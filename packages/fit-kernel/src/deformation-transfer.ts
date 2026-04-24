export const fitKernelDeformationTransferSchemaVersion =
  "fit-mesh-display-transfer.v1";

export type FitKernelDisplayTransferInfluence = {
  displayVertex: number;
  fitVertex: number;
  weight: number;
};

export type FitKernelDisplayTransferBinding = {
  schemaVersion: typeof fitKernelDeformationTransferSchemaVersion;
  displayVertexCount: number;
  fitVertexCount: number;
  influences: readonly FitKernelDisplayTransferInfluence[];
};

export type FitKernelBuildDisplayTransferBindingInput = {
  displayRestPositions: Float32Array | readonly number[];
  fitRestPositions: Float32Array | readonly number[];
  maxInfluences?: number;
};

export type FitKernelApplyDisplayTransferInput = {
  displayRestPositions: Float32Array | readonly number[];
  fitRestPositions: Float32Array | readonly number[];
  fitDisplacements: Float32Array | readonly number[];
  binding?: FitKernelDisplayTransferBinding;
  strength?: number;
};

export type FitKernelApplyDisplayTransferResult = {
  schemaVersion: typeof fitKernelDeformationTransferSchemaVersion;
  positions: Float32Array;
  binding: FitKernelDisplayTransferBinding;
  displayVertexCount: number;
  fitVertexCount: number;
  maxDisplacementMm: number;
  appliedVertexCount: number;
};

type Bounds = {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
};

type NormalizedVertex = {
  vertex: number;
  x: number;
  y: number;
  z: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toFloat32Array = (value: Float32Array | readonly number[], label: string) => {
  const array = value instanceof Float32Array ? value : Float32Array.from(value);
  if (array.length === 0 || array.length % 3 !== 0) {
    throw new Error(`${label} must be a non-empty multiple of 3.`);
  }
  for (const entry of array) {
    if (!Number.isFinite(entry)) {
      throw new Error(`${label} contains a non-finite value.`);
    }
  }
  return array;
};

const computeBounds = (positions: Float32Array): Bounds => {
  const bounds: Bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  };

  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index] ?? 0;
    const y = positions[index + 1] ?? 0;
    const z = positions[index + 2] ?? 0;
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.minZ = Math.min(bounds.minZ, z);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
    bounds.maxZ = Math.max(bounds.maxZ, z);
  }

  return bounds;
};

const normalizeAxis = (value: number, min: number, max: number) => {
  const span = max - min;
  if (Math.abs(span) < 1e-8) {
    return 0;
  }
  return ((value - min) / span) * 2 - 1;
};

const normalizeVertices = (positions: Float32Array): NormalizedVertex[] => {
  const bounds = computeBounds(positions);
  const vertices: NormalizedVertex[] = [];

  for (let index = 0; index < positions.length; index += 3) {
    vertices.push({
      vertex: index / 3,
      x: normalizeAxis(positions[index] ?? 0, bounds.minX, bounds.maxX),
      y: normalizeAxis(positions[index + 1] ?? 0, bounds.minY, bounds.maxY),
      z: normalizeAxis(positions[index + 2] ?? 0, bounds.minZ, bounds.maxZ),
    });
  }

  return vertices;
};

const squaredDistance = (a: NormalizedVertex, b: NormalizedVertex) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
};

