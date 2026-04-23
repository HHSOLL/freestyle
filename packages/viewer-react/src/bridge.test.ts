import assert from "node:assert/strict";
import test from "node:test";
import type { BodyProfile, RuntimeGarmentAsset } from "@freestyle/shared-types";
import {
  buildViewerBodySignature,
  buildViewerAvatarInput,
  buildViewerGarmentsInput,
  buildViewerSceneInput,
  resolveViewerCameraPreset,
} from "./bridge.js";

const bodyProfile: BodyProfile = {
  version: 2,
  gender: "female",
  bodyFrame: "balanced",
  simple: {
    heightCm: 168,
    shoulderCm: 40,
    chestCm: 88,
    waistCm: 70,
    hipCm: 96,
    inseamCm: 79,
  },
};

const garment: RuntimeGarmentAsset = {
  id: "starter-top-soft-casual",
  name: "Soft Casual Top",
  imageSrc: "/assets/garments/starter-top.png",
  category: "tops",
  source: "starter",
  palette: [],
  runtime: {
    modelPath: "/assets/garments/mpfb/female/top_soft_casual_v4.glb",
    skeletonProfileId: "mpfb-v1",
    anchorBindings: [],
    collisionZones: ["torso"],
    bodyMaskZones: ["torso"],
    surfaceClearanceCm: 0.8,
    renderPriority: 10,
  },
  metadata: {
    selectedSizeLabel: "M",
  },
};

test("buildViewerBodySignature derives a canonical typed body signature", () => {
  const signature = buildViewerBodySignature(bodyProfile);

  assert.equal(signature.version, "body-signature.v1");
  assert.equal(signature.measurements.heightCm, 168);
  assert.equal(signature.measurements.bustCm, 88);
  assert.equal(signature.normalizedShape.heightClass, "average");
  assert.equal(signature.normalizedShape.shoulderClass, "average");
  assert.match(signature.hash, /^[a-z0-9]+$/);
});

test("buildViewerAvatarInput derives a canonical typed body signature", () => {
  const input = buildViewerAvatarInput({
    avatarVariantId: "female-base",
    bodyProfile,
  });

  assert.equal(input.avatarId, "female-base");
  assert.equal(input.bodySignature?.version, "body-signature.v1");
  assert.equal(input.bodySignature?.measurements.waistCm, 70);
  assert.deepEqual(input.appearance, {
    avatarVariantId: "female-base",
    gender: "female",
    bodyFrame: "balanced",
  });
});

test("buildViewerGarmentsInput keeps garment ids and selected sizes only", () => {
  assert.deepEqual(buildViewerGarmentsInput([garment]), [
    {
      garmentId: "starter-top-soft-casual",
      size: "M",
    },
  ]);
});

test("resolveViewerCameraPreset keeps pose-to-camera mapping explicit", () => {
  assert.equal(resolveViewerCameraPreset("neutral"), "full-body-front");
  assert.equal(resolveViewerCameraPreset("stride"), "full-body-three-quarter");
  assert.equal(resolveViewerCameraPreset("tailored"), "full-body-front-tight");
});

test("buildViewerSceneInput keeps the full viewport payload together", () => {
  const input = buildViewerSceneInput({
    avatarVariantId: "female-base",
    backgroundColor: "#101820",
    bodyProfile,
    equippedGarments: [garment],
    poseId: "stride",
    qualityTier: "balanced",
    selectedItemId: garment.id,
  });

  assert.equal(input.avatar.avatarId, "female-base");
  assert.equal(input.cameraPreset, "full-body-three-quarter");
  assert.equal(input.qualityMode, "balanced");
  assert.equal(input.selectedItemId, garment.id);
  assert.equal(input.backgroundColor, "#101820");
  assert.deepEqual(input.garments, [
    {
      garmentId: "starter-top-soft-casual",
      size: "M",
    },
  ]);
});
