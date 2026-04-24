import type {
  FitKernelPreviewDeformationTransferMode,
  FitKernelPreviewSolverKind,
  FitKernelPreviewVector3,
} from "./index.js";

export const fitKernelXpbdPreviewSolveSchemaVersion = "xpbd-preview-solve.v1";
export const fitKernelXpbdDeformationBufferSchemaVersion =
  "preview-fit-mesh-deformation-buffer.v1";

export type FitKernelXpbdDistanceConstraintKind =
  | "stretch"
  | "shear"
  | "bend"
  | "waistband"
  | "strap"
  | "hem";

export type FitKernelXpbdDistanceConstraint = {
  kind: FitKernelXpbdDistanceConstraintKind;
  particleA: number;
  particleB: number;
  restLengthMeters: number;
  compliance?: number;
};

export type FitKernelXpbdPinConstraint = {
  kind: "pin";
  particle: number;
  target: FitKernelPreviewVector3;
  compliance?: number;
};

export type FitKernelXpbdSphereCollisionConstraint = {
  kind: "sphere-collision";
  particle: number;
  center: FitKernelPreviewVector3;
  radiusMeters: number;
  marginMeters?: number;
  friction?: number;
};

export type FitKernelXpbdConstraint =
  | FitKernelXpbdDistanceConstraint
  | FitKernelXpbdPinConstraint
  | FitKernelXpbdSphereCollisionConstraint;

export type FitKernelXpbdSolveInput = {
  schemaVersion: typeof fitKernelXpbdPreviewSolveSchemaVersion;
  sessionId: string;
  garmentId: string;
  sequence: number;
  positions: Float32Array | readonly number[];
  previousPositions?: Float32Array | readonly number[];
  inverseMasses: Float32Array | readonly number[];
  constraints: readonly FitKernelXpbdConstraint[];
  iterations: number;
  deltaSeconds: number;
  gravity?: FitKernelPreviewVector3;
  damping?: number;
};

export type FitKernelXpbdDeformationBuffer = {
  schemaVersion: typeof fitKernelXpbdDeformationBufferSchemaVersion;
  garmentId: string;
  sessionId: string;
  sequence: number;
  solverKind: Extract<FitKernelPreviewSolverKind, "xpbd-cloth-preview">;
  transferMode: Extract<
    FitKernelPreviewDeformationTransferMode,
    "fit-mesh-deformation-buffer"
  >;
  vertexCount: number;
  positions: Float32Array;
  displacements: Float32Array;
  maxDisplacementMm: number;
  residualError: number;
  hasNaN: boolean;
  iterations: number;
};

type MutableVector3 = [number, number, number];

const minimumDeltaSeconds = 1 / 240;
const maximumDeltaSeconds = 1 / 24;

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isFiniteNumber = (value: number) => Number.isFinite(value);

const toFloat32Array = (value: Float32Array | readonly number[], label: string) => {
  const array = value instanceof Float32Array ? new Float32Array(value) : Float32Array.from(value);
  for (const entry of array) {
    if (!isFiniteNumber(entry)) {
      throw new Error(`${label} contains a non-finite value.`);
    }
  }
  return array;
};

const assertParticleIndex = (particle: number, vertexCount: number, label: string) => {
  if (!Number.isInteger(particle) || particle < 0 || particle >= vertexCount) {
    throw new Error(`${label} references invalid particle index ${particle}.`);
  }
};

const readVector = (positions: Float32Array, particle: number): MutableVector3 => {
  const offset = particle * 3;
  return [positions[offset] ?? 0, positions[offset + 1] ?? 0, positions[offset + 2] ?? 0];
};

const writeVector = (positions: Float32Array, particle: number, vector: MutableVector3) => {
  const offset = particle * 3;
  positions[offset] = vector[0];
  positions[offset + 1] = vector[1];
  positions[offset + 2] = vector[2];
};

const vectorLength = (x: number, y: number, z: number) => Math.hypot(x, y, z);

const complianceAlpha = (compliance: number | undefined, deltaSeconds: number) =>
  Math.max(compliance ?? 0, 0) / Math.max(deltaSeconds * deltaSeconds, 1e-8);

