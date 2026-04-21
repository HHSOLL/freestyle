import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBodyProfileRevision,
  buildFitSimulationCacheKey,
  buildPublishedGarmentRevision,
  fitSimulationGetResponseSchema,
  normalizeBodyProfile,
} from "@freestyle/contracts";
import { buildServer } from "../main.js";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "freestyle-fit-simulation-routes-"));
const bodyProfileStorePath = path.join(tempDir, "body-profiles.json");
const fitSimulationStorePath = path.join(tempDir, "fit-simulations.json");
const runtimeGarmentStorePath = path.join(tempDir, "runtime-garments.json");

const publishedGarmentFixture = {
  id: "published-top-route-fit-sim",
  name: "Route Fit Sim Tee",
  imageSrc: "/assets/demo/route-fit-sim-tee.png",
  category: "tops",
  brand: "Partner Sample",
  source: "inventory",
  metadata: {
    measurements: {
      chestCm: 58.5,
      shoulderCm: 52.5,
      sleeveLengthCm: 21,
      lengthCm: 65.5,
    },
    fitProfile: {
      layer: "base",
      silhouette: "regular",
      structure: "soft",
      stretch: 0.08,
      drape: 0.18,
    },
    measurementModes: {
      chestCm: "flat-half-circumference",
      shoulderCm: "linear-length",
      sleeveLengthCm: "linear-length",
      lengthCm: "linear-length",
    },
    sizeChart: [
      {
        label: "L",
        measurements: {
          chestCm: 58.5,
          shoulderCm: 52.5,
          sleeveLengthCm: 21,
          lengthCm: 65.5,
        },
        measurementModes: {
          chestCm: "flat-half-circumference",
          shoulderCm: "linear-length",
          sleeveLengthCm: "linear-length",
          lengthCm: "linear-length",
        },
        source: "product-detail",
      },
    ],
    selectedSizeLabel: "L",
    physicalProfile: {
      materialStretchRatio: 0.08,
      maxComfortStretchRatio: 0.05,
      compressionToleranceCm: {
        chestCm: 1.4,
      },
    },
  },
  runtime: {
    modelPath: "/assets/garments/partner/route-fit-sim-tee.glb",
    skeletonProfileId: "freestyle-rig-v2",
    anchorBindings: [
      { id: "leftShoulder", weight: 0.3 },
      { id: "rightShoulder", weight: 0.3 },
      { id: "chestCenter", weight: 0.2 },
      { id: "waistCenter", weight: 0.2 },
    ],
    collisionZones: ["torso", "arms"],
    bodyMaskZones: [],
    surfaceClearanceCm: 1.2,
    renderPriority: 1,
  },
  palette: ["#f5f5f5", "#10161f"],
  publication: {
    sourceSystem: "admin-domain",
    publishedAt: "2026-04-20T12:00:00.000Z",
    assetVersion: "route-fit-sim-tee@1.0.0",
    measurementStandard: "body-garment-v1",
  },
};

