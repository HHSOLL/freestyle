import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReferenceClosetStagePreviewFrameRequest,
  createReferenceClosetStagePreviewFrameState,
  detectReferenceClosetStagePreviewFeatures,
  resolveReferenceClosetStagePreviewBackend,
  stepReferenceClosetStagePreviewFrame,
} from "./reference-closet-stage-preview-simulation.js";

test("detectReferenceClosetStagePreviewFeatures snapshots browser capability flags", () => {
  const snapshot = detectReferenceClosetStagePreviewFeatures({
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

test("resolveReferenceClosetStagePreviewBackend prefers reduced worker compute when motion exists", () => {
  const featureSnapshot = {
    hasWorker: true,
    hasOffscreenCanvas: false,
    hasWebGPU: false,
    crossOriginIsolated: false,
  } as const;

  assert.equal(
    resolveReferenceClosetStagePreviewBackend({
      qualityTier: "low",
      hasContinuousMotion: true,
      featureSnapshot,
    }),
    "static-fit",
  );
  assert.equal(
    resolveReferenceClosetStagePreviewBackend({
      qualityTier: "balanced",
      hasContinuousMotion: true,
      featureSnapshot,
    }),
    "worker-reduced",
  );
  assert.equal(
    resolveReferenceClosetStagePreviewBackend({
      qualityTier: "high",
      hasContinuousMotion: true,
      featureSnapshot: {
        ...featureSnapshot,
        hasWorker: false,
      },
    }),
    "cpu-reduced",
  );
  assert.equal(
    resolveReferenceClosetStagePreviewBackend({
      qualityTier: "high",
      hasContinuousMotion: true,
      featureSnapshot: {
        ...featureSnapshot,
        hasWebGPU: true,
      },
      experimentalWebGPU: true,
    }),
    "experimental-webgpu",
  );
});

test("stepReferenceClosetStagePreviewFrame drives a reduced preview state and settles toward idle", () => {
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

  let state = createReferenceClosetStagePreviewFrameState();
  const first = stepReferenceClosetStagePreviewFrame(
    buildReferenceClosetStagePreviewFrameRequest({
      sessionId: "session-a",
      sequence: 1,
      backend: "cpu-reduced",
      elapsedTimeSeconds: 0,
      deltaSeconds: 1 / 60,
      featureSnapshot,
      currentAnchorWorld: [0, 1.4, 0],
      state,
      config,
    }),
  );

  state = first.state;
  const second = stepReferenceClosetStagePreviewFrame(
    buildReferenceClosetStagePreviewFrameRequest({
      sessionId: "session-a",
      sequence: 2,
      backend: "cpu-reduced",
      elapsedTimeSeconds: 1 / 60,
      deltaSeconds: 1 / 60,
      featureSnapshot,
      currentAnchorWorld: [0.08, 1.42, 0.02],
      state,
      config,
    }),
  );

  assert.equal(first.state.initialized, true);
  assert.equal(second.shouldContinue, true);
  assert.notDeepEqual(second.rotationRad, [0, 0, 0]);
  assert.notEqual(second.position[1], config.baseOffsetY);

  let settling = second;
  const settlingConfig = {
    ...config,
    idleAmplitudeDeg: 0,
    idleFrequencyHz: 1,
    verticalBobCm: 0,
    lateralSwingCm: 0,
  };
  for (let index = 0; index < 240; index += 1) {
    settling = stepReferenceClosetStagePreviewFrame(
      buildReferenceClosetStagePreviewFrameRequest({
        sessionId: "session-a",
        sequence: 3 + index,
        backend: "cpu-reduced",
        elapsedTimeSeconds: (index + 2) / 60,
        deltaSeconds: 1 / 60,
        featureSnapshot,
        currentAnchorWorld: [0.08, 1.42, 0.02],
        state: settling.state,
        config: settlingConfig,
      }),
    );
  }

  assert.equal(settling.shouldContinue, false);
  assert.ok(settling.angularEnergy < second.angularEnergy);
});