const applyDistanceConstraint = (
  positions: Float32Array,
  inverseMasses: Float32Array,
  vertexCount: number,
  constraint: FitKernelXpbdDistanceConstraint,
  deltaSeconds: number,
) => {
  assertParticleIndex(constraint.particleA, vertexCount, constraint.kind);
  assertParticleIndex(constraint.particleB, vertexCount, constraint.kind);
  if (!isFiniteNumber(constraint.restLengthMeters) || constraint.restLengthMeters < 0) {
    throw new Error(`${constraint.kind} constraint has an invalid rest length.`);
  }

  const a = readVector(positions, constraint.particleA);
  const b = readVector(positions, constraint.particleB);
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  const length = vectorLength(dx, dy, dz);
  if (length <= 1e-8) {
    return 0;
  }

  const wA = inverseMasses[constraint.particleA] ?? 0;
  const wB = inverseMasses[constraint.particleB] ?? 0;
  const weightSum = wA + wB;
  if (weightSum <= 0) {
    return 0;
  }

  const residual = length - constraint.restLengthMeters;
  const lambda = -residual / (weightSum + complianceAlpha(constraint.compliance, deltaSeconds));
  const nx = dx / length;
  const ny = dy / length;
  const nz = dz / length;

  writeVector(positions, constraint.particleA, [
    a[0] + wA * lambda * nx,
    a[1] + wA * lambda * ny,
    a[2] + wA * lambda * nz,
  ]);
  writeVector(positions, constraint.particleB, [
    b[0] - wB * lambda * nx,
    b[1] - wB * lambda * ny,
    b[2] - wB * lambda * nz,
  ]);

  return Math.abs(residual);
};

const applyPinConstraint = (
  positions: Float32Array,
  inverseMasses: Float32Array,
  vertexCount: number,
  constraint: FitKernelXpbdPinConstraint,
  deltaSeconds: number,
) => {
  assertParticleIndex(constraint.particle, vertexCount, "pin");
  const weight = inverseMasses[constraint.particle] ?? 0;
  if (weight <= 0) {
    return 0;
  }

  const position = readVector(positions, constraint.particle);
  const residualX = constraint.target[0] - position[0];
  const residualY = constraint.target[1] - position[1];
  const residualZ = constraint.target[2] - position[2];
  const alpha = complianceAlpha(constraint.compliance, deltaSeconds);
  const correctionScale = weight / (weight + alpha);
  writeVector(positions, constraint.particle, [
    position[0] + residualX * correctionScale,
    position[1] + residualY * correctionScale,
    position[2] + residualZ * correctionScale,
  ]);

  return vectorLength(residualX, residualY, residualZ);
};

const applySphereCollisionConstraint = (
  positions: Float32Array,
  inverseMasses: Float32Array,
  vertexCount: number,
  constraint: FitKernelXpbdSphereCollisionConstraint,
) => {
  assertParticleIndex(constraint.particle, vertexCount, "sphere-collision");
  if (!isFiniteNumber(constraint.radiusMeters) || constraint.radiusMeters <= 0) {
    throw new Error("sphere-collision constraint has an invalid radius.");
  }

  const weight = inverseMasses[constraint.particle] ?? 0;
  if (weight <= 0) {
    return 0;
  }

  const position = readVector(positions, constraint.particle);
  const dx = position[0] - constraint.center[0];
  const dy = position[1] - constraint.center[1];
  const dz = position[2] - constraint.center[2];
  const distance = vectorLength(dx, dy, dz);
  const targetRadius = constraint.radiusMeters + (constraint.marginMeters ?? 0);
  if (distance >= targetRadius) {
    return 0;
  }

  const nx = distance > 1e-8 ? dx / distance : 0;
  const ny = distance > 1e-8 ? dy / distance : 1;
  const nz = distance > 1e-8 ? dz / distance : 0;
  const frictionScale = clampNumber(1 - (constraint.friction ?? 0), 0.05, 1);
  writeVector(positions, constraint.particle, [
    constraint.center[0] + nx * targetRadius,
    constraint.center[1] + ny * targetRadius * frictionScale + position[1] * (1 - frictionScale),
    constraint.center[2] + nz * targetRadius,
  ]);

  return targetRadius - distance;
};

const assertXpbdSolveInput = (input: FitKernelXpbdSolveInput) => {
  if (input.schemaVersion !== fitKernelXpbdPreviewSolveSchemaVersion) {
    throw new Error(`Unsupported XPBD solve schema version: ${input.schemaVersion}`);
  }
  if (!input.sessionId.trim() || !input.garmentId.trim()) {
    throw new Error("XPBD solve input requires sessionId and garmentId.");
  }
  if (!Number.isInteger(input.sequence) || input.sequence < 0) {
    throw new Error("XPBD solve input requires a non-negative integer sequence.");
  }
  if (!Number.isInteger(input.iterations) || input.iterations <= 0 || input.iterations > 128) {
    throw new Error("XPBD solve input iterations must be between 1 and 128.");
  }
  if (!isFiniteNumber(input.deltaSeconds) || input.deltaSeconds <= 0) {
    throw new Error("XPBD solve input requires a positive deltaSeconds.");
  }
};

