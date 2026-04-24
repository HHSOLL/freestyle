/* global globalThis */

const frameSchemaVersion = "preview-simulation-frame.v1";
const deformationSchemaVersion = "preview-deformation.v1";
const resultEnvelopeType = "PREVIEW_FRAME_RESULT";
const deformationEnvelopeType = "PREVIEW_DEFORMATION";
const defaultSolverKind = "reduced-preview-spring";
const xpbdSolverKind = "xpbd-cloth-preview";
const defaultTransferMode = "secondary-motion-transform";
const xpbdTransferMode = "fit-mesh-deformation-buffer";
const xpbdDeformationBufferSchemaVersion = "preview-fit-mesh-deformation-buffer.v1";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const degToRad = (value) => (value * Math.PI) / 180;

const resolveExecutionMode = (backend) =>
  backend === "static-fit"
    ? "static-fit"
    : backend === "cpu-xpbd"
      ? "cpu-xpbd-preview"
      : "reduced-preview";

const resolveSolverKind = (backend) => (backend === "cpu-xpbd" ? xpbdSolverKind : defaultSolverKind);

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

const createSolverState = () => ({
  initialized: false,
  transport: "transferable-array-buffer",
  bodySignature: null,
  collisionBody: null,
  garments: new Map(),
});

const solverState = createSolverState();

const ensureGarmentState = (garmentId) => {
  if (!solverState.garments.has(garmentId)) {
    solverState.garments.set(garmentId, {
      fitMesh: null,
      xpbdFitMesh: null,
      materialProfile: null,
      lastResult: null,
      lastDeformation: null,
    });
  }
  return solverState.garments.get(garmentId);
};

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
    Math.abs(idleCos) * (((config.verticalBobCm || 0) / 100) * looseness) +
      Math.max(velocityY, 0) * 0.0025,
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
    schemaVersion: frameSchemaVersion,
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

const buildResultEnvelope = (result, solveDurationMs) => ({
  type: resultEnvelopeType,
  result,
  metrics: {
    solverKind: resolveSolverKind(result.backend),
    executionMode: resolveExecutionMode(result.backend),
    backend: result.backend,
    solveDurationMs,
    angularEnergy: result.angularEnergy,
    positionalEnergy: result.positionalEnergy,
    anchorEnergy: result.anchorEnergy,
    shouldContinue: result.shouldContinue,
  },
});

const buildDeformationEnvelope = (garmentId, result, xpbdResult) => ({
  type: deformationEnvelopeType,
  deformation: {
    schemaVersion: deformationSchemaVersion,
    garmentId,
    sessionId: String(result.sessionId || ""),
    sequence: Number.isFinite(result.sequence) ? result.sequence : 0,
    backend: result.backend || "worker-reduced",
    executionMode: resolveExecutionMode(result.backend),
    transferMode: xpbdResult ? xpbdTransferMode : defaultTransferMode,
    rotationRad: Array.isArray(result.rotationRad) ? [...result.rotationRad] : [0, 0, 0],
    position: Array.isArray(result.position) ? [...result.position] : [0, 0, 0],
    buffer: xpbdResult
      ? {
          schemaVersion: xpbdDeformationBufferSchemaVersion,
          solverKind: xpbdSolverKind,
          vertexCount: xpbdResult.vertexCount,
          byteLength: xpbdResult.positions.byteLength + xpbdResult.displacements.byteLength,
          transport: solverState.transport,
          dirtyRange: {
            firstVertex: 0,
            vertexCount: xpbdResult.vertexCount,
          },
          copyCount: 0,
          serializeMs: xpbdResult.serializeMs,
          transferMs: 0,
          applyMs: 0,
        }
      : undefined,
    buffers: xpbdResult
      ? {
          positions: xpbdResult.positions.buffer,
          displacements: xpbdResult.displacements.buffer,
        }
      : undefined,
    settled: !result.shouldContinue,
  },
});

const toFloat32Array = (value) =>
  value instanceof Float32Array ? new Float32Array(value) : Float32Array.from(Array.isArray(value) ? value : []);

const vectorLength = (x, y, z) => Math.hypot(x, y, z);

const readVector = (positions, particle) => {
  const offset = particle * 3;
  return [positions[offset] || 0, positions[offset + 1] || 0, positions[offset + 2] || 0];
};

const writeVector = (positions, particle, vector) => {
  const offset = particle * 3;
  positions[offset] = vector[0];
  positions[offset + 1] = vector[1];
  positions[offset + 2] = vector[2];
};

