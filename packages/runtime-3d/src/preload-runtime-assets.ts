"use client";

import { useGLTF } from "@react-three/drei";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { resolveGarmentRuntimeModelPath } from "@freestyle/domain-garment";
import type { AvatarRenderVariantId, RuntimeGarmentAsset } from "@freestyle/shared-types";
import { avatarRenderManifest } from "./avatar-manifest.js";

const DRACO_DECODER_PATH = "/draco/gltf/";

const configureRuntimeLoader = (loader: unknown) => {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
  (loader as { setDRACOLoader: (dracoLoader: DRACOLoader) => unknown }).setDRACOLoader(dracoLoader);
};

const preloadRuntimeModelPath = (modelPath: string) => {
  useGLTF.preload(modelPath, false, true, configureRuntimeLoader);
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
