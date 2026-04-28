import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFitKernelPreviewDeformationEnvelope,
  buildFitKernelPreviewFrameRequest,
  buildFitKernelPreviewResultEnvelope,
  createFitKernelPreviewFrameState,
  defaultFitKernelBufferTransport,
  defaultFitKernelExecutionMode,
  defaultFitKernelPreviewDeformationTransferMode,
  defaultFitKernelPreviewEngineKind,
  detectFitKernelPreviewFeatures,
  fitKernelXpbdDeformationBufferSchemaVersion,
  fitKernelXpbdPreviewSolveSchemaVersion,
  fitKernelBufferTransports,
  fitKernelPreviewDeformationTransferModes,
  fitKernelExecutionModes,
  fitKernelPreviewEngineKinds,
  fitKernelPreviewEngineStatuses,
  isFitKernelPreviewDeformationEnvelope,
  isFitKernelPreviewResultEnvelope,
  resolveFitKernelBufferTransport,
  resolveFitKernelPreviewEngineStatus,
  resolveFitKernelExecutionMode,
  solveFitKernelXpbdPreview,
  stepFitKernelPreviewFrame,
} from "./index.js";

test("fit-kernel exposes canonical execution modes and transports", () => {
  assert.deepEqual(fitKernelExecutionModes, [
    "reduced-preview",
    "cpu-xpbd-preview",
    "wasm-preview",
    "static-fit",
  ]);
  assert.deepEqual(fitKernelBufferTransports, [
    "transferable-array-buffer",
    "shared-array-buffer",
  ]);
  assert.equal(defaultFitKernelExecutionMode, "reduced-preview");
  assert.equal(defaultFitKernelBufferTransport, "transferable-array-buffer");
  assert.equal(
    defaultFitKernelPreviewDeformationTransferMode,
    "secondary-motion-transform",
  );
  assert.equal(defaultFitKernelPreviewEngineKind, "reduced-preview-compat");
  assert.deepEqual(fitKernelPreviewDeformationTransferModes, [
    "secondary-motion-transform",
    "fit-mesh-deformation-buffer",
  ]);
  assert.deepEqual(fitKernelPreviewEngineKinds, [
    "static-fit-compat",
    "reduced-preview-compat",
    "cpu-xpbd-preview",
    "wasm-preview",
  ]);
  assert.deepEqual(fitKernelPreviewEngineStatuses, ["ready", "fallback"]);
});

test("fit-kernel only enables SharedArrayBuffer on the optional fast path", () => {
  assert.equal(resolveFitKernelBufferTransport(), "transferable-array-buffer");
  assert.equal(
    resolveFitKernelBufferTransport({
      crossOriginIsolated: true,
      sharedArrayBufferRequested: true,
    }),
    "shared-array-buffer",
  );
});

test("fit-kernel detects current preview runtime features without overstating worker support", () => {
  const snapshot = detectFitKernelPreviewFeatures({
    Worker: function Worker() {
      return undefined;
    },
    OffscreenCanvas: function OffscreenCanvas() {
      return undefined;
    },
    crossOriginIsolated: true,
    navigator: {
      gpu: {},
    },
  });

  assert.deepEqual(snapshot, {
    hasWorker: true,
    hasOffscreenCanvas: true,
    hasWebGPU: true,
    crossOriginIsolated: true,
  });
});

test("fit-kernel resolves current execution mode truthfully for reduced preview backends", () => {
  assert.equal(resolveFitKernelExecutionMode({ backend: "static-fit" }), "static-fit");
  assert.equal(resolveFitKernelExecutionMode({ backend: "cpu-xpbd" }), "cpu-xpbd-preview");
  assert.equal(resolveFitKernelExecutionMode({ backend: "wasm-preview" }), "wasm-preview");
  assert.equal(resolveFitKernelExecutionMode({ backend: "worker-reduced" }), "reduced-preview");
  assert.equal(
    resolveFitKernelExecutionMode({ backend: "worker-reduced", wasmPreviewEnabled: true }),
    "wasm-preview",
  );
});

