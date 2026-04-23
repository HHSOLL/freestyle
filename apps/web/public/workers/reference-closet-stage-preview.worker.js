/* global globalThis */

const schemaVersion = "preview-simulation-frame.v1";
const resultEnvelopeType = "PREVIEW_FRAME_RESULT";
const defaultSolverKind = "reduced-preview-spring";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const degToRad = (value) => (value * Math.PI) / 180;

const resolveExecutionMode = (backend) => (backend === "static-fit" ? "static-fit" : "reduced-preview");

const springAxis = (value, velocity, target, stiffness, damping, deltaSeconds) => {
  const acceleration = (target - value) * stiffness - velocity * damping;
  const nextVelocity = velocity + acceleration * deltaSeconds;
  const nextValue = value + nextVelocity * deltaSeconds;
  return {
    value: nextValue,
    velocity: nextVelocity,
  };
};

const cloneState = (state) => ({
  initialized: Boolean(state?.initialized),
  lastAnchorWorld: Array.isArray(state?.lastAnchorWorld) ? [...state.lastAnchorWorld] : [0, 0, 0],
  rotationRad: Array.isArray(state?.rotationRad) ? [...state.rotationRad] : [0, 0, 0],
  rotationVelocity: Array.isArray(state?.rotationVelocity) ? [...state.rotationVelocity] : [0, 0, 0],
  positionOffset: Array.isArray(state?.positionOffset) ? [...state.positionOffset] : [0, 0, 0],
  positionVelocity: Array.isArray(state?.positionVelocity) ? [...state.positionVelocity] : [0, 0, 0],
});

const stepFrame = (request) => {
  const state = cloneState(request.state);
  const currentAnchorWorld = Array.isArray(request.currentAnchorWorld) ? request.currentAnchorWorld : [0, 0, 0];
  const dt = clamp(request.deltaSeconds || 1 / 60, 1 / 240, 1 / 24);
  const config = request.config || {};

  if (!state.initialized) {
    state.initialized = true;
    state.lastAnchorWorld = [...currentAnchorWorld];
  }

  const velocityX = (currentAnchorWorld[0] - state.lastAnchorWorld[0]) / dt;
  const velocityY = (currentAnchorWorld[1] - state.lastAnchorWorld[1]) / dt;
  const velocityZ = (currentAnchorWorld[2] - state.lastAnchorWorld[2]) / dt;
  state.lastAnchorWorld = [...currentAnchorWorld];

  const idlePhase = (request.elapsedTimeSeconds || 0) * (config.idleFrequencyHz || 0.9) * Math.PI * 2;
  const idleSin = Math.sin(idlePhase);
  const idleCos = Math.cos(idlePhase * 0.83 + 0.6);
  const idleAmplitudeRad = degToRad(config.idleAmplitudeDeg || 0.4);
  const looseness = config.looseness || 1;

  const targetYaw = clamp(
    -velocityX * 0.028 * (config.influence || 1) + idleSin * idleAmplitudeRad * looseness,
    -degToRad(config.maxYawDeg || 0),
    degToRad(config.maxYawDeg || 0),
  );
  const targetPitch = clamp(
    velocityZ * 0.022 * (config.influence || 1) + idleCos * idleAmplitudeRad * 0.72 * looseness,
    -degToRad(config.maxPitchDeg || 0),
    degToRad(config.maxPitchDeg || 0),
  );
  const targetRoll = clamp(
    -velocityX * 0.018 * (config.influence || 1) + idleSin * idleAmplitudeRad * 0.48 * looseness,
    -degToRad(config.maxRollDeg || 0),
    degToRad(config.maxRollDeg || 0),
  );

  const yawAxis = springAxis(
    state.rotationRad[1],
    state.rotationVelocity[1],
    targetYaw,
    config.stiffness || 1,
    config.damping || 1,
    dt,
  );
  const pitchAxis = springAxis(
    state.rotationRad[0],
    state.rotationVelocity[0],
    targetPitch,
    config.stiffness || 1,
    config.damping || 1,
    dt,
  );
  const rollAxis = springAxis(
    state.rotationRad[2],
    state.rotationVelocity[2],
    targetRoll,
    config.stiffness || 1,
    config.damping || 1,
    dt,
  );

  state.rotationRad = [pitchAxis.value, yawAxis.value, rollAxis.value];
  state.rotationVelocity = [pitchAxis.velocity, yawAxis.velocity, rollAxis.velocity];

  const targetPosX = clamp(
    idleSin *
      (((config.lateralSwingCm || 0) / 100) * looseness) *
      (String(config.profileId || "").startsWith("hair") ? 1 : 0.74),
    -0.06 * (config.scaleCompensation || 1),
    0.06 * (config.scaleCompensation || 1),
  );
  const targetPosY = clamp(
    Math.abs(idleCos) * (((config.verticalBobCm || 0) / 100) * looseness) + Math.max(velocityY, 0) * 0.0025,
    0,
    0.08 * (config.scaleCompensation || 1),
  );

  const posXAxis = springAxis(
    state.positionOffset[0],
    state.positionVelocity[0],
    targetPosX,
    (config.stiffness || 1) * 0.8,
    config.damping || 1,
    dt,
  );
  const posYAxis = springAxis(
    state.positionOffset[1],
    state.positionVelocity[1],
    targetPosY,
    (config.stiffness || 1) * 0.72,
    config.damping || 1,
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
    schemaVersion,
    sessionId: String(request.sessionId || ""),
    sequence: Number.isFinite(request.sequence) ? request.sequence : 0,
    backend: request.backend || "worker-reduced",
    state,
    rotationRad: [...state.rotationRad],
    position: [state.positionOffset[0], (config.baseOffsetY || 0) + state.positionOffset[1], 0],
    targetRotationRad: [targetPitch, targetYaw, targetRoll],
    targetPosition: [targetPosX, (config.baseOffsetY || 0) + targetPosY, 0],
    angularEnergy,
    positionalEnergy,
    anchorEnergy,
    shouldContinue,
  };
};

globalThis.onmessage = (event) => {
  const request = event.data;
  if (!request || request.schemaVersion !== schemaVersion) {
    return;
  }

  const startedAt =
    globalThis.performance && typeof globalThis.performance.now === "function"
      ? globalThis.performance.now()
      : Date.now();
  const result = stepFrame(request);
  const finishedAt =
    globalThis.performance && typeof globalThis.performance.now === "function"
      ? globalThis.performance.now()
      : Date.now();

  globalThis.postMessage({
    type: resultEnvelopeType,
    result,
    metrics: {
      solverKind: defaultSolverKind,
      executionMode: resolveExecutionMode(result.backend),
      backend: result.backend,
      solveDurationMs: Math.max(0, finishedAt - startedAt),
      angularEnergy: result.angularEnergy,
      positionalEnergy: result.positionalEnergy,
      anchorEnergy: result.anchorEnergy,
      shouldContinue: result.shouldContinue,
    },
  });
};
