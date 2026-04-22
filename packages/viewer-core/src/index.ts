export {
  createSharedLoaderRegistry,
  type SharedLoaderRegistry,
  type SharedLoaderRegistryOptions,
} from "./loader-registry.js";
export {
  FreestyleViewerController,
  type ApplyGarmentsInput,
  type CreateFreestyleViewerOptions,
  type FreestyleViewer,
  type FreestyleViewerEventMap,
  type FreestyleViewerSceneInput,
  type LoadAvatarInput,
} from "./FreestyleViewer.js";

import { FreestyleViewerController, type CreateFreestyleViewerOptions } from "./FreestyleViewer.js";

export const createFreestyleViewer = async (
  canvas: HTMLCanvasElement,
  options: CreateFreestyleViewerOptions = {},
) => {
  const viewer = new FreestyleViewerController(canvas, options);
  options.telemetry?.emit({
    name: "viewer.created",
    tags: {
      renderBackend: options.renderBackend ?? "webgl2",
    },
  });
  return viewer;
};