export function buildFitKernelDisplayTransferBinding(
  input: FitKernelBuildDisplayTransferBindingInput,
): FitKernelDisplayTransferBinding {
  const displayRestPositions = toFloat32Array(input.displayRestPositions, "displayRestPositions");
  const fitRestPositions = toFloat32Array(input.fitRestPositions, "fitRestPositions");
  const displayVertexCount = displayRestPositions.length / 3;
  const fitVertexCount = fitRestPositions.length / 3;
  const maxInfluences = clamp(Math.trunc(input.maxInfluences ?? 3), 1, 4);
  const displayVertices = normalizeVertices(displayRestPositions);
  const fitVertices = normalizeVertices(fitRestPositions);
  const influences: FitKernelDisplayTransferInfluence[] = [];

  for (const displayVertex of displayVertices) {
    const nearest = fitVertices
      .map((fitVertex) => ({
        fitVertex,
        distanceSq: squaredDistance(displayVertex, fitVertex),
      }))
      .sort((a, b) => a.distanceSq - b.distanceSq)
      .slice(0, Math.min(maxInfluences, fitVertexCount));
    const total = nearest.reduce(
      (sum, entry) => sum + 1 / Math.max(entry.distanceSq, 1e-6),
      0,
    );

    for (const entry of nearest) {
      const inverseDistance = 1 / Math.max(entry.distanceSq, 1e-6);
      influences.push({
        displayVertex: displayVertex.vertex,
        fitVertex: entry.fitVertex.vertex,
        weight: Number((inverseDistance / total).toFixed(8)),
      });
    }
  }

  return {
    schemaVersion: fitKernelDeformationTransferSchemaVersion,
    displayVertexCount,
    fitVertexCount,
    influences,
  };
}

export function applyFitKernelDisplayDeformationTransfer(
  input: FitKernelApplyDisplayTransferInput,
): FitKernelApplyDisplayTransferResult {
  const displayRestPositions = toFloat32Array(input.displayRestPositions, "displayRestPositions");
  const fitRestPositions = toFloat32Array(input.fitRestPositions, "fitRestPositions");
  const fitDisplacements = toFloat32Array(input.fitDisplacements, "fitDisplacements");
  const displayVertexCount = displayRestPositions.length / 3;
  const fitVertexCount = fitRestPositions.length / 3;

  if (fitDisplacements.length !== fitRestPositions.length) {
    throw new Error("fitDisplacements length must match fitRestPositions length.");
  }

  const binding =
    input.binding ??
    buildFitKernelDisplayTransferBinding({
      displayRestPositions,
      fitRestPositions,
    });
  if (
    binding.schemaVersion !== fitKernelDeformationTransferSchemaVersion ||
    binding.displayVertexCount !== displayVertexCount ||
    binding.fitVertexCount !== fitVertexCount
  ) {
    throw new Error("display transfer binding does not match the input topology.");
  }

  const positions = new Float32Array(displayRestPositions);
  const strength = clamp(input.strength ?? 1, 0, 1);
  let appliedVertexCount = 0;
  let maxDisplacementMeters = 0;
  const touched = new Set<number>();

  for (const influence of binding.influences) {
    if (
      influence.displayVertex < 0 ||
      influence.displayVertex >= displayVertexCount ||
      influence.fitVertex < 0 ||
      influence.fitVertex >= fitVertexCount
    ) {
      throw new Error("display transfer binding references an invalid vertex.");
    }
    const displayOffset = influence.displayVertex * 3;
    const fitOffset = influence.fitVertex * 3;
    const weightedStrength = influence.weight * strength;
    positions[displayOffset] += (fitDisplacements[fitOffset] ?? 0) * weightedStrength;
    positions[displayOffset + 1] += (fitDisplacements[fitOffset + 1] ?? 0) * weightedStrength;
    positions[displayOffset + 2] += (fitDisplacements[fitOffset + 2] ?? 0) * weightedStrength;
    touched.add(influence.displayVertex);
  }

  for (const vertex of touched) {
    appliedVertexCount += 1;
    const offset = vertex * 3;
    const dx = (positions[offset] ?? 0) - (displayRestPositions[offset] ?? 0);
    const dy = (positions[offset + 1] ?? 0) - (displayRestPositions[offset + 1] ?? 0);
    const dz = (positions[offset + 2] ?? 0) - (displayRestPositions[offset + 2] ?? 0);
    maxDisplacementMeters = Math.max(maxDisplacementMeters, Math.hypot(dx, dy, dz));
  }

  return {
    schemaVersion: fitKernelDeformationTransferSchemaVersion,
    positions,
    binding,
    displayVertexCount,
    fitVertexCount,
    maxDisplacementMm: Number((maxDisplacementMeters * 1000).toFixed(4)),
    appliedVertexCount,
  };
}
