"use client";

import { useGLTF } from "@react-three/drei";
import { resolveGarmentRuntimeModelPath } from "@freestyle/domain-garment";
import type { AvatarRenderVariantId, RuntimeGarmentAsset } from "@freestyle/shared-types";
import { avatarRenderManifest } from "./avatar-manifest.js";

const preloadRuntimeModelPath = (modelPath: string) => {
  useGLTF.preload(modelPath, false, true);
};

export const preloadRuntimeAssets = ({
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

  dedupedPaths.forEach(preloadRuntimeModelPath);
};

export const preloadAvatarVariants = (variantIds: AvatarRenderVariantId[]) => {
  preloadRuntimeAssets({ avatarVariantIds: variantIds });
};
