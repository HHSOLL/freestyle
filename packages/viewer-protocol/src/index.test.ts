import assert from "node:assert/strict";
import test from "node:test";
import {
  fitArtifactCacheKeyPartsSchema,
  previewDeformationResultEnvelopeSchema,
  previewEngineStatusSchema,
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

test("preview worker protocol accepts inline body collision, fit mesh, and material inputs", () => {
  const collision = previewWorkerMessageSchema.parse({
    type: "SET_COLLISION_BODY",
    collisionBody: {
      schemaVersion: "preview-body-collision.v1",
      avatarId: "female-base",
      bodySignatureHash: "bodyhash",
      colliders: [
        {
          id: "torso",
          zone: "torso",
          kind: "capsule",
          radiusCm: 14,
          halfHeightCm: 24,
          anchorId: "chestCenter",
        },
      ],
    },
  });
  const fitMesh = previewWorkerMessageSchema.parse({
    type: "SET_GARMENT_FIT_MESH",
    garmentId: "starter-top-soft-casual",
    fitMesh: {
      schemaVersion: "garment-sim-proxy.v1",
      intendedUse: "solver-authoring",
      runtimeStarterId: "starter-top-soft-casual",
      category: "tops",
      proxyStrategy: "decimated-runtime-mesh",
      meshRelativePathByVariant: {
        "female-base": "apps/web/public/assets/garments/mpfb/female/top_soft_casual_v4.glb",
      },
      triangleBudget: 3200,
      pinnedAnchorIds: ["leftShoulder", "rightShoulder", "chestCenter"],
      selfCollision: true,
    },
  });
  const material = previewWorkerMessageSchema.parse({
    type: "SET_MATERIAL_PHYSICS",
    garmentId: "starter-top-soft-casual",
    materialProfile: {
      schemaVersion: "garment-material-profile.v1",
      intendedUse: "solver-authoring",
      runtimeStarterId: "starter-top-soft-casual",
      category: "tops",
      materialPresetId: "runtime-compat-tops",
      fabricFamily: "knit",
      stretchProfile: "medium",
      thicknessMm: 1.1,
      arealDensityGsm: 180,
      solver: {
        warpStretchRatio: 0.18,
        weftStretchRatio: 0.2,
        biasStretchRatio: 0.24,
        bendStiffness: 18,
        shearStiffness: 22,
        damping: 0.92,
        friction: 0.55,
      },
    },
  });

  assert.equal(collision.type, "SET_COLLISION_BODY");
  assert.equal(fitMesh.type, "SET_GARMENT_FIT_MESH");
  assert.equal(material.type, "SET_MATERIAL_PHYSICS");
});

test("preview worker protocol preserves solve requests and deformation envelopes", () => {
  const solve = previewWorkerMessageSchema.parse({
    type: "SOLVE_PREVIEW",
    garmentId: "starter-top-soft-casual",
    frame: {
      schemaVersion: "preview-simulation-frame.v1",
      sessionId: "preview-session",
      sequence: 3,
      backend: "worker-reduced",
      elapsedTimeSeconds: 1 / 60,
      deltaSeconds: 1 / 60,
      featureSnapshot: {
        hasWorker: true,
        hasOffscreenCanvas: false,
        hasWebGPU: false,
        crossOriginIsolated: false,
      },
      currentAnchorWorld: [0, 1.4, 0],
      state: {
        initialized: true,
        lastAnchorWorld: [0, 1.4, 0],
        rotationRad: [0, 0, 0],
        rotationVelocity: [0, 0, 0],
        positionOffset: [0, 0, 0],
        positionVelocity: [0, 0, 0],
      },
      config: {
        profileId: "garment-loose",
        stiffness: 7.5,
        damping: 3.1,
        influence: 0.9,
        looseness: 1.08,
        scaleCompensation: 1,
        maxYawDeg: 16,
        maxPitchDeg: 12,
        maxRollDeg: 8,
        idleAmplitudeDeg: 0.4,
        idleFrequencyHz: 0.9,
        verticalBobCm: 1.2,
        lateralSwingCm: 1.6,
        baseOffsetY: 0.03,
      },
    },
  });
  const deformation = previewDeformationResultEnvelopeSchema.parse({
    type: "PREVIEW_DEFORMATION",
    deformation: {
      schemaVersion: "preview-deformation.v1",
      garmentId: "starter-top-soft-casual",
      sessionId: "preview-session",
      sequence: 3,
      backend: "worker-reduced",
      executionMode: "reduced-preview",
      transferMode: "secondary-motion-transform",
      rotationRad: [0.01, 0.02, 0.03],
      position: [0.001, 0.032, 0],
      settled: false,
    },
  });

  assert.equal(solve.type, "SOLVE_PREVIEW");
  assert.equal(deformation.type, "PREVIEW_DEFORMATION");
  assert.equal(deformation.deformation.transferMode, "secondary-motion-transform");
});

test("preview deformation envelopes can carry XPBD fit-mesh buffer metadata", () => {
  const deformation = previewDeformationResultEnvelopeSchema.parse({
    type: "PREVIEW_DEFORMATION",
    deformation: {
      schemaVersion: "preview-deformation.v1",
      garmentId: "starter-top-soft-casual",
      sessionId: "preview-session",
      sequence: 8,
      backend: "cpu-xpbd",
      executionMode: "cpu-xpbd-preview",
      transferMode: "fit-mesh-deformation-buffer",
      rotationRad: [0, 0, 0],
      position: [0, 0, 0],
      buffer: {
        schemaVersion: "preview-fit-mesh-deformation-buffer.v1",
        solverKind: "xpbd-cloth-preview",
        vertexCount: 3200,
        byteLength: 38400,
        transport: "transferable-array-buffer",
        dirtyRange: {
          firstVertex: 0,
          vertexCount: 3200,
        },
        copyCount: 0,
        serializeMs: 0.4,
        transferMs: 0.8,
        applyMs: 1.2,
      },
      settled: false,
    },
  });

  assert.equal(deformation.deformation.transferMode, "fit-mesh-deformation-buffer");
  assert.equal(deformation.deformation.buffer?.solverKind, "xpbd-cloth-preview");
  assert.equal(deformation.deformation.buffer?.copyCount, 0);
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

test("viewer event envelope preserves preview engine status without overstating wasm preview", () => {
  const status = previewEngineStatusSchema.parse({
    schemaVersion: "preview-engine-status.v1",
    engineKind: "reduced-preview-compat",
    executionMode: "reduced-preview",
    backend: "experimental-webgpu",
    transport: "main-thread",
    status: "fallback",
    fallbackReason: "wasm-preview-disabled",
    featureSnapshot: {
      hasWorker: true,
      hasOffscreenCanvas: false,
      hasWebGPU: true,
      crossOriginIsolated: false,
    },
  });
  const parsed = viewerEventEnvelopeSchema.parse({
    type: "fit:preview-engine-status",
    payload: status,
  });

  assert.equal(parsed.type, "fit:preview-engine-status");
  assert.equal(parsed.payload.fallbackReason, "wasm-preview-disabled");
});
