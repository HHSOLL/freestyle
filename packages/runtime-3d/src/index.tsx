"use client";

export {
  avatarRenderManifest,
  referenceRigAliasPatterns,
  resolveAvatarRuntimeModelPath,
} from "./avatar-manifest.js";
export { ReferenceClosetStageCanvas } from "./closet-stage.js";
export { preloadRuntimeAssets } from "./preload-runtime-assets.js";
export { runtimeAssetBudget } from "./runtime-asset-budget.js";
export {
  createStudioBackdropPalette,
  resolveStudioLightingRigSpec,
  type StudioLightingRigMode,
  type StudioLightingRigSpec,
} from "./studio-lighting-rig-policy.js";
export {
  StudioLightingRig,
} from "./studio-lighting-rig.js";
