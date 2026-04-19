import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import {
  publishedRuntimeGarmentItemResponseSchema,
  publishedRuntimeGarmentListResponseSchema,
  type PublishedGarmentAsset,
} from "@freestyle/contracts";
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

const writeRuntimeGarmentStore = (value: unknown) => {
  fs.writeFileSync(runtimeGarmentStorePath, JSON.stringify(value, null, 2), "utf8");
};

test.beforeEach(() => {
  process.env.DEV_BYPASS_USER_ID = "00000000-0000-4000-8000-000000000001";
  process.env.ADMIN_USER_IDS = process.env.DEV_BYPASS_USER_ID;
  delete process.env.ALLOW_ANONYMOUS_USER;
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
  delete process.env.ADMIN_USER_IDS;
  delete process.env.ALLOW_ANONYMOUS_USER;
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
  const postPayload = publishedRuntimeGarmentItemResponseSchema.parse(postResponse.json());
  assert.equal(postPayload.item.id, publishedGarmentFixture.id);

  const getAdminResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/garments?category=tops",
  });

  assert.equal(getAdminResponse.statusCode, 200);
  assert.equal(getAdminResponse.headers["x-freestyle-surface"], "product");
  const adminListPayload = publishedRuntimeGarmentListResponseSchema.parse(getAdminResponse.json());
  assert.equal(adminListPayload.total, 1);

  const getAdminDetailResponse = await app.inject({
    method: "GET",
    url: `/v1/admin/garments/${publishedGarmentFixture.id}`,
  });

  assert.equal(getAdminDetailResponse.statusCode, 200);
  const adminDetailPayload = publishedRuntimeGarmentItemResponseSchema.parse(getAdminDetailResponse.json());
  assert.equal(adminDetailPayload.item.publication.sourceSystem, "admin-domain");

  const getClosetResponse = await app.inject({
    method: "GET",
    url: "/v1/closet/runtime-garments",
  });

  assert.equal(getClosetResponse.statusCode, 200);
  assert.equal(getClosetResponse.headers["x-freestyle-surface"], "product");
  const closetPayload = publishedRuntimeGarmentListResponseSchema.parse(getClosetResponse.json());
  assert.equal(closetPayload.items[0]?.publication.sourceSystem, "admin-domain");
  assert.equal(closetPayload.items[0]?.metadata?.selectedSizeLabel, "L");

  const putResponse = await app.inject({
    method: "PUT",
    url: `/v1/admin/garments/${publishedGarmentFixture.id}`,
    payload: {
      ...publishedGarmentFixture,
      name: "Precision Tee Updated",
    },
  });

  assert.equal(putResponse.statusCode, 200);
  const putPayload = publishedRuntimeGarmentItemResponseSchema.parse(putResponse.json());
  assert.equal(putPayload.item.name, "Precision Tee Updated");

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
  assert.equal(publishedRuntimeGarmentListResponseSchema.parse(listResponse.json()).total, 0);

  await app.close();
});

test("admin update route rejects route and payload id mismatches before writing", async () => {
  const app = buildServer();

  const response = await app.inject({
    method: "PUT",
    url: `/v1/admin/garments/${publishedGarmentFixture.id}`,
    payload: {
      ...publishedGarmentFixture,
      id: "published-top-different-id",
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "VALIDATION_ERROR");
  assert.match(response.json().message, /Body id must match route id/);

  await app.close();
});

test("admin routes reject anonymous-header access even when anonymous product auth is enabled", async () => {
  delete process.env.DEV_BYPASS_USER_ID;
  process.env.ADMIN_USER_IDS = "00000000-0000-4000-8000-000000000099";
  process.env.ALLOW_ANONYMOUS_USER = "true";
  const app = buildServer();

  const response = await app.inject({
    method: "GET",
    url: "/v1/admin/garments",
    headers: {
      "x-anonymous-user-id": "00000000-0000-4000-8000-000000000123",
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, "UNAUTHORIZED");

  await app.close();
  delete process.env.ALLOW_ANONYMOUS_USER;
});

test("admin routes reject non-admin dev bypass users while closet runtime reads remain available", async () => {
  process.env.ADMIN_USER_IDS = "00000000-0000-4000-8000-000000000099";
  const app = buildServer();

  const adminResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/garments",
  });

  assert.equal(adminResponse.statusCode, 401);
  assert.equal(adminResponse.json().error, "UNAUTHORIZED");

  const closetResponse = await app.inject({
    method: "GET",
    url: "/v1/closet/runtime-garments",
  });

  assert.equal(closetResponse.statusCode, 200);
  assert.equal(publishedRuntimeGarmentListResponseSchema.parse(closetResponse.json()).total, 0);

  await app.close();
});

test("persisted mixed runtime garment rows keep valid entries while filtering malformed and semantically invalid rows", async () => {
  writeRuntimeGarmentStore({
    version: 1,
    items: [
      publishedGarmentFixture,
      { id: "broken-row", name: "Broken Row" },
      semanticallyInvalidGarmentFixture,
    ],
  });

  const app = buildServer();

  const closetResponse = await app.inject({
    method: "GET",
    url: "/v1/closet/runtime-garments",
  });

  assert.equal(closetResponse.statusCode, 200);
  const closetPayload = publishedRuntimeGarmentListResponseSchema.parse(closetResponse.json());
  assert.equal(closetPayload.total, 1);
  assert.deepEqual(
    closetPayload.items.map((item) => item.id),
    [publishedGarmentFixture.id],
  );

  const adminResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/garments",
  });

  assert.equal(adminResponse.statusCode, 200);
  const adminPayload = publishedRuntimeGarmentListResponseSchema.parse(adminResponse.json());
  assert.equal(adminPayload.total, 1);
  assert.deepEqual(
    adminPayload.items.map((item) => item.id),
    [publishedGarmentFixture.id],
  );

  await app.close();
});

test("admin detail route treats semantically invalid persisted garments as missing", async () => {
  writeRuntimeGarmentStore({
    version: 1,
    items: [publishedGarmentFixture, semanticallyInvalidGarmentFixture],
  });

  const app = buildServer();

  const invalidDetailResponse = await app.inject({
    method: "GET",
    url: `/v1/admin/garments/${semanticallyInvalidGarmentFixture.id}`,
  });

  assert.equal(invalidDetailResponse.statusCode, 404);
  assert.equal(invalidDetailResponse.json().error, "NOT_FOUND");

  const validDetailResponse = await app.inject({
    method: "GET",
    url: `/v1/admin/garments/${publishedGarmentFixture.id}`,
  });

  assert.equal(validDetailResponse.statusCode, 200);
  assert.equal(
    publishedRuntimeGarmentItemResponseSchema.parse(validDetailResponse.json()).item.id,
    publishedGarmentFixture.id,
  );

  await app.close();
});
