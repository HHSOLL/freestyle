"use client";

import type { QualityTier } from "@freestyle/shared-types";

export const referenceClosetStagePreviewFrameSchemaVersion = "preview-simulation-frame.v1";

export const referenceClosetStagePreviewBackendIds = [
  "static-fit",
  "cpu-reduced",
  "worker-reduced",
  "experimental-webgpu",
] as const;

export type ReferenceClosetStagePreviewBackendId = (typeof referenceClosetStagePreviewBackendIds)[number];

export type ReferenceClosetStagePreviewFeatureSnapshot = {
  hasWorker: boolean;
  hasOffscreenCanvas: boolean;
  hasWebGPU: boolean;
  crossOriginIsolated: boolean;
};

export type ReferenceClosetStagePreviewVector3 = [number, number, number];

export type ReferenceClosetStagePreviewFrameState = {
  initialized: boolean;
  lastAnchorWorld: ReferenceClosetStagePreviewVector3;
  rotationRad: ReferenceClosetStagePreviewVector3;
  rotationVelocity: ReferenceClosetStagePreviewVector3;
  positionOffset: ReferenceClosetStagePreviewVector3;
  positionVelocity: ReferenceClosetStagePreviewVector3;
};

export type ReferenceClosetStagePreviewFrameConfig = {
  profileId: "hair-sway" | "hair-long" | "hair-bob" | "garment-soft" | "garment-loose";
  stiffness: number;
  damping: number;
  influence: number;
  looseness: number;
  scaleCompensation: number;
  maxYawDeg: number;
  maxPitchDeg: number;
  maxRollDeg: number;
  idleAmplitudeDeg?: number;
  idleFrequencyHz?: number;
  verticalBobCm?: number;
  lateralSwingCm?: number;
  baseOffsetY: number;
};

export type ReferenceClosetStagePreviewFrameRequest = {
  schemaVersion: typeof referenceClosetStagePreviewFrameSchemaVersion;
  sessionId: string;
  sequence: number;
  backend: ReferenceClosetStagePreviewBackendId;
  elapsedTimeSeconds: number;
  deltaSeconds: number;
  featureSnapshot: ReferenceClosetStagePreviewFeatureSnapshot;
  currentAnchorWorld: ReferenceClosetStagePreviewVector3;
  state: ReferenceClosetStagePreviewFrameState;
  config: ReferenceClosetStagePreviewFrameConfig;
};

export type ReferenceClosetStagePreviewFrameResult = {
  schemaVersion: typeof referenceClosetStagePreviewFrameSchemaVersion;
  sessionId: string;
  sequence: number;
  backend: ReferenceClosetStagePreviewBackendId;
  state: ReferenceClosetStagePreviewFrameState;
  rotationRad: ReferenceClosetStagePreviewVector3;
  position: ReferenceClosetStagePreviewVector3;
  targetRotationRad: ReferenceClosetStagePreviewVector3;
  targetPosition: ReferenceClosetStagePreviewVector3;
  angularEnergy: number;
  positionalEnergy: number;
  anchorEnergy: number;
  shouldContinue: boolean;
};

type FeatureEnv = Partial<{
  Worker: unknown;
  OffscreenCanvas: unknown;
  crossOriginIsolated: boolean;
  navigator: {
    gpu?: unknown;
  };
}>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const degToRad = (value: number) => (value * Math.PI) / 180;

const springAxis = (
  value: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  deltaSeconds: number,
) => {
  const acceleration = (target - value) * stiffness - velocity * damping;
  const nextVelocity = velocity + acceleration * deltaSeconds;
  const nextValue = value + nextVelocity * deltaSeconds;
  return {
    value: nextValue,
    velocity: nextVelocity,
  };
};

export function detectReferenceClosetStagePreviewFeatures(
  env: FeatureEnv | undefined = typeof globalThis === "undefined" ? undefined : (globalThis as FeatureEnv),
): ReferenceClosetStagePreviewFeatureSnapshot {
  return {
    hasWorker: typeof env?.Worker !== "undefined",
    hasOffscreenCanvas: typeof env?.OffscreenCanvas !== "undefined",
    hasWebGPU: Boolean(env?.navigator && "gpu" in env.navigator && env.navigator.gpu),
    crossOriginIsolated: env?.crossOriginIsolated === true,
  };
}

