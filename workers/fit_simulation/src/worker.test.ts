import assert from "node:assert/strict";
import test from "node:test";
import { buildJobPayloadEnvelope, JOB_TYPES, type JobRecord } from "@freestyle/shared";
import { parseFitSimulationJobPayload } from "./worker.js";

const baseJob = (payload: Record<string, unknown>): JobRecord => ({
  id: "00000000-0000-4000-8000-000000000081",
  user_id: "00000000-0000-4000-8000-000000000082",
  job_type: JOB_TYPES.FIT_SIMULATE_HQ,
  status: "queued",
  priority: 100,
  payload,
  result: null,
  error_code: null,
  error_message: null,
  attempt: 0,
  max_attempts: 5,
  run_after: "2026-04-20T10:00:00.000Z",
  locked_by: null,
  locked_at: null,
  heartbeat_at: null,
  parent_job_id: null,
  idempotency_key: "fit-sim-123",
  created_at: "2026-04-20T10:00:00.000Z",
  updated_at: "2026-04-20T10:00:00.000Z",
  completed_at: null,
});

test("parseFitSimulationJobPayload preserves canonical fit-simulation envelopes", () => {
  const parsed = parseFitSimulationJobPayload(
    baseJob(
      buildJobPayloadEnvelope(
        JOB_TYPES.FIT_SIMULATE_HQ,
        {
          fit_simulation_id: "00000000-0000-4000-8000-000000000083",
          bodyVersionId: "body-profile:user-1:2026-04-20T10:00:00.000Z",
          garmentVariantId: "starter-top-soft-casual",
          avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
          garmentManifestUrl: "https://freestyle.local/assets/garments/starter/top-soft-casual.glb",
          materialPreset: "knit_medium",
          qualityTier: "fast",
        },
        {
          traceId: "00000000-0000-4000-8000-000000000084",
          idempotencyKey: "fit-sim-123",
        },
      ),
    ),
  );

  assert.equal(parsed.trace_id, "00000000-0000-4000-8000-000000000084");
  assert.equal(parsed.data.fit_simulation_id, "00000000-0000-4000-8000-000000000083");
  assert.equal(parsed.data.garmentVariantId, "starter-top-soft-casual");
});

test("parseFitSimulationJobPayload upgrades legacy fit-simulation payloads", () => {
  const parsed = parseFitSimulationJobPayload(
    baseJob({
      fit_simulation_id: "00000000-0000-4000-8000-000000000083",
      bodyVersionId: "body-profile:user-1:2026-04-20T10:00:00.000Z",
      garmentVariantId: "starter-top-soft-casual",
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/starter/top-soft-casual.glb",
      materialPreset: "knit_medium",
      qualityTier: "balanced",
    }),
  );

  assert.equal(parsed.trace_id, "00000000-0000-4000-8000-000000000081");
  assert.equal(parsed.data.qualityTier, "balanced");
});

