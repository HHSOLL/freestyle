import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFitSimulationCacheKey,
  buildPublishedGarmentRevision,
  buildJobPayloadEnvelope,
  buildBodyProfileRevision,
  fitMapArtifactDataSchema,
  fitSimulationMetricsArtifactDataSchema,
  garmentFitAssessmentSchema,
  garmentInstantFitReportSchema,
  JOB_TYPES,
  type JobRecord,
} from "@freestyle/shared";
import {
  buildFitSimulationDrapedGlbBuffer,
  buildFitSimulationMetricsArtifactPayload,
  buildFitMapArtifactPayload,
  buildFitSimulationPreviewPngBuffer,
  buildFitSimulationPreviewSvg,
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

const fitSimulationCacheKey = buildFitSimulationCacheKey({
  avatarVariantId: "female-base",
  bodyProfileRevision,
  garmentVariantId: "starter-top-soft-casual",
  garmentRevision,
  materialPreset: "knit_medium",
  qualityTier: "balanced",
});

const phase4DrapeWarning =
  "Phase 4 baseline draped_glb is an authored-scene merge artifact; solver-deformed cloth remains future work.";

test("parseFitSimulationJobPayload preserves canonical fit-simulation envelopes", () => {
  const parsed = parseFitSimulationJobPayload(
    baseJob(
      buildJobPayloadEnvelope(
        JOB_TYPES.FIT_SIMULATE_HQ,
        {
          fit_simulation_id: "00000000-0000-4000-8000-000000000083",
          bodyVersionId: `body-profile:user-1:${bodyProfileRevision}`,
          bodyProfileRevision,
          garmentVariantId: "starter-top-soft-casual",
          garmentRevision,
          avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
          garmentManifestUrl: "https://freestyle.local/assets/garments/starter/top-soft-casual.glb",
          materialPreset: "knit_medium",
          qualityTier: "fast",
          cacheKey: buildFitSimulationCacheKey({
            bodyProfileRevision,
            garmentVariantId: "starter-top-soft-casual",
            garmentRevision,
            materialPreset: "knit_medium",
            qualityTier: "fast",
          }),
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
      bodyVersionId: `body-profile:user-1:${bodyProfileRevision}`,
      garmentVariantId: "starter-top-soft-casual",
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/starter/top-soft-casual.glb",
      materialPreset: "knit_medium",
      qualityTier: "balanced",
    }),
  );

  assert.equal(parsed.trace_id, "00000000-0000-4000-8000-000000000081");
  assert.equal(parsed.data.qualityTier, "balanced");
  assert.equal(parsed.data.bodyProfileRevision, bodyProfileRevision);
  assert.equal(parsed.data.garmentRevision, "starter-top-soft-casual");
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
      bodyVersionId: `body-profile:user-1:${bodyProfileRevision}`,
      bodyProfileRevision,
      garmentVariantId: "starter-top-soft-casual",
      garmentRevision,
      avatarVariantId: "female-base",
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/starter/top-soft-casual.glb",
      materialPreset: "knit_medium",
      qualityTier: "balanced",
      cacheKey: fitSimulationCacheKey,
    },
    {
      id: "starter-top-soft-casual",
      name: "Soft Tucked Tee",
      category: "tops",
    },
    fitAssessment,
    instantFit,
    [phase4DrapeWarning],
  );

  const parsed = fitMapArtifactDataSchema.parse(payload);
  assert.equal(parsed.overlays.length, 4);
  assert.equal(parsed.overlays[0]?.kind, "easeMap");
  assert.equal(parsed.overlays[3]?.kind, "confidenceMap");
});

test("buildFitSimulationMetricsArtifactPayload emits typed HQ metrics evidence", () => {
  const payload = buildFitSimulationMetricsArtifactPayload(
    "00000000-0000-4000-8000-000000000083",
    {
      bodyVersionId: `body-profile:user-1:${bodyProfileRevision}`,
      bodyProfileRevision,
      garmentVariantId: "starter-top-soft-casual",
      garmentRevision,
      avatarVariantId: "female-base",
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/starter/top-soft-casual.glb",
      materialPreset: "knit_medium",
      qualityTier: "balanced",
      cacheKey: fitSimulationCacheKey,
    },
    {
      id: "starter-top-soft-casual",
      name: "Soft Tucked Tee",
      category: "tops",
    },
    {
      dominantOverlayKind: "collisionRiskMap",
      dominantRegionId: "chest",
      dominantMeasurementKey: "chestCm",
      dominantScore: 0.66,
      overlayScores: [
        { kind: "easeMap", overallScore: 0.12, maxRegionScore: 0.12 },
        { kind: "stretchMap", overallScore: 0.08, maxRegionScore: 0.08 },
        { kind: "collisionRiskMap", overallScore: 0.66, maxRegionScore: 0.66 },
        { kind: "confidenceMap", overallScore: 0.74, maxRegionScore: 0.74 },
      ],
    },
    {
      durationMs: 820,
      penetrationRate: 0.021,
      maxStretchRatio: 1.04,
    },
    [phase4DrapeWarning],
    ["draped_glb", "preview_png", "fit_map_json", "metrics_json"],
  );

  const parsed = fitSimulationMetricsArtifactDataSchema.parse(payload);
  assert.equal(parsed.drapeSource, "authored-scene-merge");
  assert.equal(parsed.artifactKinds[0], "draped_glb");
  assert.equal(parsed.metrics.durationMs, 820);
});

test("buildFitSimulationDrapedGlbBuffer merges avatar and garment assets into a GLB artifact", async () => {
  const glb = await buildFitSimulationDrapedGlbBuffer({
    fitSimulationId: "00000000-0000-4000-8000-000000000083",
    avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
    garmentManifestUrl: "https://freestyle.local/assets/garments/mpfb/female/top_soft_casual_v4.glb",
  });

  assert.ok(glb.length > 1024);
  assert.equal(glb.subarray(0, 4).toString("utf8"), "glTF");
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
      bodyVersionId: `body-profile:user-1:${bodyProfileRevision}`,
      bodyProfileRevision,
      garmentVariantId: "starter-top-soft-casual",
      garmentRevision,
      avatarVariantId: "female-base",
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/starter/top-soft-casual.glb",
      materialPreset: "knit_medium",
      qualityTier: "balanced",
      cacheKey: fitSimulationCacheKey,
    },
    {
      id: "starter-top-soft-casual",
      name: "Soft Tucked Tee",
      category: "tops",
    },
    fitAssessment,
    instantFit,
    [phase4DrapeWarning],
  );

  const png = await buildFitSimulationPreviewPngBuffer(
    "00000000-0000-4000-8000-000000000083",
    fitMap,
  );

  assert.ok(png.length > 1024);
  assert.deepEqual(Array.from(png.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
});

test("buildFitSimulationPreviewSvg reflects the dominant overlay summary", () => {
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
    [phase4DrapeWarning],
  );

  const svg = buildFitSimulationPreviewSvg(
    "00000000-0000-4000-8000-000000000083",
    fitMap,
  );

  assert.match(svg, /dominant overlay: collisionRiskMap/);
  assert.match(svg, /region collisionRiskMap summary/);
});
