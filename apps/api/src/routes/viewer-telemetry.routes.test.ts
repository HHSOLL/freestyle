import assert from "node:assert/strict";
import test from "node:test";
import { viewerTelemetryResponseSchema } from "@freestyle/contracts";
import { buildServer } from "../main.js";

test("viewer telemetry route accepts product viewer metrics", async () => {
  const app = buildServer();

  const response = await app.inject({
    method: "POST",
    url: "/v1/telemetry/viewer",
    payload: {
      events: [
        {
          event_id: "viewer-telemetry-route-001",
          metric_name: "viewer.host.garment-swap.preview-latency",
          value: 96,
          unit: "ms",
          occurred_at: "2026-04-24T10:00:00.000Z",
          route: "/app/closet",
          garment_id: "starter-top-soft-casual",
          garment_ids: ["starter-top-soft-casual"],
          device_tier: "C",
          quality_tier: "balanced",
          viewer_host: "viewer-react",
          tags: {
            source: "cache",
            phase9Source: "phase9-release-flag",
          },
        },
      ],
    },
  });

  assert.equal(response.statusCode, 202);
  assert.equal(response.headers["x-freestyle-surface"], "product");
  const payload = viewerTelemetryResponseSchema.parse(response.json());
  assert.equal(payload.accepted_count, 1);
  assert.equal(payload.recommended_actions.length, 0);

  await app.close();
});

test("viewer telemetry route fails closed on unknown metrics", async () => {
  const app = buildServer();

  const response = await app.inject({
    method: "POST",
    url: "/v1/telemetry/viewer",
    payload: {
      events: [
        {
          event_id: "viewer-telemetry-route-invalid-001",
          metric_name: "viewer.unknown.metric",
          occurred_at: "2026-04-24T10:00:00.000Z",
        },
      ],
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.headers["x-freestyle-surface"], "product");

  await app.close();
});
