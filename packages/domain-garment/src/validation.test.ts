import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultSkeletonProfileId,
  starterGarmentCatalog,
  validateGarmentRuntimeBinding,
  validateStarterGarment,
} from "./index.js";

test("starter garment catalog satisfies runtime contract", () => {
  const issues = starterGarmentCatalog.flatMap(validateStarterGarment);
  assert.deepEqual(issues, []);
});

test("garment runtime binding rejects unknown skeleton profiles and anchors", () => {
  const issues = validateGarmentRuntimeBinding({
    modelPath: "/assets/closet/models/top_tee.glb",
    skeletonProfileId: "unknown-rig",
    anchorBindings: [{ id: "leftShoulder", weight: 1 }],
    collisionZones: ["torso"],
    bodyMaskZones: ["torso"],
    surfaceClearanceCm: 1,
    renderPriority: 1,
  });

  assert.deepEqual(issues, ["unknown skeletonProfileId: unknown-rig"]);
});

test("garment runtime binding validates anchors against the declared skeleton profile", () => {
  const issues = validateGarmentRuntimeBinding({
    modelPath: "/assets/closet/models/top_tee.glb",
    skeletonProfileId: defaultSkeletonProfileId,
    anchorBindings: [
      { id: "leftShoulder", weight: 0.5 },
      { id: "leftAnkle", weight: 0.5 },
    ],
    collisionZones: ["torso"],
    bodyMaskZones: ["torso"],
    surfaceClearanceCm: 1,
    renderPriority: 1,
  });

  assert.deepEqual(issues, []);
});