test("fit-kernel resolves preview engine status without overstating wasm availability", () => {
  const featureSnapshot = {
    hasWorker: true,
    hasOffscreenCanvas: false,
    hasWebGPU: true,
    crossOriginIsolated: false,
  } as const;

  assert.deepEqual(
    resolveFitKernelPreviewEngineStatus({
      backend: "static-fit",
      featureSnapshot,
      hasContinuousMotion: false,
      qualityTier: "balanced",
    }),
    {
      engineKind: "static-fit-compat",
      executionMode: "static-fit",
      backend: "static-fit",
      transport: "main-thread",
      status: "fallback",
      fallbackReason: "no-continuous-motion",
      featureSnapshot,
    },
  );

  assert.deepEqual(
    resolveFitKernelPreviewEngineStatus({
      backend: "worker-reduced",
      featureSnapshot,
      hasContinuousMotion: true,
      qualityTier: "balanced",
    }),
    {
      engineKind: "reduced-preview-compat",
      executionMode: "reduced-preview",
      backend: "worker-reduced",
      transport: "worker-message",
      status: "ready",
      featureSnapshot,
    },
  );

  assert.deepEqual(
    resolveFitKernelPreviewEngineStatus({
      backend: "cpu-xpbd",
      featureSnapshot,
      hasContinuousMotion: true,
      qualityTier: "balanced",
    }),
    {
      engineKind: "cpu-xpbd-preview",
      executionMode: "cpu-xpbd-preview",
      backend: "cpu-xpbd",
      transport: "worker-message",
      status: "ready",
      featureSnapshot,
    },
  );

  assert.deepEqual(
    resolveFitKernelPreviewEngineStatus({
      backend: "wasm-preview",
      featureSnapshot,
      hasContinuousMotion: true,
      qualityTier: "balanced",
    }),
    {
      engineKind: "wasm-preview",
      executionMode: "wasm-preview",
      backend: "wasm-preview",
      transport: "worker-message",
      status: "ready",
      featureSnapshot,
    },
  );

  assert.deepEqual(
    resolveFitKernelPreviewEngineStatus({
      backend: "experimental-webgpu",
      featureSnapshot,
      hasContinuousMotion: true,
      qualityTier: "high",
    }),
    {
      engineKind: "reduced-preview-compat",
      executionMode: "reduced-preview",
      backend: "experimental-webgpu",
      transport: "main-thread",
      status: "fallback",
      fallbackReason: "wasm-preview-disabled",
      featureSnapshot,
    },
  );

  assert.deepEqual(
    resolveFitKernelPreviewEngineStatus({
      backend: "worker-reduced",
      featureSnapshot,
      hasContinuousMotion: true,
      qualityTier: "balanced",
      workerBootFailed: true,
    }),
    {
      engineKind: "reduced-preview-compat",
      executionMode: "reduced-preview",
      backend: "worker-reduced",
      transport: "main-thread",
      status: "fallback",
      fallbackReason: "engine-boot-failed",
      featureSnapshot,
    },
  );
});

test("fit-kernel builds reduced preview metrics and result envelopes from stepped frames", () => {
  const featureSnapshot = {
    hasWorker: true,
    hasOffscreenCanvas: false,
    hasWebGPU: false,
    crossOriginIsolated: false,
  } as const;

  const config = {
    profileId: "garment-loose" as const,
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
  };

  const result = stepFitKernelPreviewFrame(
    buildFitKernelPreviewFrameRequest({
      sessionId: "session-a",
      sequence: 1,
      backend: "worker-reduced",
      elapsedTimeSeconds: 1 / 60,
      deltaSeconds: 1 / 60,
      featureSnapshot,
      currentAnchorWorld: [0.08, 1.42, 0.02],
      state: createFitKernelPreviewFrameState(),
      config,
    }),
  );
  const envelope = buildFitKernelPreviewResultEnvelope({
    backend: "worker-reduced",
    result,
    solveDurationMs: 0.42,
  });
  const deformationEnvelope = buildFitKernelPreviewDeformationEnvelope({
    garmentId: "starter-top-soft-casual",
    result,
  });

  assert.equal(result.state.initialized, true);
  assert.equal(envelope.type, "PREVIEW_FRAME_RESULT");
  assert.equal(envelope.metrics.executionMode, "reduced-preview");
  assert.equal(envelope.metrics.backend, "worker-reduced");
  assert.equal(envelope.metrics.solveDurationMs, 0.42);
  assert.equal(envelope.metrics.shouldContinue, result.shouldContinue);
  assert.equal(isFitKernelPreviewResultEnvelope(envelope), true);
  assert.equal(isFitKernelPreviewDeformationEnvelope(deformationEnvelope), true);
  assert.equal(isFitKernelPreviewResultEnvelope(result), false);
  assert.equal(
    deformationEnvelope.deformation.transferMode,
    "secondary-motion-transform",
  );
  assert.equal(deformationEnvelope.deformation.garmentId, "starter-top-soft-casual");
  assert.equal(deformationEnvelope.deformation.settled, false);
  assert.notDeepEqual(result.rotationRad, [0, 0, 0]);
});

