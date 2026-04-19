import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import {
  bodyProfileGetResponseSchema,
  bodyProfilePutResponseSchema,
  publishedRuntimeGarmentListResponseSchema,
} from "@freestyle/contracts";
import { buildServer } from "../main.js";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "freestyle-api-"));
const bodyProfileStorePath = path.join(tempDir, "body-profiles.json");
const runtimeGarmentStorePath = path.join(tempDir, "runtime-garments.json");

test.beforeEach(() => {
  process.env.DEV_BYPASS_USER_ID = "00000000-0000-4000-8000-000000000001";
  process.env.ADMIN_USER_IDS = process.env.DEV_BYPASS_USER_ID;
  process.env.BODY_PROFILE_STORE_PATH = bodyProfileStorePath;
  process.env.GARMENT_PUBLICATION_STORE_PATH = runtimeGarmentStorePath;
  try {
    fs.unlinkSync(bodyProfileStorePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
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
  delete process.env.BODY_PROFILE_STORE_PATH;
  delete process.env.GARMENT_PUBLICATION_STORE_PATH;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("product surface persists body profile through the profile namespace", async () => {
  const app = buildServer();

  const emptyGetResponse = await app.inject({
    method: "GET",
    url: "/v1/profile/body-profile",
  });

  assert.equal(emptyGetResponse.statusCode, 200);
  assert.equal(bodyProfileGetResponseSchema.parse(emptyGetResponse.json()).bodyProfile, null);

  const putResponse = await app.inject({
    method: "PUT",
    url: "/v1/profile/body-profile",
    payload: {
      profile: {
        version: 2,
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
      },
    },
  });

  assert.equal(putResponse.statusCode, 200);
  assert.equal(putResponse.headers["x-freestyle-surface"], "product");
  const putPayload = bodyProfilePutResponseSchema.parse(putResponse.json());
  assert.equal(putPayload.bodyProfile.version, 2);
  assert.equal(putPayload.bodyProfile.profile.gender, "female");
  assert.equal(putPayload.bodyProfile.profile.bodyFrame, "balanced");

  const getResponse = await app.inject({
    method: "GET",
    url: "/v1/profile/body-profile",
  });

  assert.equal(getResponse.statusCode, 200);
  const getPayload = bodyProfileGetResponseSchema.parse(getResponse.json());
  assert.equal(getPayload.bodyProfile?.profile.simple.heightCm, 172);
  assert.equal(getPayload.bodyProfile?.profile.gender, "female");
  assert.equal(getPayload.bodyProfile?.profile.bodyFrame, "balanced");
  assert.equal(getPayload.bodyProfile?.version, 2);

  await app.close();
});

test("profile namespace returns 500 when the persistence backing store is unreadable", async () => {
  process.env.BODY_PROFILE_STORE_PATH = tempDir;
  const app = buildServer();

  const response = await app.inject({
    method: "GET",
    url: "/v1/profile/body-profile",
  });

  assert.equal(response.statusCode, 500);
  assert.equal(response.headers["x-freestyle-surface"], "product");
  assert.equal(response.json().error, "INTERNAL_SERVER_ERROR");

  await app.close();
});

test("runtime garment namespace returns 500 when the publication backing store is unreadable", async () => {
  process.env.GARMENT_PUBLICATION_STORE_PATH = tempDir;
  const app = buildServer();

  const closetResponse = await app.inject({
    method: "GET",
    url: "/v1/closet/runtime-garments",
  });

  assert.equal(closetResponse.statusCode, 500);
  assert.equal(closetResponse.headers["x-freestyle-surface"], "product");
  assert.equal(closetResponse.json().error, "INTERNAL_SERVER_ERROR");

  const adminResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/garments",
  });

  assert.equal(adminResponse.statusCode, 500);
  assert.equal(adminResponse.headers["x-freestyle-surface"], "product");
  assert.equal(adminResponse.json().error, "INTERNAL_SERVER_ERROR");

  await app.close();
});

test("product namespace smoke keeps representative routes and admin under the product surface", async () => {
  const app = buildServer();

  const cases = [
    { method: "GET", url: "/v1/closet/items", allowedStatuses: [200, 500], payload: undefined },
    { method: "GET", url: "/v1/closet/runtime-garments", expectedStatus: 200, payload: undefined },
    { method: "GET", url: "/v1/canvas/looks", allowedStatuses: [200, 500], payload: undefined },
    { method: "GET", url: "/v1/community/looks", allowedStatuses: [200, 500], payload: undefined },
    { method: "GET", url: "/v1/admin/garments", expectedStatus: 200, payload: undefined },
    { method: "POST", url: "/v1/admin/garments", expectedStatus: 400, payload: {} },
  ] as const;

  for (const testCase of cases) {
    const response = await app.inject({
      method: testCase.method,
      url: testCase.url,
      payload: testCase.payload,
    });

    if ("expectedStatus" in testCase) {
      assert.equal(
        response.statusCode,
        testCase.expectedStatus,
        `${testCase.method} ${testCase.url} returned an unexpected status`,
      );
    } else {
      assert.ok(
        testCase.allowedStatuses.some((status) => status === response.statusCode),
        `${testCase.method} ${testCase.url} returned ${response.statusCode}, expected one of ${testCase.allowedStatuses.join(", ")}`,
      );
    }
    assert.equal(response.headers["x-freestyle-surface"], "product");

    if (testCase.method === "GET" && testCase.url === "/v1/closet/runtime-garments") {
      assert.equal(publishedRuntimeGarmentListResponseSchema.parse(response.json()).total, 0);
    }
    if (testCase.method === "GET" && testCase.url === "/v1/admin/garments") {
      assert.equal(publishedRuntimeGarmentListResponseSchema.parse(response.json()).total, 0);
    }
  }

  await app.close();
});

test("canvas look route rejects invalid payloads before touching persistence", async () => {
  const app = buildServer();

  const response = await app.inject({
    method: "POST",
    url: "/v1/canvas/looks",
    payload: {
      title: "Broken look",
      previewImage: "data:image/png;base64,abc123",
      data: {
        unexpected: "shape",
      },
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.headers["x-freestyle-surface"], "product");
  assert.equal(response.json().error, "VALIDATION_ERROR");

  await app.close();
});

test("legacy and lab namespaces stay isolated from the main product surface", async () => {
  delete process.env.DEV_BYPASS_USER_ID;
  const app = buildServer();

  const [legacyAssets, legacyWidget, labTryons, missingOldAssets, missingOldLabTryons] = await Promise.all([
    app.inject({ method: "GET", url: "/v1/legacy/assets" }),
    app.inject({ method: "GET", url: "/v1/legacy/widget/config?tenant_id=t&product_id=p" }),
    app.inject({ method: "POST", url: "/v1/lab/jobs/tryons", payload: {} }),
    app.inject({ method: "GET", url: "/v1/assets" }),
    app.inject({ method: "POST", url: "/v1/lab/tryons", payload: {} }),
  ]);

  assert.equal(legacyAssets.statusCode, 401);
  assert.equal(legacyAssets.headers["x-freestyle-surface"], "legacy");
  assert.equal(legacyAssets.headers.deprecation, "true");
  assert.equal(legacyWidget.statusCode, 200);
  assert.equal(legacyWidget.headers["x-freestyle-surface"], "legacy");
  assert.equal(labTryons.statusCode, 401);
  assert.equal(labTryons.headers["x-freestyle-surface"], "lab");
  assert.equal(missingOldAssets.statusCode, 404);
  assert.equal(missingOldLabTryons.statusCode, 404);

  await app.close();
});

test("health routes stay outside the product, legacy, and lab namespace headers", async () => {
  const app = buildServer();

  const [healthz, readyz] = await Promise.all([
    app.inject({ method: "GET", url: "/healthz" }),
    app.inject({ method: "GET", url: "/readyz" }),
  ]);

  assert.equal(healthz.statusCode, 200);
  assert.equal(healthz.headers["x-freestyle-surface"], undefined);

  assert.ok([200, 503].includes(readyz.statusCode));
  assert.equal(readyz.headers["x-freestyle-surface"], undefined);

  await app.close();
});