export function solveFitKernelXpbdPreview(
  input: FitKernelXpbdSolveInput,
): FitKernelXpbdDeformationBuffer {
  assertXpbdSolveInput(input);
  const restPositions = toFloat32Array(input.positions, "positions");
  if (restPositions.length === 0 || restPositions.length % 3 !== 0) {
    throw new Error("positions length must be a non-empty multiple of 3.");
  }

  const vertexCount = restPositions.length / 3;
  const previousPositions = input.previousPositions
    ? toFloat32Array(input.previousPositions, "previousPositions")
    : new Float32Array(restPositions);
  const inverseMasses = toFloat32Array(input.inverseMasses, "inverseMasses");
  if (previousPositions.length !== restPositions.length) {
    throw new Error("previousPositions length must match positions length.");
  }
  if (inverseMasses.length !== vertexCount) {
    throw new Error("inverseMasses length must match vertex count.");
  }

  const positions = new Float32Array(restPositions);
  const deltaSeconds = clampNumber(input.deltaSeconds, minimumDeltaSeconds, maximumDeltaSeconds);
  const gravity = input.gravity ?? [0, -9.81, 0];
  const damping = clampNumber(input.damping ?? 0.985, 0, 1);

  for (let particle = 0; particle < vertexCount; particle += 1) {
    const inverseMass = inverseMasses[particle] ?? 0;
    if (inverseMass <= 0) {
      continue;
    }

    const offset = particle * 3;
    positions[offset] =
      (positions[offset] ?? 0) +
      ((positions[offset] ?? 0) - (previousPositions[offset] ?? 0)) * damping +
      gravity[0] * deltaSeconds * deltaSeconds;
    positions[offset + 1] =
      (positions[offset + 1] ?? 0) +
      ((positions[offset + 1] ?? 0) - (previousPositions[offset + 1] ?? 0)) * damping +
      gravity[1] * deltaSeconds * deltaSeconds;
    positions[offset + 2] =
      (positions[offset + 2] ?? 0) +
      ((positions[offset + 2] ?? 0) - (previousPositions[offset + 2] ?? 0)) * damping +
      gravity[2] * deltaSeconds * deltaSeconds;
  }

  let accumulatedResidual = 0;
  for (let iteration = 0; iteration < input.iterations; iteration += 1) {
    for (const constraint of input.constraints) {
      if (constraint.kind === "pin") {
        accumulatedResidual += applyPinConstraint(
          positions,
          inverseMasses,
          vertexCount,
          constraint,
          deltaSeconds,
        );
      } else if (constraint.kind === "sphere-collision") {
        accumulatedResidual += applySphereCollisionConstraint(
          positions,
          inverseMasses,
          vertexCount,
          constraint,
        );
      } else {
        accumulatedResidual += applyDistanceConstraint(
          positions,
          inverseMasses,
          vertexCount,
          constraint,
          deltaSeconds,
        );
      }
    }
  }

  const displacements = new Float32Array(restPositions.length);
  let maxDisplacementMeters = 0;
  let hasNaN = false;
  for (let index = 0; index < positions.length; index += 3) {
    const dx = (positions[index] ?? 0) - (restPositions[index] ?? 0);
    const dy = (positions[index + 1] ?? 0) - (restPositions[index + 1] ?? 0);
    const dz = (positions[index + 2] ?? 0) - (restPositions[index + 2] ?? 0);
    displacements[index] = dx;
    displacements[index + 1] = dy;
    displacements[index + 2] = dz;
    hasNaN =
      hasNaN ||
      !isFiniteNumber(positions[index] ?? Number.NaN) ||
      !isFiniteNumber(positions[index + 1] ?? Number.NaN) ||
      !isFiniteNumber(positions[index + 2] ?? Number.NaN);
    maxDisplacementMeters = Math.max(maxDisplacementMeters, vectorLength(dx, dy, dz));
  }

  return {
    schemaVersion: fitKernelXpbdDeformationBufferSchemaVersion,
    garmentId: input.garmentId,
    sessionId: input.sessionId,
    sequence: input.sequence,
    solverKind: "xpbd-cloth-preview",
    transferMode: "fit-mesh-deformation-buffer",
    vertexCount,
    positions,
    displacements,
    maxDisplacementMm: Number((maxDisplacementMeters * 1000).toFixed(4)),
    residualError: Number(
      (
        accumulatedResidual / Math.max(input.iterations * Math.max(input.constraints.length, 1), 1)
      ).toFixed(8),
    ),
    hasNaN,
    iterations: input.iterations,
  };
}
