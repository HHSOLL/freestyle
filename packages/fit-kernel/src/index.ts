export const fitKernelExecutionModes = [
  "reduced-preview",
  "cpu-xpbd-preview",
  "wasm-preview",
  "static-fit",
] as const;
export const fitKernelBufferTransports = [
  "transferable-array-buffer",
  "shared-array-buffer",
] as const;
export const fitKernelPreviewFrameSchemaVersion = "preview-simulation-frame.v1";
export const fitKernelPreviewDeformationSchemaVersion = "preview-deformation.v1";
export const fitKernelPreviewBackendIds = [
  "static-fit",
  "cpu-reduced",
  "cpu-xpbd",
  "worker-reduced",
  "experimental-webgpu",
] as const;
export const fitKernelPreviewSolverKinds = [
  "reduced-preview-spring",
  "xpbd-cloth-preview",
] as const;
export const fitKernelPreviewDeformationTransferModes = [
  "secondary-motion-transform",
  "fit-mesh-deformation-buffer",
] as const;
export const fitKernelPreviewEngineKinds = [
  "static-fit-compat",
  "reduced-preview-compat",
  "cpu-xpbd-preview",
  "wasm-preview",
] as const;
export const fitKernelPreviewEngineStatuses = ["ready", "fallback"] as const;
export const fitKernelPreviewEngineTransports = ["main-thread", "worker-message"] as const;
export const fitKernelPreviewFallbackReasons = [
  "no-continuous-motion",
  "low-quality-tier",
  "worker-unavailable",
  "wasm-preview-disabled",
  "engine-boot-failed",
] as const;

export {
  fitKernelXpbdDeformationBufferSchemaVersion,
  fitKernelXpbdPreviewSolveSchemaVersion,
  solveFitKernelXpbdPreview,
  type FitKernelXpbdConstraint,
  type FitKernelXpbdDeformationBuffer,
  type FitKernelXpbdDistanceConstraint,
  type FitKernelXpbdDistanceConstraintKind,
  type FitKernelXpbdPinConstraint,
  type FitKernelXpbdSolveInput,
  type FitKernelXpbdSphereCollisionConstraint,
} from "./xpbd-preview.js";

export type FitKernelExecutionMode = (typeof fitKernelExecutionModes)[number];
export type FitKernelBufferTransport = (typeof fitKernelBufferTransports)[number];
export type FitKernelPreviewBackendId = (typeof fitKernelPreviewBackendIds)[number];
export type FitKernelPreviewSolverKind = (typeof fitKernelPreviewSolverKinds)[number];
export type FitKernelPreviewDeformationTransferMode =
  (typeof fitKernelPreviewDeformationTransferModes)[number];
export type FitKernelPreviewEngineKind = (typeof fitKernelPreviewEngineKinds)[number];
export type FitKernelPreviewEngineStatusKind = (typeof fitKernelPreviewEngineStatuses)[number];
export type FitKernelPreviewEngineTransport = (typeof fitKernelPreviewEngineTransports)[number];
export type FitKernelPreviewFallbackReason = (typeof fitKernelPreviewFallbackReasons)[number];
export type FitKernelPreviewVector3 = [number, number, number];
export type FitKernelPreviewQualityTier = "low" | "balanced" | "high";
export type FitKernelPreviewMotionProfileId =
  | "hair-sway"
  | "hair-long"
  | "hair-bob"
  | "garment-soft"
  | "garment-loose";

export type FitKernelPreviewFeatureSnapshot = {
  hasWorker: boolean;
  hasOffscreenCanvas: boolean;
  hasWebGPU: boolean;
  crossOriginIsolated: boolean;
};

export type FitKernelPreviewFrameState = {
  initialized: boolean;
  lastAnchorWorld: FitKernelPreviewVector3;
  rotationRad: FitKernelPreviewVector3;
  rotationVelocity: FitKernelPreviewVector3;
  positionOffset: FitKernelPreviewVector3;
  positionVelocity: FitKernelPreviewVector3;
};

