import assert from "node:assert/strict";
import test from "node:test";
import { buildJobPayloadEnvelope, JOB_TYPES, type JobRecord } from "@freestyle/shared";
import { normalizeWorkerJobResult } from "./index.js";

const baseJob = (payload: Record<string, unknown>): JobRecord => ({
  id: "00000000-0000-4000-8000-000000000010",
  user_id: "00000000-0000-4000-8000-000000000011",
  job_type: JOB_TYPES.IMPORT_PRODUCT_URL,
  status: "processing",
  priority: 100,
  payload,
  result: null,
  error_code: null,
  error_message: null,
  attempt: 1,
  max_attempts: 5,
  run_after: "2026-04-19T10:00:00.000Z",
  locked_by: "worker",
  locked_at: "2026-04-19T10:00:00.000Z",
  heartbeat_at: "2026-04-19T10:00:05.000Z",
  parent_job_id: null,
  idempotency_key: "import-123",
  created_at: "2026-04-19T10:00:00.000Z",
  updated_at: "2026-04-19T10:00:05.000Z",
  completed_at: null,
});

test("normalizeWorkerJobResult uses the payload trace for canonical worker results", () => {
  const job = baseJob(
    buildJobPayloadEnvelope(
      JOB_TYPES.IMPORT_PRODUCT_URL,
      {
        product_id: "00000000-0000-4000-8000-000000000012",
        source_url: "https://example.com/products/123",
      },
      {
        traceId: "00000000-0000-4000-8000-000000000013",
        idempotencyKey: "import-123",
      },
    ),
  );

  const result = normalizeWorkerJobResult(job, {
    product_id: "00000000-0000-4000-8000-000000000012",
    progress: 100,
  });

  assert.equal(result.job_type, JOB_TYPES.IMPORT_PRODUCT_URL);
  assert.equal(result.trace_id, "00000000-0000-4000-8000-000000000013");
  assert.equal(result.progress, 100);
  assert.equal(result.data.product_id, "00000000-0000-4000-8000-000000000012");
});

test("normalizeWorkerJobResult falls back to job id when the payload is legacy", () => {
  const job = baseJob({
    product_id: "00000000-0000-4000-8000-000000000012",
    source_url: "https://example.com/products/123",
  });

  const result = normalizeWorkerJobResult(job, {
    selected_image_url: "https://cdn.example.com/image.jpg",
  });

  assert.equal(result.trace_id, job.id);
  assert.equal(result.data.selected_image_url, "https://cdn.example.com/image.jpg");
});
