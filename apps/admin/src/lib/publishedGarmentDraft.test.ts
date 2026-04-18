import assert from "node:assert/strict";
import test from "node:test";
import { defaultSkeletonProfileId, validatePublishedGarmentAsset } from "@freestyle/domain-garment";
import { buildBlankPublishedGarment, normalizeDraftForCategory } from "./publishedGarmentDraft.js";

test("buildBlankPublishedGarment uses the canonical default skeleton profile", () => {
  const draft = buildBlankPublishedGarment("tops");

  assert.equal(draft.runtime.skeletonProfileId, defaultSkeletonProfileId);
  assert.deepEqual(validatePublishedGarmentAsset(draft), []);
});

test("normalizeDraftForCategory rewrites legacy invalid skeleton ids to the canonical default", () => {
  const legacyDraft = {
    ...buildBlankPublishedGarment("outerwear"),
    runtime: {
      ...buildBlankPublishedGarment("outerwear").runtime,
      skeletonProfileId: "freestyle-humanoid-v1",
    },
  };

  const normalized = normalizeDraftForCategory(legacyDraft, "outerwear");

  assert.equal(normalized.runtime.skeletonProfileId, defaultSkeletonProfileId);
  assert.deepEqual(validatePublishedGarmentAsset(normalized), []);
});
