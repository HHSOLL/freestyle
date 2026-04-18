import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import type { PublishedGarmentAsset } from "@freestyle/shared";
import { buildServer } from "../main.js";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "freestyle-runtime-garments-"));
const runtimeGarmentStorePath = path.join(tempDir, "runtime-garments.json");

const publishedGarmentFixture: PublishedGarmentAsset = {
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
};

const semanticallyInvalidGarmentFixture: PublishedGarmentAsset = {
  ...publishedGarmentFixture,
  id: "published-top-invalid-rig",
  name: "Precision Tee Invalid",
  runtime: {
    ...publishedGarmentFixture.runtime,
    skeletonProfileId: "freestyle-humanoid-v1",
  },
  publication: {
    ...publishedGarmentFixture.publication,
    assetVersion: "precision-tee-invalid@1.0.0",
  },
};

test.beforeEach(() => {
  process.env.DEV_BYPASS_USER_ID = "00000000-0000-4000-8000-000000000001";
  process.env.GARMENT_PUBLICATION_STORE_PATH = runtimeGarmentStorePath;
  try {
    fs.unlinkSync(runtimeGarmentStorePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
});

test.after(() => {
  delete process.env.DEV_BYPASS_USER_ID;
  delete process.env.GARMENT_PUBLICATION_STORE_PATH;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("published runtime garments can be upserted through admin routes and consumed by closet routes", async () => {
  const app = buildServer();

  const postResponse = await app.inject({
    method: "POST",
    url: "/v1/admin/garments",
    payload: publishedGarmentFixture,
  });

  assert.equal(postResponse.statusCode, 201);
  assert.equal(postResponse.headers["x-freestyle-surface"], "product");
  assert.equal(postResponse.json().item.id, publishedGarmentFixture.id);

  const getAdminResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/garments?category=tops",
  });

  assert.equal(getAdminResponse.statusCode, 200);
  assert.equal(getAdminResponse.headers["x-freestyle-surface"], "product");
  assert.equal(getAdminResponse.json().total, 1);

  const getClosetResponse = await app.inject({
    method: "GET",
    url: "/v1/closet/runtime-garments",
  });

  assert.equal(getClosetResponse.statusCode, 200);
  assert.equal(getClosetResponse.headers["x-freestyle-surface"], "product");
  assert.equal(getClosetResponse.json().items[0]?.publication?.sourceSystem, "admin-domain");
  assert.equal(getClosetResponse.json().items[0]?.metadata?.selectedSizeLabel, "L");

  await app.close();
});

test("admin create route rejects duplicate garment ids", async () => {
  const app = buildServer();

  const firstCreate = await app.inject({
    method: "POST",
    url: "/v1/admin/garments",
    payload: publishedGarmentFixture,
  });

  assert.equal(firstCreate.statusCode, 201);

  const duplicateCreate = await app.inject({
    method: "POST",
    url: "/v1/admin/garments",
    payload: publishedGarmentFixture,
  });

  assert.equal(duplicateCreate.statusCode, 409);
  assert.equal(duplicateCreate.json().error, "CONFLICT");

  await app.close();
});

test("admin create route rejects semantically invalid garment payloads without persisting them", async () => {
  const app = buildServer();

  const createResponse = await app.inject({
    method: "POST",
    url: "/v1/admin/garments",
    payload: semanticallyInvalidGarmentFixture,
  });

  assert.equal(createResponse.statusCode, 400);
  assert.equal(createResponse.json().error, "VALIDATION_ERROR");
  assert.match(createResponse.json().message, /unknown skeletonProfileId/);
  assert.deepEqual(createResponse.json().issues, [
    "unknown skeletonProfileId: freestyle-humanoid-v1",
  ]);

  const listResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/garments",
  });

  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.json().total, 0);

  await app.close();
});
