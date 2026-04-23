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
  fitSimulationAdminInspectionListResponseSchema,
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
  status?: "queued" | "processing" | "succeeded" | "failed";
  garmentId?: string;
  updatedAt?: string;
}) => {
  const id = options?.id ?? "00000000-0000-4000-8000-000000000801";
  const artifactKinds = ["draped_glb", "preview_png", "fit_map_json", "metrics_json"] as const;
  const garmentSnapshot = {
    ...publishedGarmentFixture,
    id: options?.garmentId ?? publishedGarmentFixture.id,
  } satisfies PublishedGarmentAsset;
  const bodyProfileRevisionValue = buildBodyProfileRevision(bodyProfileFixture);
  const garmentRevision = buildPublishedGarmentRevision(garmentSnapshot);
  const qualityTier = "balanced" as const;
  const cacheKeyValue = buildFitSimulationCacheKey({
    avatarVariantId: "female-base",
    bodyProfileRevision: bodyProfileRevisionValue,
    garmentVariantId: garmentSnapshot.id,
    garmentRevision,
    materialPreset: "knit_medium",
    qualityTier,
  });

  await upsertFitSimulationRecord({
    id,
    jobId: "00000000-0000-4000-8000-000000000901",
    userId: "00000000-0000-4000-8000-000000000777",
    status: options?.status ?? "succeeded",
    avatarVariantId: "female-base",
    bodyVersionId: `body-profile:00000000-0000-4000-8000-000000000777:${bodyProfileRevisionValue}`,
    bodyProfileRevision: bodyProfileRevisionValue,
    garmentVariantId: garmentSnapshot.id,
    garmentRevision,
    avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
    garmentManifestUrl: "https://freestyle.local/assets/garments/partner/admin-fit-sim-tee.glb",
    materialPreset: "knit_medium",
    qualityTier,
    cacheKey: cacheKeyValue,
    bodyProfile: bodyProfileFixture,
    garmentSnapshot,
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
            cacheKey: cacheKeyValue,
            cacheKeyParts: {
              avatarVariantId: "female-base",
              bodyProfileRevision: bodyProfileRevisionValue,
              garmentVariantId: garmentSnapshot.id,
              garmentRevision,
              materialPreset: "knit_medium",
              qualityTier: "balanced",
            },
            artifactKinds: [...artifactKinds],
            drapeSource: "authored-scene-merge",
          }),
          generatedAt: "2026-04-24T09:02:00.000Z",
          cacheKey: cacheKeyValue,
          cacheKeyParts: {
            avatarVariantId: "female-base",
            bodyProfileRevision: bodyProfileRevisionValue,
            garmentVariantId: garmentSnapshot.id,
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
    updatedAt: options?.updatedAt ?? "2026-04-24T09:02:00.000Z",
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

test("admin fit-simulation list route returns newest-first summaries for the current garment", async () => {
  const newestId = await seedFitSimulation({
    id: "00000000-0000-4000-8000-000000000811",
    updatedAt: "2026-04-24T09:05:00.000Z",
  });
  await seedFitSimulation({
    id: "00000000-0000-4000-8000-000000000812",
    garmentId: "published-bottom-admin-fit-sim",
    updatedAt: "2026-04-24T09:06:00.000Z",
  });
  const olderId = await seedFitSimulation({
    id: "00000000-0000-4000-8000-000000000813",
    updatedAt: "2026-04-24T09:01:00.000Z",
  });

  const app = buildServer();
  const response = await app.inject({
    method: "GET",
    url: `/v1/admin/fit-simulations?garment_variant_id=${publishedGarmentFixture.id}`,
  });

  assert.equal(response.statusCode, 200);
  const payload = fitSimulationAdminInspectionListResponseSchema.parse(response.json());
  assert.equal(payload.total, 2);
  assert.deepEqual(
    payload.items.map((item) => item.id),
    [newestId, olderId],
  );
  assert.equal(payload.items[0]?.hasLineage, true);
  assert.equal(payload.items[0]?.artifactCount, 4);
  assert.equal(payload.items[0]?.warningCount, 0);

  await app.close();
});

test("admin fit-simulation list route filters by lineage and status", async () => {
  await seedFitSimulation({
    id: "00000000-0000-4000-8000-000000000821",
    artifactLineage: false,
    status: "failed",
  });
  const matchingId = await seedFitSimulation({
    id: "00000000-0000-4000-8000-000000000822",
    status: "succeeded",
  });

  const app = buildServer();
  const response = await app.inject({
    method: "GET",
    url: `/v1/admin/fit-simulations?garment_variant_id=${publishedGarmentFixture.id}&status=succeeded&has_artifact_lineage=true&limit=1`,
  });

  assert.equal(response.statusCode, 200);
  const payload = fitSimulationAdminInspectionListResponseSchema.parse(response.json());
  assert.equal(payload.total, 1);
  assert.equal(payload.items[0]?.id, matchingId);
  assert.equal(payload.items[0]?.status, "succeeded");
  assert.equal(payload.items[0]?.hasLineage, true);

  await app.close();
});

test("admin fit-simulation list route returns 200 empty list when the store is empty", async () => {
  const app = buildServer();
  const response = await app.inject({
    method: "GET",
    url: "/v1/admin/fit-simulations",
  });

  assert.equal(response.statusCode, 200);
  const payload = fitSimulationAdminInspectionListResponseSchema.parse(response.json());
  assert.equal(payload.total, 0);
  assert.deepEqual(payload.items, []);

  await app.close();
});

test("admin fit-simulation list route validates query parameters", async () => {
  const app = buildServer();
  const response = await app.inject({
    method: "GET",
    url: "/v1/admin/fit-simulations?has_artifact_lineage=maybe",
  });

  assert.equal(response.statusCode, 400);
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

test("admin fit-simulation list route rejects anonymous callers", async () => {
  delete process.env.DEV_BYPASS_USER_ID;
  delete process.env.ADMIN_USER_IDS;

  const app = buildServer();
  const response = await app.inject({
    method: "GET",
    url: "/v1/admin/fit-simulations",
  });

  assert.equal(response.statusCode, 401);
  await app.close();
});
