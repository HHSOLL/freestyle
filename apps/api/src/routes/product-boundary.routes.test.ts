import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { buildServer } from "../main.js";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "freestyle-api-"));
const bodyProfileStorePath = path.join(tempDir, "body-profiles.json");

test.beforeEach(() => {
  process.env.DEV_BYPASS_USER_ID = "00000000-0000-4000-8000-000000000001";
  process.env.BODY_PROFILE_STORE_PATH = bodyProfileStorePath;
  try {
    fs.unlinkSync(bodyProfileStorePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
});

test.after(() => {
  delete process.env.DEV_BYPASS_USER_ID;
  delete process.env.BODY_PROFILE_STORE_PATH;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("product surface persists body profile through the profile namespace", async () => {
  const app = buildServer();

  const putResponse = await app.inject({
    method: "PUT",
    url: "/v1/profile/body-profile",
    payload: {
      profile: {
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
  assert.equal(putResponse.json().bodyProfile.version, 1);

  const getResponse = await app.inject({
    method: "GET",
    url: "/v1/profile/body-profile",
  });

  assert.equal(getResponse.statusCode, 200);
  assert.equal(getResponse.json().bodyProfile.profile.simple.heightCm, 172);

  await app.close();
});

test("legacy and lab namespaces stay isolated from the main product surface", async () => {
  delete process.env.DEV_BYPASS_USER_ID;
  const app = buildServer();

  const [legacyAssets, legacyWidget, labTryons, missingOldAssets] = await Promise.all([
    app.inject({ method: "GET", url: "/v1/legacy/assets" }),
    app.inject({ method: "GET", url: "/v1/legacy/widget/config?tenant_id=t&product_id=p" }),
    app.inject({ method: "POST", url: "/v1/lab/jobs/tryons", payload: {} }),
    app.inject({ method: "GET", url: "/v1/assets" }),
  ]);

  assert.equal(legacyAssets.statusCode, 401);
  assert.equal(legacyAssets.headers["x-freestyle-surface"], "legacy");
  assert.equal(legacyAssets.headers.deprecation, "true");
  assert.equal(legacyWidget.statusCode, 200);
  assert.equal(legacyWidget.headers["x-freestyle-surface"], "legacy");
  assert.equal(labTryons.statusCode, 401);
  assert.equal(labTryons.headers["x-freestyle-surface"], "lab");
  assert.equal(missingOldAssets.statusCode, 404);

  await app.close();
});
