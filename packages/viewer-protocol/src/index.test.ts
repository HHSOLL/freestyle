import assert from "node:assert/strict";
import test from "node:test";
import {
  fitArtifactCacheKeyPartsSchema,
  viewerCommandSchema,
  viewerEventEnvelopeSchema,
  viewerManifestEnvelopeSchema,
  viewerSceneSchema,
} from "./index.js";

test("viewer command schema keeps camera preset and quality mode explicit", () => {
  const parsed = viewerCommandSchema.parse({
    type: "set-camera-preset",
    preset: "full-body-three-quarter",
  });

  assert.equal(parsed.type, "set-camera-preset");
  assert.equal(parsed.preset, "full-body-three-quarter");
});

test("viewer scene schema accepts typed body-signature payloads", () => {
  const parsed = viewerSceneSchema.parse({
    avatar: {
      avatarId: "female-base",
      bodySignature: {
        version: "body-signature.v1",
        measurements: {
          heightCm: 168,
          waistCm: 70,
          hipCm: 96,
        },
        normalizedShape: {
          heightClass: "average",
          torsoClass: "average",
          hipClass: "average",
          shoulderClass: "average",
        },
        hash: "abc123",
      },
    },
    garments: [
      {
        garmentId: "starter-top-soft-casual",
        size: "M",
      },
    ],
    cameraPreset: "full-body-front",
    qualityMode: "balanced",
    selectedItemId: "starter-top-soft-casual",
    backgroundColor: "#101820",
  });

  assert.equal(parsed.avatar.bodySignature?.hash, "abc123");
});

test("viewer event envelope schema preserves fit preview payloads", () => {
  const parsed = viewerEventEnvelopeSchema.parse({
    type: "fit:preview-ready",
    payload: {
      garments: [
        {
          garmentId: "starter-top-soft-casual",
          size: "M",
        },
      ],
      source: "static-fit",
    },
  });

  assert.equal(parsed.type, "fit:preview-ready");
  assert.equal(parsed.payload.source, "static-fit");
});

test("viewer manifest envelope schema tracks product approval state", () => {
  const parsed = viewerManifestEnvelopeSchema.parse({
    schemaVersion: "viewer-manifest.v1",
    renderBackend: "webgl2",
    avatar: {
      id: "female-base",
      version: "v12",
      manifestPath: "assets/avatar/female/manifest.json",
      approvalState: "PUBLISHED",
    },
    garments: [],
  });

  assert.equal(parsed.avatar.approvalState, "PUBLISHED");
});

test("fit artifact cache key parts keep versioned lineage inputs explicit", () => {
  const parsed = fitArtifactCacheKeyPartsSchema.parse({
    avatarModelVersion: "female-v12",
    bodySignatureHash: "bodyhash",
    poseFamily: "standing",
    garmentId: "starter-top-soft-casual",
    garmentVersion: "g-v4",
    selectedSize: "M",
    materialPhysicsVersion: "mat-v2",
    solverVersion: "solver-v1",
    fitPolicyVersion: "policy-v3",
  });

  assert.equal(parsed.fitPolicyVersion, "policy-v3");
});
