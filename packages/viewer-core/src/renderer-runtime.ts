import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
  WebGLRenderer,
  type ColorRepresentation,
} from "three";
import { createSharedLoaderRegistry } from "./loader-registry.js";
import { ViewerProxyStage } from "./proxy-stage.js";
import type {
  ApplyGarmentsInput,
  CreateFreestyleViewerOptions,
  FreestyleViewerViewportInput,
  LoadAvatarInput,
  ViewerCameraPreset,
} from "./FreestyleViewer.js";
import { createRenderScheduler, type RenderSchedulerAdapter } from "./render-scheduler.js";

export type ViewerRendererBackend = "webgl2" | "webgpu" | "noop";

export type ViewerRendererMetrics = {
  backend: ViewerRendererBackend;
  renderCount: number;
  resizeCount: number;
  width: number;
  height: number;
  pixelRatio: number;
  lastRenderReason: string | null;
};

export type ViewerRendererRuntime = {
  backend: ViewerRendererBackend;
  getMetrics: () => ViewerRendererMetrics;
  invalidate: (reason?: string) => void;
  renderNow: (reason?: string) => void;
  syncAvatar: (input: LoadAvatarInput) => void;
  syncGarments: (garments: ApplyGarmentsInput, selectedItemId?: string | null) => void;
  setCameraPreset: (preset: ViewerCameraPreset) => void;
  setViewport: (viewport: FreestyleViewerViewportInput) => void;
  setBackgroundColor: (color?: string) => void;
  syncQualityMode: (mode: "low" | "balanced" | "high") => void;
  dispose: () => void;
};

export type ViewerRendererFactory = (
  canvas: HTMLCanvasElement,
  options?: CreateFreestyleViewerOptions,
) => ViewerRendererRuntime;

const qualityTierPixelRatioCaps = {
  low: 1,
  balanced: 1.5,
  high: 2,
} as const;

const qualityTierBackdrop = {
  low: "#0b1018",
  balanced: "#101820",
  high: "#121c28",
} as const;

const readCanvasDisplaySize = (canvas: HTMLCanvasElement) => ({
  width: Math.max(1, Math.floor(canvas.clientWidth || canvas.width || 1)),
  height: Math.max(1, Math.floor(canvas.clientHeight || canvas.height || 1)),
});

const resolveDevicePixelRatio = () => {
  if (typeof globalThis.window !== "undefined" && typeof globalThis.window.devicePixelRatio === "number") {
    return globalThis.window.devicePixelRatio;
  }

  return 1;
};

const createNoopViewerRendererRuntime = (): ViewerRendererRuntime => {
  const metrics: ViewerRendererMetrics = {
    backend: "noop",
    renderCount: 0,
    resizeCount: 0,
    width: 0,
    height: 0,
    pixelRatio: 1,
    lastRenderReason: null,
  };

  return {
    backend: "noop",
    getMetrics() {
      return { ...metrics };
    },
    invalidate(reason = "noop-invalidate") {
      metrics.renderCount += 1;
      metrics.lastRenderReason = reason;
    },
    renderNow(reason = "noop-render") {
      metrics.renderCount += 1;
      metrics.lastRenderReason = reason;
    },
    syncAvatar() {
      return;
    },
    syncGarments() {
      return;
    },
    setCameraPreset() {
      return;
    },
    setViewport(viewport) {
      metrics.width = viewport.widthCssPx;
      metrics.height = viewport.heightCssPx;
      metrics.pixelRatio = viewport.devicePixelRatio ?? 1;
    },
    setBackgroundColor() {
      return;
    },
    syncQualityMode() {
      return;
    },
    dispose() {
      return;
    },
  };
};

