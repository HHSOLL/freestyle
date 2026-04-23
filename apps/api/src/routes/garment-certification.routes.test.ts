import assert from "node:assert/strict";
import test from "node:test";
import {
  garmentCertificationItemResponseSchema,
  garmentCertificationListResponseSchema,
} from "@freestyle/contracts";
import { buildServer } from "../main.js";

test.beforeEach(() => {
  process.env.DEV_BYPASS_USER_ID = "00000000-0000-4000-8000-000000000001";
  process.env.ADMIN_USER_IDS = process.env.DEV_BYPASS_USER_ID;
});

test.after(() => {
  delete process.env.DEV_BYPASS_USER_ID;
  delete process.env.ADMIN_USER_IDS;
});

test("garment certification bundle is exposed through admin-only read routes", async () => {
  const app = buildServer();

  const listResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/garment-certifications",
  });

  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.headers["x-freestyle-surface"], "product");
  const listPayload = garmentCertificationListResponseSchema.parse(listResponse.json());
  assert.ok(listPayload.total >= 1);
  assert.equal(listPayload.total, listPayload.items.length);
  assert.ok(listPayload.items.some((item) => item.id === "starter-top-soft-casual"));

  const filteredResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/garment-certifications?category=shoes",
  });

  assert.equal(filteredResponse.statusCode, 200);
  const filteredPayload = garmentCertificationListResponseSchema.parse(filteredResponse.json());
  assert.ok(filteredPayload.total >= 1);
  assert.ok(filteredPayload.items.every((item) => item.category === "shoes"));

  const detailResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/garment-certifications/starter-top-soft-casual",
  });

  assert.equal(detailResponse.statusCode, 200);
  const detailPayload = garmentCertificationItemResponseSchema.parse(detailResponse.json());
  assert.equal(detailPayload.item.id, "starter-top-soft-casual");
  assert.equal(detailPayload.item.category, "tops");

  const missingResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/garment-certifications/not-a-real-garment",
  });

  assert.equal(missingResponse.statusCode, 404);

  await app.close();
});

test("garment certification admin routes reject anonymous callers", async () => {
  delete process.env.DEV_BYPASS_USER_ID;
  delete process.env.ADMIN_USER_IDS;

  const app = buildServer();
  const response = await app.inject({
    method: "GET",
    url: "/v1/admin/garment-certifications",
  });

  assert.equal(response.statusCode, 401);
  await app.close();
});
