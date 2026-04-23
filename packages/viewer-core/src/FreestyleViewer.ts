import type { BodySignature } from "@freestyle/asset-schema";
import type {
  FitHqReadyEvent,
  FitPreviewReadyEvent,
  ViewerCameraPreset,
  ViewerErrorEvent,
  ViewerGarmentSelection,
  ViewerQualityMode,
  ViewerTelemetryEvent,
} from "@freestyle/viewer-protocol";
import { createViewerRendererRuntime, type ViewerRendererFactory, type ViewerRendererRuntime } from "./renderer-runtime.js";
import type { RenderSchedulerAdapter } from "./render-scheduler.js";

export type {
  ViewerCameraPreset,
  ViewerGarmentSelection,
  ViewerQualityMode,
} from "@freestyle/viewer-protocol";

export type FreestyleViewerEventMap = {
  "fit:preview-ready": FitPreviewReadyEvent;
  "fit:hq-ready": FitHqReadyEvent;
  metrics: ViewerTelemetryEvent;
  error: ViewerErrorEvent;
};

type ViewerEventName = keyof FreestyleViewerEventMap;
type ViewerListener<TName extends ViewerEventName> = (event: FreestyleViewerEventMap[TName]) => void;

export type LoadAvatarInput = {
  avatarId: string;
  bodySignature?: BodySignature;
  appearance?: Record<string, unknown>;
};

export type ApplyGarmentsInput = ViewerGarmentSelection[];

export type FreestyleViewerSceneInput = {
  avatar: LoadAvatarInput;
  garments: ApplyGarmentsInput;
  cameraPreset: ViewerCameraPreset;
  qualityMode: ViewerQualityMode;
  selectedItemId?: string | null;
  backgroundColor?: string;
};

export type FreestyleViewerViewportInput = {
  widthCssPx: number;
  heightCssPx: number;
  devicePixelRatio?: number;
};

export type CreateFreestyleViewerOptions = {
  renderBackend?: "webgl2" | "webgpu";
  devicePolicy?: Record<string, unknown>;
  assetResolver?: {
    resolve: (assetId: string) => Promise<string>;
  };
  telemetry?: {
    emit: (event: { name: string; value?: number; tags?: Record<string, string> }) => void;
  };
  cachePolicy?: Record<string, unknown>;
  rendererFactory?: ViewerRendererFactory;
  schedulerAdapter?: RenderSchedulerAdapter;
};

export interface FreestyleViewer {
  loadAvatar(input: LoadAvatarInput): Promise<void>;
  applyGarments(input: ApplyGarmentsInput): Promise<void>;
  setScene(input: FreestyleViewerSceneInput): Promise<void>;
  setViewport(input: FreestyleViewerViewportInput): void;
  invalidate(reason?: string): void;
  setCameraPreset(preset: ViewerCameraPreset): void;
  setQualityMode(mode: ViewerQualityMode): void;
  requestHighQualityFit(): Promise<void>;
  on<TName extends ViewerEventName>(eventName: TName, listener: ViewerListener<TName>): () => void;
  dispose(): void;
}

export class FreestyleViewerController implements FreestyleViewer {
  readonly canvas: HTMLCanvasElement;
  readonly options: CreateFreestyleViewerOptions;

  private readonly listeners = new Map<ViewerEventName, Set<ViewerListener<ViewerEventName>>>();
  private readonly rendererRuntime: ViewerRendererRuntime;
  private garments: ApplyGarmentsInput = [];
  private scene: FreestyleViewerSceneInput | null = null;
  private viewport: FreestyleViewerViewportInput | null = null;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, options: CreateFreestyleViewerOptions = {}) {
    this.canvas = canvas;
    this.options = options;
    this.rendererRuntime = (options.rendererFactory ?? createViewerRendererRuntime)(canvas, options);
  }

  async loadAvatar(input: LoadAvatarInput) {
    this.assertActive();
    this.rendererRuntime.syncAvatar(input);
    this.emit("metrics", {
      name: "viewer.avatar.load.requested",
      tags: { avatarId: input.avatarId },
    });
    this.rendererRuntime.invalidate("avatar-load");
  }

  async applyGarments(input: ApplyGarmentsInput) {
    this.assertActive();
    this.garments = input;
    this.rendererRuntime.syncGarments(input, this.scene?.selectedItemId);
    this.emit("fit:preview-ready", {
      garments: input,
      source: "static-fit",
    });
    this.rendererRuntime.invalidate("garment-apply");
  }

  async setScene(input: FreestyleViewerSceneInput) {
    this.assertActive();
    this.scene = input;
    this.rendererRuntime.setBackgroundColor(input.backgroundColor);
    this.emit("metrics", {
      name: "viewer.scene.updated",
      tags: {
        selectedItemId: input.selectedItemId ?? "none",
        backgroundColor: input.backgroundColor ?? "default",
      },
    });
    this.setQualityMode(input.qualityMode);
    this.setCameraPreset(input.cameraPreset);
    await this.loadAvatar(input.avatar);
    await this.applyGarments(input.garments);
  }

  setViewport(input: FreestyleViewerViewportInput) {
    this.assertActive();
    this.viewport = input;
    this.rendererRuntime.setViewport(input);
    this.emit("metrics", {
      name: "viewer.viewport.updated",
      tags: {
        widthCssPx: String(input.widthCssPx),
        heightCssPx: String(input.heightCssPx),
      },
      value: input.devicePixelRatio,
    });
  }

  invalidate(reason = "viewer.invalidate") {
    this.assertActive();
    this.rendererRuntime.invalidate(reason);
  }

  setCameraPreset(preset: ViewerCameraPreset) {
    this.assertActive();
    this.rendererRuntime.setCameraPreset(preset);
    this.emit("metrics", {
      name: "viewer.camera.preset",
      tags: { preset },
    });
  }

  setQualityMode(mode: ViewerQualityMode) {
    this.assertActive();
    this.rendererRuntime.syncQualityMode(mode);
    this.emit("metrics", {
      name: "viewer.quality.mode",
      tags: { mode },
    });
  }

  async requestHighQualityFit() {
    this.assertActive();
    this.emit("fit:hq-ready", {
      cacheKey: this.garments.map((item) => `${item.garmentId}:${item.size ?? "default"}`).join("|"),
    });
    this.rendererRuntime.invalidate("hq-fit");
  }

  on<TName extends ViewerEventName>(eventName: TName, listener: ViewerListener<TName>) {
    const listeners = this.listeners.get(eventName) ?? new Set<ViewerListener<ViewerEventName>>();
    listeners.add(listener as ViewerListener<ViewerEventName>);
    this.listeners.set(eventName, listeners);

    return () => {
      listeners.delete(listener as ViewerListener<ViewerEventName>);
      if (listeners.size === 0) {
        this.listeners.delete(eventName);
      }
    };
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.rendererRuntime.dispose();
    this.listeners.clear();
  }

  private assertActive() {
    if (this.disposed) {
      throw new Error("FreestyleViewerController is disposed.");
    }
  }

  private emit<TName extends ViewerEventName>(eventName: TName, event: FreestyleViewerEventMap[TName]) {
    if (eventName === "metrics") {
      this.options.telemetry?.emit(event as FreestyleViewerEventMap["metrics"]);
    } else {
      this.options.telemetry?.emit({
        name: `viewer.event.${eventName}`,
      });
    }

    const listeners = this.listeners.get(eventName);
    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => {
      listener(event as FreestyleViewerEventMap[ViewerEventName]);
    });
  }
}
