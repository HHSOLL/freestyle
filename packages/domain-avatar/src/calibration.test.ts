import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAvatarReferenceMeasurementDerivationExpectations,
  collectAvatarMeasurementsSidecarBaseIssues,
  collectAvatarMeasurementsSidecarSummaryIssues,
  parseAvatarMeasurementsSidecar,
} from "./calibration.js";

const expectedSchemaVersion = "avatar-measurements-sidecar-v1";

const summary = {
  fullBody: "mpfb-female-base.body.fullbody",
  rig: {
    name: "mpfb-female-base",
    boneNames: [
      "upperarm_l",
      "upperarm_r",
      "lowerarm_l",
      "hand_l",
      "thigh_l",
      "calf_l",
      "spine_01",
      "spine_02",
      "spine_03",
      "neck_01",
      "thigh_r",
    ],
  },
  referenceMeasurementsMm: {
    statureMm: 1639,
    shoulderWidthMm: 313,
    armLengthMm: 491,
    inseamMm: 784,
    torsoLengthMm: 432,
    hipWidthMm: 196,
  },
  segmentation: {
    torso: 2898,
    arms: 5098,
    hips: 666,
    legs: 2546,
    feet: 2864,
    exposed: 5086,
  },
  buildProvenance: {
    mpfb: {
      revision: "7053847edd62a09dfe1ec6209d69a425435195c4",
    },
  },
};

const validSidecar = {
  schemaVersion: expectedSchemaVersion,
  variantId: "female-base",
  authoringSource: "mpfb2",
  units: "mm",
  buildProvenance: summary.buildProvenance,
  referenceMeasurementsMm: summary.referenceMeasurementsMm,
  referenceMeasurementsMmDerivation: {
    kind: "geometry-derived-reference",
    intendedUse: "authoring-qa",
    sourceObjectName: summary.fullBody,
    sourceRigName: summary.rig.name,
    measurements: buildAvatarReferenceMeasurementDerivationExpectations(summary),
  },
  segmentationVertexCounts: summary.segmentation,
};

test("measurements sidecar base validation passes a complete calibration artifact", () => {
  const issues = collectAvatarMeasurementsSidecarBaseIssues(validSidecar, {
    variantId: "female-base",
    expectedSchemaVersion,
  });

  assert.deepEqual(issues, []);
});

test("measurements sidecar parser returns typed sidecars and reports schema drift", () => {
  const parsed = parseAvatarMeasurementsSidecar(validSidecar, {
    variantId: "female-base",
    expectedSchemaVersion,
  });
  const drifted = parseAvatarMeasurementsSidecar(
    {
      ...validSidecar,
      referenceMeasurementsMmDerivation: {
        ...validSidecar.referenceMeasurementsMmDerivation,
        measurements: {
          statureMm: validSidecar.referenceMeasurementsMmDerivation.measurements.statureMm,
        },
      },
    },
    {
      variantId: "female-base",
      expectedSchemaVersion,
    },
  );

  assert.equal(parsed.sidecar?.variantId, "female-base");
  assert.deepEqual(parsed.issues, []);
  assert.equal(drifted.sidecar, null);
  assert.ok(drifted.issues.some((issue) => issue.includes("referenceMeasurementsMmDerivation.measurements.shoulderWidthMm")));
});

test("measurements sidecar summary validation enforces derivation and summary parity", () => {
  const issues = collectAvatarMeasurementsSidecarSummaryIssues(validSidecar, {
    variantId: "female-base",
    expectedSchemaVersion,
    summary,
  });

  assert.deepEqual(issues, []);
});

test("measurements sidecar summary validation fails on stale derivation drift", () => {
  const driftedSidecar = {
    ...validSidecar,
    referenceMeasurementsMmDerivation: {
      ...validSidecar.referenceMeasurementsMmDerivation,
      measurements: {
        ...validSidecar.referenceMeasurementsMmDerivation.measurements,
        armLengthMm: {
          method: "bone-chain-length",
          bones: ["upperarm_l", "hand_l"],
        },
      },
    },
  };

  const issues = collectAvatarMeasurementsSidecarSummaryIssues(driftedSidecar, {
    variantId: "female-base",
    expectedSchemaVersion,
    summary,
  });

  assert.ok(
    issues.includes(
      "female-base: measurements sidecar referenceMeasurementsMmDerivation.measurements.armLengthMm.bones must match the extraction chain",
    ),
  );
});
