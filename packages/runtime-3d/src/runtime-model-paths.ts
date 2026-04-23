import { resolveGarmentRuntimeModelPath } from "@freestyle/domain-garment";
import type { AvatarRenderVariantId, QualityTier, RuntimeGarmentAsset } from "@freestyle/shared-types";
import { resolveAvatarRuntimeModelPath } from "./avatar-manifest.js";

export const collectRuntimeModelPaths = ({
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
  const dedupedPaths = new Set<string>();

  avatarVariantIds.forEach((variantId) => {
    const modelPath = resolveAvatarRuntimeModelPath(variantId, qualityTier);
    if (modelPath) {
      dedupedPaths.add(modelPath);
    }
  });

  garmentAssets.forEach((item) => {
    const modelPath = resolveGarmentRuntimeModelPath(item.runtime, garmentVariantId, qualityTier);
    if (modelPath) {
      dedupedPaths.add(modelPath);
    }
  });

  return Array.from(dedupedPaths);
};
