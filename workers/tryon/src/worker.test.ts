import assert from "node:assert/strict";
import test from "node:test";
import { buildJobPayloadEnvelope, JOB_TYPES, type JobRecord } from "@freestyle/shared";
import { parseTryonJobPayload } from "./worker.js";

const baseJob = (payload: Record<string, unknown>): JobRecord => ({
  id: "00000000-0000-4000-8000-000000000040",
  user_id: "00000000-0000-4000-8000-000000000041",
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

test("parseTryonJobPayload preserves canonical try-on envelopes", () => {
  const parsed = parseTryonJobPayload(
    baseJob(
      buildJobPayloadEnvelope(
        JOB_TYPES.TRYON_GENERATE,
        {
          tryon_id: "00000000-0000-4000-8000-000000000042",
          asset_id: "00000000-0000-4000-8000-000000000043",
          input_image_url: "https://example.com/person.jpg",
        },
        {
          traceId: "00000000-0000-4000-8000-000000000044",
          idempotencyKey: "tryon-123",
        },
      ),
    ),
  );

  assert.equal(parsed.trace_id, "00000000-0000-4000-8000-000000000044");
  assert.equal(parsed.data.tryon_id, "00000000-0000-4000-8000-000000000042");
  assert.equal(parsed.data.asset_id, "00000000-0000-4000-8000-000000000043");
});

test("parseTryonJobPayload upgrades legacy try-on payloads", () => {
  const parsed = parseTryonJobPayload(
    baseJob({
      tryon_id: "00000000-0000-4000-8000-000000000042",
      asset_id: "00000000-0000-4000-8000-000000000043",
      input_image_url: "data:image/png;base64,abcd",
    }),
  );

  assert.equal(parsed.trace_id, "00000000-0000-4000-8000-000000000040");
  assert.equal(parsed.data.input_image_url, "data:image/png;base64,abcd");
});
