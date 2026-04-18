import assert from "node:assert/strict";
import test from "node:test";
import { parsePublishedRuntimeGarment, parsePublishedRuntimeGarmentList } from "./publishedRuntimeGarment.js";

const publishedGarmentFixture = {
  id: "published-top-precision-tee",
  name: "Precision Tee",
  imageSrc: "/assets/demo/precision-tee.png",
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
        shoulderCm: 0.8,
      },
    },
  },
  runtime: {
    modelPath: "/assets/garments/partner/precision-tee.glb",
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
    publishedAt: "2026-04-14T12:00:00.000Z",
    assetVersion: "precision-tee@1.0.0",
    measurementStandard: "body-garment-v1",
    provenanceUrl: "https://partner.example.com/garments/precision-tee",
  },
} as const;

test("parsePublishedRuntimeGarment accepts canonical camelCase published garments", () => {
  const parsed = parsePublishedRuntimeGarment(publishedGarmentFixture);
  assert.ok(parsed);
  assert.equal(parsed.imageSrc, publishedGarmentFixture.imageSrc);
  assert.equal(parsed.runtime.skeletonProfileId, "freestyle-rig-v2");
});

test("parsePublishedRuntimeGarment rejects legacy snake_case garment payloads", () => {
  const parsed = parsePublishedRuntimeGarment({
    id: "legacy-published-top",
    name: "Legacy Tee",
    image_url: "/assets/demo/legacy-tee.png",
    category: "tops",
    source: "inventory",
  });

  assert.equal(parsed, null);
});

test("parsePublishedRuntimeGarmentList filters malformed garments without dropping valid entries", () => {
  const parsed = parsePublishedRuntimeGarmentList([
    publishedGarmentFixture,
    {
      ...publishedGarmentFixture,
      id: "bad-rig",
      runtime: {
        ...publishedGarmentFixture.runtime,
        skeletonProfileId: "freestyle-humanoid-v1",
      },
    },
  ]);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.id, publishedGarmentFixture.id);
});