export type FitKernelPreviewFrameConfig = {
  profileId: FitKernelPreviewMotionProfileId;
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

export type FitKernelPreviewFrameRequest = {
  schemaVersion: typeof fitKernelPreviewFrameSchemaVersion;
  sessionId: string;
  sequence: number;
  backend: FitKernelPreviewBackendId;
  elapsedTimeSeconds: number;
  deltaSeconds: number;
  featureSnapshot: FitKernelPreviewFeatureSnapshot;
  currentAnchorWorld: FitKernelPreviewVector3;
  state: FitKernelPreviewFrameState;
  config: FitKernelPreviewFrameConfig;
};

export type FitKernelPreviewFrameResult = {
  schemaVersion: typeof fitKernelPreviewFrameSchemaVersion;
  sessionId: string;
  sequence: number;
  backend: FitKernelPreviewBackendId;
  state: FitKernelPreviewFrameState;
  rotationRad: FitKernelPreviewVector3;
  position: FitKernelPreviewVector3;
  targetRotationRad: FitKernelPreviewVector3;
  targetPosition: FitKernelPreviewVector3;
  angularEnergy: number;
  positionalEnergy: number;
  anchorEnergy: number;
  shouldContinue: boolean;
};

export type FitKernelPreviewMetrics = {
  solverKind: FitKernelPreviewSolverKind;
  executionMode: FitKernelExecutionMode;
  backend: FitKernelPreviewBackendId;
  solveDurationMs: number;
  angularEnergy: number;
  positionalEnergy: number;
  anchorEnergy: number;
  shouldContinue: boolean;
};

export type FitKernelPreviewEngineStatus = {
  engineKind: FitKernelPreviewEngineKind;
  executionMode: FitKernelExecutionMode;
  backend: FitKernelPreviewBackendId;
  transport: FitKernelPreviewEngineTransport;
  status: FitKernelPreviewEngineStatusKind;
  fallbackReason?: FitKernelPreviewFallbackReason;
  featureSnapshot: FitKernelPreviewFeatureSnapshot;
};

export type FitKernelPreviewResultEnvelope = {
  type: "PREVIEW_FRAME_RESULT";
  result: FitKernelPreviewFrameResult;
  metrics: FitKernelPreviewMetrics;
};

export type FitKernelPreviewDeformation = {
  schemaVersion: typeof fitKernelPreviewDeformationSchemaVersion;
  garmentId: string;
  sessionId: string;
  sequence: number;
  backend: FitKernelPreviewBackendId;
  executionMode: FitKernelExecutionMode;
  transferMode: FitKernelPreviewDeformationTransferMode;
  rotationRad: FitKernelPreviewVector3;
  position: FitKernelPreviewVector3;
  settled: boolean;
};

export type FitKernelPreviewDeformationEnvelope = {
  type: "PREVIEW_DEFORMATION";
  deformation: FitKernelPreviewDeformation;
};

type FitKernelFeatureEnv = Partial<{
  Worker: unknown;
  OffscreenCanvas: unknown;
  crossOriginIsolated: boolean;
  navigator: {
    gpu?: unknown;
  };
}>;

export const defaultFitKernelExecutionMode: FitKernelExecutionMode = "reduced-preview";
export const defaultFitKernelBufferTransport: FitKernelBufferTransport = "transferable-array-buffer";
export const defaultFitKernelPreviewSolverKind: FitKernelPreviewSolverKind =
  "reduced-preview-spring";
export const defaultFitKernelPreviewDeformationTransferMode: FitKernelPreviewDeformationTransferMode =
  "secondary-motion-transform";
export const defaultFitKernelPreviewEngineKind: FitKernelPreviewEngineKind =
  "reduced-preview-compat";

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

export const resolveFitKernelBufferTransport = (options?: {
  crossOriginIsolated?: boolean;
  sharedArrayBufferRequested?: boolean;
}): FitKernelBufferTransport => {
  if (options?.crossOriginIsolated && options.sharedArrayBufferRequested) {
    return "shared-array-buffer";
  }

  return "transferable-array-buffer";
};

export const resolveFitKernelExecutionMode = (input?: {
  backend?: FitKernelPreviewBackendId;
  wasmPreviewEnabled?: boolean;
}): FitKernelExecutionMode => {
  if (input?.backend === "static-fit") {
    return "static-fit";
  }

  if (input?.backend === "cpu-xpbd") {
    return "cpu-xpbd-preview";
  }

  if (input?.wasmPreviewEnabled) {
    return "wasm-preview";
  }

  return "reduced-preview";
};

export function detectFitKernelPreviewFeatures(
  env: FitKernelFeatureEnv | undefined =
    typeof globalThis === "undefined" ? undefined : (globalThis as FitKernelFeatureEnv),
): FitKernelPreviewFeatureSnapshot {
  return {
    hasWorker: typeof env?.Worker !== "undefined",
    hasOffscreenCanvas: typeof env?.OffscreenCanvas !== "undefined",
    hasWebGPU: Boolean(env?.navigator && "gpu" in env.navigator && env.navigator.gpu),
    crossOriginIsolated: env?.crossOriginIsolated === true,
  };
}

export function createFitKernelPreviewFrameState(): FitKernelPreviewFrameState {
  return {
    initialized: false,
    lastAnchorWorld: [0, 0, 0],
    rotationRad: [0, 0, 0],
    rotationVelocity: [0, 0, 0],
    positionOffset: [0, 0, 0],
    positionVelocity: [0, 0, 0],
  };
}

export function buildFitKernelPreviewFrameRequest(
  input: Omit<FitKernelPreviewFrameRequest, "schemaVersion">,
): FitKernelPreviewFrameRequest {
  const deltaSeconds = clamp(input.deltaSeconds || 1 / 60, 1 / 240, 1 / 24);
  return {
    ...input,
    schemaVersion: fitKernelPreviewFrameSchemaVersion,
    deltaSeconds,
  };
}

export function stepFitKernelPreviewFrame(
  request: FitKernelPreviewFrameRequest,
): FitKernelPreviewFrameResult {
  const state: FitKernelPreviewFrameState = {
    initialized: request.state.initialized,
    lastAnchorWorld: [...request.state.lastAnchorWorld] as FitKernelPreviewVector3,
    rotationRad: [...request.state.rotationRad] as FitKernelPreviewVector3,
    rotationVelocity: [...request.state.rotationVelocity] as FitKernelPreviewVector3,
    positionOffset: [...request.state.positionOffset] as FitKernelPreviewVector3,
    positionVelocity: [...request.state.positionVelocity] as FitKernelPreviewVector3,
  };

  const dt = clamp(request.deltaSeconds || 1 / 60, 1 / 240, 1 / 24);
  const currentAnchorWorld = request.currentAnchorWorld;
  if (!state.initialized) {
    state.initialized = true;
    state.lastAnchorWorld = [...currentAnchorWorld] as FitKernelPreviewVector3;
  }

  const velocityX = (currentAnchorWorld[0] - state.lastAnchorWorld[0]) / dt;
  const velocityY = (currentAnchorWorld[1] - state.lastAnchorWorld[1]) / dt;
  const velocityZ = (currentAnchorWorld[2] - state.lastAnchorWorld[2]) / dt;
  state.lastAnchorWorld = [...currentAnchorWorld] as FitKernelPreviewVector3;

  const idlePhase =
    request.elapsedTimeSeconds * (request.config.idleFrequencyHz ?? 0.9) * Math.PI * 2;
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
    Math.abs(idleCos) * ((request.config.verticalBobCm ?? 0) / 100) * looseness +
      Math.max(velocityY, 0) * 0.0025,
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
    Math.abs(state.rotationVelocity[0]) +
    Math.abs(state.rotationVelocity[1]) +
    Math.abs(state.rotationVelocity[2]);
  const positionalEnergy =
    Math.abs(state.positionVelocity[0]) + Math.abs(state.positionVelocity[1]);
  const anchorEnergy = Math.abs(velocityX) + Math.abs(velocityY) + Math.abs(velocityZ);

  const shouldContinue =
    angularEnergy > 0.02 ||
    positionalEnergy > 0.006 ||
    anchorEnergy > 0.02 ||
    Math.abs(targetYaw - state.rotationRad[1]) > 0.002 ||
    Math.abs(targetPitch - state.rotationRad[0]) > 0.002 ||
    Math.abs(targetRoll - state.rotationRad[2]) > 0.002;

  return {
    schemaVersion: fitKernelPreviewFrameSchemaVersion,
    sessionId: request.sessionId,
    sequence: request.sequence,
    backend: request.backend,
    state,
    rotationRad: [...state.rotationRad],
    position: [state.positionOffset[0], request.config.baseOffsetY + state.positionOffset[1], 0],
    targetRotationRad: [targetPitch, targetYaw, targetRoll],
    targetPosition: [targetPosX, request.config.baseOffsetY + targetPosY, 0],
    angularEnergy,
    positionalEnergy,
    anchorEnergy,
    shouldContinue,
  };
}

export const summarizeFitKernelPreviewMetrics = (input: {
  backend: FitKernelPreviewBackendId;
  result: FitKernelPreviewFrameResult;
  solveDurationMs: number;
  executionMode?: FitKernelExecutionMode;
}): FitKernelPreviewMetrics => ({
  solverKind: defaultFitKernelPreviewSolverKind,
  executionMode:
    input.executionMode ?? resolveFitKernelExecutionMode({ backend: input.backend }),
  backend: input.backend,
  solveDurationMs: input.solveDurationMs,
  angularEnergy: input.result.angularEnergy,
  positionalEnergy: input.result.positionalEnergy,
  anchorEnergy: input.result.anchorEnergy,
  shouldContinue: input.result.shouldContinue,
});

export const buildFitKernelPreviewResultEnvelope = (input: {
  backend: FitKernelPreviewBackendId;
  result: FitKernelPreviewFrameResult;
  solveDurationMs: number;
  executionMode?: FitKernelExecutionMode;
}): FitKernelPreviewResultEnvelope => ({
  type: "PREVIEW_FRAME_RESULT",
  result: input.result,
  metrics: summarizeFitKernelPreviewMetrics(input),
});

export const buildFitKernelPreviewDeformation = (input: {
  garmentId: string;
  result: FitKernelPreviewFrameResult;
  executionMode?: FitKernelExecutionMode;
}): FitKernelPreviewDeformation => ({
  schemaVersion: fitKernelPreviewDeformationSchemaVersion,
  garmentId: input.garmentId,
  sessionId: input.result.sessionId,
  sequence: input.result.sequence,
  backend: input.result.backend,
  executionMode:
    input.executionMode ?? resolveFitKernelExecutionMode({ backend: input.result.backend }),
  transferMode: defaultFitKernelPreviewDeformationTransferMode,
  rotationRad: [...input.result.rotationRad],
  position: [...input.result.position],
  settled: !input.result.shouldContinue,
});

export const buildFitKernelPreviewDeformationEnvelope = (input: {
  garmentId: string;
  result: FitKernelPreviewFrameResult;
  executionMode?: FitKernelExecutionMode;
}): FitKernelPreviewDeformationEnvelope => ({
  type: "PREVIEW_DEFORMATION",
  deformation: buildFitKernelPreviewDeformation(input),
});

export const resolveFitKernelPreviewEngineStatus = (input: {
  backend: FitKernelPreviewBackendId;
  featureSnapshot: FitKernelPreviewFeatureSnapshot;
  hasContinuousMotion: boolean;
  qualityTier: FitKernelPreviewQualityTier;
  workerAvailable?: boolean;
  workerBootFailed?: boolean;
}): FitKernelPreviewEngineStatus => {
  const executionMode = resolveFitKernelExecutionMode({ backend: input.backend });
  const workerActive =
    (input.backend === "worker-reduced" || input.backend === "cpu-xpbd") &&
    (input.workerAvailable ?? input.featureSnapshot.hasWorker);

  if (!input.hasContinuousMotion) {
    return {
      engineKind: "static-fit-compat",
      executionMode: "static-fit",
      backend: "static-fit",
      transport: "main-thread",
      status: "fallback",
      fallbackReason: "no-continuous-motion",
      featureSnapshot: input.featureSnapshot,
    };
  }

  if (input.qualityTier === "low") {
    return {
      engineKind: "static-fit-compat",
      executionMode: "static-fit",
      backend: "static-fit",
      transport: "main-thread",
      status: "fallback",
      fallbackReason: "low-quality-tier",
      featureSnapshot: input.featureSnapshot,
    };
  }

  if (input.backend === "worker-reduced" || input.backend === "cpu-xpbd") {
    if (input.workerBootFailed) {
      return {
        engineKind:
          input.backend === "cpu-xpbd" ? "cpu-xpbd-preview" : "reduced-preview-compat",
        executionMode,
        backend: input.backend,
        transport: "main-thread",
        status: "fallback",
        fallbackReason: "engine-boot-failed",
        featureSnapshot: input.featureSnapshot,
      };
    }

    if (!workerActive) {
      return {
        engineKind:
          input.backend === "cpu-xpbd" ? "cpu-xpbd-preview" : "reduced-preview-compat",
        executionMode,
        backend: input.backend,
        transport: "main-thread",
        status: "fallback",
        fallbackReason: "worker-unavailable",
        featureSnapshot: input.featureSnapshot,
      };
    }

    return {
      engineKind:
        input.backend === "cpu-xpbd" ? "cpu-xpbd-preview" : "reduced-preview-compat",
      executionMode,
      backend: input.backend,
      transport: "worker-message",
      status: "ready",
      featureSnapshot: input.featureSnapshot,
    };
  }

  if (input.backend === "experimental-webgpu") {
    return {
      engineKind: "reduced-preview-compat",
      executionMode,
      backend: input.backend,
      transport: "main-thread",
      status: "fallback",
      fallbackReason: "wasm-preview-disabled",
      featureSnapshot: input.featureSnapshot,
    };
  }

  if (input.backend === "cpu-reduced") {
    return {
      engineKind: "reduced-preview-compat",
      executionMode,
      backend: input.backend,
      transport: "main-thread",
      status: "fallback",
      fallbackReason: "worker-unavailable",
      featureSnapshot: input.featureSnapshot,
    };
  }

  return {
    engineKind: "static-fit-compat",
    executionMode,
    backend: input.backend,
    transport: "main-thread",
    status: "ready",
    featureSnapshot: input.featureSnapshot,
  };
};

export const isFitKernelPreviewResultEnvelope = (
  value: unknown,
): value is FitKernelPreviewResultEnvelope =>
  Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      value.type === "PREVIEW_FRAME_RESULT" &&
      "result" in value &&
      "metrics" in value,
  );

export const isFitKernelPreviewDeformationEnvelope = (
  value: unknown,
): value is FitKernelPreviewDeformationEnvelope =>
  Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      value.type === "PREVIEW_DEFORMATION" &&
      "deformation" in value,
  );
