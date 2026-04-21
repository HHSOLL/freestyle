import assert from "node:assert/strict";
import test from "node:test";
import { defaultBodyProfile } from "@freestyle/shared-types";
import { assessGarmentPhysicalFit, starterGarmentCatalog } from "@freestyle/domain-garment";
import {
  collisionZonesFromLimitingKeys,
  getAdaptiveCollisionClearanceMultiplier,
  getAdaptiveGarmentAdjustment,
  getFitVisualCue,
} from "./reference-closet-stage-sim-adapter.js";

test("collisionZonesFromLimitingKeys maps fit dimensions into stage collision zones", () => {
  assert.deepEqual(
    Array.from(collisionZonesFromLimitingKeys("tops", ["chestCm", "sleeveLengthCm"])).sort(),
    ["arms", "hips", "torso"],
  );
  assert.deepEqual(
    Array.from(collisionZonesFromLimitingKeys("shoes", ["lengthCm", "hemCm"])).sort(),
    ["feet"],
  );
});

test("getAdaptiveCollisionClearanceMultiplier increases for compression-heavy garments", () => {
  const garment = starterGarmentCatalog.find((entry) => entry.id === "starter-top-soft-casual");
  assert.ok(garment);
  const assessment = assessGarmentPhysicalFit(garment, {
    ...defaultBodyProfile,
    simple: {
      ...defaultBodyProfile.simple,
      chestCm: 122,
      waistCm: 112,
    },
  });
  assert.ok(assessment);

  assert.ok(getAdaptiveCollisionClearanceMultiplier(garment, assessment) > 1);
});

test("getFitVisualCue highlights tighter fits and selected items", () => {
  const garment = starterGarmentCatalog.find((entry) => entry.id === "starter-top-soft-casual");
  assert.ok(garment);
  const assessment = assessGarmentPhysicalFit(garment, defaultBodyProfile);
  assert.ok(assessment);

  const idleCue = getFitVisualCue(assessment, false);
  const selectedCue = getFitVisualCue(assessment, true);

  assert.ok(selectedCue.scaleMultiplier >= idleCue.scaleMultiplier);
  assert.ok(selectedCue.emissiveIntensity >= idleCue.emissiveIntensity);
});

test("getAdaptiveGarmentAdjustment expands layered outerwear in stride pose", () => {
  const garment = starterGarmentCatalog.find((entry) => entry.id === "starter-outer-tailored-layer");
  assert.ok(garment);
  const assessment = assessGarmentPhysicalFit(garment, defaultBodyProfile);
  assert.ok(assessment);

  const adjustment = getAdaptiveGarmentAdjustment(garment, assessment, "stride", {
    layeredUnderOuterwear: false,
    hasTopUnderneath: true,
  });

  assert.ok(adjustment.widthScale > 1);
  assert.ok(adjustment.depthScale > 1);
  assert.ok(adjustment.heightScale >= 1);
});
