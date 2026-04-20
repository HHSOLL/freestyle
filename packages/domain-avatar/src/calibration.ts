import {
  avatarMeasurementsSidecarSchema,
  type AvatarMeasurementsSidecar,
  type AvatarReferenceMeasurements,
} from "@freestyle/contracts";

type AvatarMeasurementDerivationExpectation = {
  method: string;
  bones?: string[];
  objectName?: string;
};

type AvatarMeasurementsSummaryContext = {
  fullBody?: string;
  rig?: {
    name?: string;
    boneNames?: string[];
  };
  referenceMeasurementsMm?: AvatarReferenceMeasurements;
  segmentation?: Record<string, number>;
  buildProvenance?: unknown;
};

export const avatarReferenceMeasurementKeys = [
  "statureMm",
  "shoulderWidthMm",
  "armLengthMm",
  "inseamMm",
  "torsoLengthMm",
  "hipWidthMm",
] as const;

export const avatarComparableReferenceMeasurements = {
  statureMm: {
    profileKey: "heightCm",
    label: "stature",
  },
  shoulderWidthMm: {
    profileKey: "shoulderCm",
    label: "shoulder",
  },
  armLengthMm: {
    profileKey: "armLengthCm",
    label: "armLength",
  },
  inseamMm: {
    profileKey: "inseamCm",
    label: "inseam",
  },
  torsoLengthMm: {
    profileKey: "torsoLengthCm",
    label: "torsoLength",
  },
} as const;

export const buildAvatarReferenceMeasurementDerivationExpectations = (
  summary: AvatarMeasurementsSummaryContext,
) =>
  ({
  statureMm: {
    method: "object-bounding-box-height",
    objectName: summary?.fullBody,
  },
  shoulderWidthMm: {
    method: "bone-head-distance",
    bones: ["upperarm_l", "upperarm_r"],
  },
  armLengthMm: {
    method: "bone-chain-length",
    bones: ["upperarm_l", "lowerarm_l", "hand_l"],
  },
  inseamMm: {
    method: "bone-chain-length",
    bones: ["thigh_l", "calf_l"],
  },
  torsoLengthMm: {
    method: "bone-chain-length",
    bones: ["spine_01", "spine_02", "spine_03", "neck_01"],
  },
  hipWidthMm: {
    method: "bone-head-distance",
    bones: ["thigh_l", "thigh_r"],
  },
}) satisfies Record<string, AvatarMeasurementDerivationExpectation>;

export const collectAvatarMeasurementsSidecarBaseIssues = (
  sidecar: AvatarMeasurementsSidecar | null | undefined,
  {
    variantId,
    expectedSchemaVersion,
  }: {
    variantId: string;
    expectedSchemaVersion: string;
  },
) => {
  const issues: string[] = [];

  if (sidecar?.schemaVersion !== expectedSchemaVersion) {
    issues.push(`${variantId}: measurements sidecar schemaVersion must be ${expectedSchemaVersion}`);
  }
  if (sidecar?.variantId !== variantId) {
    issues.push(`${variantId}: measurements sidecar variantId must match ${variantId}`);
  }
  if (sidecar?.authoringSource !== "mpfb2") {
    issues.push(`${variantId}: measurements sidecar authoringSource must be mpfb2`);
  }
  if (sidecar?.units !== "mm") {
    issues.push(`${variantId}: measurements sidecar units must be mm`);
  }
  if (typeof sidecar?.buildProvenance !== "object" || !sidecar.buildProvenance) {
    issues.push(`${variantId}: measurements sidecar buildProvenance is required`);
  }

  for (const key of avatarReferenceMeasurementKeys) {
    if (typeof sidecar?.referenceMeasurementsMm?.[key] !== "number" || sidecar.referenceMeasurementsMm[key] <= 0) {
      issues.push(`${variantId}: measurements sidecar referenceMeasurementsMm.${key} must be a positive number`);
    }
  }

  const measurementDerivation = sidecar?.referenceMeasurementsMmDerivation;
  if (!measurementDerivation || typeof measurementDerivation !== "object") {
    issues.push(`${variantId}: measurements sidecar referenceMeasurementsMmDerivation is required`);
  } else {
    if (measurementDerivation.kind !== "geometry-derived-reference") {
      issues.push(`${variantId}: measurements sidecar referenceMeasurementsMmDerivation.kind must be geometry-derived-reference`);
    }
    if (measurementDerivation.intendedUse !== "authoring-qa") {
      issues.push(`${variantId}: measurements sidecar referenceMeasurementsMmDerivation.intendedUse must be authoring-qa`);
    }

    for (const key of avatarReferenceMeasurementKeys) {
      if (!measurementDerivation.measurements?.[key]) {
        issues.push(`${variantId}: measurements sidecar referenceMeasurementsMmDerivation.measurements.${key} is required`);
      }
    }
  }

  return issues;
};

