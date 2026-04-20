import assert from "node:assert/strict";
import test from "node:test";
import {
  buildJobPayloadEnvelope,
  fitMapArtifactDataSchema,
  garmentFitAssessmentSchema,
  garmentInstantFitReportSchema,
  JOB_TYPES,
  type JobRecord,
} from "@freestyle/shared";
import {
  buildFitMapArtifactPayload,
  buildFitSimulationPreviewPngBuffer,
  parseFitSimulationJobPayload,
} from "./worker.js";

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

test("buildFitMapArtifactPayload emits typed Phase E overlay evidence", () => {
  const fitAssessment = garmentFitAssessmentSchema.parse({
    sizeLabel: "L",
    overallState: "snug",
    tensionRisk: "medium",
    clippingRisk: "medium",
    stretchLoad: 0.76,
    limitingKeys: ["chestCm", "waistCm"],
    dimensions: [
      {
        key: "chestCm",
        measurementMode: "body-circumference",
        garmentCm: 108,
        bodyCm: 104,
        effectiveGarmentCm: 110,
        easeCm: 6,
        requiredStretchRatio: 0.02,
        state: "snug",
      },
      {
        key: "waistCm",
        measurementMode: "body-circumference",
        garmentCm: 92,
        bodyCm: 88,
        effectiveGarmentCm: 94,
        easeCm: 6,
        requiredStretchRatio: 0.01,
        state: "regular",
      },
    ],
  });
  const instantFit = garmentInstantFitReportSchema.parse({
    schemaVersion: "garment-instant-fit-report.v1",
    sizeLabel: "L",
    overallFit: "tight",
    overallState: "snug",
    tensionRisk: "medium",
    clippingRisk: "medium",
    confidence: 0.74,
    primaryRegionId: "chest",
    summary: {
      ko: "L · 가슴 기준 타이트함",
      en: "L · Chest tight fit",
    },
    explanations: [
      {
        ko: "가슴 여유가 제한적이다.",
        en: "Chest ease is limited.",
      },
    ],
    limitingKeys: ["chestCm", "waistCm"],
    regions: [
      {
        regionId: "chest",
        measurementKey: "chestCm",
        fitState: "snug",
        easeCm: 6,
        isLimiting: true,
      },
      {
        regionId: "waist",
        measurementKey: "waistCm",
        fitState: "regular",
        easeCm: 6,
        isLimiting: true,
      },
    ],
  });

  const payload = buildFitMapArtifactPayload(
    "00000000-0000-4000-8000-000000000083",
    {
      bodyVersionId: "body-profile:user-1:2026-04-20T10:00:00.000Z",
      garmentVariantId: "starter-top-soft-casual",
      avatarVariantId: "female-base",
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/starter/top-soft-casual.glb",
      materialPreset: "knit_medium",
      qualityTier: "balanced",
    },
    {
      id: "starter-top-soft-casual",
      name: "Soft Tucked Tee",
      category: "tops",
    },
    fitAssessment,
    instantFit,
    ["Baseline Phase D worker emits fit_map_json plus preview_png; draped_glb remains pending."],
  );

  const parsed = fitMapArtifactDataSchema.parse(payload);
  assert.equal(parsed.overlays.length, 4);
  assert.equal(parsed.overlays[0]?.kind, "easeMap");
  assert.equal(parsed.overlays[3]?.kind, "confidenceMap");
});

test("buildFitSimulationPreviewPngBuffer rasterizes a PNG preview artifact", async () => {
  const fitAssessment = garmentFitAssessmentSchema.parse({
    sizeLabel: "L",
    overallState: "snug",
    tensionRisk: "medium",
    clippingRisk: "medium",
    stretchLoad: 0.76,
    limitingKeys: ["chestCm"],
    dimensions: [
      {
        key: "chestCm",
        measurementMode: "body-circumference",
        garmentCm: 108,
        bodyCm: 104,
        effectiveGarmentCm: 110,
        easeCm: 6,
        requiredStretchRatio: 0.02,
        state: "snug",
      },
    ],
  });
  const instantFit = garmentInstantFitReportSchema.parse({
    schemaVersion: "garment-instant-fit-report.v1",
    sizeLabel: "L",
    overallFit: "tight",
    overallState: "snug",
    tensionRisk: "medium",
    clippingRisk: "medium",
    confidence: 0.74,
    primaryRegionId: "chest",
    summary: {
      ko: "L · 가슴 기준 타이트함",
      en: "L · Chest tight fit",
    },
    explanations: [
      {
        ko: "가슴 여유가 제한적이다.",
        en: "Chest ease is limited.",
      },
    ],
    limitingKeys: ["chestCm"],
    regions: [
      {
        regionId: "chest",
        measurementKey: "chestCm",
        fitState: "snug",
        easeCm: 6,
        isLimiting: true,
      },
    ],
  });
  const fitMap = buildFitMapArtifactPayload(
    "00000000-0000-4000-8000-000000000083",
    {
      bodyVersionId: "body-profile:user-1:2026-04-20T10:00:00.000Z",
      garmentVariantId: "starter-top-soft-casual",
      avatarVariantId: "female-base",
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/starter/top-soft-casual.glb",
      materialPreset: "knit_medium",
      qualityTier: "balanced",
    },
    {
      id: "starter-top-soft-casual",
      name: "Soft Tucked Tee",
      category: "tops",
    },
    fitAssessment,
    instantFit,
    ["Baseline Phase D worker emits fit_map_json plus preview_png; draped_glb remains pending."],
  );

  const png = await buildFitSimulationPreviewPngBuffer(
    "00000000-0000-4000-8000-000000000083",
    fitMap,
  );

  assert.ok(png.length > 1024);
  assert.deepEqual(Array.from(png.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
});