export function resolveReferenceClosetStagePreviewBackend({
  qualityTier,
  hasContinuousMotion,
  featureSnapshot,
  experimentalWebGPU,
}: {
  qualityTier: QualityTier;
  hasContinuousMotion: boolean;
  featureSnapshot: ReferenceClosetStagePreviewFeatureSnapshot;
  experimentalWebGPU?: boolean;
}): ReferenceClosetStagePreviewBackendId {
  if (!hasContinuousMotion || qualityTier === "low") {
    return "static-fit";
  }

  if (experimentalWebGPU && qualityTier === "high" && featureSnapshot.hasWebGPU) {
    return "experimental-webgpu";
  }

  if (featureSnapshot.hasWorker) {
    return "worker-reduced";
  }

  return "cpu-reduced";
}

export function createReferenceClosetStagePreviewFrameState(): ReferenceClosetStagePreviewFrameState {
  return {
    initialized: false,
    lastAnchorWorld: [0, 0, 0],
    rotationRad: [0, 0, 0],
    rotationVelocity: [0, 0, 0],
    positionOffset: [0, 0, 0],
    positionVelocity: [0, 0, 0],
  };
}

export function buildReferenceClosetStagePreviewFrameRequest(
  input: Omit<ReferenceClosetStagePreviewFrameRequest, "schemaVersion">,
): ReferenceClosetStagePreviewFrameRequest {
  const deltaSeconds = clamp(input.deltaSeconds || 1 / 60, 1 / 240, 1 / 24);
  return {
    ...input,
    schemaVersion: referenceClosetStagePreviewFrameSchemaVersion,
    deltaSeconds,
  };
}

