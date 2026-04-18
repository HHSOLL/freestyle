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
  const hair = fs.statSync(
    path.join(repoRoot, "apps/web/public/assets/garments/mpfb/female/hair_afro_cloud.glb"),
  ).size;
  const defaultClosetScene =
    female +
    fs.statSync(path.join(repoRoot, "apps/web/public/assets/garments/mpfb/female/top_soft_casual.glb")).size +
    fs.statSync(path.join(repoRoot, "apps/web/public/assets/garments/mpfb/female/bottom_soft_wool_v1.glb")).size +
    fs.statSync(path.join(repoRoot, "apps/web/public/assets/garments/mpfb/female/shoes_soft_sneaker.glb")).size +
    fs.statSync(path.join(repoRoot, "apps/web/public/assets/garments/mpfb/female/hair_clean_sweep.glb")).size;

  assert.ok(female <= runtimeAssetBudget.avatarGlbBytes);
  assert.ok(male <= runtimeAssetBudget.avatarGlbBytes);
  assert.ok(garment <= runtimeAssetBudget.garmentGlbBytes);
  assert.ok(hair <= runtimeAssetBudget.hairGlbBytes);
  assert.ok(defaultClosetScene <= runtimeAssetBudget.defaultClosetSceneBytes);
});
