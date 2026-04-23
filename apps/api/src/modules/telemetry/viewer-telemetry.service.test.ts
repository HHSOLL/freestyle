import assert from "node:assert/strict";
import test from "node:test";
import { recordViewerTelemetryEnvelope } from "./viewer-telemetry.service.js";

test("viewer telemetry accepts route latency events without recommending actions", () => {
  const response = recordViewerTelemetryEnvelope({
    events: [
      {
        event_id: "viewer-telemetry-latency-001",
        metric_name: "viewer.host.first-avatar-paint",
        value: 840,
        unit: "ms",
        occurred_at: "2026-04-24T10:00:00.000Z",
        route: "/app/closet",
        device_tier: "C",
        quality_tier: "balanced",
        viewer_host: "viewer-react",
        tags: {
          source: "static-fit",
        },
      },
    ],
  });

  assert.equal(response.status, "accepted");
  assert.equal(response.accepted_count, 1);
  assert.equal(response.recommended_actions.length, 0);
});

test("viewer telemetry recommends fit certification review after repeated bad fit reports", () => {
  const garmentId = "starter-top-soft-casual";
  let lastResponse = recordViewerTelemetryEnvelope({
    events: [
      {
        event_id: "viewer-telemetry-bad-fit-001",
        metric_name: "viewer.bad-fit-report",
        value: 1,
        unit: "count",
        occurred_at: "2026-04-24T10:01:00.000Z",
        garment_id: garmentId,
        garment_ids: [garmentId],
        viewer_host: "viewer-react",
      },
    ],
  });
  assert.equal(lastResponse.recommended_actions.length, 0);

  lastResponse = recordViewerTelemetryEnvelope({
    events: [
      {
        event_id: "viewer-telemetry-bad-fit-002",
        metric_name: "viewer.bad-fit-report",
        value: 1,
        unit: "count",
        occurred_at: "2026-04-24T10:02:00.000Z",
        garment_id: garmentId,
        garment_ids: [garmentId],
        viewer_host: "viewer-react",
      },
      {
        event_id: "viewer-telemetry-bad-fit-003",
        metric_name: "viewer.bad-fit-report",
        value: 1,
        unit: "count",
        occurred_at: "2026-04-24T10:03:00.000Z",
        garment_id: garmentId,
        garment_ids: [garmentId],
        viewer_host: "viewer-react",
      },
    ],
  });

  assert.equal(lastResponse.recommended_actions[0]?.action, "reopen-fit-certification");
  assert.equal(lastResponse.recommended_actions[0]?.subject_id, garmentId);
});

test("viewer telemetry rejects unknown metrics", () => {
  assert.throws(
    () =>
      recordViewerTelemetryEnvelope({
        events: [
          {
            event_id: "viewer-telemetry-invalid-001",
            metric_name: "viewer.unknown.metric",
            occurred_at: "2026-04-24T10:00:00.000Z",
          },
        ],
      }),
    /Invalid option/,
  );
});
