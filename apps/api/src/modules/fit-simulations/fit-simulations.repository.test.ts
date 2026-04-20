import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import {
  fitMapArtifactDataSchema,
  normalizeBodyProfile,
  type PublishedGarmentAsset,
} from "@freestyle/contracts";
import { createFileFitSimulationPersistencePort } from "./fit-simulations.repository.js";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "freestyle-fit-simulations-"));
const storePath = path.join(tempDir, "fit-simulations.json");

const bodyProfile = normalizeBodyProfile({
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

const garmentSnapshot: PublishedGarmentAsset = {
  id: "starter-top-soft-casual",
  name: "Soft Casual",
  imageSrc: "/assets/garments/top-soft.png",
  category: "tops",
  brand: "Starter",
  source: "inventory",
  metadata: {
    measurements: {
      chestCm: 117,
      waistCm: 112,
      shoulderCm: 52.5,
      sleeveLengthCm: 21,
      lengthCm: 65.5,
    },
    measurementModes: {
      chestCm: "body-circumference",
      waistCm: "body-circumference",
      shoulderCm: "linear-length",
      sleeveLengthCm: "linear-length",
      lengthCm: "linear-length",
    },
    sizeChart: [
      {
        label: "M",
        measurements: {
          chestCm: 117,
          waistCm: 112,
          shoulderCm: 52.5,
          sleeveLengthCm: 21,
          lengthCm: 65.5,
        },
        measurementModes: {
          chestCm: "body-circumference",
          waistCm: "body-circumference",
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
      maxComfortStretchRatio: 0.05,
      compressionToleranceCm: {
        chestCm: 1.2,
      },
    },
    fitProfile: {
      layer: "base",
      silhouette: "regular",
      structure: "soft",
      stretch: 0.08,
      drape: 0.18,
    },
  },
  runtime: {
    modelPath: "/assets/garments/starter/top-soft-casual.glb",
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
  palette: ["#eef0f4", "#10161f"],
  publication: {
    sourceSystem: "starter-catalog",
    publishedAt: "2026-04-20T00:00:00.000Z",
    assetVersion: "starter-top-soft-casual@1.0.0",
    measurementStandard: "body-garment-v1",
  },
};

const fitMapFixture = fitMapArtifactDataSchema.parse({
  schemaVersion: "fit-map-json.v1" as const,
  generatedAt: "2026-04-20T00:05:00.000Z",
  fitSimulationId: "00000000-0000-4000-8000-000000000071",
  request: {
    bodyVersionId: "body-profile:00000000-0000-4000-8000-000000000073:2026-04-20T00:00:00.000Z",
    garmentVariantId: garmentSnapshot.id,
    avatarVariantId: "female-base" as const,
    avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
    garmentManifestUrl: "https://freestyle.local/assets/garments/starter/top-soft-casual.glb",
    materialPreset: "knit_medium",
    qualityTier: "balanced" as const,
  },
  garment: {
    id: garmentSnapshot.id,
    name: garmentSnapshot.name,
    category: garmentSnapshot.category,
  },
  fitAssessment: {
    sizeLabel: "M",
    overallState: "regular" as const,
    tensionRisk: "low" as const,
    clippingRisk: "low" as const,
    stretchLoad: 0.12,
    limitingKeys: ["chestCm"],
    dimensions: [
      {
        key: "chestCm" as const,
        measurementMode: "body-circumference" as const,
        garmentCm: 117,
        bodyCm: 88,
        effectiveGarmentCm: 117,
        easeCm: 29,
        requiredStretchRatio: 0,
        state: "regular" as const,
      },
    ],
  },
  instantFit: {
    schemaVersion: "garment-instant-fit-report.v1" as const,
    sizeLabel: "M",
    overallFit: "good" as const,
    overallState: "regular" as const,
    tensionRisk: "low" as const,
    clippingRisk: "low" as const,
    confidence: 0.92,
    primaryRegionId: "chest" as const,
    summary: {
      ko: "M · 전반적으로 안정적인 핏",
      en: "M · Overall stable fit",
    },
    explanations: [
      {
        ko: "가슴 기준 여유가 충분하다.",
        en: "Chest ease is sufficient.",
      },
    ],
    limitingKeys: ["chestCm"],
    regions: [
      {
        regionId: "chest" as const,
        measurementKey: "chestCm" as const,
        fitState: "regular" as const,
        easeCm: 29,
        isLimiting: true,
      },
    ],
  },
  overlays: [
    {
      kind: "easeMap" as const,
      overallScore: 0.14,
      maxRegionScore: 0.14,
      regions: [
        {
          regionId: "chest" as const,
          measurementKey: "chestCm" as const,
          score: 0.14,
          fitState: "regular" as const,
          easeCm: 29,
          requiredStretchRatio: 0,
          isLimiting: true,
        },
      ],
    },
    {
      kind: "stretchMap" as const,
      overallScore: 0.08,
      maxRegionScore: 0.08,
      regions: [
        {
          regionId: "chest" as const,
          measurementKey: "chestCm" as const,
          score: 0.08,
          fitState: "regular" as const,
          easeCm: 29,
          requiredStretchRatio: 0,
          isLimiting: true,
        },
      ],
    },
    {
      kind: "collisionRiskMap" as const,
      overallScore: 0.38,
      maxRegionScore: 0.38,
      regions: [
        {
          regionId: "chest" as const,
          measurementKey: "chestCm" as const,
          score: 0.38,
          fitState: "regular" as const,
          easeCm: 29,
          requiredStretchRatio: 0,
          isLimiting: true,
        },
      ],
    },
    {
      kind: "confidenceMap" as const,
      overallScore: 0.9,
      maxRegionScore: 0.9,
      regions: [
        {
          regionId: "chest" as const,
          measurementKey: "chestCm" as const,
          score: 0.9,
          fitState: "regular" as const,
          easeCm: 29,
          requiredStretchRatio: 0,
          isLimiting: true,
        },
      ],
    },
  ],
  warnings: [],
});

test.beforeEach(() => {
  try {
    fs.unlinkSync(storePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
});

test.after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("file fit-simulation persistence port round-trips stored records", async () => {
  const port = createFileFitSimulationPersistencePort({ storePath });
  const record = await port.upsertFitSimulationRecord({
    id: "00000000-0000-4000-8000-000000000071",
    jobId: "00000000-0000-4000-8000-000000000072",
    userId: "00000000-0000-4000-8000-000000000073",
    status: "queued",
    avatarVariantId: "female-base",
    bodyVersionId: "body-profile:00000000-0000-4000-8000-000000000073:2026-04-20T00:00:00.000Z",
    garmentVariantId: garmentSnapshot.id,
    avatarManifestUrl: "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
    garmentManifestUrl: "https://freestyle.local/assets/garments/starter/top-soft-casual.glb",
    materialPreset: "knit_medium",
    qualityTier: "balanced",
    bodyProfile,
    garmentSnapshot,
    fitAssessment: null,
    instantFit: null,
    fitMap: fitMapFixture,
    artifacts: [],
    metrics: null,
    warnings: [],
    errorMessage: null,
    createdAt: "2026-04-20T00:00:00.000Z",
    updatedAt: "2026-04-20T00:00:00.000Z",
    completedAt: null,
  });

  assert.equal(record.id, "00000000-0000-4000-8000-000000000071");
  const byId = await port.getFitSimulationRecordById(record.id);
  assert.equal(byId?.garmentSnapshot.id, garmentSnapshot.id);
  assert.equal(byId?.fitMap?.schemaVersion, "fit-map-json.v1");
  assert.equal(byId?.fitMap?.overlays[0]?.kind, "easeMap");

  const byUser = await port.getFitSimulationRecordForUser(
    record.id,
    "00000000-0000-4000-8000-000000000073",
  );
  assert.equal(byUser?.avatarVariantId, "female-base");

  await port.deleteFitSimulationRecord(record.id);
  const deleted = await port.getFitSimulationRecordById(record.id);
  assert.equal(deleted, null);
});
