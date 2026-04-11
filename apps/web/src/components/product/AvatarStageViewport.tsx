"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { detectQualityTier, preloadRuntimeAssets } from "@freestyle/runtime-3d";
import type { BodyProfile, StarterGarment } from "@freestyle/shared-types";

const DynamicAvatarStage = dynamic(
  () => import("@freestyle/runtime-3d").then((module) => module.AvatarStageCanvas),
  { ssr: false },
);

export function AvatarStageViewport({
  bodyProfile,
  avatarVariantId,
  poseId,
  equippedGarments,
  selectedItemId,
  qualityTier,
}: {
  bodyProfile: BodyProfile;
  avatarVariantId: "female-base" | "male-base";
  poseId: "neutral" | "relaxed" | "contrapposto" | "stride" | "tailored";
  equippedGarments: StarterGarment[];
  selectedItemId: string | null;
  qualityTier?: "low" | "balanced" | "high";
}) {
  const resolvedQualityTier = useMemo(() => qualityTier ?? detectQualityTier(), [qualityTier]);

  useEffect(() => {
    preloadRuntimeAssets();
  }, []);

  return (
    <DynamicAvatarStage
      bodyProfile={bodyProfile}
      avatarVariantId={avatarVariantId}
      poseId={poseId}
      equippedGarments={equippedGarments}
      selectedItemId={selectedItemId}
      qualityTier={resolvedQualityTier}
    />
  );
}