export const createViewerRendererRuntime: ViewerRendererFactory = (
  canvas,
  options: CreateFreestyleViewerOptions = {},
) => {
  if (typeof canvas?.getContext !== "function") {
    return createNoopViewerRendererRuntime();
  }

  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    canvas,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  const loaderRegistry = createSharedLoaderRegistry(renderer);

  const metrics: ViewerRendererMetrics = {
    backend: options.renderBackend ?? "webgl2",
    renderCount: 0,
    resizeCount: 0,
    width: 0,
    height: 0,
    pixelRatio: 1,
    lastRenderReason: null,
  };

  let disposed = false;
  let contextLost = false;
  let qualityMode: "low" | "balanced" | "high" = "balanced";
  let backgroundColor: ColorRepresentation = qualityTierBackdrop.balanced;
  let viewport: FreestyleViewerViewportInput | null = null;

  const resizeRendererToCanvas = () => {
    const width = viewport?.widthCssPx ?? readCanvasDisplaySize(canvas).width;
    const height = viewport?.heightCssPx ?? readCanvasDisplaySize(canvas).height;
    const pixelRatio = Math.min(
      viewport?.devicePixelRatio ?? resolveDevicePixelRatio(),
      qualityTierPixelRatioCaps[qualityMode],
    );
    const sizeChanged = width !== metrics.width || height !== metrics.height || pixelRatio !== metrics.pixelRatio;

    if (!sizeChanged) {
      return;
    }

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    metrics.width = width;
    metrics.height = height;
    metrics.pixelRatio = pixelRatio;
    metrics.resizeCount += 1;
  };

  const renderFrame = (reason: string) => {
    if (disposed || contextLost) {
      return;
    }

    resizeRendererToCanvas();
    renderer.setClearColor(backgroundColor, 1);
    renderer.clear(true, true, true);
    proxyStage.render(renderer);
    metrics.renderCount += 1;
    metrics.lastRenderReason = reason;
  };

  const proxyStage = new ViewerProxyStage({
    canvas,
    requestRender(reason) {
      scheduler.invalidate(reason);
    },
  });

  const scheduler = createRenderScheduler(
    (frame) => {
      renderFrame(frame.reason);
    },
    options.schedulerAdapter as RenderSchedulerAdapter | undefined,
  );

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
  };

  const handleContextRestored = () => {
    contextLost = false;
    scheduler.invalidate("context-restored");
  };

  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);

  const runtime: ViewerRendererRuntime = {
    backend: options.renderBackend ?? "webgl2",
    getMetrics() {
      return { ...metrics };
    },
    invalidate(reason = "viewer.invalidate") {
      scheduler.invalidate(reason);
    },
    renderNow(reason = "viewer.render-now") {
      scheduler.flush(reason);
    },
    syncAvatar(input) {
      proxyStage.syncAvatar(input);
      scheduler.invalidate("avatar-sync");
    },
    syncGarments(garments, selectedItemId) {
      proxyStage.syncGarments(garments, selectedItemId);
      scheduler.invalidate("garment-sync");
    },
    setCameraPreset(preset) {
      proxyStage.setCameraPreset(preset);
      scheduler.invalidate("camera-preset");
    },
    setViewport(nextViewport) {
      viewport = nextViewport;
      proxyStage.setViewport(nextViewport);
      scheduler.invalidate("viewport");
    },
    setBackgroundColor(color) {
      backgroundColor = color ?? qualityTierBackdrop[qualityMode];
      proxyStage.setBackgroundColor(typeof backgroundColor === "string" ? backgroundColor : undefined);
      scheduler.invalidate("background-color");
    },
    syncQualityMode(mode) {
      qualityMode = mode;
      if (!backgroundColor || backgroundColor === qualityTierBackdrop.low || backgroundColor === qualityTierBackdrop.balanced || backgroundColor === qualityTierBackdrop.high) {
        backgroundColor = qualityTierBackdrop[mode];
      }
      proxyStage.syncQualityMode(mode);
      proxyStage.setBackgroundColor(typeof backgroundColor === "string" ? backgroundColor : undefined);
      scheduler.invalidate("quality-mode");
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      scheduler.dispose();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      proxyStage.dispose();
      loaderRegistry.dispose();
      renderer.forceContextLoss?.();
      renderer.dispose();
    },
  };

  runtime.renderNow("viewer.init");

  return runtime;
};
