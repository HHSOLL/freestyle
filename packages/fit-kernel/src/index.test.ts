import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFitKernelPreviewFrameRequest,
  buildFitKernelPreviewResultEnvelope,
  createFitKernelPreviewFrameState,
  defaultFitKernelBufferTransport,
  defaultFitKernelExecutionMode,
  detectFitKernelPreviewFeatures,
  fitKernelBufferTransports,
  fitKernelExecutionModes,
  isFitKernelPreviewResultEnvelope,
  resolveFitKernelBufferTransport,
  resolveFitKernelExecutionMode,
  stepFitKernelPreviewFrame,
} from "./index.js";

test("fit-kernel exposes canonical execution modes and transports", () => {
  assert.deepEqual(fitKernelExecutionModes, [
    "reduced-preview",
    "wasm-preview",
    "static-fit",
  ]);
  assert.deepEqual(fitKernelBufferTransports, [
    "transferable-array-buffer",
    "shared-array-buffer",
  ]);
  assert.equal(defaultFitKernelExecutionMode, "reduced-preview");
  assert.equal(defaultFitKernelBufferTransport, "transferable-array-buffer");
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
  assert.equal(resolveFitKernelExecutionMode({ backend: "worker-reduced" }), "reduced-preview");
  assert.equal(
    resolveFitKernelExecutionMode({ backend: "worker-reduced", wasmPreviewEnabled: true }),
    "wasm-preview",
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

  assert.equal(result.state.initialized, true);
  assert.equal(envelope.type, "PREVIEW_FRAME_RESULT");
  assert.equal(envelope.metrics.executionMode, "reduced-preview");
  assert.equal(envelope.metrics.backend, "worker-reduced");
  assert.equal(envelope.metrics.solveDurationMs, 0.42);
  assert.equal(envelope.metrics.shouldContinue, result.shouldContinue);
  assert.equal(isFitKernelPreviewResultEnvelope(envelope), true);
  assert.equal(isFitKernelPreviewResultEnvelope(result), false);
  assert.notDeepEqual(result.rotationRad, [0, 0, 0]);
});
