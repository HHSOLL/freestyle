import assert from "node:assert/strict";
import test from "node:test";
import { buildJobPayloadEnvelope, JOB_TYPES, type JobRecord } from "@freestyle/shared";
import { getEvaluationIdFromJob } from "./evaluations.service.js";

const baseJob = (payload: Record<string, unknown>): JobRecord => ({
  id: "00000000-0000-4000-8000-000000000050",
  user_id: "00000000-0000-4000-8000-000000000051",
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

test("getEvaluationIdFromJob reads canonical evaluator envelopes", () => {
  const job = baseJob(
    buildJobPayloadEnvelope(
      JOB_TYPES.EVALUATOR_OUTFIT,
      {
        evaluation_id: "00000000-0000-4000-8000-000000000052",
        request_payload: {},
      },
      {
        traceId: "00000000-0000-4000-8000-000000000053",
        idempotencyKey: "eval-123",
      },
    ),
  );

  assert.equal(getEvaluationIdFromJob(job), "00000000-0000-4000-8000-000000000052");
});

test("getEvaluationIdFromJob upgrades legacy evaluator payloads", () => {
  const job = baseJob({
    evaluation_id: "00000000-0000-4000-8000-000000000052",
    request_payload: {},
  });

  assert.equal(getEvaluationIdFromJob(job), "00000000-0000-4000-8000-000000000052");
});
