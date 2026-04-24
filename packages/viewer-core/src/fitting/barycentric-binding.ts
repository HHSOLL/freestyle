const POSITION_STRIDE = 3;
const EPSILON = 1e-8;

type Vec3 = [number, number, number];
type TriangleVertexIds = [number, number, number];

export type IndexedRestMesh = {
  positions: Float32Array<ArrayBufferLike>;
  indices: ArrayLike<number>;
};

export type PointRestMesh = {
  positions: Float32Array<ArrayBufferLike>;
};

export type BarycentricBindingEntry = {
  targetVertexIndex: number;
  sourceVertexIds: TriangleVertexIds;
  barycentric: Vec3;
  localOffset: Vec3;
  restDistanceSq: number;
};

export type BarycentricBinding = {
  kind: "barycentric";
  sourceVertexCount: number;
  targetVertexCount: number;
  entries: BarycentricBindingEntry[];
};

type ClosestPointResult = {
  point: Vec3;
  barycentric: Vec3;
  distanceSq: number;
};

type TriangleFrame = {
  tangent: Vec3;
  bitangent: Vec3;
  normal: Vec3;
};

const ensurePositionBuffer = (positions: Float32Array<ArrayBufferLike>, label: string) => {
  if (positions.length === 0 || positions.length % POSITION_STRIDE !== 0) {
    throw new Error(`${label} positions must be a non-empty Float32Array with xyz stride.`);
  }
};

const ensureTriangleIndexBuffer = (indices: ArrayLike<number>) => {
  if (indices.length === 0 || indices.length % POSITION_STRIDE !== 0) {
    throw new Error("Source indices must contain triangles.");
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

const dot = (left: Vec3, right: Vec3) => left[0] * right[0] + left[1] * right[1] + left[2] * right[2];

const cross = (left: Vec3, right: Vec3): Vec3 => [
  left[1] * right[2] - left[2] * right[1],
  left[2] * right[0] - left[0] * right[2],
  left[0] * right[1] - left[1] * right[0],
];

const lengthSq = (value: Vec3) => dot(value, value);

const normalize = (value: Vec3, fallback: Vec3): Vec3 => {
  const valueLengthSq = lengthSq(value);
  if (valueLengthSq <= EPSILON) {
    return fallback;
  }

  const inverse = 1 / Math.sqrt(valueLengthSq);
  return scale(value, inverse);
};

const orthogonal = (value: Vec3): Vec3 => {
  const basis = Math.abs(value[0]) < 0.9 ? ([1, 0, 0] as Vec3) : ([0, 1, 0] as Vec3);
  return normalize(cross(value, basis), [0, 0, 1]);
};

const barycentricPoint = (a: Vec3, b: Vec3, c: Vec3, barycentric: Vec3): Vec3 => {
  return [
    a[0] * barycentric[0] + b[0] * barycentric[1] + c[0] * barycentric[2],
    a[1] * barycentric[0] + b[1] * barycentric[1] + c[1] * barycentric[2],
    a[2] * barycentric[0] + b[2] * barycentric[1] + c[2] * barycentric[2],
  ];
};

const buildTriangleFrame = (a: Vec3, b: Vec3, c: Vec3): TriangleFrame => {
  const ab = subtract(b, a);
  const ac = subtract(c, a);
  const tangent = normalize(lengthSq(ab) > EPSILON ? ab : ac, [1, 0, 0]);
  const rawNormal = cross(ab, ac);
  const normal = normalize(rawNormal, orthogonal(tangent));
  const bitangent = normalize(cross(normal, tangent), orthogonal(tangent));

  return {
    tangent,
    bitangent,
    normal,
  };
};

const closestPointOnTriangle = (point: Vec3, a: Vec3, b: Vec3, c: Vec3): ClosestPointResult => {
  const ab = subtract(b, a);
  const ac = subtract(c, a);
  const ap = subtract(point, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);

  if (d1 <= 0 && d2 <= 0) {
    return {
      point: a,
      barycentric: [1, 0, 0],
      distanceSq: lengthSq(subtract(point, a)),
    };
  }

  const bp = subtract(point, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) {
    return {
      point: b,
      barycentric: [0, 1, 0],
      distanceSq: lengthSq(subtract(point, b)),
    };
  }

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    const result = add(a, scale(ab, v));
    return {
      point: result,
      barycentric: [1 - v, v, 0],
      distanceSq: lengthSq(subtract(point, result)),
    };
  }

  const cp = subtract(point, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) {
    return {
      point: c,
      barycentric: [0, 0, 1],
      distanceSq: lengthSq(subtract(point, c)),
    };
  }

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    const result = add(a, scale(ac, w));
    return {
      point: result,
      barycentric: [1 - w, 0, w],
      distanceSq: lengthSq(subtract(point, result)),
    };
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const edge = subtract(c, b);
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    const result = add(b, scale(edge, w));
    return {
      point: result,
      barycentric: [0, 1 - w, w],
      distanceSq: lengthSq(subtract(point, result)),
    };
  }

  const denominator = 1 / (va + vb + vc);
  const v = vb * denominator;
  const w = vc * denominator;
  const barycentric: Vec3 = [1 - v - w, v, w];
  const result = barycentricPoint(a, b, c, barycentric);

  return {
    point: result,
    barycentric,
    distanceSq: lengthSq(subtract(point, result)),
  };
};

