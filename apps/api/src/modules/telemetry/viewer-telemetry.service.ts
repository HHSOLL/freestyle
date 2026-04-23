import { randomUUID } from "node:crypto";
import {
  viewerTelemetryEnvelopeSchema,
  type ViewerTelemetryEvent,
  type ViewerTelemetryRecommendedAction,
  type ViewerTelemetryResponse,
} from "@freestyle/contracts";

type TelemetryAccumulator = {
  badFitReportsByGarment: Map<string, number>;
  fitFallbacksByGarment: Map<string, number>;
  contextLossByDeviceTier: Map<string, number>;
  hqCacheMissBySolver: Map<string, number>;
  materialFailuresByClass: Map<string, number>;
};

const createAccumulator = (): TelemetryAccumulator => ({
  badFitReportsByGarment: new Map(),
  fitFallbacksByGarment: new Map(),
  contextLossByDeviceTier: new Map(),
  hqCacheMissBySolver: new Map(),
  materialFailuresByClass: new Map(),
});

const accumulator = createAccumulator();

const increment = (target: Map<string, number>, key: string) => {
  target.set(key, (target.get(key) ?? 0) + 1);
  return target.get(key) ?? 0;
};

const buildRecommendedActions = (event: ViewerTelemetryEvent): ViewerTelemetryRecommendedAction[] => {
  const actions: ViewerTelemetryRecommendedAction[] = [];

  if (event.metric_name === "viewer.bad-fit-report" && event.garment_id) {
    const count = increment(accumulator.badFitReportsByGarment, event.garment_id);
    if (count >= 3) {
      actions.push({
        action: "reopen-fit-certification",
        severity: "critical",
        subject_type: "garment",
        subject_id: event.garment_id,
        reason: "Bad fit reports crossed the production telemetry stop gate.",
      });
    }
  }

  if (event.metric_name === "viewer.fit.fallback" && event.garment_id) {
    const count = increment(accumulator.fitFallbacksByGarment, event.garment_id);
    if (count >= 5) {
      actions.push({
        action: "pause-garment-serving",
        severity: "critical",
        subject_type: "garment",
        subject_id: event.garment_id,
        reason: "Fit fallback volume crossed the garment serving stop gate.",
      });
    }
  }

  if (event.metric_name === "viewer.webgl.context-loss") {
    const deviceTier = event.device_tier ?? "unknown";
    const count = increment(accumulator.contextLossByDeviceTier, deviceTier);
    if (count >= 3) {
      actions.push({
        action: "lower-device-quality-policy",
        severity: "critical",
        subject_type: "device-tier",
        subject_id: deviceTier,
        reason: "WebGL context loss crossed the device-tier stop gate.",
      });
    }
  }

  if (event.metric_name === "viewer.hq.cache-hit" && event.value === 0) {
    const solverVersion = event.solver_version ?? "unknown";
    const count = increment(accumulator.hqCacheMissBySolver, solverVersion);
    if (count >= 5) {
      actions.push({
        action: "review-hq-cache-policy",
        severity: "warning",
        subject_type: "solver",
        subject_id: solverVersion,
        reason: "HQ cache miss volume crossed the review threshold.",
      });
    }
  }

  if (
    (event.metric_name === "viewer.asset.load-failure" ||
      event.metric_name === "viewer.ktx2.transcode-failure") &&
    event.material_class
  ) {
    const count = increment(accumulator.materialFailuresByClass, event.material_class);
    if (count >= 3) {
      actions.push({
        action: "review-material-delivery",
        severity: "critical",
        subject_type: "material-class",
        subject_id: event.material_class,
        reason: "Material delivery failures crossed the production telemetry stop gate.",
      });
    }
  }

  return actions;
};

export const recordViewerTelemetryEnvelope = (input: unknown): ViewerTelemetryResponse => {
  const parsed = viewerTelemetryEnvelopeSchema.parse(input);
  const recommendedActions = parsed.events.flatMap(buildRecommendedActions);

  return {
    status: "accepted",
    received_count: parsed.events.length,
    accepted_count: parsed.events.length,
    rejected_count: 0,
    recommended_actions: recommendedActions,
  };
};

export const buildViewerTelemetryEvent = (
  input: Omit<ViewerTelemetryEvent, "event_id" | "occurred_at"> & Partial<Pick<ViewerTelemetryEvent, "event_id" | "occurred_at">>,
): ViewerTelemetryEvent => ({
  ...input,
  event_id: input.event_id ?? randomUUID(),
  occurred_at: input.occurred_at ?? new Date().toISOString(),
  garment_ids: input.garment_ids ?? [],
  device_tier: input.device_tier ?? "unknown",
  viewer_host: input.viewer_host ?? "unknown",
  tags: input.tags ?? {},
});
