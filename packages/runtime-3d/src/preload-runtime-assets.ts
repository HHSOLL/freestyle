"use client";

import type { AvatarRenderVariantId, RuntimeGarmentAsset } from "@freestyle/shared-types";
import { preloadRuntimeModelPath } from "./runtime-gltf-loader.js";
import { collectRuntimeModelPaths } from "./runtime-model-paths.js";

export const preloadRuntimeAssets = ({
  avatarVariantIds = [],
  garmentAssets = [],
  garmentVariantId = "female-base",
}: {
  avatarVariantIds?: AvatarRenderVariantId[];
  garmentAssets?: RuntimeGarmentAsset[];
  garmentVariantId?: AvatarRenderVariantId;
} = {}) => {
  collectRuntimeModelPaths({
    avatarVariantIds,
    garmentAssets,
    garmentVariantId,
  }).forEach(preloadRuntimeModelPath);
};

export const preloadAvatarVariants = (variantIds: AvatarRenderVariantId[]) => {
  preloadRuntimeAssets({ avatarVariantIds: variantIds });
};
