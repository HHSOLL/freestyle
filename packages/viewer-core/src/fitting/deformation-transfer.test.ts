import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDeformationTransfer,
  createDeformationTransfer,
  evaluateFootwearFit,
} from "../index.js";

const toRoundedArray = (values: Float32Array<ArrayBufferLike>, precision = 4) =>
  [...values].map((value) => Number(value.toFixed(precision)));

test("barycentric deformation transfer maps fit mesh motion onto display vertices", () => {
  const transfer = createDeformationTransfer({
    mode: "barycentric",
    fitRestMesh: {
      positions: new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]),
      indices: [0, 1, 2],
    },
    displayRestMesh: {
      positions: new Float32Array([
        0.25, 0.25, 0.2,
      ]),
    },
  });

  const output = applyDeformationTransfer(transfer, {
    fitDeformedPositions: new Float32Array([
      0, 0, 1,
      1, 0, 1,
      0, 1, 1,
    ]),
  });

  assert.deepEqual(toRoundedArray(output), [0.25, 0.25, 1.2]);
});

test("cage deformation transfer applies weighted cage displacement without solving display mesh", () => {
  const transfer = createDeformationTransfer({
    mode: "cage",
    cageRestPositions: new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      1, 1, 0,
    ]),
    displayRestMesh: {
      positions: new Float32Array([
        0.5, 0.5, 0,
      ]),
    },
    options: {
      maxInfluences: 4,
    },
  });

  const output = applyDeformationTransfer(transfer, {
    cageDeformedPositions: new Float32Array([
      0, 0, 0.4,
      1, 0, 0.4,
      0, 1, 0.4,
      1, 1, 0.4,
    ]),
  });

  assert.deepEqual(toRoundedArray(output), [0.5, 0.5, 0.4]);
});

test("sandals footwear gate fails visible foot mask and strap penetration", () => {
  const result = evaluateFootwearFit({
    category: "sandals",
    metrics: {
      footLengthDeltaMm: 3,
      footWidthDeltaMm: 3,
      instepClearanceMm: 4,
      heelAlignmentDeltaMm: 3,
      toeAlignmentDeltaMm: 5,
      outsoleOverhangMm: 2,
      strapVisiblePenetrationMm: 3,
      bodyMaskVisibleAreaMm2: 1,
      soleGroundContactPass: true,
    },
  });

  assert.equal(result.pass, false);
  assert.deepEqual(
    result.failReasons.map((reason) => reason.metric).sort(),
    ["bodyMaskVisibleAreaMm2", "strapVisiblePenetrationMm", "toeAlignmentDeltaMm"],
  );
});

test("footwear gate fails closed when required metrics are missing", () => {
  const result = evaluateFootwearFit({
    category: "shoes",
    metrics: {
      soleGroundContactPass: true,
    },
  });

  assert.equal(result.pass, false);
  assert.ok(result.failReasons.some((reason) => reason.code === "missing-metric"));
  assert.ok(result.failReasons.some((reason) => reason.metric === "footLengthDeltaMm"));
});
