import assert from "node:assert/strict";
import test from "node:test";

import {
  applyFitKernelDisplayDeformationTransfer,
  buildFitKernelDisplayTransferBinding,
} from "./deformation-transfer.js";

const assertClose = (actual: number | undefined, expected: number, epsilon = 0.000001) => {
  assert.ok(actual !== undefined);
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not within ${epsilon} of ${expected}`);
};

test("display transfer binding maps display vertices to normalized fit-space influences", () => {
  const displayRestPositions = new Float32Array([
    -1, 1, 0,
    1, 1, 0,
    -1, -1, 0,
    1, -1, 0,
  ]);
  const fitRestPositions = new Float32Array([
    -0.5, 0.5, 0,
    0.5, 0.5, 0,
    -0.5, -0.5, 0,
    0.5, -0.5, 0,
  ]);

  const binding = buildFitKernelDisplayTransferBinding({
    displayRestPositions,
    fitRestPositions,
    maxInfluences: 1,
  });

  assert.equal(binding.displayVertexCount, 4);
  assert.equal(binding.fitVertexCount, 4);
  assert.equal(binding.influences.length, 4);
  assert.deepEqual(
    binding.influences.map((influence) => influence.fitVertex),
    [0, 1, 2, 3],
  );
});

test("display transfer applies fit-mesh displacement without mutating rest buffers", () => {
  const displayRestPositions = new Float32Array([
    -1, 1, 0,
    1, 1, 0,
    -1, -1, 0,
    1, -1, 0,
  ]);
  const fitRestPositions = new Float32Array([
    -0.5, 0.5, 0,
    0.5, 0.5, 0,
    -0.5, -0.5, 0,
    0.5, -0.5, 0,
  ]);
  const fitDisplacements = new Float32Array([
    0, -0.01, 0,
    0, -0.02, 0,
    0, -0.03, 0,
    0, -0.04, 0,
  ]);
  const binding = buildFitKernelDisplayTransferBinding({
    displayRestPositions,
    fitRestPositions,
    maxInfluences: 1,
  });

  const result = applyFitKernelDisplayDeformationTransfer({
    displayRestPositions,
    fitRestPositions,
    fitDisplacements,
    binding,
    strength: 0.5,
  });

  assert.equal(result.appliedVertexCount, 4);
  assert.equal(result.maxDisplacementMm, 20);
  assert.equal(displayRestPositions[1], 1);
  assertClose(result.positions[1], 0.995);
  assertClose(result.positions[10], -1.02);
});
