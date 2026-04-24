import {
  applyBarycentricBinding,
  createBarycentricBinding,
  type BarycentricBinding,
  type IndexedRestMesh,
  type PointRestMesh,
} from "./barycentric-binding.js";
import { applyCageBinding, createCageBinding, type CageBinding, type CageBindingOptions } from "./cage-binding.js";

export type DeformationTransferMode = "barycentric" | "cage";

export type DeformationTransfer =
  | {
      mode: "barycentric";
      binding: BarycentricBinding;
    }
  | {
      mode: "cage";
      binding: CageBinding;
    };

export type CreateDeformationTransferInput =
  | {
      mode: "barycentric";
      fitRestMesh: IndexedRestMesh;
      displayRestMesh: PointRestMesh;
    }
  | {
      mode: "cage";
      cageRestPositions: Float32Array<ArrayBufferLike>;
      displayRestMesh: PointRestMesh;
      options?: CageBindingOptions;
    };

export type ApplyDeformationTransferInput =
  | {
      mode?: "barycentric";
      fitDeformedPositions: Float32Array<ArrayBufferLike>;
      targetPositions?: Float32Array<ArrayBufferLike>;
    }
  | {
      mode?: "cage";
      cageDeformedPositions: Float32Array<ArrayBufferLike>;
      targetPositions?: Float32Array<ArrayBufferLike>;
    };

export const createDeformationTransfer = (input: CreateDeformationTransferInput): DeformationTransfer => {
  if (input.mode === "barycentric") {
    return {
      mode: "barycentric",
      binding: createBarycentricBinding(input.fitRestMesh, input.displayRestMesh),
    };
  }

  return {
    mode: "cage",
    binding: createCageBinding(input.cageRestPositions, input.displayRestMesh.positions, input.options),
  };
};

export const applyDeformationTransfer = (
  transfer: DeformationTransfer,
  input: ApplyDeformationTransferInput,
): Float32Array => {
  if (transfer.mode === "barycentric") {
    if (!("fitDeformedPositions" in input)) {
      throw new Error("Barycentric transfer requires fitDeformedPositions.");
    }

    return applyBarycentricBinding(transfer.binding, input.fitDeformedPositions, input.targetPositions);
  }

  if (!("cageDeformedPositions" in input)) {
    throw new Error("Cage transfer requires cageDeformedPositions.");
  }

  return applyCageBinding(transfer.binding, input.cageDeformedPositions, input.targetPositions);
};
