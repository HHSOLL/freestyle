import type {
  FitPreviewReadyEvent,
  ViewerEventEnvelope,
  ViewerScene,
  ViewerTelemetryEvent,
} from "@freestyle/viewer-protocol";
import {
  fitPreviewReadyEventSchema,
  viewerEventEnvelopeSchema,
  viewerTelemetryEventSchema,
} from "@freestyle/viewer-protocol";

export type ViewerRouteSceneKind = "initial-avatar" | "garment-swap" | "scene-refresh";

export type ViewerRouteTelemetrySnapshot = {
  firstAvatarPaintMs: number | null;
  lastGarmentSwapMs: number | null;
  lastPreviewSource: FitPreviewReadyEvent["source"] | null;
  lastTelemetryName: string | null;
  sceneSequence: number;
  activeSceneKind: ViewerRouteSceneKind | null;
};

type PendingSceneMeasurement = {
  startedAt: number;
  kind: ViewerRouteSceneKind;
  garmentKey: string;
};

const initialViewerRouteTelemetrySnapshot: ViewerRouteTelemetrySnapshot = {
  firstAvatarPaintMs: null,
  lastGarmentSwapMs: null,
  lastPreviewSource: null,
  lastTelemetryName: null,
  sceneSequence: 0,
  activeSceneKind: null,
};

const buildGarmentSceneKey = (scene: ViewerScene) =>
  JSON.stringify({
    selectedItemId: scene.selectedItemId ?? null,
    garments: scene.garments.map((item) => ({
      garmentId: item.garmentId,
      size: item.size ?? null,
    })),
  });

const buildHostMetric = (
  name: string,
  value: number,
  source: FitPreviewReadyEvent["source"],
): ViewerTelemetryEvent =>
  viewerTelemetryEventSchema.parse({
    name,
    value,
    tags: {
      source,
    },
  });

export const createViewerRouteTelemetryTracker = (now: () => number = () => performance.now()) => {
  let snapshot: ViewerRouteTelemetrySnapshot = { ...initialViewerRouteTelemetrySnapshot };
  let previousGarmentKey: string | null = null;
  let pendingScene: PendingSceneMeasurement | null = null;
  let capturedInitialAvatarPaint = false;

  const getSnapshot = () => ({ ...snapshot });

  return {
    getSnapshot,
    startScene(scene: ViewerScene) {
      const garmentKey = buildGarmentSceneKey(scene);
      const kind: ViewerRouteSceneKind =
        previousGarmentKey === null
          ? "initial-avatar"
          : previousGarmentKey !== garmentKey
            ? "garment-swap"
            : "scene-refresh";

      pendingScene = {
        startedAt: now(),
        kind,
        garmentKey,
      };
      snapshot = {
        ...snapshot,
        sceneSequence: snapshot.sceneSequence + 1,
        activeSceneKind: kind,
      };
      return getSnapshot();
    },
    recordMetric(event: ViewerTelemetryEvent) {
      const parsed = viewerTelemetryEventSchema.parse(event);
      snapshot = {
        ...snapshot,
        lastTelemetryName: parsed.name,
      };
      return {
        event: parsed,
        snapshot: getSnapshot(),
      };
    },
    recordEventEnvelope(envelope: ViewerEventEnvelope) {
      const parsed = viewerEventEnvelopeSchema.parse(envelope);
      return parsed;
    },
    recordPreviewReady(event: FitPreviewReadyEvent) {
      const payload = fitPreviewReadyEventSchema.parse(event);
      const parsed = viewerEventEnvelopeSchema.parse({
        type: "fit:preview-ready",
        payload,
      });
      const emitted: ViewerTelemetryEvent[] = [];

      if (pendingScene) {
        const elapsedMs = Math.max(0, Math.round(now() - pendingScene.startedAt));

        if (!capturedInitialAvatarPaint && pendingScene.kind === "initial-avatar") {
          capturedInitialAvatarPaint = true;
          snapshot = {
            ...snapshot,
            firstAvatarPaintMs: elapsedMs,
          };
          emitted.push(buildHostMetric("viewer.host.first-avatar-paint", elapsedMs, payload.source));
        }

        if (pendingScene.kind === "garment-swap") {
          snapshot = {
            ...snapshot,
            lastGarmentSwapMs: elapsedMs,
          };
          emitted.push(buildHostMetric("viewer.host.garment-swap.preview-latency", elapsedMs, payload.source));
        }

        previousGarmentKey = pendingScene.garmentKey;
        pendingScene = null;
      }

      snapshot = {
        ...snapshot,
        lastPreviewSource: payload.source,
        activeSceneKind: null,
      };

      return {
        envelope: parsed,
        emitted,
        snapshot: getSnapshot(),
      };
    },
  };
};

export { initialViewerRouteTelemetrySnapshot };
