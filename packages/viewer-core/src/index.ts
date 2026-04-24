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
  createViewerMaterial,
  createViewerSkinMaterial,
  resolveProxyMaterialClass,
  viewerMaterialPresets,
  type ViewerMaterialClass,
  type ViewerMaterialPreset,
} from "./material-system.js";
export {
  inferProxyGarmentKind,
  resolveProxyCameraOrbit,
  ViewerProxyStage,
  type ViewerProxyGarmentKind,
} from "./proxy-stage.js";
export {
  createBarycentricBinding,
  applyBarycentricBinding,
  type BarycentricBinding,
  type BarycentricBindingEntry,
  type IndexedRestMesh,
  type PointRestMesh,
} from "./fitting/barycentric-binding.js";
export {
  createCageBinding,
  applyCageBinding,
  type CageBinding,
  type CageBindingEntry,
  type CageBindingOptions,
} from "./fitting/cage-binding.js";
export {
  createDeformationTransfer,
  applyDeformationTransfer,
  type ApplyDeformationTransferInput,
  type CreateDeformationTransferInput,
  type DeformationTransfer,
  type DeformationTransferMode,
} from "./fitting/deformation-transfer.js";
export { evaluateFootwearFit } from "./fitting/footwear-fit.js";
export {
  createViewerRendererRuntime,
  type ViewerRendererBackend,
  type ViewerRendererFactory,
  type ViewerRendererMetrics,
  type ViewerRendererRuntime,
} from "./renderer-runtime.js";
export {
  createResourceRegistry,
  type ViewerResourceKind,
  type ViewerResourceRegistration,
  type ViewerResourceRegistry,
  type ViewerResourceRegistryOptions,
  type ViewerResourceRegistrySnapshot,
  type ViewerResourceSnapshot,
} from "./resource-registry.js";
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
