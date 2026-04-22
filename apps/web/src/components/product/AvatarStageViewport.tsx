"use client";

import { startTransition, useEffect, useMemo, useReducer, useState, type ComponentType } from "react";
import type { BodyProfile, RuntimeGarmentAsset } from "@freestyle/shared-types";
import { AvatarStageViewportFallback } from "./AvatarStageViewportFallback.js";
import {
  loadConfiguredAvatarStageModule,
  resolveAvatarStageComponent,
  resolveViewerHost,
} from "@/lib/viewer-host";
import {
  avatarStageViewportInitialLifecycleState,
  detectAvatarStageViewportSupport,
  reduceAvatarStageViewportLifecycle,
  resolveAvatarStageViewportQualityTier,
  resolveAvatarStageViewportRenderState,
  shouldApplyAvatarStageViewportLoadResult,
  type ViewportQualityTier,
} from "./avatar-stage-viewport-lifecycle.js";

type AvatarStageViewportProps = {
  bodyProfile: BodyProfile;
  avatarVariantId: "female-base" | "male-base";
  poseId: "neutral" | "relaxed" | "contrapposto" | "stride" | "tailored";
  equippedGarments: RuntimeGarmentAsset[];
  selectedItemId: string | null;
  qualityTier?: ViewportQualityTier;
  backgroundColor?: string;
};

type AvatarStageComponent = ComponentType<Omit<AvatarStageViewportProps, "qualityTier"> & { qualityTier: ViewportQualityTier }>;

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
  backgroundColor,
}: AvatarStageViewportProps) {
  const viewerHost = useMemo(() => resolveViewerHost(), []);
  const resolvedQualityTier = useMemo(() => {
    return resolveAvatarStageViewportQualityTier(qualityTier, detectQualityTier());
  }, [qualityTier]);
  const [lifecycleState, dispatchLifecycle] = useReducer(
    reduceAvatarStageViewportLifecycle,
    avatarStageViewportInitialLifecycleState,
  );
  const [StageComponent, setStageComponent] = useState<AvatarStageComponent | null>(null);

  useEffect(() => {
    dispatchLifecycle({
      type: "support-detected",
      supportState: detectAvatarStageViewportSupport(
        typeof document === "undefined" ? undefined : () => document.createElement("canvas"),
      ),
    });
  }, []);

  useEffect(() => {
    if (lifecycleState.supportState !== "supported") return;

    let cancelled = false;
    const attempt = lifecycleState.attempt;
    dispatchLifecycle({ type: "load-started", attempt });

    void loadConfiguredAvatarStageModule(viewerHost)
      .then((module) => {
        if (
          !shouldApplyAvatarStageViewportLoadResult({
            cancelled,
            supportState: lifecycleState.supportState,
            activeAttempt: lifecycleState.attempt,
            resolvedAttempt: attempt,
          })
        ) {
          return;
        }
        const nextStageComponent = resolveAvatarStageComponent(module, viewerHost);
        if (!nextStageComponent) {
          throw new Error(`Configured viewer host "${viewerHost}" did not expose a stage component.`);
        }
        setStageComponent(() => nextStageComponent as AvatarStageComponent);
        dispatchLifecycle({ type: "load-resolved", attempt, loadState: "ready" });
      })
      .catch((error) => {
        if (
          !shouldApplyAvatarStageViewportLoadResult({
            cancelled,
            supportState: lifecycleState.supportState,
            activeAttempt: lifecycleState.attempt,
            resolvedAttempt: attempt,
          })
        ) {
          return;
        }
        console.error(`Failed to load configured viewer host "${viewerHost}"`, error);
        setStageComponent(null);
        dispatchLifecycle({ type: "load-resolved", attempt, loadState: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [lifecycleState.attempt, lifecycleState.supportState, viewerHost]);

  const handleRetry = () => {
    startTransition(() => {
      dispatchLifecycle({ type: "retry-requested" });
    });
  };

  const renderState = resolveAvatarStageViewportRenderState(lifecycleState, Boolean(StageComponent));
  if (renderState !== "ready") {
    return (
      <AvatarStageViewportFallback
        state={renderState}
        onRetry={renderState === "error" ? handleRetry : undefined}
      />
    );
  }

  const RuntimeStageComponent = StageComponent;
  if (!RuntimeStageComponent) {
    return <AvatarStageViewportFallback state="loading" />;
  }

  return (
    <RuntimeStageComponent
      bodyProfile={bodyProfile}
      avatarVariantId={avatarVariantId}
      poseId={poseId}
      equippedGarments={equippedGarments}
      selectedItemId={selectedItemId}
      qualityTier={resolvedQualityTier}
      backgroundColor={backgroundColor}
    />
  );
}