const fitMapFixture = {
  schemaVersion: "fit-map-json.v1",
  generatedAt: "2026-04-20T10:02:00.000Z",
  fitSimulationId: "00000000-0000-4000-8000-000000000011",
  request: {
    bodyVersionId: `body-profile:user-id:${buildBodyProfileRevision(
      normalizeBodyProfile({
        gender: "female",
        bodyFrame: "balanced",
        simple: {
          heightCm: 172,
          shoulderCm: 44,
          chestCm: 91,
          waistCm: 74,
          hipCm: 95,
          inseamCm: 79,
        },
      }),
    )}`,
    bodyProfileRevision: buildBodyProfileRevision(
      normalizeBodyProfile({
        gender: "female",
        bodyFrame: "balanced",
        simple: {
          heightCm: 172,
          shoulderCm: 44,
          chestCm: 91,
          waistCm: 74,
          hipCm: 95,
          inseamCm: 79,
        },
      }),
    ),
    garmentVariantId: publishedGarmentFixture.id,
    garmentRevision: buildPublishedGarmentRevision(publishedGarmentFixture),
    avatarVariantId: "female-base",
    avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
    garmentManifestUrl: "https://freestyle.local/assets/garments/partner/route-fit-sim-tee.glb",
    materialPreset: "knit_medium",
    qualityTier: "fast",
    cacheKey: buildFitSimulationCacheKey({
      avatarVariantId: "female-base",
      bodyProfileRevision: buildBodyProfileRevision(
        normalizeBodyProfile({
          gender: "female",
          bodyFrame: "balanced",
          simple: {
            heightCm: 172,
            shoulderCm: 44,
            chestCm: 91,
            waistCm: 74,
            hipCm: 95,
            inseamCm: 79,
          },
        }),
      ),
      garmentVariantId: publishedGarmentFixture.id,
      garmentRevision: buildPublishedGarmentRevision(publishedGarmentFixture),
      materialPreset: "knit_medium",
      qualityTier: "fast",
    }),
  },
  garment: {
    id: publishedGarmentFixture.id,
    name: publishedGarmentFixture.name,
    category: publishedGarmentFixture.category,
  },
  fitAssessment: {
    sizeLabel: "L",
    overallState: "regular",
    tensionRisk: "low",
    clippingRisk: "low",
    stretchLoad: 0.1,
    limitingKeys: ["chestCm"],
    dimensions: [
      {
        key: "chestCm",
        measurementMode: "flat-half-circumference",
        garmentCm: 117,
        bodyCm: 91,
        effectiveGarmentCm: 117,
        easeCm: 26,
        requiredStretchRatio: 0,
        state: "regular",
      },
    ],
  },
  instantFit: {
    schemaVersion: "garment-instant-fit-report.v1",
    sizeLabel: "L",
    overallFit: "good",
    overallState: "regular",
    tensionRisk: "low",
    clippingRisk: "low",
    confidence: 0.9,
    primaryRegionId: "chest",
    summary: {
      ko: "L · 안정적인 핏",
      en: "L · Stable fit",
    },
    explanations: [
      {
        ko: "가슴 여유가 충분하다.",
        en: "Chest ease is sufficient.",
      },
    ],
    limitingKeys: ["chestCm"],
    regions: [
      {
        regionId: "chest",
        measurementKey: "chestCm",
        fitState: "regular",
        easeCm: 26,
        isLimiting: true,
      },
    ],
  },
  overlays: [
    {
      kind: "easeMap",
      overallScore: 0.12,
      maxRegionScore: 0.12,
      regions: [
        {
          regionId: "chest",
          measurementKey: "chestCm",
          score: 0.12,
          fitState: "regular",
          easeCm: 26,
          requiredStretchRatio: 0,
          isLimiting: true,
        },
      ],
    },
    {
      kind: "stretchMap",
      overallScore: 0.08,
      maxRegionScore: 0.08,
      regions: [
        {
          regionId: "chest",
          measurementKey: "chestCm",
          score: 0.08,
          fitState: "regular",
          easeCm: 26,
          requiredStretchRatio: 0,
          isLimiting: true,
        },
      ],
    },
    {
      kind: "collisionRiskMap",
      overallScore: 0.32,
      maxRegionScore: 0.32,
      regions: [
        {
          regionId: "chest",
          measurementKey: "chestCm",
          score: 0.32,
          fitState: "regular",
          easeCm: 26,
          requiredStretchRatio: 0,
          isLimiting: true,
        },
      ],
    },
    {
      kind: "confidenceMap",
      overallScore: 0.9,
      maxRegionScore: 0.9,
      regions: [
        {
          regionId: "chest",
          measurementKey: "chestCm",
          score: 0.9,
          fitState: "regular",
          easeCm: 26,
          requiredStretchRatio: 0,
          isLimiting: true,
        },
      ],
    },
  ],
  warnings: [],
};

const fitMapSummaryFixture = {
  dominantOverlayKind: "confidenceMap",
  dominantRegionId: "chest",
  dominantMeasurementKey: "chestCm",
  dominantScore: 0.9,
  overlayScores: [
    { kind: "easeMap", overallScore: 0.12, maxRegionScore: 0.12 },
    { kind: "stretchMap", overallScore: 0.08, maxRegionScore: 0.08 },
    { kind: "collisionRiskMap", overallScore: 0.32, maxRegionScore: 0.32 },
    { kind: "confidenceMap", overallScore: 0.9, maxRegionScore: 0.9 },
  ],
};

test.beforeEach(() => {
  process.env.DEV_BYPASS_USER_ID = "00000000-0000-4000-8000-000000000001";
  process.env.BODY_PROFILE_STORE_PATH = bodyProfileStorePath;
  process.env.FIT_SIMULATION_STORE_PATH = fitSimulationStorePath;
  process.env.GARMENT_PUBLICATION_PERSISTENCE_DRIVER = "file";
  process.env.GARMENT_PUBLICATION_STORE_PATH = runtimeGarmentStorePath;

  for (const filePath of [bodyProfileStorePath, fitSimulationStorePath, runtimeGarmentStorePath]) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
});

