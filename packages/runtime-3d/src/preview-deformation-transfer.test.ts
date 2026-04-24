import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import { applyRuntimePreviewFitMeshDeformation } from "./preview-deformation-transfer.js";

const assertClose = (actual: number | undefined, expected: number, epsilon = 0.01) => {
  assert.ok(actual !== undefined);
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not within ${epsilon} of ${expected}`);
};

const buildPayload = () => {
  const positions = new Float32Array([
    -0.5, 0.5, 0,
    0.5, 0.5, 0,
    -0.5, -0.5, 0,
    0.5, -0.5, 0,
  ]);
  const displacements = new Float32Array([
    0, -0.01, 0,
    0, -0.02, 0,
    0, -0.03, 0,
    0, -0.04, 0,
  ]);

  return {
    buffer: {
      schemaVersion: "preview-fit-mesh-deformation-buffer.v1",
      solverKind: "xpbd-cloth-preview",
      vertexCount: 4,
      byteLength: positions.byteLength + displacements.byteLength,
    },
    buffers: {
      positions: positions.buffer,
      displacements: displacements.buffer,
    },
  };
};

test("runtime preview transfer applies XPBD deformation buffers to visible mesh vertices", () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([
        -1, 1, 0,
        1, 1, 0,
        -1, -1, 0,
        1, -1, 0,
      ]),
      3,
    ),
  );
  geometry.setIndex([0, 2, 1, 1, 2, 3]);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  const root = new THREE.Group();
  root.add(mesh);

  const result = applyRuntimePreviewFitMeshDeformation(root, buildPayload(), { strength: 0.5 });
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const positionArray = position.array as Float32Array;

  assert.equal(result.appliedMeshCount, 1);
  assert.equal(result.appliedVertexCount, 4);
  assertClose(result.maxDisplacementMm, 20);
  assert.equal(position.version, 1);
  assertClose(positionArray[1], 0.995);
  assertClose(positionArray[10], -1.02);
});

test("runtime preview transfer ignores non-XPBD deformation envelopes", () => {
  const root = new THREE.Group();
  const result = applyRuntimePreviewFitMeshDeformation(root, {
    buffer: {
      schemaVersion: "preview-deformation.v1",
      solverKind: "reduced-preview-spring",
      vertexCount: 0,
      byteLength: 0,
    },
  });

  assert.deepEqual(result, {
    appliedMeshCount: 0,
    appliedVertexCount: 0,
    maxDisplacementMm: 0,
  });
});
