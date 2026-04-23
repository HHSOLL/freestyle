export {
  createSharedLoaderRegistry,
  resolveSharedLoaderRegistryPolicy,
  type SharedLoaderRegistry,
  type SharedLoaderRegistryOptions,
} from "./loader-registry.js";
export {
  createRenderScheduler,
  type RenderFrame,
  type RenderScheduler,
  type RenderSchedulerAdapter,
} from "./render-scheduler.js";
export {
  inferProxyGarmentKind,
  resolveProxyCameraOrbit,
  ViewerProxyStage,
  type ViewerProxyGarmentKind,
} from "./proxy-stage.js";
export {
  createViewerRendererRuntime,
  type ViewerRendererBackend,
  type ViewerRendererFactory,
  type ViewerRendererMetrics,
  type ViewerRendererRuntime,
} from "./renderer-runtime.js";
export {
  FreestyleViewerController,
  type ApplyGarmentsInput,
  type CreateFreestyleViewerOptions,
  type FreestyleViewer,
  type ViewerCameraPreset,
  type FreestyleViewerEventMap,
  type FreestyleViewerSceneInput,
  type FreestyleViewerViewportInput,
  type LoadAvatarInput,
} from "./FreestyleViewer.js";

import { FreestyleViewerController, type CreateFreestyleViewerOptions } from "./FreestyleViewer.js";

export const createFreestyleViewer = async (
  canvas: HTMLCanvasElement,
  options: CreateFreestyleViewerOptions = {},
) => {
  if (options.renderBackend === "webgpu") {
    options.telemetry?.emit({
      name: "viewer.backend.unsupported",
      tags: {
        renderBackend: "webgpu",
      },
    });
    throw new Error('Render backend "webgpu" is not implemented in viewer-core yet.');
  }

  const viewer = new FreestyleViewerController(canvas, options);
  options.telemetry?.emit({
    name: "viewer.created",
    tags: {
      renderBackend: options.renderBackend ?? "webgl2",
    },
  });
  return viewer;
};