export function stepReferenceClosetStagePreviewFrame(
  request: ReferenceClosetStagePreviewFrameRequest,
): ReferenceClosetStagePreviewFrameResult {
  const state: ReferenceClosetStagePreviewFrameState = {
    initialized: request.state.initialized,
    lastAnchorWorld: [...request.state.lastAnchorWorld] as ReferenceClosetStagePreviewVector3,
    rotationRad: [...request.state.rotationRad] as ReferenceClosetStagePreviewVector3,
    rotationVelocity: [...request.state.rotationVelocity] as ReferenceClosetStagePreviewVector3,
    positionOffset: [...request.state.positionOffset] as ReferenceClosetStagePreviewVector3,
    positionVelocity: [...request.state.positionVelocity] as ReferenceClosetStagePreviewVector3,
  };

  const dt = clamp(request.deltaSeconds || 1 / 60, 1 / 240, 1 / 24);
  const currentAnchorWorld = request.currentAnchorWorld;
  if (!state.initialized) {
    state.initialized = true;
    state.lastAnchorWorld = [...currentAnchorWorld] as ReferenceClosetStagePreviewVector3;
  }

  const velocityX = (currentAnchorWorld[0] - state.lastAnchorWorld[0]) / dt;
  const velocityY = (currentAnchorWorld[1] - state.lastAnchorWorld[1]) / dt;
  const velocityZ = (currentAnchorWorld[2] - state.lastAnchorWorld[2]) / dt;
  state.lastAnchorWorld = [...currentAnchorWorld] as ReferenceClosetStagePreviewVector3;

  const idlePhase = request.elapsedTimeSeconds * (request.config.idleFrequencyHz ?? 0.9) * Math.PI * 2;
  const idleSin = Math.sin(idlePhase);
  const idleCos = Math.cos(idlePhase * 0.83 + 0.6);
  const idleAmplitudeRad = degToRad(request.config.idleAmplitudeDeg ?? 0.4);
  const looseness = request.config.looseness;

  const targetYaw = clamp(
    -velocityX * 0.028 * request.config.influence + idleSin * idleAmplitudeRad * looseness,
    -degToRad(request.config.maxYawDeg),
    degToRad(request.config.maxYawDeg),
  );
  const targetPitch = clamp(
    velocityZ * 0.022 * request.config.influence + idleCos * idleAmplitudeRad * 0.72 * looseness,
    -degToRad(request.config.maxPitchDeg),
    degToRad(request.config.maxPitchDeg),
  );
  const targetRoll = clamp(
    -velocityX * 0.018 * request.config.influence + idleSin * idleAmplitudeRad * 0.48 * looseness,
    -degToRad(request.config.maxRollDeg),
    degToRad(request.config.maxRollDeg),
  );

  const yawAxis = springAxis(
    state.rotationRad[1],
    state.rotationVelocity[1],
    targetYaw,
    request.config.stiffness,
    request.config.damping,
    dt,
  );
  const pitchAxis = springAxis(
    state.rotationRad[0],
    state.rotationVelocity[0],
    targetPitch,
    request.config.stiffness,
    request.config.damping,
    dt,
  );
  const rollAxis = springAxis(
    state.rotationRad[2],
    state.rotationVelocity[2],
    targetRoll,
    request.config.stiffness,
    request.config.damping,
    dt,
  );

  state.rotationRad = [pitchAxis.value, yawAxis.value, rollAxis.value];
  state.rotationVelocity = [pitchAxis.velocity, yawAxis.velocity, rollAxis.velocity];

  const targetPosX = clamp(
    idleSin *
      ((request.config.lateralSwingCm ?? 0) / 100) *
      looseness *
      (request.config.profileId.startsWith("hair") ? 1 : 0.74),
    -0.06 * request.config.scaleCompensation,
    0.06 * request.config.scaleCompensation,
  );
  const targetPosY = clamp(
    Math.abs(idleCos) * ((request.config.verticalBobCm ?? 0) / 100) * looseness + Math.max(velocityY, 0) * 0.0025,
    0,
    0.08 * request.config.scaleCompensation,
  );

  const posXAxis = springAxis(
    state.positionOffset[0],
    state.positionVelocity[0],
    targetPosX,
    request.config.stiffness * 0.8,
    request.config.damping,
    dt,
  );
  const posYAxis = springAxis(
    state.positionOffset[1],
    state.positionVelocity[1],
    targetPosY,
    request.config.stiffness * 0.72,
    request.config.damping,
    dt,
  );

  state.positionOffset = [posXAxis.value, posYAxis.value, 0];
  state.positionVelocity = [posXAxis.velocity, posYAxis.velocity, 0];

  const angularEnergy =
    Math.abs(state.rotationVelocity[0]) + Math.abs(state.rotationVelocity[1]) + Math.abs(state.rotationVelocity[2]);
  const positionalEnergy = Math.abs(state.positionVelocity[0]) + Math.abs(state.positionVelocity[1]);
  const anchorEnergy = Math.abs(velocityX) + Math.abs(velocityY) + Math.abs(velocityZ);

  const shouldContinue =
    angularEnergy > 0.02 ||
    positionalEnergy > 0.006 ||
    anchorEnergy > 0.02 ||
    Math.abs(targetYaw - state.rotationRad[1]) > 0.002 ||
    Math.abs(targetPitch - state.rotationRad[0]) > 0.002 ||
    Math.abs(targetRoll - state.rotationRad[2]) > 0.002;

  return {
    schemaVersion: referenceClosetStagePreviewFrameSchemaVersion,
    sessionId: request.sessionId,
    sequence: request.sequence,
    backend: request.backend,
    state,
    rotationRad: [...state.rotationRad] as ReferenceClosetStagePreviewVector3,
    position: [state.positionOffset[0], request.config.baseOffsetY + state.positionOffset[1], 0],
    targetRotationRad: [targetPitch, targetYaw, targetRoll],
    targetPosition: [targetPosX, request.config.baseOffsetY + targetPosY, 0],
    angularEnergy,
    positionalEnergy,
    anchorEnergy,
    shouldContinue,
  };
}
