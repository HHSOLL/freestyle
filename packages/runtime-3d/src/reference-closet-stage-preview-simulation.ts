"use client";

import type { QualityTier } from "@freestyle/shared-types";
import {
  buildFitKernelPreviewFrameRequest,
  createFitKernelPreviewFrameState,
  detectFitKernelPreviewFeatures,
  fitKernelPreviewFrameSchemaVersion,
  fitKernelPreviewBackendIds,
  isFitKernelPreviewResultEnvelope,
  resolveFitKernelPreviewEngineStatus,
  stepFitKernelPreviewFrame,
  type FitKernelPreviewEngineStatus,
  type FitKernelPreviewFeatureSnapshot,
  type FitKernelPreviewFrameConfig,
  type FitKernelPreviewFrameRequest,
  type FitKernelPreviewFrameResult,
  type FitKernelPreviewFrameState,
  type FitKernelPreviewResultEnvelope,
  type FitKernelPreviewVector3,
} from "@freestyle/fit-kernel";

export const referenceClosetStagePreviewFrameSchemaVersion = fitKernelPreviewFrameSchemaVersion;

export const referenceClosetStagePreviewBackendIds = fitKernelPreviewBackendIds;

export type ReferenceClosetStagePreviewBackendId =
  (typeof referenceClosetStagePreviewBackendIds)[number];

export type ReferenceClosetStagePreviewFeatureSnapshot = FitKernelPreviewFeatureSnapshot;

export type ReferenceClosetStagePreviewVector3 = FitKernelPreviewVector3;

export type ReferenceClosetStagePreviewFrameState = FitKernelPreviewFrameState;

export type ReferenceClosetStagePreviewFrameConfig = FitKernelPreviewFrameConfig;

export type ReferenceClosetStagePreviewFrameRequest = FitKernelPreviewFrameRequest;

export type ReferenceClosetStagePreviewFrameResult = FitKernelPreviewFrameResult;

export type ReferenceClosetStagePreviewResultEnvelope = FitKernelPreviewResultEnvelope;
export type ReferenceClosetStagePreviewEngineStatus = FitKernelPreviewEngineStatus;

export const isReferenceClosetStagePreviewResultEnvelope = (
  value: unknown,
): value is ReferenceClosetStagePreviewResultEnvelope =>
  isFitKernelPreviewResultEnvelope(value);

export function detectReferenceClosetStagePreviewFeatures(
  env?: Parameters<typeof detectFitKernelPreviewFeatures>[0],
): ReferenceClosetStagePreviewFeatureSnapshot {
  return detectFitKernelPreviewFeatures(env);
}

export function resolveReferenceClosetStagePreviewBackend({
  qualityTier,
  hasContinuousMotion,
  featureSnapshot,
  experimentalWebGPU,
  experimentalXpbdPreview,
}: {
  qualityTier: QualityTier;
  hasContinuousMotion: boolean;
  featureSnapshot: ReferenceClosetStagePreviewFeatureSnapshot;
  experimentalWebGPU?: boolean;
  experimentalXpbdPreview?: boolean;
}): ReferenceClosetStagePreviewBackendId {
  if (!hasContinuousMotion || qualityTier === "low") {
    return "static-fit";
  }

  if (experimentalXpbdPreview && featureSnapshot.hasWorker) {
    return "cpu-xpbd";
  }

  if (experimentalWebGPU && qualityTier === "high" && featureSnapshot.hasWebGPU) {
    return "experimental-webgpu";
  }

  if (featureSnapshot.hasWorker) {
    return "worker-reduced";
  }

  return "cpu-reduced";
}

export function resolveReferenceClosetStagePreviewEngineStatus(input: {
  qualityTier: QualityTier;
  hasContinuousMotion: boolean;
  featureSnapshot: ReferenceClosetStagePreviewFeatureSnapshot;
  backend: ReferenceClosetStagePreviewBackendId;
  workerAvailable?: boolean;
  workerBootFailed?: boolean;
}): ReferenceClosetStagePreviewEngineStatus {
  return resolveFitKernelPreviewEngineStatus(input);
}

export function createReferenceClosetStagePreviewFrameState(): ReferenceClosetStagePreviewFrameState {
  return createFitKernelPreviewFrameState();
}

export function buildReferenceClosetStagePreviewFrameRequest(
  input: Omit<ReferenceClosetStagePreviewFrameRequest, "schemaVersion">,
): ReferenceClosetStagePreviewFrameRequest {
  return buildFitKernelPreviewFrameRequest(input);
}

export function stepReferenceClosetStagePreviewFrame(
  request: ReferenceClosetStagePreviewFrameRequest,
): ReferenceClosetStagePreviewFrameResult {
  return stepFitKernelPreviewFrame(request);
}
