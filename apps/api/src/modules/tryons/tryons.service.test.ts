import assert from "node:assert/strict";
import test from "node:test";
import { buildJobPayloadEnvelope, JOB_TYPES, type JobRecord } from "@freestyle/shared";
import { getTryonIdFromJob } from "./tryons.service.js";

const baseJob = (payload: Record<string, unknown>): JobRecord => ({
  id: "00000000-0000-4000-8000-000000000060",
  user_id: "00000000-0000-4000-8000-000000000061",
  job_type: JOB_TYPES.TRYON_GENERATE,
  status: "queued",
  priority: 100,
  payload,
  result: null,
  error_code: null,
  error_message: null,
  attempt: 0,
  max_attempts: 5,
  run_after: "2026-04-19T10:00:00.000Z",
  locked_by: null,
  locked_at: null,
  heartbeat_at: null,
  parent_job_id: null,
  idempotency_key: "tryon-123",
  created_at: "2026-04-19T10:00:00.000Z",
  updated_at: "2026-04-19T10:00:00.000Z",
  completed_at: null,
});

test("getTryonIdFromJob reads canonical try-on envelopes", () => {
  const job = baseJob(
    buildJobPayloadEnvelope(
      JOB_TYPES.TRYON_GENERATE,
      {
        tryon_id: "00000000-0000-4000-8000-000000000062",
        asset_id: "00000000-0000-4000-8000-000000000063",
        input_image_url: "https://example.com/person.jpg",
      },
      {
        traceId: "00000000-0000-4000-8000-000000000064",
        idempotencyKey: "tryon-123",
      },
    ),
  );

  assert.equal(getTryonIdFromJob(job), "00000000-0000-4000-8000-000000000062");
});

test("getTryonIdFromJob upgrades legacy try-on payloads", () => {
  const job = baseJob({
    tryon_id: "00000000-0000-4000-8000-000000000062",
    asset_id: "00000000-0000-4000-8000-000000000063",
    input_image_url: "data:image/png;base64,abcd",
  });

  assert.equal(getTryonIdFromJob(job), "00000000-0000-4000-8000-000000000062");
});
