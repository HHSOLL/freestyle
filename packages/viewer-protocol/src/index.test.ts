import assert from "node:assert/strict";
import test from "node:test";
import {
  fitArtifactCacheKeyPartsSchema,
  previewFrameMetricsSchema,
  previewRuntimeSnapshotSchema,
  previewTransportBackendDefault,
  previewWorkerMessageSchema,
  previewWorkerResultEnvelopeSchema,
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

test("viewer command and preview payloads allow avatar-only scenes without garments", () => {
  const command = viewerCommandSchema.parse({
    type: "apply-garments",
    garments: [],
  });
  const envelope = viewerEventEnvelopeSchema.parse({
    type: "fit:preview-ready",
    payload: {
      garments: [],
      source: "static-fit",
    },
  });

  assert.equal(command.type, "apply-garments");
  assert.equal(envelope.type, "fit:preview-ready");
  assert.deepEqual(command.garments, []);
  assert.deepEqual(envelope.payload.garments, []);
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

test("preview worker protocol reuses the fit-kernel transport default", () => {
  const parsed = previewWorkerMessageSchema.parse({
    type: "INIT_SOLVER",
    backend: previewTransportBackendDefault,
  });

  assert.equal(parsed.type, "INIT_SOLVER");
  assert.equal(parsed.backend, "transferable-array-buffer");
});

test("preview worker result envelope keeps reduced-preview metrics explicit", () => {
  const parsed = previewWorkerResultEnvelopeSchema.parse({
    type: "PREVIEW_FRAME_RESULT",
    result: {
      schemaVersion: "preview-simulation-frame.v1",
      sessionId: "preview-session",
      sequence: 3,
      backend: "worker-reduced",
      state: {
        initialized: true,
        lastAnchorWorld: [0, 1.4, 0],
        rotationRad: [0.01, 0.02, 0.03],
        rotationVelocity: [0.001, 0.002, 0.003],
        positionOffset: [0.001, 0.002, 0],
        positionVelocity: [0.0001, 0.0002, 0],
      },
      rotationRad: [0.01, 0.02, 0.03],
      position: [0.001, 0.032, 0],
      targetRotationRad: [0.02, 0.03, 0.01],
      targetPosition: [0.004, 0.035, 0],
      angularEnergy: 0.12,
      positionalEnergy: 0.02,
      anchorEnergy: 0.3,
      shouldContinue: true,
    },
    metrics: {
      solverKind: "reduced-preview-spring",
      executionMode: "reduced-preview",
      backend: "worker-reduced",
      solveDurationMs: 0.42,
      angularEnergy: 0.12,
      positionalEnergy: 0.02,
      anchorEnergy: 0.3,
      shouldContinue: true,
    },
  });

  const metrics = previewFrameMetricsSchema.parse(parsed.metrics);
  assert.equal(parsed.type, "PREVIEW_FRAME_RESULT");
  assert.equal(metrics.executionMode, "reduced-preview");
});

test("viewer event envelope preserves preview runtime snapshots as read-only evidence", () => {
  const snapshot = previewRuntimeSnapshotSchema.parse({
    schemaVersion: "preview-runtime-snapshot.v1",
    sessionId: "preview-session",
    sequence: 4,
    executionMode: "reduced-preview",
    backend: "worker-reduced",
    solverKind: "reduced-preview-spring",
    solveDurationMs: 0.42,
    angularEnergy: 0.12,
    positionalEnergy: 0.02,
    anchorEnergy: 0.3,
    shouldContinue: true,
    settled: false,
  });
  const parsed = viewerEventEnvelopeSchema.parse({
    type: "fit:preview-runtime-updated",
    payload: snapshot,
  });

  assert.equal(parsed.type, "fit:preview-runtime-updated");
  assert.equal(parsed.payload.backend, "worker-reduced");
  assert.equal(parsed.payload.executionMode, "reduced-preview");
});