test.after(() => {
  delete process.env.DEV_BYPASS_USER_ID;
  delete process.env.BODY_PROFILE_STORE_PATH;
  delete process.env.FIT_SIMULATION_STORE_PATH;
  delete process.env.GARMENT_PUBLICATION_PERSISTENCE_DRIVER;
  delete process.env.GARMENT_PUBLICATION_STORE_PATH;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("fit-simulation create route fails closed when body profile is missing", async () => {
  fs.writeFileSync(
    runtimeGarmentStorePath,
    JSON.stringify({ version: 1, items: [publishedGarmentFixture] }, null, 2),
    "utf8",
  );

  const app = buildServer();
  const response = await app.inject({
    method: "POST",
    url: "/v1/lab/jobs/fit-simulations",
    payload: {
      garment_id: publishedGarmentFixture.id,
      quality_tier: "fast",
    },
  });

  assert.equal(response.statusCode, 409);
  assert.equal(response.headers["x-freestyle-surface"], "lab");
  assert.equal(response.json().error, "PRECONDITION_FAILED");

  await app.close();
});

test("fit-simulation create route rejects unknown garment ids before touching the queue", async () => {
  fs.writeFileSync(
    bodyProfileStorePath,
    JSON.stringify(
      {
        version: 1,
        items: {
          "00000000-0000-4000-8000-000000000001": {
            profile: normalizeBodyProfile({
              gender: "female",
              bodyFrame: "balanced",
              simple: {
                heightCm: 172,
                shoulderCm: 44,
                chestCm: 91,
                waistCm: 74,
                hipCm: 95,
                inseamCm: 79,
              },
            }),
            version: 2,
            revision: buildBodyProfileRevision(
              normalizeBodyProfile({
                gender: "female",
                bodyFrame: "balanced",
                simple: {
                  heightCm: 172,
                  shoulderCm: 44,
                  chestCm: 91,
                  waistCm: 74,
                  hipCm: 95,
                  inseamCm: 79,
                },
              }),
            ),
            updatedAt: "2026-04-20T10:00:00.000Z",
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const app = buildServer();
  const response = await app.inject({
    method: "POST",
    url: "/v1/lab/jobs/fit-simulations",
    payload: {
      garment_id: "missing-garment",
      quality_tier: "fast",
    },
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.headers["x-freestyle-surface"], "lab");
  assert.equal(response.json().error, "NOT_FOUND");

  await app.close();
});

test("fit-simulation read route returns the public record shape from the persistence port", async () => {
  fs.writeFileSync(
    fitSimulationStorePath,
    JSON.stringify(
      {
        version: 1,
        items: {
          "00000000-0000-4000-8000-000000000011": {
            id: "00000000-0000-4000-8000-000000000011",
            jobId: "00000000-0000-4000-8000-000000000012",
            userId: "00000000-0000-4000-8000-000000000001",
            status: "queued",
            avatarVariantId: "female-base",
            bodyVersionId: fitMapFixture.request.bodyVersionId,
            bodyProfileRevision: fitMapFixture.request.bodyProfileRevision,
            garmentVariantId: publishedGarmentFixture.id,
            garmentRevision: fitMapFixture.request.garmentRevision,
            avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
            garmentManifestUrl: "https://freestyle.local/assets/garments/partner/route-fit-sim-tee.glb",
            materialPreset: "knit_medium",
            qualityTier: "fast",
            cacheKey: fitMapFixture.request.cacheKey,
            bodyProfile: normalizeBodyProfile({
              gender: "female",
              bodyFrame: "balanced",
              simple: {
                heightCm: 172,
                shoulderCm: 44,
                chestCm: 91,
                waistCm: 74,
                hipCm: 95,
                inseamCm: 79,
              },
            }),
            garmentSnapshot: publishedGarmentFixture,
            fitAssessment: null,
            instantFit: null,
            fitMap: fitMapFixture,
            fitMapSummary: fitMapSummaryFixture,
            artifacts: [
              {
                kind: "metrics_json",
                url: "https://freestyle.local/fit-simulations/00000000-0000-4000-8000-000000000011/metrics.json",
              },
              {
                kind: "preview_png",
                url: "https://freestyle.local/fit-simulations/00000000-0000-4000-8000-000000000011/preview.png",
              },
              {
                kind: "fit_map_json",
                url: "https://freestyle.local/fit-simulations/00000000-0000-4000-8000-000000000011/fit-map.json",
              },
              {
                kind: "draped_glb",
                url: "https://freestyle.local/fit-simulations/00000000-0000-4000-8000-000000000011/draped.glb",
              },
            ],
            metrics: null,
            warnings: [],
            errorMessage: null,
            createdAt: "2026-04-20T10:00:00.000Z",
            updatedAt: "2026-04-20T10:00:00.000Z",
            completedAt: null,
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const app = buildServer();
  const response = await app.inject({
    method: "GET",
    url: "/v1/lab/fit-simulations/00000000-0000-4000-8000-000000000011",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["x-freestyle-surface"], "lab");
  const payload = fitSimulationGetResponseSchema.parse(response.json());
  assert.equal(payload.fitSimulation.id, "00000000-0000-4000-8000-000000000011");
  assert.equal(payload.fitSimulation.materialPreset, "knit_medium");
  assert.equal(payload.fitSimulation.fitMap?.schemaVersion, "fit-map-json.v1");
  assert.equal(payload.fitSimulation.fitMap?.overlays[0]?.kind, "easeMap");
  assert.equal(payload.fitSimulation.fitMapSummary?.dominantOverlayKind, "confidenceMap");
  assert.equal(payload.fitSimulation.artifacts[0]?.kind, "draped_glb");
  assert.equal(payload.fitSimulation.artifacts[3]?.kind, "metrics_json");

  await app.close();
});
