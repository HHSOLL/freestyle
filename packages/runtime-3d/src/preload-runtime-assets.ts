"use client";

import type { AvatarRenderVariantId, QualityTier, RuntimeGarmentAsset } from "@freestyle/shared-types";
import { preloadRuntimeModelPath } from "./runtime-gltf-loader.js";
import { collectRuntimeModelPaths } from "./runtime-model-paths.js";

export const preloadRuntimeAssets = ({
  avatarVariantIds = [],
  garmentAssets = [],
  garmentVariantId = "female-base",
  qualityTier = "high",
}: {
  avatarVariantIds?: AvatarRenderVariantId[];
  garmentAssets?: RuntimeGarmentAsset[];
  garmentVariantId?: AvatarRenderVariantId;
  qualityTier?: QualityTier;
} = {}) => {
  collectRuntimeModelPaths({
    avatarVariantIds,
    garmentAssets,
    garmentVariantId,
    qualityTier,
  }).forEach(preloadRuntimeModelPath);
};

export const preloadAvatarVariants = (variantIds: AvatarRenderVariantId[]) => {
  preloadRuntimeAssets({ avatarVariantIds: variantIds });
};
