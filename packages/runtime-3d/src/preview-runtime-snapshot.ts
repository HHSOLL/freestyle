"use client";

import {
  defaultFitKernelPreviewSolverKind,
  isFitKernelPreviewResultEnvelope,
  resolveFitKernelExecutionMode,
  type FitKernelExecutionMode,
  type FitKernelPreviewBackendId,
  type FitKernelPreviewFrameResult,
  type FitKernelPreviewResultEnvelope,
  type FitKernelPreviewSolverKind,
} from "@freestyle/fit-kernel";
import {
  previewRuntimeSnapshotSchema,
  previewRuntimeSnapshotSchemaVersion,
  viewerEventEnvelopeSchema,
  type PreviewRuntimeSnapshot,
  type ViewerEventEnvelope,
} from "@freestyle/viewer-protocol";

export type { PreviewRuntimeSnapshot } from "@freestyle/viewer-protocol";

type PreviewRuntimeSnapshotSeed = {
  sessionId: string;
  sequence: number;
  backend: FitKernelPreviewBackendId;
  executionMode?: FitKernelExecutionMode;
  solverKind?: FitKernelPreviewSolverKind;
  solveDurationMs?: number;
  angularEnergy?: number;
  positionalEnergy?: number;
  anchorEnergy?: number;
  shouldContinue?: boolean;
};

export function createPreviewRuntimeSnapshot(
  input: PreviewRuntimeSnapshotSeed,
): PreviewRuntimeSnapshot {
  const executionMode =
    input.executionMode ?? resolveFitKernelExecutionMode({ backend: input.backend });
  const shouldContinue = input.shouldContinue ?? false;

  return previewRuntimeSnapshotSchema.parse({
    schemaVersion: previewRuntimeSnapshotSchemaVersion,
    sessionId: input.sessionId,
    sequence: input.sequence,
    executionMode,
    backend: input.backend,
    solverKind:
      input.solverKind ??
      (executionMode === "static-fit"
        ? undefined
        : input.backend === "cpu-xpbd"
          ? "xpbd-cloth-preview"
          : defaultFitKernelPreviewSolverKind),
    solveDurationMs: input.solveDurationMs ?? 0,
    angularEnergy: input.angularEnergy ?? 0,
    positionalEnergy: input.positionalEnergy ?? 0,
    anchorEnergy: input.anchorEnergy ?? 0,
    shouldContinue,
    settled: !shouldContinue,
  });
}

export function buildPreviewRuntimeSnapshot(input: {
  payload: FitKernelPreviewFrameResult | FitKernelPreviewResultEnvelope;
  solveDurationMs?: number;
}): PreviewRuntimeSnapshot {
  if (isFitKernelPreviewResultEnvelope(input.payload)) {
    const { metrics, result } = input.payload;
    return createPreviewRuntimeSnapshot({
      sessionId: result.sessionId,
      sequence: result.sequence,
      backend: result.backend,
      executionMode: metrics.executionMode,
      solverKind: metrics.solverKind,
      solveDurationMs: metrics.solveDurationMs,
      angularEnergy: metrics.angularEnergy,
      positionalEnergy: metrics.positionalEnergy,
      anchorEnergy: metrics.anchorEnergy,
      shouldContinue: metrics.shouldContinue,
    });
  }

  const result = input.payload;
  return createPreviewRuntimeSnapshot({
    sessionId: result.sessionId,
    sequence: result.sequence,
    backend: result.backend,
    solveDurationMs: input.solveDurationMs ?? 0,
    angularEnergy: result.angularEnergy,
    positionalEnergy: result.positionalEnergy,
    anchorEnergy: result.anchorEnergy,
    shouldContinue: result.shouldContinue,
  });
}

export function buildPreviewRuntimeEventEnvelope(
  snapshot: PreviewRuntimeSnapshot,
): ViewerEventEnvelope {
  return viewerEventEnvelopeSchema.parse({
    type: "fit:preview-runtime-updated",
    payload: snapshot,
  });
}

export function hasPreviewRuntimeSnapshotChanged(
  previous: PreviewRuntimeSnapshot | null,
  next: PreviewRuntimeSnapshot,
) {
  if (!previous) {
    return true;
  }

  return (
    previous.sessionId !== next.sessionId ||
    previous.sequence !== next.sequence ||
    previous.executionMode !== next.executionMode ||
    previous.backend !== next.backend ||
    previous.solverKind !== next.solverKind ||
    previous.solveDurationMs !== next.solveDurationMs ||
    previous.angularEnergy !== next.angularEnergy ||
    previous.positionalEnergy !== next.positionalEnergy ||
    previous.anchorEnergy !== next.anchorEnergy ||
    previous.shouldContinue !== next.shouldContinue ||
    previous.settled !== next.settled
  );
}

export function applyPreviewRuntimeSnapshotDataAttributes(
  element: HTMLElement | null,
  snapshot: PreviewRuntimeSnapshot | null,
) {
  if (!element) {
    return;
  }

  element.dataset.previewRuntimeExecutionMode = snapshot?.executionMode ?? "";
  element.dataset.previewRuntimeBackend = snapshot?.backend ?? "";
  element.dataset.previewRuntimeSolverKind = snapshot?.solverKind ?? "";
  element.dataset.previewRuntimeSessionId = snapshot?.sessionId ?? "";
  element.dataset.previewRuntimeSequence = snapshot ? String(snapshot.sequence) : "";
  element.dataset.previewRuntimeSolveDurationMs = snapshot
    ? snapshot.solveDurationMs.toFixed(3)
    : "";
  element.dataset.previewRuntimeSettled = snapshot ? String(snapshot.settled) : "";
}
