import test from "node:test";
import assert from "node:assert/strict";
import { starterGarmentCatalog } from "@freestyle/domain-garment";
import { defaultBodyProfile, type RuntimeGarmentAsset } from "@freestyle/shared-types";
import {
  hasSignificantContinuousMotion,
  resolveReferenceClosetStageScenePolicy,
} from "./reference-closet-stage-policy.js";

const garmentById = (id: string) => {
  const garment = starterGarmentCatalog.find((item) => item.id === id);
  assert.ok(garment, `expected starter garment ${id} to exist`);
  return garment as RuntimeGarmentAsset;
};

test("hasSignificantContinuousMotion keeps long-hair runtime motion enabled above low quality", () => {
  const garment = garmentById("starter-hair-long-fall");

  assert.equal(hasSignificantContinuousMotion(garment, defaultBodyProfile, "neutral", "balanced"), true);
});

test("hasSignificantContinuousMotion disables secondary motion at low quality even for long-hair assets", () => {
  const garment = garmentById("starter-hair-long-fall");

  assert.equal(hasSignificantContinuousMotion(garment, defaultBodyProfile, "neutral", "low"), false);
});

test("resolveReferenceClosetStageScenePolicy returns avatar-only lighting and demand settings when no garments are equipped", () => {
  const policy = resolveReferenceClosetStageScenePolicy({
    bodyProfile: defaultBodyProfile,
    equippedGarments: [],
    poseId: "neutral",
    qualityTier: "balanced",
  });

  assert.equal(policy.avatarOnly, true);
  assert.equal(policy.hasContinuousMotion, false);
  assert.equal(policy.frameloop, "demand");
  assert.deepEqual(policy.dpr, [0.95, 1.25]);
  assert.equal(policy.backgroundColor, "#d7cec6");
  assert.equal(policy.fogColor, "#d7cec6");
  assert.equal(policy.controlsEnableDamping, true);
  assert.equal(policy.controlsDampingFactor, 0.06);
  assert.equal(policy.lighting.ambientIntensity, 0.48);
  assert.equal(policy.lighting.directional.color, "#fff8ef");
  assert.equal(policy.lighting.avatarOnlyAccent?.directionalIntensity, 0.42);
});

test("resolveReferenceClosetStageScenePolicy keeps dressed high-tier stages shadowed and motion-aware", () => {
  const policy = resolveReferenceClosetStageScenePolicy({
    bodyProfile: defaultBodyProfile,
    equippedGarments: [garmentById("starter-outer-tailored-layer")],
    poseId: "stride",
    qualityTier: "high",
  });

  assert.equal(policy.avatarOnly, false);
  assert.equal(policy.hasContinuousMotion, true);
  assert.equal(policy.shadows, true);
  assert.equal(policy.antialias, true);
  assert.deepEqual(policy.dpr, [1, 1.5]);
  assert.equal(policy.backgroundColor, "#d0d4db");
  assert.equal(policy.controlsEnableDamping, true);
  assert.equal(policy.controlsDampingFactor, 0.08);
  assert.equal(policy.lighting.directional.shadowMapSize, 1536);
  assert.equal(policy.lighting.avatarOnlyAccent, null);
});

test("resolveReferenceClosetStageScenePolicy disables demand-motion extras on low-tier rigid looks", () => {
  const policy = resolveReferenceClosetStageScenePolicy({
    bodyProfile: defaultBodyProfile,
    equippedGarments: [garmentById("starter-top-soft-casual")],
    poseId: "neutral",
    qualityTier: "low",
  });

  assert.equal(policy.avatarOnly, false);
  assert.equal(policy.hasContinuousMotion, false);
  assert.equal(policy.shadows, false);
  assert.equal(policy.antialias, false);
  assert.deepEqual(policy.dpr, [0.85, 1]);
  assert.equal(policy.controlsEnableDamping, false);
  assert.equal(policy.lighting.directional.shadowMapSize, 1024);
});
