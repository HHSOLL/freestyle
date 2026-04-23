"use client";

import { startTransition, useEffect, useMemo, useReducer, useState, type ComponentType } from "react";
import { ViewerStageFallback } from "./stage-fallback.js";
import {
  detectViewerStageSupport,
  reduceViewerStageLifecycle,
  resolveViewerStageQualityTier,
  resolveViewerStageRenderState,
  shouldApplyViewerStageLoadResult,
  viewerStageInitialLifecycleState,
  type ViewportQualityTier,
} from "./stage-lifecycle.js";
import {
  loadConfiguredAvatarStageComponent,
  resolveViewerHost,
  type ViewerHostMode,
} from "./host-selection.js";
import type { FreestyleViewerHostProps, ViewerQualityTier } from "./freestyle-viewer-host.js";

export type AvatarStageViewportProps = Omit<FreestyleViewerHostProps, "qualityTier"> & {
  qualityTier?: ViewerQualityTier;
  viewerHostMode?: ViewerHostMode;
};

type AvatarStageComponent = ComponentType<FreestyleViewerHostProps>;

function detectQualityTier(): ViewportQualityTier {
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
  telemetryTags,
  viewerHostMode,
}: AvatarStageViewportProps) {
  const viewerHost = useMemo(() => viewerHostMode ?? resolveViewerHost(), [viewerHostMode]);
  const resolvedQualityTier = useMemo(() => {
    return resolveViewerStageQualityTier(qualityTier, detectQualityTier());
  }, [qualityTier]);
  const [lifecycleState, dispatchLifecycle] = useReducer(
    reduceViewerStageLifecycle,
    viewerStageInitialLifecycleState,
  );
  const [StageComponent, setStageComponent] = useState<AvatarStageComponent | null>(null);

  useEffect(() => {
    dispatchLifecycle({
      type: "support-detected",
      supportState: detectViewerStageSupport(
        typeof document === "undefined" ? undefined : () => document.createElement("canvas"),
      ),
    });
  }, []);

  useEffect(() => {
    if (lifecycleState.supportState !== "supported") return;

    let cancelled = false;
    const attempt = lifecycleState.attempt;
    dispatchLifecycle({ type: "load-started", attempt });

    void loadConfiguredAvatarStageComponent(viewerHost)
      .then((nextStageComponent) => {
        if (
          !shouldApplyViewerStageLoadResult({
            cancelled,
            supportState: lifecycleState.supportState,
            activeAttempt: lifecycleState.attempt,
            resolvedAttempt: attempt,
          })
        ) {
          return;
        }
        if (!nextStageComponent) {
          throw new Error(`Configured viewer host "${viewerHost}" did not expose a stage component.`);
        }
        setStageComponent(() => nextStageComponent as AvatarStageComponent);
        dispatchLifecycle({ type: "load-resolved", attempt, loadState: "ready" });
      })
      .catch((error) => {
        if (
          !shouldApplyViewerStageLoadResult({
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

  const renderState = resolveViewerStageRenderState(lifecycleState, Boolean(StageComponent));
  if (renderState !== "ready") {
    return <ViewerStageFallback state={renderState} onRetry={renderState === "error" ? handleRetry : undefined} />;
  }

  const RuntimeStageComponent = StageComponent;
  if (!RuntimeStageComponent) {
    return <ViewerStageFallback state="loading" />;
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
      telemetryTags={telemetryTags}
    />
  );
}
