"use client";

import type { FitKernelPreviewEngineStatus } from "@freestyle/fit-kernel";
import {
  previewEngineStatusSchema,
  previewEngineStatusSchemaVersion,
  viewerEventEnvelopeSchema,
  type PreviewEngineStatus,
  type PreviewRuntimeSnapshot,
  type ViewerEventEnvelope,
} from "@freestyle/viewer-protocol";

export type { PreviewEngineStatus } from "@freestyle/viewer-protocol";

export function createPreviewEngineStatus(
  input: FitKernelPreviewEngineStatus,
): PreviewEngineStatus {
  return previewEngineStatusSchema.parse({
    schemaVersion: previewEngineStatusSchemaVersion,
    ...input,
  });
}

export function buildPreviewEngineStatusEventEnvelope(
  status: PreviewEngineStatus,
): ViewerEventEnvelope {
  return viewerEventEnvelopeSchema.parse({
    type: "fit:preview-engine-status",
    payload: status,
  });
}

export function hasPreviewEngineStatusChanged(
  previous: PreviewEngineStatus | null,
  next: PreviewEngineStatus,
) {
  if (!previous) {
    return true;
  }

  return (
    previous.engineKind !== next.engineKind ||
    previous.executionMode !== next.executionMode ||
    previous.backend !== next.backend ||
    previous.transport !== next.transport ||
    previous.status !== next.status ||
    previous.fallbackReason !== next.fallbackReason ||
    previous.featureSnapshot.hasWorker !== next.featureSnapshot.hasWorker ||
    previous.featureSnapshot.hasOffscreenCanvas !==
      next.featureSnapshot.hasOffscreenCanvas ||
    previous.featureSnapshot.hasWebGPU !== next.featureSnapshot.hasWebGPU ||
    previous.featureSnapshot.crossOriginIsolated !==
      next.featureSnapshot.crossOriginIsolated
  );
}

export function resolveObservedPreviewEngineFallbackStatus(input: {
  requested: PreviewEngineStatus;
  runtime: PreviewRuntimeSnapshot;
}): PreviewEngineStatus | null {
  if (
    input.requested.backend !== "wasm-preview" ||
    input.runtime.executionMode !== "cpu-xpbd-preview"
  ) {
    return null;
  }

  return previewEngineStatusSchema.parse({
    schemaVersion: previewEngineStatusSchemaVersion,
    engineKind: "cpu-xpbd-preview",
    executionMode: "cpu-xpbd-preview",
    backend: "cpu-xpbd",
    transport: "worker-message",
    status: "fallback",
    fallbackReason: "wasm-preview-runtime-fallback",
    featureSnapshot: input.requested.featureSnapshot,
  });
}

export function applyPreviewEngineStatusDataAttributes(
  element: HTMLElement | null,
  status: PreviewEngineStatus | null,
) {
  if (!element) {
    return;
  }

  element.dataset.previewEngineKind = status?.engineKind ?? "";
  element.dataset.previewEngineExecutionMode = status?.executionMode ?? "";
  element.dataset.previewEngineBackend = status?.backend ?? "";
  element.dataset.previewEngineTransport = status?.transport ?? "";
  element.dataset.previewEngineStatus = status?.status ?? "";
  element.dataset.previewEngineFallbackReason = status?.fallbackReason ?? "";
  element.dataset.previewEngineHasWorker = status
    ? String(status.featureSnapshot.hasWorker)
    : "";
  element.dataset.previewEngineHasWebgpu = status
    ? String(status.featureSnapshot.hasWebGPU)
    : "";
  element.dataset.previewEngineCrossOriginIsolated = status
    ? String(status.featureSnapshot.crossOriginIsolated)
    : "";
}
