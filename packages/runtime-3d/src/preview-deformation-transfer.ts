import {
  applyFitKernelDisplayDeformationTransfer,
  type FitKernelDisplayTransferBinding,
} from "@freestyle/fit-kernel";
import * as THREE from "three";

type PreviewFitMeshDeformationPayload = {
  buffer?: {
    schemaVersion: string;
    solverKind: string;
    vertexCount: number;
    byteLength: number;
  };
  buffers?: {
    positions?: ArrayBuffer;
    displacements?: ArrayBuffer;
  };
};

type GeometryTransferState = {
  displayRestPositions: Float32Array;
  binding?: FitKernelDisplayTransferBinding;
  fitVertexCount?: number;
};

export type RuntimePreviewFitMeshTransferResult = {
  appliedMeshCount: number;
  appliedVertexCount: number;
  maxDisplacementMm: number;
};

const geometryTransferState = new WeakMap<THREE.BufferGeometry, GeometryTransferState>();

const isMeshWithPositionGeometry = (
  object: THREE.Object3D,
): object is THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> => {
  if (!(object instanceof THREE.Mesh)) {
    return false;
  }
  const geometry = object.geometry;
  const position = geometry?.getAttribute("position");
  return Boolean(geometry && position && "array" in position && position.array instanceof Float32Array);
};

const buildFitRestPositions = (positions: Float32Array, displacements: Float32Array) => {
  if (positions.length !== displacements.length) {
    throw new Error("fit deformation positions and displacements must have the same length.");
  }
  const restPositions = new Float32Array(positions.length);
  for (let index = 0; index < positions.length; index += 1) {
    restPositions[index] = (positions[index] ?? 0) - (displacements[index] ?? 0);
  }
  return restPositions;
};

export function applyRuntimePreviewFitMeshDeformation(
  root: THREE.Object3D | null,
  deformation: PreviewFitMeshDeformationPayload,
  options: { strength?: number } = {},
): RuntimePreviewFitMeshTransferResult {
  if (
    !root ||
    deformation.buffer?.schemaVersion !== "preview-fit-mesh-deformation-buffer.v1" ||
    !deformation.buffers?.positions ||
    !deformation.buffers.displacements
  ) {
    return { appliedMeshCount: 0, appliedVertexCount: 0, maxDisplacementMm: 0 };
  }

  const fitPositions = new Float32Array(deformation.buffers.positions);
  const fitDisplacements = new Float32Array(deformation.buffers.displacements);
  const fitRestPositions = buildFitRestPositions(fitPositions, fitDisplacements);
  const fitVertexCount = fitRestPositions.length / 3;
  let appliedMeshCount = 0;
  let appliedVertexCount = 0;
  let maxDisplacementMm = 0;

  root.traverse((object) => {
    if (!isMeshWithPositionGeometry(object)) {
      return;
    }

    const geometry = object.geometry;
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const positionArray = position.array as Float32Array;
    let state = geometryTransferState.get(geometry);
    if (!state || state.displayRestPositions.length !== positionArray.length) {
      state = {
        displayRestPositions: new Float32Array(positionArray),
      };
      geometryTransferState.set(geometry, state);
    }

    const result = applyFitKernelDisplayDeformationTransfer({
      displayRestPositions: state.displayRestPositions,
      fitRestPositions,
      fitDisplacements,
      binding: state.fitVertexCount === fitVertexCount ? state.binding : undefined,
      strength: options.strength ?? 0.42,
    });

    state.binding = result.binding;
    state.fitVertexCount = fitVertexCount;
    positionArray.set(result.positions);
    position.needsUpdate = true;
    if (geometry.getAttribute("normal")) {
      geometry.computeVertexNormals();
      const normal = geometry.getAttribute("normal");
      if (normal) {
        normal.needsUpdate = true;
      }
    }
    geometry.computeBoundingSphere();
    appliedMeshCount += 1;
    appliedVertexCount += result.appliedVertexCount;
    maxDisplacementMm = Math.max(maxDisplacementMm, result.maxDisplacementMm);
  });

  return { appliedMeshCount, appliedVertexCount, maxDisplacementMm };
}
