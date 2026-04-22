import type { ComponentType } from "react";
import type { AvatarRenderVariantId, RuntimeGarmentAsset } from "@freestyle/shared-types";
import { FreestyleViewerHost, type FreestyleViewerHostProps } from "./freestyle-viewer-host.js";

export type ViewerHostMode = "runtime-3d" | "viewer-react";

export type ViewerPreloadInput = {
  avatarVariantIds?: AvatarRenderVariantId[];
  garmentAssets?: RuntimeGarmentAsset[];
  garmentVariantId?: AvatarRenderVariantId;
};

type Runtime3DModule = {
  ReferenceClosetStageCanvas?: ComponentType<FreestyleViewerHostProps>;
  preloadRuntimeAssets?: (input?: ViewerPreloadInput) => void;
};

type Runtime3DModuleLoader = () => Promise<Runtime3DModule>;

export const resolveViewerHost = (value = process.env.NEXT_PUBLIC_VIEWER_HOST): ViewerHostMode => {
  return value === "viewer-react" ? "viewer-react" : "runtime-3d";
};

export const loadRuntime3DModule: Runtime3DModuleLoader = async () => import("@freestyle/runtime-3d");

export const loadConfiguredAvatarStageComponent = async (
  host = resolveViewerHost(),
  loadRuntime3D = loadRuntime3DModule,
) => {
  if (host === "viewer-react") {
    return FreestyleViewerHost;
  }

  const runtime3DModule = await loadRuntime3D();
  return runtime3DModule.ReferenceClosetStageCanvas ?? null;
};

export const preloadViewerAssets = async (
  input: ViewerPreloadInput = {},
  host = resolveViewerHost(),
  loadRuntime3D = loadRuntime3DModule,
) => {
  if (host !== "runtime-3d") {
    return;
  }

  const runtime3DModule = await loadRuntime3D();
  runtime3DModule.preloadRuntimeAssets?.(input);
};
