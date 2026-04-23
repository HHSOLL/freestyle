"use client";

import {
  viewerTelemetryEnvelopeSchema,
  viewerTelemetryMetricNames,
  type ViewerTelemetryEnvelope,
} from "@freestyle/contracts";
import { apiFetch, isClientApiConfigured } from "./clientApi.js";
import type { ClosetViewerPhase9Snapshot } from "./closet-viewer-phase9.js";

type ViewerTelemetryDetail = {
  name?: unknown;
  value?: unknown;
  tags?: unknown;
};

type ViewerTelemetryForwarderContext = ClosetViewerPhase9Snapshot & {
  avatarId: string;
  garmentIds: string[];
  qualityTier: "low" | "balanced" | "high";
};

const viewerTelemetryMetricNameSet = new Set<string>(viewerTelemetryMetricNames);
const VIEWER_TELEMETRY_SESSION_KEY = "freestyle:viewer-telemetry-session-id";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const sanitizeTags = (value: unknown) => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => typeof entry === "string")
      .map(([key, entry]) => [key, entry as string]),
  );
};

const getSessionId = () => {
  try {
    const storage = globalThis.sessionStorage;
    const existing = storage.getItem(VIEWER_TELEMETRY_SESSION_KEY)?.trim();
    if (existing) {
      return existing;
    }
    const next = globalThis.crypto?.randomUUID?.() ?? `viewer-session-${Date.now()}`;
    storage.setItem(VIEWER_TELEMETRY_SESSION_KEY, next);
    return next;
  } catch {
    return undefined;
  }
};

export const buildViewerTelemetryEnvelope = (
  detail: unknown,
  context: ViewerTelemetryForwarderContext,
): ViewerTelemetryEnvelope | null => {
  if (!isRecord(detail)) {
    return null;
  }

  const typedDetail = detail as ViewerTelemetryDetail;
  if (typeof typedDetail.name !== "string" || !viewerTelemetryMetricNameSet.has(typedDetail.name)) {
    return null;
  }

  const tags = {
    ...sanitizeTags(typedDetail.tags),
    phase9Enabled: String(context.phase9Enabled),
    phase9KillSwitch: String(context.killSwitch),
    phase9Source: context.source,
    viewerHost: context.host,
  };
  const value = typeof typedDetail.value === "number" && Number.isFinite(typedDetail.value)
    ? typedDetail.value
    : undefined;

  return viewerTelemetryEnvelopeSchema.parse({
    events: [
      {
        event_id: globalThis.crypto?.randomUUID?.() ?? `viewer-event-${Date.now()}`,
        metric_name: typedDetail.name,
        value,
        unit: typedDetail.name.includes("latency") || typedDetail.name.includes("paint") ? "ms" : undefined,
        occurred_at: new Date().toISOString(),
        route: globalThis.location?.pathname ?? "/",
        session_id: getSessionId(),
        avatar_id: context.avatarId,
        garment_id: context.garmentIds[0],
        garment_ids: context.garmentIds,
        quality_tier: context.qualityTier,
        viewer_host: context.host,
        tags,
      },
    ],
  });
};

export const startViewerTelemetryForwarder = (context: ViewerTelemetryForwarderContext) => {
  if (typeof window === "undefined" || !isClientApiConfigured) {
    return () => undefined;
  }

  const handleViewerTelemetry = (event: Event) => {
    const envelope = buildViewerTelemetryEnvelope((event as CustomEvent<unknown>).detail, context);
    if (!envelope) {
      return;
    }

    void apiFetch("/v1/telemetry/viewer", {
      method: "POST",
      keepalive: true,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(envelope),
    }).catch(() => undefined);
  };

  window.addEventListener("freestyle:viewer-telemetry", handleViewerTelemetry);
  return () => window.removeEventListener("freestyle:viewer-telemetry", handleViewerTelemetry);
};