test("fit-kernel XPBD preview solves only fit mesh positions and emits a deformation buffer", () => {
  const result = solveFitKernelXpbdPreview({
    schemaVersion: fitKernelXpbdPreviewSolveSchemaVersion,
    sessionId: "xpbd-session",
    garmentId: "starter-top-soft-casual",
    sequence: 7,
    positions: new Float32Array([
      0, 0, 0,
      1.4, 0, 0,
      0, -0.8, 0,
    ]),
    previousPositions: new Float32Array([
      0, 0, 0,
      1.4, 0, 0,
      0, -0.8, 0,
    ]),
    inverseMasses: new Float32Array([0, 1, 1]),
    deltaSeconds: 1 / 60,
    iterations: 18,
    gravity: [0, 0, 0],
    constraints: [
      {
        kind: "pin",
        particle: 0,
        target: [0, 0, 0],
      },
      {
        kind: "stretch",
        particleA: 0,
        particleB: 1,
        restLengthMeters: 1,
      },
      {
        kind: "shear",
        particleA: 0,
        particleB: 2,
        restLengthMeters: 0.75,
      },
    ],
  });

  assert.equal(result.schemaVersion, fitKernelXpbdDeformationBufferSchemaVersion);
  assert.equal(result.solverKind, "xpbd-cloth-preview");
  assert.equal(result.transferMode, "fit-mesh-deformation-buffer");
  assert.equal(result.vertexCount, 3);
  assert.equal(result.positions.length, 9);
  assert.equal(result.displacements.length, 9);
  assert.equal(result.hasNaN, false);
  assert.equal(result.iterations, 18);
  assert.ok(result.maxDisplacementMm > 0);
  assert.ok(result.residualError < 0.05);
  assert.equal(result.positions[0], 0);
  assert.equal(result.positions[1], 0);
  assert.equal(result.positions[2], 0);
  assert.ok(Math.abs((result.positions[3] ?? 0) - 1) < 0.01);
  assert.ok(Math.abs((result.positions[7] ?? 0) + 0.75) < 0.01);
});

test("fit-kernel XPBD preview enforces body sphere collision constraints", () => {
  const result = solveFitKernelXpbdPreview({
    schemaVersion: fitKernelXpbdPreviewSolveSchemaVersion,
    sessionId: "xpbd-session",
    garmentId: "sandal-strap",
    sequence: 2,
    positions: [0, 0.1, 0],
    previousPositions: [0, 0.1, 0],
    inverseMasses: [1],
    deltaSeconds: 1 / 60,
    iterations: 2,
    gravity: [0, 0, 0],
    constraints: [
      {
        kind: "sphere-collision",
        particle: 0,
        center: [0, 0, 0],
        radiusMeters: 0.25,
        marginMeters: 0.01,
      },
    ],
  });

  assert.equal(result.positions.length, 3);
  assert.ok((result.positions[1] ?? 0) >= 0.259);
  assert.ok(result.maxDisplacementMm >= 150);
  assert.equal(result.hasNaN, false);
});

test("fit-kernel XPBD preview fails closed on invalid numeric input", () => {
  assert.throws(
    () =>
      solveFitKernelXpbdPreview({
        schemaVersion: fitKernelXpbdPreviewSolveSchemaVersion,
        sessionId: "xpbd-session",
        garmentId: "broken",
        sequence: 1,
        positions: [0, Number.NaN, 0],
        inverseMasses: [1],
        deltaSeconds: 1 / 60,
        iterations: 1,
        constraints: [],
      }),
    /positions contains a non-finite value/,
  );
});
