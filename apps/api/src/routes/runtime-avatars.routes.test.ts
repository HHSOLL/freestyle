import assert from "node:assert/strict";
import test from "node:test";
import {
  publishedRuntimeAvatarItemResponseSchema,
  publishedRuntimeAvatarListResponseSchema,
} from "@freestyle/contracts";
import { runtimeAvatarRenderManifestSchemaVersion } from "@freestyle/shared-types";
import { resolveAvatarRuntimeModelPath } from "@freestyle/runtime-3d/avatar-manifest";
import { buildServer } from "../main.js";

test.beforeEach(() => {
  process.env.DEV_BYPASS_USER_ID = "00000000-0000-4000-8000-000000000001";
  process.env.ADMIN_USER_IDS = process.env.DEV_BYPASS_USER_ID;
});

test.after(() => {
  delete process.env.DEV_BYPASS_USER_ID;
  delete process.env.ADMIN_USER_IDS;
});

test("published runtime avatars are exposed through admin routes only", async () => {
  const app = buildServer();

  const listResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/avatars",
  });

  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.headers["x-freestyle-surface"], "product");
  const listPayload = publishedRuntimeAvatarListResponseSchema.parse(listResponse.json());
  assert.equal(listPayload.total, 2);
  assert.equal(listPayload.items[0]?.publication.approvalState, "PUBLISHED");
  assert.equal(
    listPayload.items.find((item) => item.id === "female-base")?.lodModelPaths?.lod1,
    resolveAvatarRuntimeModelPath("female-base", "balanced"),
  );
  assert.equal(
    listPayload.items.find((item) => item.id === "female-base")?.lodModelPaths?.lod2,
    resolveAvatarRuntimeModelPath("female-base", "low"),
  );

  const detailResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/avatars/female-base",
  });

  assert.equal(detailResponse.statusCode, 200);
  const detailPayload = publishedRuntimeAvatarItemResponseSchema.parse(detailResponse.json());
  assert.equal(detailPayload.item.id, "female-base");
  assert.equal(
    detailPayload.item.publication.runtimeManifestVersion,
    runtimeAvatarRenderManifestSchemaVersion,
  );

  const filteredResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/avatars?approval_state=DRAFT",
  });

  assert.equal(filteredResponse.statusCode, 200);
  const filteredPayload = publishedRuntimeAvatarListResponseSchema.parse(filteredResponse.json());
  assert.equal(filteredPayload.total, 0);

  await app.close();
});

test("runtime avatar admin routes reject anonymous callers", async () => {
  delete process.env.DEV_BYPASS_USER_ID;
  delete process.env.ADMIN_USER_IDS;

  const app = buildServer();
  const response = await app.inject({
    method: "GET",
    url: "/v1/admin/avatars",
  });

  assert.equal(response.statusCode, 401);
  await app.close();
});