const applyXpbdDistanceConstraint = (positions, inverseMasses, constraint, deltaSeconds) => {
  const a = readVector(positions, constraint.particleA);
  const b = readVector(positions, constraint.particleB);
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  const length = vectorLength(dx, dy, dz);
  const weightA = inverseMasses[constraint.particleA] || 0;
  const weightB = inverseMasses[constraint.particleB] || 0;
  const weightSum = weightA + weightB;
  if (length <= 1e-8 || weightSum <= 0) return 0;
  const residual = length - constraint.restLengthMeters;
  const alpha = Math.max(constraint.compliance || 0, 0) / Math.max(deltaSeconds * deltaSeconds, 1e-8);
  const lambda = -residual / (weightSum + alpha);
  const nx = dx / length;
  const ny = dy / length;
  const nz = dz / length;
  writeVector(positions, constraint.particleA, [
    a[0] + weightA * lambda * nx,
    a[1] + weightA * lambda * ny,
    a[2] + weightA * lambda * nz,
  ]);
  writeVector(positions, constraint.particleB, [
    b[0] - weightB * lambda * nx,
    b[1] - weightB * lambda * ny,
    b[2] - weightB * lambda * nz,
  ]);
  return Math.abs(residual);
};

const applyXpbdPinConstraint = (positions, inverseMasses, constraint, deltaSeconds) => {
  const weight = inverseMasses[constraint.particle] || 0;
  if (weight <= 0) return 0;
  const position = readVector(positions, constraint.particle);
  const dx = constraint.target[0] - position[0];
  const dy = constraint.target[1] - position[1];
  const dz = constraint.target[2] - position[2];
  const alpha = Math.max(constraint.compliance || 0, 0) / Math.max(deltaSeconds * deltaSeconds, 1e-8);
  const scale = weight / (weight + alpha);
  writeVector(positions, constraint.particle, [
    position[0] + dx * scale,
    position[1] + dy * scale,
    position[2] + dz * scale,
  ]);
  return vectorLength(dx, dy, dz);
};

const applyXpbdSphereCollision = (positions, inverseMasses, constraint) => {
  const weight = inverseMasses[constraint.particle] || 0;
  if (weight <= 0) return 0;
  const position = readVector(positions, constraint.particle);
  const dx = position[0] - constraint.center[0];
  const dy = position[1] - constraint.center[1];
  const dz = position[2] - constraint.center[2];
  const distance = vectorLength(dx, dy, dz);
  const radius = constraint.radiusMeters + (constraint.marginMeters || 0);
  if (distance >= radius) return 0;
  const nx = distance > 1e-8 ? dx / distance : 0;
  const ny = distance > 1e-8 ? dy / distance : 1;
  const nz = distance > 1e-8 ? dz / distance : 0;
  writeVector(positions, constraint.particle, [
    constraint.center[0] + nx * radius,
    constraint.center[1] + ny * radius,
    constraint.center[2] + nz * radius,
  ]);
  return radius - distance;
};

const solveXpbdFitMesh = (xpbdFitMesh, sequence) => {
  if (!xpbdFitMesh || !Array.isArray(xpbdFitMesh.positions) || !Array.isArray(xpbdFitMesh.inverseMasses)) {
    return null;
  }
  const startedAt =
    globalThis.performance && typeof globalThis.performance.now === "function"
      ? globalThis.performance.now()
      : Date.now();
  const restPositions = toFloat32Array(xpbdFitMesh.positions);
  const positions = new Float32Array(restPositions);
  const previousPositions = new Float32Array(restPositions);
  const inverseMasses = toFloat32Array(xpbdFitMesh.inverseMasses);
  const vertexCount = restPositions.length / 3;
  const deltaSeconds = 1 / 60;
  const gravity = Array.isArray(xpbdFitMesh.gravity) ? xpbdFitMesh.gravity : [0, -9.81, 0];
  const damping = clamp(xpbdFitMesh.damping || 0.985, 0, 1);
  const iterations = clamp(Math.round(xpbdFitMesh.iterations || 8), 1, 64);

  for (let particle = 0; particle < vertexCount; particle += 1) {
    if ((inverseMasses[particle] || 0) <= 0) continue;
    const offset = particle * 3;
    positions[offset] =
      (positions[offset] || 0) +
      ((positions[offset] || 0) - (previousPositions[offset] || 0)) * damping +
      gravity[0] * deltaSeconds * deltaSeconds;
    positions[offset + 1] =
      (positions[offset + 1] || 0) +
      ((positions[offset + 1] || 0) - (previousPositions[offset + 1] || 0)) * damping +
      gravity[1] * deltaSeconds * deltaSeconds;
    positions[offset + 2] =
      (positions[offset + 2] || 0) +
      ((positions[offset + 2] || 0) - (previousPositions[offset + 2] || 0)) * damping +
      gravity[2] * deltaSeconds * deltaSeconds;
  }

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const constraint of xpbdFitMesh.constraints || []) {
      if (constraint.kind === "pin") {
        applyXpbdPinConstraint(positions, inverseMasses, constraint, deltaSeconds);
      } else if (constraint.kind === "sphere-collision") {
        applyXpbdSphereCollision(positions, inverseMasses, constraint);
      } else {
        applyXpbdDistanceConstraint(positions, inverseMasses, constraint, deltaSeconds);
      }
    }
  }

  const displacements = new Float32Array(restPositions.length);
  for (let index = 0; index < positions.length; index += 1) {
    displacements[index] = (positions[index] || 0) - (restPositions[index] || 0);
  }
  const finishedAt =
    globalThis.performance && typeof globalThis.performance.now === "function"
      ? globalThis.performance.now()
      : Date.now();
  return {
    vertexCount,
    positions,
    displacements,
    sequence,
    serializeMs: Math.max(0, finishedAt - startedAt),
  };
};

