import assert from "node:assert/strict";
import test from "node:test";
import {
  JOB_TYPES,
  buildBodyProfileRevision,
  buildFitSimulationCacheKey,
  buildPublishedGarmentRevision,
  buildJobPayloadEnvelope,
  buildJobResultEnvelope,
  fitSimulateHQJobPayloadInputSchema,
  fitSimulateHQJobType,
  importProductJobPayloadSchema,
  normalizeJobResultEnvelope,
  normalizeQueuedJobPayload,
  readJobPayloadEnvelope,
  readJobResultEnvelope,
} from "./index.js";

const traceId = "00000000-0000-4000-8000-000000000001";

test("normalizeQueuedJobPayload upgrades legacy import payloads into canonical envelopes", () => {
  const payload = normalizeQueuedJobPayload({
    jobType: JOB_TYPES.IMPORT_PRODUCT_URL,
    payload: {
      product_id: "00000000-0000-4000-8000-000000000002",
      source_url: "https://example.com/products/123",
      category_hint: "tops",
    },
    schema: importProductJobPayloadSchema,
    fallbackTraceId: traceId,
    idempotencyKey: "import-123",
  });

  assert.equal(payload.schema_version, "job-payload.v1");
  assert.equal(payload.job_type, JOB_TYPES.IMPORT_PRODUCT_URL);
  assert.equal(payload.trace_id, traceId);
  assert.equal(payload.idempotency_key, "import-123");
  assert.equal(payload.data.category_hint, "tops");
});

test("queued payload helpers preserve canonical envelopes", () => {
  const canonical = buildJobPayloadEnvelope(
    JOB_TYPES.IMPORT_PRODUCT_URL,
    {
      product_id: "00000000-0000-4000-8000-000000000002",
      source_url: "https://example.com/products/123",
    },
    {
      traceId,
      idempotencyKey: "import-123",
    },
  );

  const normalized = normalizeQueuedJobPayload({
    jobType: JOB_TYPES.IMPORT_PRODUCT_URL,
    payload: canonical,
    schema: importProductJobPayloadSchema,
    fallbackTraceId: "00000000-0000-4000-8000-000000000099",
  });

  assert.deepEqual(normalized, canonical);
  assert.equal(readJobPayloadEnvelope(canonical)?.trace_id, traceId);
});

test("normalizeQueuedJobPayload upgrades reserved simulation requests into canonical envelopes", () => {
  const bodyProfileRevision = buildBodyProfileRevision({
    gender: "female",
    bodyFrame: "balanced",
    simple: {
      heightCm: 166,
      shoulderCm: 40,
      chestCm: 88,
      waistCm: 70,
      hipCm: 96,
      inseamCm: 79,
    },
  });
  const garmentRevision = buildPublishedGarmentRevision({
    id: "starter-top-soft-casual",
    publication: {
      assetVersion: "starter-top-soft-casual@1.0.0",
    },
  });
  const payload = normalizeQueuedJobPayload({
    jobType: JOB_TYPES.FIT_SIMULATE_HQ,
    payload: {
      jobType: fitSimulateHQJobType,
      schemaVersion: "fit-simulate-hq.v1",
      bodyVersionId: `body-profile:user-1:${bodyProfileRevision}`,
      bodyProfileRevision,
      garmentVariantId: "starter-top-soft-casual",
      garmentRevision,
      avatarManifestUrl: "https://cdn.freestyle.test/assets/avatars/female-base.glb",
      garmentManifestUrl: "https://cdn.freestyle.test/assets/garments/soft-casual.glb",
      materialPreset: "cotton_woven_light",
      qualityTier: "fast",
      cacheKey: buildFitSimulationCacheKey({
        bodyProfileRevision,
        garmentVariantId: "starter-top-soft-casual",
        garmentRevision,
        materialPreset: "cotton_woven_light",
        qualityTier: "fast",
      }),
    },
    schema: fitSimulateHQJobPayloadInputSchema,
    fallbackTraceId: traceId,
    idempotencyKey: "fit-sim-123",
  });

  assert.equal(payload.schema_version, "job-payload.v1");
  assert.equal(payload.job_type, JOB_TYPES.FIT_SIMULATE_HQ);
  assert.equal(payload.idempotency_key, "fit-sim-123");
  assert.equal(payload.data.bodyVersionId, `body-profile:user-1:${bodyProfileRevision}`);
  assert.equal(payload.data.bodyProfileRevision, bodyProfileRevision);
  assert.equal(payload.data.garmentRevision, garmentRevision);
  assert.equal("schemaVersion" in payload.data, false);
});

test("normalizeJobResultEnvelope upgrades legacy result blobs into canonical envelopes", () => {
  const result = normalizeJobResultEnvelope({
    jobType: JOB_TYPES.ASSET_PROCESSOR_PROCESS,
    result: {
      asset_id: "00000000-0000-4000-8000-000000000003",
      progress: 48,
      warnings: ["soft fallback"],
      metrics: {
        duration_ms: 812,
      },
    },
    fallbackTraceId: traceId,
  });

  assert.equal(result?.schema_version, "job-result.v1");
  assert.equal(result?.trace_id, traceId);
  assert.equal(result?.progress, 48);
  assert.deepEqual(result?.warnings, ["soft fallback"]);
  assert.equal(result?.data.asset_id, "00000000-0000-4000-8000-000000000003");
});

test("result helpers preserve canonical envelopes", () => {
  const canonical = buildJobResultEnvelope(
    JOB_TYPES.BACKGROUND_REMOVAL_PROCESS,
    {
      asset_id: "00000000-0000-4000-8000-000000000003",
      next_job_id: "00000000-0000-4000-8000-000000000004",
    },
    {
      traceId,
      progress: 100,
      warnings: [],
    },
  );

  const normalized = normalizeJobResultEnvelope({
    jobType: JOB_TYPES.BACKGROUND_REMOVAL_PROCESS,
    result: canonical,
    fallbackTraceId: "00000000-0000-4000-8000-000000000099",
  });

  assert.deepEqual(normalized, canonical);
  assert.equal(readJobResultEnvelope(canonical)?.job_type, JOB_TYPES.BACKGROUND_REMOVAL_PROCESS);
});
