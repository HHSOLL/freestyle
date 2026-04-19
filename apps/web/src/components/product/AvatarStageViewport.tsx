"use client";

import { startTransition, useEffect, useMemo, useState, type ComponentType } from "react";
import type { BodyProfile, RuntimeGarmentAsset } from "@freestyle/shared-types";
import { AvatarStageViewportFallback } from "./AvatarStageViewportFallback.js";

type AvatarStageViewportProps = {
  bodyProfile: BodyProfile;
  avatarVariantId: "female-base" | "male-base";
  poseId: "neutral" | "relaxed" | "contrapposto" | "stride" | "tailored";
  equippedGarments: RuntimeGarmentAsset[];
  selectedItemId: string | null;
  qualityTier?: "low" | "balanced" | "high";
};

type AvatarStageComponent = ComponentType<Omit<AvatarStageViewportProps, "qualityTier"> & { qualityTier: "low" | "balanced" | "high" }>;
type StageLoadState = "loading" | "ready" | "error";
type StageSupportState = "pending" | "supported" | "unsupported";

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

const qualityTierRank = {
  low: 0,
  balanced: 1,
  high: 2,
} as const;

function supportsWebGL() {
  if (typeof document === "undefined") return true;
  const canvas = document.createElement("canvas");
  return Boolean(
    canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl"),
  );
}

export function AvatarStageViewport({
  bodyProfile,
  avatarVariantId,
  poseId,
  equippedGarments,
  selectedItemId,
  qualityTier,
}: AvatarStageViewportProps) {
  const resolvedQualityTier = useMemo(() => {
    const detected = detectQualityTier();
    if (!qualityTier) return detected;
    return qualityTierRank[qualityTier] <= qualityTierRank[detected] ? qualityTier : detected;
  }, [qualityTier]);
  const [supportState, setSupportState] = useState<StageSupportState>("pending");
  const [stageAttempt, setStageAttempt] = useState(0);
  const [stageLoadState, setStageLoadState] = useState<StageLoadState>("loading");
  const [StageComponent, setStageComponent] = useState<AvatarStageComponent | null>(null);

  useEffect(() => {
    setSupportState(supportsWebGL() ? "supported" : "unsupported");
  }, []);

  useEffect(() => {
    if (supportState !== "supported") return;

    let cancelled = false;
    setStageLoadState("loading");
    setStageComponent(null);

    void import("@freestyle/runtime-3d")
      .then((module) => {
        if (cancelled) return;
        setStageComponent(() => module.ReferenceClosetStageCanvas as AvatarStageComponent);
        setStageLoadState("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load runtime closet stage", error);
        setStageComponent(null);
        setStageLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [stageAttempt, supportState]);

  const handleRetry = () => {
    startTransition(() => {
      setStageAttempt((attempt) => attempt + 1);
    });
  };

  if (supportState === "unsupported") {
    return <AvatarStageViewportFallback state="unsupported" />;
  }

  if (stageLoadState === "error") {
    return <AvatarStageViewportFallback state="error" onRetry={handleRetry} />;
  }

  if (supportState !== "supported" || stageLoadState !== "ready" || !StageComponent) {
    return <AvatarStageViewportFallback state="loading" />;
  }

  return (
    <StageComponent
      bodyProfile={bodyProfile}
      avatarVariantId={avatarVariantId}
      poseId={poseId}
      equippedGarments={equippedGarments}
      selectedItemId={selectedItemId}
      qualityTier={resolvedQualityTier}
    />
  );
}
