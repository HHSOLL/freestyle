import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBodyProfileRevision,
  buildFitSimulationArtifactLineageId,
  buildFitSimulationCacheKey,
  buildPublishedGarmentRevision,
  fitSimulationAdminInspectionResponseSchema,
  normalizeBodyProfile,
  type PublishedGarmentAsset,
} from "@freestyle/contracts";
import { upsertFitSimulationRecord } from "../modules/fit-simulations/fit-simulations.repository.js";
import { buildServer } from "../main.js";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "freestyle-admin-fit-sim-routes-"));

const bodyProfileFixture = normalizeBodyProfile({
  gender: "female",
  bodyFrame: "balanced",
  simple: {
    heightCm: 170,
    shoulderCm: 42,
    chestCm: 90,
    waistCm: 74,
    hipCm: 96,
    inseamCm: 78,
  },
});

const publishedGarmentFixture: PublishedGarmentAsset = {
  id: "published-top-admin-fit-sim",
  name: "Admin Fit Sim Tee",
  imageSrc: "/assets/demo/admin-fit-sim-tee.png",
  category: "tops",
  brand: "Partner Sample",
  source: "inventory",
  metadata: {
    measurements: {
      chestCm: 58,
      shoulderCm: 51,
      sleeveLengthCm: 22,
      lengthCm: 65,
    },
    fitProfile: {
      layer: "base",
      silhouette: "regular",
      structure: "soft",
      stretch: 0.08,
      drape: 0.16,
    },
    measurementModes: {
      chestCm: "flat-half-circumference",
      shoulderCm: "linear-length",
      sleeveLengthCm: "linear-length",
      lengthCm: "linear-length",
    },
    sizeChart: [
      {
        label: "M",
        measurements: {
          chestCm: 58,
          shoulderCm: 51,
          sleeveLengthCm: 22,
          lengthCm: 65,
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
    selectedSizeLabel: "M",
    physicalProfile: {
      materialStretchRatio: 0.08,
      maxComfortStretchRatio: 0.04,
      compressionToleranceCm: {
        chestCm: 1.2,
      },
    },
  },
  runtime: {
    modelPath: "/assets/garments/partner/admin-fit-sim-tee.glb",
    skeletonProfileId: "freestyle-rig-v2",
    anchorBindings: [
      { id: "leftShoulder", weight: 0.3 },
      { id: "rightShoulder", weight: 0.3 },
      { id: "chestCenter", weight: 0.2 },
      { id: "waistCenter", weight: 0.2 },
    ],
    collisionZones: ["torso", "arms"],
    bodyMaskZones: [],
    surfaceClearanceCm: 1.1,
    renderPriority: 1,
  },
  palette: ["#f4f4f4", "#10161f"],
  publication: {
    sourceSystem: "admin-domain",
    publishedAt: "2026-04-24T09:00:00.000Z",
    assetVersion: "admin-fit-sim-tee@1.0.0",
    measurementStandard: "body-garment-v1",
    approvalState: "PUBLISHED",
  },
};

const bodyProfileRevision = buildBodyProfileRevision(bodyProfileFixture);
const garmentRevision = buildPublishedGarmentRevision(publishedGarmentFixture);
const cacheKey = buildFitSimulationCacheKey({
  avatarVariantId: "female-base",
  bodyProfileRevision,
  garmentVariantId: publishedGarmentFixture.id,
  garmentRevision,
  materialPreset: "knit_medium",
  qualityTier: "balanced",
});

test.beforeEach(() => {
  process.env.DEV_BYPASS_USER_ID = "00000000-0000-4000-8000-000000000001";
  process.env.ADMIN_USER_IDS = process.env.DEV_BYPASS_USER_ID;
  process.env.FIT_SIMULATION_STORE_PATH = path.join(
    tempDir,
    `fit-simulations-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
});

test.after(() => {
  delete process.env.DEV_BYPASS_USER_ID;
  delete process.env.ADMIN_USER_IDS;
  delete process.env.FIT_SIMULATION_STORE_PATH;
});

const seedFitSimulation = async (options?: {
  id?: string;
  artifactLineage?: boolean;
}) => {
  const id = options?.id ?? "00000000-0000-4000-8000-000000000801";
  const artifactKinds = ["draped_glb", "preview_png", "fit_map_json", "metrics_json"] as const;

  await upsertFitSimulationRecord({
    id,
    jobId: "00000000-0000-4000-8000-000000000901",
    userId: "00000000-0000-4000-8000-000000000777",
    status: "succeeded",
    avatarVariantId: "female-base",
    bodyVersionId: `body-profile:00000000-0000-4000-8000-000000000777:${bodyProfileRevision}`,
    bodyProfileRevision,
    garmentVariantId: publishedGarmentFixture.id,
    garmentRevision,
    avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
    garmentManifestUrl: "https://freestyle.local/assets/garments/partner/admin-fit-sim-tee.glb",
    materialPreset: "knit_medium",
    qualityTier: "balanced",
    cacheKey,
    bodyProfile: bodyProfileFixture,
    garmentSnapshot: publishedGarmentFixture,
    fitAssessment: null,
    instantFit: null,
    fitMap: null,
    fitMapSummary: null,
    artifacts: artifactKinds.map((kind) => ({
      kind,
      url: `https://freestyle.local/fit-simulations/${id}/${kind}`,
      key: `fit-simulations/${id}/${kind}`,
      label: kind,
    })),
    metrics: {
      durationMs: 842,
      penetrationRate: 0.061,
      maxStretchRatio: 1.02,
    },
    artifactLineage: options?.artifactLineage === false
      ? null
      : {
          schemaVersion: "fit-simulation-artifact-lineage.v1",
          artifactLineageId: buildFitSimulationArtifactLineageId({
            cacheKey,
            cacheKeyParts: {
              avatarVariantId: "female-base",
              bodyProfileRevision,
              garmentVariantId: publishedGarmentFixture.id,
              garmentRevision,
              materialPreset: "knit_medium",
              qualityTier: "balanced",
            },
            artifactKinds: [...artifactKinds],
            drapeSource: "authored-scene-merge",
          }),
          generatedAt: "2026-04-24T09:02:00.000Z",
          cacheKey,
          cacheKeyParts: {
            avatarVariantId: "female-base",
            bodyProfileRevision,
            garmentVariantId: publishedGarmentFixture.id,
            garmentRevision,
            materialPreset: "knit_medium",
            qualityTier: "balanced",
          },
          avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
          garmentManifestUrl: "https://freestyle.local/assets/garments/partner/admin-fit-sim-tee.glb",
          storageBackend: "remote-storage",
          drapeSource: "authored-scene-merge",
          artifactKinds: [...artifactKinds],
          manifestKey: `fit-simulations/${id}/artifact-lineage.json`,
          manifestUrl: `https://freestyle.local/fit-simulations/${id}/artifact-lineage.json`,
          warnings: [],
        },
    warnings: [],
    errorMessage: null,
    createdAt: "2026-04-24T09:00:00.000Z",
    updatedAt: "2026-04-24T09:02:00.000Z",
    completedAt: "2026-04-24T09:02:00.000Z",
  });

  return id;
};

