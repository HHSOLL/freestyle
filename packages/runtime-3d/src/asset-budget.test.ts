import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runtimeAssetBudget } from "./index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("avatar runtime assets stay within declared size budget", () => {
  const female = fs.statSync(path.join(repoRoot, "apps/web/public/assets/avatars/quaternius-animated-woman.glb")).size;
  const male = fs.statSync(path.join(repoRoot, "apps/web/public/assets/avatars/quaternius-man.glb")).size;
  const garment = fs.statSync(path.join(repoRoot, "apps/web/public/assets/closet/models/outer_bomber.glb")).size;

  assert.ok(female <= runtimeAssetBudget.avatarGlbBytes);
  assert.ok(male <= runtimeAssetBudget.avatarGlbBytes);
  assert.ok(garment <= runtimeAssetBudget.garmentGlbBytes);
});
