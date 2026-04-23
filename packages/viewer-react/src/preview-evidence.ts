import {
  detectFitKernelPreviewFeatures,
  type FitKernelPreviewFallbackReason,
} from "@freestyle/fit-kernel";
import {
  previewEngineStatusSchema,
  previewEngineStatusSchemaVersion,
  previewRuntimeSnapshotSchema,
  previewRuntimeSnapshotSchemaVersion,
  viewerEventEnvelopeSchema,
  type PreviewEngineStatus,
  type PreviewRuntimeSnapshot,
  type ViewerEventEnvelope,
} from "@freestyle/viewer-protocol";

export const createViewerReactPreviewEngineStatus = (input?: {
  fallbackReason?: FitKernelPreviewFallbackReason;
}): PreviewEngineStatus =>
  previewEngineStatusSchema.parse({
    schemaVersion: previewEngineStatusSchemaVersion,
    engineKind: "static-fit-compat",
    executionMode: "static-fit",
    backend: "static-fit",
    transport: "main-thread",
    status: "fallback",
    fallbackReason: input?.fallbackReason ?? "no-continuous-motion",
    featureSnapshot: detectFitKernelPreviewFeatures(),
  });

export const buildViewerReactPreviewEngineEnvelope = (
  status: PreviewEngineStatus,
): ViewerEventEnvelope =>
  viewerEventEnvelopeSchema.parse({
    type: "fit:preview-engine-status",
    payload: status,
  });

export const createViewerReactPreviewRuntimeSnapshot = (input: {
  sessionId: string;
  sequence: number;
  solveDurationMs?: number;
}): PreviewRuntimeSnapshot =>
  previewRuntimeSnapshotSchema.parse({
    schemaVersion: previewRuntimeSnapshotSchemaVersion,
    sessionId: input.sessionId,
    sequence: input.sequence,
    executionMode: "static-fit",
    backend: "static-fit",
    solveDurationMs: input.solveDurationMs ?? 0,
    angularEnergy: 0,
    positionalEnergy: 0,
    anchorEnergy: 0,
    shouldContinue: false,
    settled: true,
  });

export const buildViewerReactPreviewRuntimeEnvelope = (
  snapshot: PreviewRuntimeSnapshot,
): ViewerEventEnvelope =>
  viewerEventEnvelopeSchema.parse({
    type: "fit:preview-runtime-updated",
    payload: snapshot,
  });
