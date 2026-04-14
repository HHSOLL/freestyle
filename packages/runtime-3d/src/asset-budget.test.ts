import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runtimeAssetBudget } from "./index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("avatar runtime assets stay within declared size budget", () => {
  const female = fs.statSync(path.join(repoRoot, "apps/web/public/assets/avatars/mpfb-female-base.glb")).size;
  const male = fs.statSync(path.join(repoRoot, "apps/web/public/assets/avatars/mpfb-male-base.glb")).size;
  const garment = fs.statSync(
    path.join(repoRoot, "apps/web/public/assets/garments/mpfb/female/outer_tailored_layer.glb"),
  ).size;

  assert.ok(female <= runtimeAssetBudget.avatarGlbBytes);
  assert.ok(male <= runtimeAssetBudget.avatarGlbBytes);
  assert.ok(garment <= runtimeAssetBudget.garmentGlbBytes);
});
