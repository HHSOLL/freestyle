import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildBodyProfileRevision,
  buildFitSimulationArtifactLineageId,
  buildFitSimulationCacheKey,
  buildPublishedGarmentRevision,
  normalizeBodyProfile,
  type PublishedGarmentAsset,
} from "@freestyle/contracts";
import { getPublishedRuntimeAvatarCatalogItemById } from "@freestyle/runtime-3d/avatar-publication-catalog";
import { upsertFitSimulationRecord } from "./fit-simulations.repository.js";
import {
  listFitSimulationInspectionSummaries,
  resolvePublishedAvatarSimulationInput,
} from "./fit-simulations.service.js";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "freestyle-fit-simulation-service-"));

const garmentFixture: PublishedGarmentAsset = {
  id: "published-top-fit-sim-service",
  name: "Service Fit Tee",
  imageSrc: "/assets/demo/service-fit-tee.png",
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
    fitProfile: {
      layer: "base",
      silhouette: "regular",
      structure: "soft",
      stretch: 0.08,
      drape: 0.16,
    },
  },
  runtime: {
    modelPath: "/assets/garments/partner/service-fit-tee.glb",
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
    assetVersion: "service-fit-tee@1.0.0",
    measurementStandard: "body-garment-v1",
    approvalState: "PUBLISHED",
  },
};

test("resolvePublishedAvatarSimulationInput uses the published runtime avatar catalog", () => {
  const profile = normalizeBodyProfile({
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
  });

  const resolved = resolvePublishedAvatarSimulationInput(profile);
  const publishedAvatar = getPublishedRuntimeAvatarCatalogItemById("female-base");

  assert.ok(publishedAvatar);
  assert.equal(resolved.avatarVariantId, publishedAvatar.id);
  assert.equal(
    resolved.avatarManifestUrl,
    new URL(publishedAvatar.modelPath, "https://freestyle.local").toString(),
  );
});

test.beforeEach(() => {
  process.env.FIT_SIMULATION_STORE_PATH = path.join(
    tempDir,
    `fit-simulations-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
});

test.after(() => {
  delete process.env.FIT_SIMULATION_STORE_PATH;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("listFitSimulationInspectionSummaries returns read-only admin summaries", async () => {
  const bodyProfile = normalizeBodyProfile({
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
  const bodyProfileRevision = buildBodyProfileRevision(bodyProfile);
  const garmentRevision = buildPublishedGarmentRevision(garmentFixture);
  const cacheKey = buildFitSimulationCacheKey({
    avatarVariantId: "female-base",
    bodyProfileRevision,
    garmentVariantId: garmentFixture.id,
    garmentRevision,
    materialPreset: "knit_medium",
    qualityTier: "balanced",
  });

  await upsertFitSimulationRecord({
    id: "00000000-0000-4000-8000-000000000851",
    jobId: "00000000-0000-4000-8000-000000000951",
    userId: "00000000-0000-4000-8000-000000000777",
    status: "succeeded",
    avatarVariantId: "female-base",
    bodyVersionId: `body-profile:00000000-0000-4000-8000-000000000777:${bodyProfileRevision}`,
    bodyProfileRevision,
    garmentVariantId: garmentFixture.id,
    garmentRevision,
    avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
    garmentManifestUrl: "https://freestyle.local/assets/garments/partner/service-fit-tee.glb",
    materialPreset: "knit_medium",
    qualityTier: "balanced",
    cacheKey,
    bodyProfile,
    garmentSnapshot: garmentFixture,
    fitAssessment: null,
    instantFit: null,
    fitMap: null,
    fitMapSummary: null,
    artifacts: [
      { kind: "draped_glb", url: "https://freestyle.local/fit/draped.glb" },
      { kind: "preview_png", url: "https://freestyle.local/fit/preview.png" },
    ],
    metrics: null,
    artifactLineage: {
      schemaVersion: "fit-simulation-artifact-lineage.v1",
      artifactLineageId: buildFitSimulationArtifactLineageId({
        cacheKey,
        cacheKeyParts: {
          avatarVariantId: "female-base",
          bodyProfileRevision,
          garmentVariantId: garmentFixture.id,
          garmentRevision,
          materialPreset: "knit_medium",
          qualityTier: "balanced",
        },
        artifactKinds: ["draped_glb", "preview_png"],
        drapeSource: "authored-scene-merge",
      }),
      generatedAt: "2026-04-24T09:02:00.000Z",
      cacheKey,
      cacheKeyParts: {
        avatarVariantId: "female-base",
        bodyProfileRevision,
        garmentVariantId: garmentFixture.id,
        garmentRevision,
        materialPreset: "knit_medium",
        qualityTier: "balanced",
      },
      avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
      garmentManifestUrl: "https://freestyle.local/assets/garments/partner/service-fit-tee.glb",
      storageBackend: "remote-storage",
      drapeSource: "authored-scene-merge",
      artifactKinds: ["draped_glb", "preview_png"],
      manifestKey: "fit-simulations/00000000-0000-4000-8000-000000000851/artifact-lineage.json",
      manifestUrl:
        "https://freestyle.local/fit-simulations/00000000-0000-4000-8000-000000000851/artifact-lineage.json",
      warnings: ["lineage warning"],
    },
    warnings: ["preview warning"],
    errorMessage: null,
    createdAt: "2026-04-24T09:00:00.000Z",
    updatedAt: "2026-04-24T09:03:00.000Z",
    completedAt: "2026-04-24T09:03:00.000Z",
  });

  const summary = await listFitSimulationInspectionSummaries({
    garmentVariantId: garmentFixture.id,
    hasArtifactLineage: true,
  });

  assert.equal(summary.schemaVersion, "fit-simulation-admin-inspection-list.v1");
  assert.equal(summary.total, 1);
  assert.equal(summary.items[0]?.artifactCount, 2);
  assert.equal(summary.items[0]?.warningCount, 2);
  assert.equal(summary.items[0]?.hasLineage, true);
});