const formatContractPath = (path: PropertyKey[]) =>
  path.length > 0
    ? path
        .map((part) => (typeof part === "symbol" ? part.toString() : String(part)))
        .join(".")
    : "root";

export const parseAvatarMeasurementsSidecar = (
  sidecar: unknown,
  {
    variantId,
    expectedSchemaVersion,
  }: {
    variantId: string;
    expectedSchemaVersion: string;
  },
) => {
  const parsed = avatarMeasurementsSidecarSchema.safeParse(sidecar);
  if (!parsed.success) {
    return {
      sidecar: null,
      issues: parsed.error.issues.map(
        (issue) => `${variantId}: measurements sidecar ${formatContractPath(issue.path)} ${issue.message}`,
      ),
    };
  }

  return {
    sidecar: parsed.data,
    issues: collectAvatarMeasurementsSidecarBaseIssues(parsed.data, {
      variantId,
      expectedSchemaVersion,
    }),
  };
};

export const collectAvatarMeasurementsSidecarSummaryIssues = (
  sidecar: AvatarMeasurementsSidecar | null | undefined,
  {
    variantId,
    expectedSchemaVersion,
    summary,
  }: {
    variantId: string;
    expectedSchemaVersion: string;
    summary: AvatarMeasurementsSummaryContext;
  },
) => {
  const issues = collectAvatarMeasurementsSidecarBaseIssues(sidecar, {
    variantId,
    expectedSchemaVersion,
  });
  const summaryBoneNames = Array.isArray(summary?.rig?.boneNames) ? summary.rig.boneNames : [];
  const expectedDerivations = buildAvatarReferenceMeasurementDerivationExpectations(summary);

  if (JSON.stringify(sidecar?.referenceMeasurementsMm ?? {}) !== JSON.stringify(summary?.referenceMeasurementsMm ?? {})) {
    issues.push(`${variantId}: measurements sidecar referenceMeasurementsMm must match summary`);
  }

  const measurementDerivation = sidecar?.referenceMeasurementsMmDerivation;
  if (measurementDerivation && typeof measurementDerivation === "object") {
    if (measurementDerivation.sourceObjectName !== summary?.fullBody) {
      issues.push(`${variantId}: measurements sidecar referenceMeasurementsMmDerivation.sourceObjectName must match summary fullBody`);
    }
    if (measurementDerivation.sourceRigName !== summary?.rig?.name) {
      issues.push(`${variantId}: measurements sidecar referenceMeasurementsMmDerivation.sourceRigName must match summary rig name`);
    }
    for (const [key, expected] of Object.entries(expectedDerivations) as Array<
      [keyof typeof expectedDerivations, AvatarMeasurementDerivationExpectation]
    >) {
      const derivation = measurementDerivation.measurements?.[key];
      if (!derivation || typeof derivation !== "object") {
        continue;
      }
      if (derivation.method !== expected.method) {
        issues.push(`${variantId}: measurements sidecar referenceMeasurementsMmDerivation.measurements.${key}.method must be ${expected.method}`);
      }
      if (Array.isArray(expected.bones)) {
        const expectedBones = expected.bones;
        const boneNames = Array.isArray(derivation.bones) ? derivation.bones : [];
        if (
          boneNames.length !== expectedBones.length
          || boneNames.some((boneName: string, index: number) => boneName !== expectedBones[index])
        ) {
          issues.push(`${variantId}: measurements sidecar referenceMeasurementsMmDerivation.measurements.${key}.bones must match the extraction chain`);
        }
        if (boneNames.some((boneName: string) => !summaryBoneNames.includes(boneName))) {
          issues.push(`${variantId}: measurements sidecar referenceMeasurementsMmDerivation.measurements.${key}.bones must exist in summary rig.boneNames`);
        }
      }
      if (typeof expected.objectName === "string" && derivation.objectName !== expected.objectName) {
        issues.push(`${variantId}: measurements sidecar referenceMeasurementsMmDerivation.measurements.${key}.objectName must match summary fullBody`);
      }
    }
  }

  if (JSON.stringify(sidecar?.segmentationVertexCounts ?? {}) !== JSON.stringify(summary?.segmentation ?? {})) {
    issues.push(`${variantId}: measurements sidecar segmentationVertexCounts must match summary segmentation`);
  }
  if (JSON.stringify(sidecar?.buildProvenance ?? {}) !== JSON.stringify(summary?.buildProvenance ?? {})) {
    issues.push(`${variantId}: measurements sidecar buildProvenance must match summary buildProvenance`);
  }

  return issues;
};
