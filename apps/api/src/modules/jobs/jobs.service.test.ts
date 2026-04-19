import assert from "node:assert/strict";
import test from "node:test";
import { buildJobPayloadEnvelope, JOB_TYPES, type JobRecord } from "@freestyle/shared";
import { buildUserJobResponse } from "./jobs.service.js";

const baseJob = (overrides: Partial<JobRecord> = {}): JobRecord => ({
  id: "00000000-0000-4000-8000-000000000020",
  user_id: "00000000-0000-4000-8000-000000000021",
  job_type: JOB_TYPES.IMPORT_UPLOAD_IMAGE,
  status: "queued",
  priority: 100,
  payload: buildJobPayloadEnvelope(
    JOB_TYPES.IMPORT_UPLOAD_IMAGE,
    {
      product_id: "00000000-0000-4000-8000-000000000022",
      image_url: "https://cdn.example.com/source.png",
    },
    {
      traceId: "00000000-0000-4000-8000-000000000023",
      idempotencyKey: "upload-123",
    },
  ),
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
  idempotency_key: "upload-123",
  created_at: "2026-04-19T10:00:00.000Z",
  updated_at: "2026-04-19T10:00:00.000Z",
  completed_at: null,
  ...overrides,
});

test("buildUserJobResponse exposes canonical trace and wraps legacy job results", () => {
  const response = buildUserJobResponse(
    baseJob({
      status: "processing",
      result: {
        asset_id: "00000000-0000-4000-8000-000000000024",
        progress: 35,
        warnings: ["waiting-on-cutout"],
      },
    }),
  );

  assert.equal(response.trace_id, "00000000-0000-4000-8000-000000000023");
  assert.equal(response.progress, 35);
  assert.equal(response.result?.schema_version, "job-result.v1");
  assert.equal(response.result?.data.asset_id, "00000000-0000-4000-8000-000000000024");
  assert.deepEqual(response.result?.warnings, ["waiting-on-cutout"]);
});

test("buildUserJobResponse preserves errors and null results", () => {
  const response = buildUserJobResponse(
    baseJob({
      status: "failed",
      error_code: "CUTOUT_NOT_AVAILABLE",
      error_message: "Background removal is unavailable for this asset.",
      completed_at: "2026-04-19T10:02:00.000Z",
    }),
  );

  assert.equal(response.trace_id, "00000000-0000-4000-8000-000000000023");
  assert.equal(response.result, null);
  assert.deepEqual(response.error, {
    code: "CUTOUT_NOT_AVAILABLE",
    message: "Background removal is unavailable for this asset.",
  });
});

test("buildUserJobResponse preserves evaluator explanation fields inside canonical job results", () => {
  const response = buildUserJobResponse(
    baseJob({
      job_type: JOB_TYPES.EVALUATOR_OUTFIT,
      payload: buildJobPayloadEnvelope(
        JOB_TYPES.EVALUATOR_OUTFIT,
        {
          evaluation_id: "00000000-0000-4000-8000-000000000025",
          request_payload: {},
        },
        {
          traceId: "00000000-0000-4000-8000-000000000026",
          idempotencyKey: "eval-123",
        },
      ),
      result: {
        progress: 100,
        evaluation_id: "00000000-0000-4000-8000-000000000025",
        compatibility_score: 82,
        explanation: {
          summary: "balanced palette",
        },
      },
    }),
  );

  assert.equal(response.trace_id, "00000000-0000-4000-8000-000000000026");
  assert.equal(
    (response.result?.data.explanation as Record<string, unknown> | undefined)?.summary,
    "balanced palette",
  );
});

test("buildUserJobResponse preserves try-on artifacts and output urls inside canonical job results", () => {
  const response = buildUserJobResponse(
    baseJob({
      job_type: JOB_TYPES.TRYON_GENERATE,
      payload: buildJobPayloadEnvelope(
        JOB_TYPES.TRYON_GENERATE,
        {
          tryon_id: "00000000-0000-4000-8000-000000000027",
          asset_id: "00000000-0000-4000-8000-000000000028",
          input_image_url: "https://example.com/person.jpg",
        },
        {
          traceId: "00000000-0000-4000-8000-000000000029",
          idempotencyKey: "tryon-123",
        },
      ),
      result: {
        progress: 100,
        tryon_id: "00000000-0000-4000-8000-000000000027",
        output_image_url: "https://cdn.example.com/tryon/output.png",
        artifacts: [
          {
            kind: "tryon-output-image",
            url: "https://cdn.example.com/tryon/output.png",
          },
        ],
      },
    }),
  );

  assert.equal(response.trace_id, "00000000-0000-4000-8000-000000000029");
  assert.equal(response.result?.artifacts[0]?.url, "https://cdn.example.com/tryon/output.png");
  assert.equal(response.result?.data.output_image_url, "https://cdn.example.com/tryon/output.png");
});
