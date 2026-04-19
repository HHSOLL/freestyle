import assert from "node:assert/strict";
import test from "node:test";
import { buildJobPayloadEnvelope, JOB_TYPES, type JobRecord } from "@freestyle/shared";
import { parseEvaluatorJobPayload } from "./worker.js";

const baseJob = (payload: Record<string, unknown>): JobRecord => ({
  id: "00000000-0000-4000-8000-000000000030",
  user_id: "00000000-0000-4000-8000-000000000031",
  job_type: JOB_TYPES.EVALUATOR_OUTFIT,
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
  idempotency_key: "eval-123",
  created_at: "2026-04-19T10:00:00.000Z",
  updated_at: "2026-04-19T10:00:00.000Z",
  completed_at: null,
});

test("parseEvaluatorJobPayload preserves canonical evaluator envelopes", () => {
  const parsed = parseEvaluatorJobPayload(
    baseJob(
      buildJobPayloadEnvelope(
        JOB_TYPES.EVALUATOR_OUTFIT,
        {
          evaluation_id: "00000000-0000-4000-8000-000000000032",
          request_payload: {
            imageDataUrl: "data:image/png;base64,abcd",
          },
        },
        {
          traceId: "00000000-0000-4000-8000-000000000033",
          idempotencyKey: "eval-123",
        },
      ),
    ),
  );

  assert.equal(parsed.trace_id, "00000000-0000-4000-8000-000000000033");
  assert.equal(parsed.data.evaluation_id, "00000000-0000-4000-8000-000000000032");
});

test("parseEvaluatorJobPayload upgrades legacy evaluator payloads", () => {
  const parsed = parseEvaluatorJobPayload(
    baseJob({
      evaluation_id: "00000000-0000-4000-8000-000000000032",
      request_payload: {
        imageDataUrl: "data:image/png;base64,abcd",
      },
    }),
  );

  assert.equal(parsed.trace_id, "00000000-0000-4000-8000-000000000030");
  assert.equal(parsed.data.request_payload.imageDataUrl, "data:image/png;base64,abcd");
});