test("admin fit-simulation inspection route returns persisted detail and lineage", async () => {
  const fitSimulationId = await seedFitSimulation();
  const app = buildServer();

  const response = await app.inject({
    method: "GET",
    url: `/v1/admin/fit-simulations/${fitSimulationId}`,
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["x-freestyle-surface"], "product");
  const payload = fitSimulationAdminInspectionResponseSchema.parse(response.json());
  assert.equal(payload.fitSimulation.id, fitSimulationId);
  assert.equal(payload.fitSimulation.status, "succeeded");
  assert.equal(payload.artifactLineage?.manifestUrl, `https://freestyle.local/fit-simulations/${fitSimulationId}/artifact-lineage.json`);
  assert.equal(payload.fitSimulation.artifacts[0]?.kind, "draped_glb");

  await app.close();
});

test("admin fit-simulation inspection route allows missing lineage without widening to an error", async () => {
  const fitSimulationId = await seedFitSimulation({
    id: "00000000-0000-4000-8000-000000000802",
    artifactLineage: false,
  });
  const app = buildServer();

  const response = await app.inject({
    method: "GET",
    url: `/v1/admin/fit-simulations/${fitSimulationId}`,
  });

  assert.equal(response.statusCode, 200);
  const payload = fitSimulationAdminInspectionResponseSchema.parse(response.json());
  assert.equal(payload.fitSimulation.id, fitSimulationId);
  assert.equal(payload.artifactLineage, null);

  await app.close();
});

test("admin fit-simulation inspection route returns 404 for unknown ids", async () => {
  const app = buildServer();

  const response = await app.inject({
    method: "GET",
    url: "/v1/admin/fit-simulations/00000000-0000-4000-8000-000000000899",
  });

  assert.equal(response.statusCode, 404);
  await app.close();
});

test("admin fit-simulation inspection route rejects anonymous callers", async () => {
  delete process.env.DEV_BYPASS_USER_ID;
  delete process.env.ADMIN_USER_IDS;

  const app = buildServer();
  const response = await app.inject({
    method: "GET",
    url: "/v1/admin/fit-simulations/00000000-0000-4000-8000-000000000899",
  });

  assert.equal(response.statusCode, 401);
  await app.close();
});
