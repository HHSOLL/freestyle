const POSITION_STRIDE = 3;
const EPSILON = 1e-8;

type Vec3 = [number, number, number];

export type CageBindingEntry = {
  targetVertexIndex: number;
  restPosition: Vec3;
  influenceVertexIds: number[];
  weights: number[];
};

export type CageBinding = {
  kind: "cage";
  cageVertexCount: number;
  targetVertexCount: number;
  restCagePositions: Float32Array<ArrayBufferLike>;
  entries: CageBindingEntry[];
};

export type CageBindingOptions = {
  maxInfluences?: number;
  weightPower?: number;
};

const ensurePositionBuffer = (positions: Float32Array<ArrayBufferLike>, label: string) => {
  if (positions.length === 0 || positions.length % POSITION_STRIDE !== 0) {
    throw new Error(`${label} positions must be a non-empty Float32Array with xyz stride.`);
  }
};

const getVec3 = (buffer: Float32Array<ArrayBufferLike>, vertexIndex: number): Vec3 => {
  const offset = vertexIndex * POSITION_STRIDE;
  if (offset + 2 >= buffer.length) {
    throw new Error(`Vertex index ${vertexIndex} is out of range for the provided positions.`);
  }

  return [buffer[offset], buffer[offset + 1], buffer[offset + 2]];
};

const setVec3 = (buffer: Float32Array<ArrayBufferLike>, vertexIndex: number, value: Vec3) => {
  const offset = vertexIndex * POSITION_STRIDE;
  buffer[offset] = value[0];
  buffer[offset + 1] = value[1];
  buffer[offset + 2] = value[2];
};

const subtract = (left: Vec3, right: Vec3): Vec3 => [
  left[0] - right[0],
  left[1] - right[1],
  left[2] - right[2],
];

const add = (left: Vec3, right: Vec3): Vec3 => [
  left[0] + right[0],
  left[1] + right[1],
  left[2] + right[2],
];

const scale = (value: Vec3, factor: number): Vec3 => [
  value[0] * factor,
  value[1] * factor,
  value[2] * factor,
];

const lengthSq = (value: Vec3) => value[0] * value[0] + value[1] * value[1] + value[2] * value[2];

export const createCageBinding = (
  cageRestPositions: Float32Array<ArrayBufferLike>,
  targetRestPositions: Float32Array<ArrayBufferLike>,
  options: CageBindingOptions = {},
): CageBinding => {
  ensurePositionBuffer(cageRestPositions, "Cage");
  ensurePositionBuffer(targetRestPositions, "Target");

  const cageVertexCount = cageRestPositions.length / POSITION_STRIDE;
  const targetVertexCount = targetRestPositions.length / POSITION_STRIDE;
  const maxInfluences = Math.max(1, Math.min(options.maxInfluences ?? 4, cageVertexCount));
  const weightPower = options.weightPower ?? 2;
  const entries: CageBindingEntry[] = [];

  for (let targetVertexIndex = 0; targetVertexIndex < targetVertexCount; targetVertexIndex += 1) {
    const restPosition = getVec3(targetRestPositions, targetVertexIndex);
    const distances = Array.from({ length: cageVertexCount }, (_, influenceVertexId) => {
      const delta = subtract(restPosition, getVec3(cageRestPositions, influenceVertexId));
      return {
        influenceVertexId,
        distanceSq: lengthSq(delta),
      };
    }).sort((left, right) => left.distanceSq - right.distanceSq || left.influenceVertexId - right.influenceVertexId);

    const nearest = distances.slice(0, maxInfluences);
    const exact = nearest.find((entry) => entry.distanceSq <= EPSILON);

    if (exact) {
      entries.push({
        targetVertexIndex,
        restPosition,
        influenceVertexIds: [exact.influenceVertexId],
        weights: [1],
      });
      continue;
    }

    const unnormalized = nearest.map((entry) => 1 / Math.pow(Math.sqrt(entry.distanceSq), weightPower));
    const sum = unnormalized.reduce((total, value) => total + value, 0);
    if (!Number.isFinite(sum) || sum <= 0) {
      throw new Error(`Unable to normalize cage weights for target vertex ${targetVertexIndex}.`);
    }

    entries.push({
      targetVertexIndex,
      restPosition,
      influenceVertexIds: nearest.map((entry) => entry.influenceVertexId),
      weights: unnormalized.map((value) => value / sum),
    });
  }

  return {
    kind: "cage",
    cageVertexCount,
    targetVertexCount,
    restCagePositions: new Float32Array(cageRestPositions),
    entries,
  };
};

export const applyCageBinding = (
  binding: CageBinding,
  cageDeformedPositions: Float32Array<ArrayBufferLike>,
  targetPositions?: Float32Array<ArrayBufferLike>,
) => {
  const resolvedTargetPositions = targetPositions ?? new Float32Array(binding.targetVertexCount * POSITION_STRIDE);
  ensurePositionBuffer(cageDeformedPositions, "Deformed cage");
  ensurePositionBuffer(resolvedTargetPositions, "Target");

  if (cageDeformedPositions.length / POSITION_STRIDE !== binding.cageVertexCount) {
    throw new Error("Deformed cage positions do not match the cage vertex count used to build the binding.");
  }

  if (resolvedTargetPositions.length / POSITION_STRIDE !== binding.targetVertexCount) {
    throw new Error("Target positions do not match the target vertex count used to build the binding.");
  }

  binding.entries.forEach((entry) => {
    const displacement = entry.influenceVertexIds.reduce<Vec3>((total, influenceVertexId, influenceIndex) => {
      const deformed = getVec3(cageDeformedPositions, influenceVertexId);
      const rest = getVec3(binding.restCagePositions, influenceVertexId);
      const weighted = scale(subtract(deformed, rest), entry.weights[influenceIndex] ?? 0);
      return add(total, weighted);
    }, [0, 0, 0]);

    setVec3(resolvedTargetPositions, entry.targetVertexIndex, add(entry.restPosition, displacement));
  });

  return resolvedTargetPositions;
};
