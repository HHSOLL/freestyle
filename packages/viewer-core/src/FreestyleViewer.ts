export type FreestyleViewerEventMap = {
  "fit:preview-ready": {
    garments: Array<{ garmentId: string; size?: string }>;
    source: "cache" | "worker" | "static-fit";
  };
  "fit:hq-ready": {
    artifactId?: string;
    cacheKey?: string;
  };
  metrics: {
    name: string;
    value?: number;
    tags?: Record<string, string>;
  };
  error: {
    code: string;
    message: string;
  };
};

type ViewerEventName = keyof FreestyleViewerEventMap;
type ViewerListener<TName extends ViewerEventName> = (event: FreestyleViewerEventMap[TName]) => void;

export type LoadAvatarInput = {
  avatarId: string;
  bodySignature?: string;
  appearance?: Record<string, unknown>;
};

export type ApplyGarmentsInput = Array<{
  garmentId: string;
  size?: string;
}>;

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
};

export interface FreestyleViewer {
  loadAvatar(input: LoadAvatarInput): Promise<void>;
  applyGarments(input: ApplyGarmentsInput): Promise<void>;
  setCameraPreset(preset: string): void;
  setQualityMode(mode: "low" | "balanced" | "high"): void;
  requestHighQualityFit(): Promise<void>;
  on<TName extends ViewerEventName>(eventName: TName, listener: ViewerListener<TName>): () => void;
  dispose(): void;
}

export class FreestyleViewerController implements FreestyleViewer {
  readonly canvas: HTMLCanvasElement;
  readonly options: CreateFreestyleViewerOptions;

  private readonly listeners = new Map<ViewerEventName, Set<ViewerListener<ViewerEventName>>>();
  private garments: ApplyGarmentsInput = [];
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, options: CreateFreestyleViewerOptions = {}) {
    this.canvas = canvas;
    this.options = options;
  }

  async loadAvatar(input: LoadAvatarInput) {
    this.assertActive();
    this.emit("metrics", {
      name: "viewer.avatar.load.requested",
      tags: { avatarId: input.avatarId },
    });
  }

  async applyGarments(input: ApplyGarmentsInput) {
    this.assertActive();
    this.garments = input;
    this.emit("fit:preview-ready", {
      garments: input,
      source: "static-fit",
    });
  }

  setCameraPreset(preset: string) {
    this.assertActive();
    this.emit("metrics", {
      name: "viewer.camera.preset",
      tags: { preset },
    });
  }

  setQualityMode(mode: "low" | "balanced" | "high") {
    this.assertActive();
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
