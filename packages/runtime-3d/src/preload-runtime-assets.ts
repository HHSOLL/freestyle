"use client";

import { useGLTF } from "@react-three/drei";
import { avatarRenderManifest } from "./avatar-manifest.js";

export const preloadRuntimeAssets = () => {
  const manifestEntries = Object.values(avatarRenderManifest) as Array<
    (typeof avatarRenderManifest)[keyof typeof avatarRenderManifest]
  >;
  manifestEntries.forEach((entry) => useGLTF.preload(entry.modelPath));
};
