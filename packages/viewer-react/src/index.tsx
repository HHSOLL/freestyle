"use client";

import { ReferenceClosetStageCanvas, preloadRuntimeAssets } from "../../runtime-3d/src/index.js";
import type { BodyProfile, RuntimeGarmentAsset } from "../../shared-types/src/index.js";

export type ViewerQualityTier = "low" | "balanced" | "high";

export type FreestyleViewerHostProps = {
  bodyProfile: BodyProfile;
  avatarVariantId: "female-base" | "male-base";
  poseId: "neutral" | "relaxed" | "contrapposto" | "stride" | "tailored";
  equippedGarments: RuntimeGarmentAsset[];
  selectedItemId: string | null;
  qualityTier: ViewerQualityTier;
  backgroundColor?: string;
};

// Batch 1 keeps the new host package as a compatibility wrapper over runtime-3d.
export function FreestyleViewerHost(props: FreestyleViewerHostProps) {
  return <ReferenceClosetStageCanvas {...props} />;
}

export const preloadViewerAssets = preloadRuntimeAssets;
