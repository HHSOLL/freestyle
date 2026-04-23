import assert from "node:assert/strict";
import test from "node:test";
import { defaultSkeletonProfileId, validatePublishedGarmentAsset } from "@freestyle/domain-garment";
import { buildBlankPublishedGarment, normalizeDraftForCategory } from "./publishedGarmentDraft.js";

test("buildBlankPublishedGarment uses the canonical default skeleton profile", () => {
  const draft = buildBlankPublishedGarment("tops");

  assert.equal(draft.runtime.skeletonProfileId, defaultSkeletonProfileId);
  assert.equal(draft.publication.viewerManifestVersion, "garment-manifest.v1");
  assert.equal(draft.viewerManifest?.schemaVersion, "garment-manifest.v1");
  assert.equal(draft.viewerManifest?.production.approvalState, "DRAFT");
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

test("normalizeDraftForCategory regenerates category-owned runtime defaults for drafts", () => {
  const draft = buildBlankPublishedGarment("tops");
  const normalized = normalizeDraftForCategory(draft, "shoes", { resetCategoryOwnedRuntime: true });

  assert.equal(normalized.category, "shoes");
  assert.equal(normalized.runtime.modelPath, `/assets/garments/partners/${draft.id}.glb`);
  assert.deepEqual(
    normalized.runtime.anchorBindings.map((entry) => entry.id),
    ["leftFoot", "rightFoot", "leftAnkle", "rightAnkle"],
  );
  assert.equal(normalized.viewerManifest?.fitPolicyCategory, "shoes");
  assert.equal(normalized.viewerManifest?.display.lod0, `/assets/garments/partners/${draft.id}.glb`);
  assert.deepEqual(normalized.runtime.collisionZones, ["feet"]);
  assert.deepEqual(normalized.runtime.bodyMaskZones, ["feet"]);
  assert.deepEqual(validatePublishedGarmentAsset(normalized), []);
});
