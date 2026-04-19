import { resolveGarmentRuntimeModelPath } from "@freestyle/domain-garment";
import type { AvatarRenderVariantId, RuntimeGarmentAsset } from "@freestyle/shared-types";
import { avatarRenderManifest } from "./avatar-manifest.js";

export const collectRuntimeModelPaths = ({
  avatarVariantIds = [],
  garmentAssets = [],
  garmentVariantId = "female-base",
}: {
  avatarVariantIds?: AvatarRenderVariantId[];
  garmentAssets?: RuntimeGarmentAsset[];
  garmentVariantId?: AvatarRenderVariantId;
} = {}) => {
  const dedupedPaths = new Set<string>();

  avatarVariantIds.forEach((variantId) => {
    const manifestEntry = avatarRenderManifest[variantId];
    if (manifestEntry) {
      dedupedPaths.add(manifestEntry.modelPath);
    }
  });

  garmentAssets.forEach((item) => {
    const modelPath = resolveGarmentRuntimeModelPath(item.runtime, garmentVariantId);
    if (modelPath) {
      dedupedPaths.add(modelPath);
    }
  });

  return Array.from(dedupedPaths);
};
