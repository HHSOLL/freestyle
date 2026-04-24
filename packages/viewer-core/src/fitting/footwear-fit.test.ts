import assert from "node:assert/strict";
import test from "node:test";
import { evaluateFootwearFit } from "../index.js";

test("evaluateFootwearFit passes a sandals input only when every gate is satisfied", () => {
  const evaluation = evaluateFootwearFit({
    category: "sandals",
    metrics: {
      footLengthDeltaMm: 4,
      footWidthDeltaMm: 3,
      instepClearanceMm: 3,
      heelAlignmentDeltaMm: 2,
      toeAlignmentDeltaMm: 2,
      outsoleOverhangMm: 1,
      strapVisiblePenetrationMm: 1.5,
      bodyMaskVisibleAreaMm2: 0,
      soleGroundContactPass: true,
    },
  });

  assert.equal(evaluation.pass, true);
  assert.deepEqual(evaluation.failReasons, []);
  assert.equal(evaluation.gates.every((gate) => gate.pass), true);
});

test("evaluateFootwearFit fails closed when required metrics are missing", () => {
  const evaluation = evaluateFootwearFit({
    category: "sandals",
    metrics: {
      footLengthDeltaMm: 4,
      footWidthDeltaMm: 3,
      instepClearanceMm: 3,
      heelAlignmentDeltaMm: 2,
      toeAlignmentDeltaMm: 2,
      outsoleOverhangMm: 1,
      bodyMaskVisibleAreaMm2: 0,
      soleGroundContactPass: true,
    },
  });

  assert.equal(evaluation.pass, false);
  assert.deepEqual(
    evaluation.failReasons.map((reason) => reason.metric),
    ["strapVisiblePenetrationMm"],
  );
  assert.equal(evaluation.gates.find((gate) => gate.metric === "strapVisiblePenetrationMm")?.failReason?.code, "missing-metric");
});

test("evaluateFootwearFit rejects sandals with visible mask leakage or failed sole-ground contact", () => {
  const evaluation = evaluateFootwearFit({
    category: "sandals",
    metrics: {
      footLengthDeltaMm: 3,
      footWidthDeltaMm: 2,
      instepClearanceMm: 2,
      heelAlignmentDeltaMm: 1,
      toeAlignmentDeltaMm: 1,
      outsoleOverhangMm: 1,
      strapVisiblePenetrationMm: 1,
      bodyMaskVisibleAreaMm2: 12,
      soleGroundContactPass: false,
    },
  });

  assert.equal(evaluation.pass, false);
  assert.deepEqual(
    evaluation.failReasons.map((reason) => reason.metric).sort(),
    ["bodyMaskVisibleAreaMm2", "soleGroundContactPass"],
  );
});