const postSolve = (garmentId, frameRequest) => {
  const garmentState = ensureGarmentState(garmentId);
  const startedAt =
    globalThis.performance && typeof globalThis.performance.now === "function"
      ? globalThis.performance.now()
      : Date.now();
  const result = stepFrame(frameRequest);
  const xpbdResult =
    frameRequest.backend === "cpu-xpbd" ? solveXpbdFitMesh(garmentState.xpbdFitMesh, result.sequence) : null;
  const finishedAt =
    globalThis.performance && typeof globalThis.performance.now === "function"
      ? globalThis.performance.now()
      : Date.now();

  garmentState.lastResult = result;
  const deformationEnvelope = buildDeformationEnvelope(garmentId, result, xpbdResult);
  garmentState.lastDeformation = xpbdResult
    ? {
        ...deformationEnvelope,
        deformation: {
          ...deformationEnvelope.deformation,
          buffers: undefined,
        },
      }
    : deformationEnvelope;

  globalThis.postMessage(buildResultEnvelope(result, Math.max(0, finishedAt - startedAt)));
  if (xpbdResult) {
    globalThis.postMessage(deformationEnvelope, [
      xpbdResult.positions.buffer,
      xpbdResult.displacements.buffer,
    ]);
  } else {
    globalThis.postMessage(deformationEnvelope);
  }
};

globalThis.onmessage = (event) => {
  const payload = event.data;
  if (!payload) {
    return;
  }

  switch (payload.type) {
    case "INIT_SOLVER": {
      solverState.initialized = true;
      solverState.transport = payload.backend || "transferable-array-buffer";
      return;
    }
    case "SET_BODY_SIGNATURE": {
      solverState.bodySignature = payload.bodySignature || null;
      return;
    }
    case "SET_COLLISION_BODY": {
      solverState.collisionBody = payload.collisionBody || null;
      return;
    }
    case "SET_GARMENT_FIT_MESH": {
      const garmentState = ensureGarmentState(payload.garmentId);
      garmentState.fitMesh = payload.fitMesh || null;
      garmentState.xpbdFitMesh = payload.xpbdFitMesh || null;
      return;
    }
    case "SET_MATERIAL_PHYSICS": {
      const garmentState = ensureGarmentState(payload.garmentId);
      garmentState.materialProfile = payload.materialProfile || null;
      return;
    }
    case "SOLVE_PREVIEW": {
      if (!payload.frame || payload.frame.schemaVersion !== frameSchemaVersion) {
        return;
      }
      postSolve(payload.garmentId, payload.frame);
      return;
    }
    case "GET_DEFORMATION": {
      const garmentState = ensureGarmentState(payload.garmentId);
      if (garmentState.lastDeformation) {
        globalThis.postMessage(garmentState.lastDeformation);
      }
      return;
    }
    case "DISPOSE_GARMENT": {
      solverState.garments.delete(payload.garmentId);
      return;
    }
    case "DISPOSE_SOLVER": {
      solverState.initialized = false;
      solverState.bodySignature = null;
      solverState.collisionBody = null;
      solverState.garments.clear();
      return;
    }
    default:
      return;
  }
};
