"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { BodyProfile, RuntimeGarmentAsset } from "@freestyle/shared-types";

const DynamicAvatarStage = dynamic(
  () => import("@freestyle/runtime-3d").then((module) => module.ReferenceClosetStageCanvas),
  { ssr: false },
);

function detectQualityTier(): "low" | "balanced" | "high" {
  if (typeof window === "undefined") return "balanced";

  const memory =
    "deviceMemory" in navigator
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 6
      : 6;
  const cores = navigator.hardwareConcurrency ?? 6;

  if (memory <= 4 || cores <= 4) return "low";
  if (memory >= 8 && cores >= 8) return "high";
  return "balanced";
}

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
  equippedGarments: RuntimeGarmentAsset[];
  selectedItemId: string | null;
  qualityTier?: "low" | "balanced" | "high";
}) {
  const resolvedQualityTier = useMemo(() => qualityTier ?? detectQualityTier(), [qualityTier]);

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