export const createBarycentricBinding = (sourceMesh: IndexedRestMesh, targetMesh: PointRestMesh): BarycentricBinding => {
  ensurePositionBuffer(sourceMesh.positions, "Source");
  ensurePositionBuffer(targetMesh.positions, "Target");
  ensureTriangleIndexBuffer(sourceMesh.indices);

  const entries: BarycentricBindingEntry[] = [];
  const sourceVertexCount = sourceMesh.positions.length / POSITION_STRIDE;
  const targetVertexCount = targetMesh.positions.length / POSITION_STRIDE;

  for (let targetVertexIndex = 0; targetVertexIndex < targetVertexCount; targetVertexIndex += 1) {
    const point = getVec3(targetMesh.positions, targetVertexIndex);

    let best: (ClosestPointResult & { sourceVertexIds: TriangleVertexIds; triangleOrder: number }) | null = null;

    for (let offset = 0; offset < sourceMesh.indices.length; offset += POSITION_STRIDE) {
      const sourceVertexIds: TriangleVertexIds = [
        Number(sourceMesh.indices[offset]),
        Number(sourceMesh.indices[offset + 1]),
        Number(sourceMesh.indices[offset + 2]),
      ];
      const a = getVec3(sourceMesh.positions, sourceVertexIds[0]);
      const b = getVec3(sourceMesh.positions, sourceVertexIds[1]);
      const c = getVec3(sourceMesh.positions, sourceVertexIds[2]);
      const candidate = closestPointOnTriangle(point, a, b, c);

      if (
        best === null ||
        candidate.distanceSq < best.distanceSq - EPSILON ||
        (Math.abs(candidate.distanceSq - best.distanceSq) <= EPSILON && offset < best.triangleOrder)
      ) {
        best = {
          ...candidate,
          sourceVertexIds,
          triangleOrder: offset,
        };
      }
    }

    if (!best) {
      throw new Error(`Unable to create a barycentric binding for target vertex ${targetVertexIndex}.`);
    }

    const [sourceA, sourceB, sourceC] = best.sourceVertexIds;
    const frame = buildTriangleFrame(
      getVec3(sourceMesh.positions, sourceA),
      getVec3(sourceMesh.positions, sourceB),
      getVec3(sourceMesh.positions, sourceC),
    );
    const offset = subtract(point, best.point);

    entries.push({
      targetVertexIndex,
      sourceVertexIds: best.sourceVertexIds,
      barycentric: best.barycentric,
      localOffset: [dot(offset, frame.tangent), dot(offset, frame.bitangent), dot(offset, frame.normal)],
      restDistanceSq: best.distanceSq,
    });
  }

  return {
    kind: "barycentric",
    sourceVertexCount,
    targetVertexCount,
    entries,
  };
};

export const applyBarycentricBinding = (
  binding: BarycentricBinding,
  sourceDeformedPositions: Float32Array<ArrayBufferLike>,
  targetPositions?: Float32Array<ArrayBufferLike>,
) => {
  const resolvedTargetPositions = targetPositions ?? new Float32Array(binding.targetVertexCount * POSITION_STRIDE);
  ensurePositionBuffer(sourceDeformedPositions, "Deformed source");
  ensurePositionBuffer(resolvedTargetPositions, "Target");

  if (sourceDeformedPositions.length / POSITION_STRIDE !== binding.sourceVertexCount) {
    throw new Error("Deformed source positions do not match the source vertex count used to build the binding.");
  }

  if (resolvedTargetPositions.length / POSITION_STRIDE !== binding.targetVertexCount) {
    throw new Error("Target positions do not match the target vertex count used to build the binding.");
  }

  binding.entries.forEach((entry) => {
    const a = getVec3(sourceDeformedPositions, entry.sourceVertexIds[0]);
    const b = getVec3(sourceDeformedPositions, entry.sourceVertexIds[1]);
    const c = getVec3(sourceDeformedPositions, entry.sourceVertexIds[2]);
    const point = barycentricPoint(a, b, c, entry.barycentric);
    const frame = buildTriangleFrame(a, b, c);
    const transferred = add(
      point,
      add(
        add(scale(frame.tangent, entry.localOffset[0]), scale(frame.bitangent, entry.localOffset[1])),
        scale(frame.normal, entry.localOffset[2]),
      ),
    );
    setVec3(resolvedTargetPositions, entry.targetVertexIndex, transferred);
  });

  return resolvedTargetPositions;
};
