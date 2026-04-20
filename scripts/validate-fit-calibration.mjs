import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  avatarMeasurementsSidecarSchemaVersion,
  fitCalibrationReportSchema,
  flattenBodyProfile,
} from "@freestyle/contracts";
import {
  avatarComparableReferenceMeasurements,
  fitReviewArchetypes,
  parseAvatarMeasurementsSidecar,
  resolveAvatarVariantFromProfile,
} from "@freestyle/domain-avatar";
import {
  assessGarmentPhysicalFit,
  formatGarmentFitSummary,
  getGarmentAdaptiveBodyMaskZones,
  starterGarmentCatalog,
} from "@freestyle/domain-garment";
import {
  avatarRenderManifest,
} from "../packages/runtime-3d/src/avatar-manifest.ts";

const fitStateRank = {
  compression: 0,
  snug: 1,
  regular: 2,
  relaxed: 3,
  oversized: 4,
};

const monotonicExpectations = [
  {
    garmentId: "starter-top-soft-casual",
    looserArchetypeId: "female-petite-lean",
    tighterArchetypeId: "female-curvy",
    reason: "smaller female body should not read tighter than curvy female body in the base tee",
  },
  {
    garmentId: "starter-bottom-soft-wool",
    looserArchetypeId: "female-petite-lean",
    tighterArchetypeId: "female-curvy",
    reason: "smaller female body should not read tighter than curvy female body in the trousers",
  },
  {
    garmentId: "starter-top-city-relaxed",
    looserArchetypeId: "male-soft",
    tighterArchetypeId: "male-athletic-tall",
    reason: "larger athletic male body should not read looser than softer balanced male body in the relaxed top",
  },
  {
    garmentId: "starter-outer-tailored-layer",
    looserArchetypeId: "female-balanced",
    tighterArchetypeId: "female-curvy",
    reason: "curvier female body should not read looser than the balanced female body in the outer layer",
  },
  {
    garmentId: "starter-shoe-night-runner",
    looserArchetypeId: "female-petite-lean",
    tighterArchetypeId: "male-athletic-tall",
    reason: "smaller foot profile should not read tighter than taller male foot profile",
  },
  {
    garmentId: "starter-accessory-city-bucket-hat",
    looserArchetypeId: "female-petite-lean",
    tighterArchetypeId: "male-athletic-tall",
    reason: "smaller head circumference should not read tighter than larger head circumference in the hat",
  },
  {
    garmentId: "starter-hair-signature-ponytail",
    looserArchetypeId: "female-petite-lean",
    tighterArchetypeId: "male-athletic-tall",
    reason: "smaller head circumference should not read tighter than larger head circumference in fitted hair assets",
  },
];

const issues = [];
const adaptiveMaskExpectations = [
  {
    garmentId: "starter-outer-tailored-layer",
    archetypeId: "female-curvy",
    expectedZones: ["arms", "hips", "torso"],
  },
  {
    garmentId: "starter-shoe-night-runner",
    archetypeId: "male-athletic-tall",
    expectedZones: ["feet"],
  },
];

const requiredCalibrationVariantIds = [...new Set(fitReviewArchetypes.map((entry) => resolveAvatarVariantFromProfile(entry.profile)))];
const avatarCalibrationVariantConfigs = requiredCalibrationVariantIds.map((variantId) => {
  const manifestEntry = avatarRenderManifest[variantId];
  if (!manifestEntry) {
    issues.push(`missing avatar render manifest entry for calibration variant ${variantId}`);
    return null;
  }

  const representativeArchetype = fitReviewArchetypes.find(
    (entry) => resolveAvatarVariantFromProfile(entry.profile) === variantId,
  );
  if (!representativeArchetype) {
    issues.push(`missing representative fit archetype for calibration variant ${variantId}`);
  }

  return {
    variantId,
    measurementsPath: path.join(process.cwd(), manifestEntry.sourceProvenance.measurementsPath),
    expectedGender: representativeArchetype?.profile.gender,
  };
}).filter(Boolean);

const loadAvatarCalibrationReference = async ({ variantId, expectedGender, measurementsPath }) => {
  let rawSidecar;
  try {
    rawSidecar = JSON.parse(await readFile(measurementsPath, "utf8"));
  } catch (error) {
    issues.push(`${variantId}: failed to read measurements sidecar at ${measurementsPath} (${error.message})`);
    return null;
  }

  const { sidecar, issues: sidecarIssues } = parseAvatarMeasurementsSidecar(rawSidecar, {
    variantId,
    expectedSchemaVersion: avatarMeasurementsSidecarSchemaVersion,
  });
  issues.push(...sidecarIssues);
  if (!sidecar) {
    return null;
  }

  return {
    variantId,
    expectedGender,
    sidecarPath: path.relative(process.cwd(), measurementsPath),
    authoringSource: sidecar.authoringSource,
    units: sidecar.units,
    buildProvenance: sidecar.buildProvenance,
    referenceMeasurementsMm: sidecar.referenceMeasurementsMm,
    referenceMeasurementsMmDerivation: sidecar.referenceMeasurementsMmDerivation,
  };
};

const avatarCalibrationReferences = (
  await Promise.all(avatarCalibrationVariantConfigs.map(loadAvatarCalibrationReference))
).filter(Boolean);
const avatarCalibrationReferenceByVariant = Object.fromEntries(
  avatarCalibrationReferences.map((entry) => [entry.variantId, entry]),
);

const report = {
  schemaVersion: "fit-calibration-report.v1",
  generatedAt: new Date().toISOString(),
  avatarCalibrationReferences: avatarCalibrationReferences.map((entry) => ({
    variantId: entry.variantId,
    expectedGender: entry.expectedGender,
    sidecarPath: entry.sidecarPath,
    authoringSource: entry.authoringSource,
    units: entry.units,
    buildProvenance: entry.buildProvenance,
    referenceMeasurementsMm: entry.referenceMeasurementsMm,
    referenceMeasurementsMmDerivation: entry.referenceMeasurementsMmDerivation,
    archetypeIds: fitReviewArchetypes
      .filter((archetype) => resolveAvatarVariantFromProfile(archetype.profile) === entry.variantId)
      .map((archetype) => archetype.id),
  })),
  archetypes: fitReviewArchetypes.map((entry) => ({
    ...(() => {
      const variantId = resolveAvatarVariantFromProfile(entry.profile);
      const calibrationReference = avatarCalibrationReferenceByVariant[variantId];
      if (!calibrationReference) {
        issues.push(`${entry.id}: missing avatar calibration reference for ${variantId}`);
      }

      const flatProfile = flattenBodyProfile(entry.profile);
      const referenceComparisonMm = Object.fromEntries(
        Object.entries(avatarComparableReferenceMeasurements).map(([measurementKey, config]) => {
          const profileValueCm = flatProfile[config.profileKey];
          const profileValueMm = typeof profileValueCm === "number" ? Math.round(profileValueCm * 10) : null;
          const referenceValueMm = calibrationReference?.referenceMeasurementsMm?.[measurementKey] ?? null;
          return [
            measurementKey,
            {
              label: config.label,
              profileValueMm,
              referenceValueMm,
              deltaMm:
                typeof profileValueMm === "number" && typeof referenceValueMm === "number"
                  ? profileValueMm - referenceValueMm
                  : null,
            },
          ];
        }),
      );

      return {
        id: entry.id,
        avatarVariantId: variantId,
        gender: entry.profile.gender,
        bodyFrame: entry.profile.bodyFrame,
        heightCm: entry.profile.simple.heightCm,
        calibrationReferencePath: calibrationReference?.sidecarPath ?? null,
        referenceComparisonMm,
      };
    })(),
  })),
  garments: starterGarmentCatalog.map((garment) => ({
    id: garment.id,
    category: garment.category,
    archetypes: fitReviewArchetypes.map((entry) => {
      const assessment = assessGarmentPhysicalFit(garment, entry.profile);
      if (!assessment) {
        issues.push(`${garment.id}: no fit assessment for archetype ${entry.id}`);
      }
      return {
        archetypeId: entry.id,
        state: assessment?.overallState ?? null,
        summaryKo: formatGarmentFitSummary(assessment, "ko"),
        limitingKeys: assessment?.limitingKeys ?? [],
        tensionRisk: assessment?.tensionRisk ?? null,
        clippingRisk: assessment?.clippingRisk ?? null,
      };
    }),
  })),
};
const parsedReport = fitCalibrationReportSchema.parse(report);

for (const expectation of monotonicExpectations) {
  const garment = starterGarmentCatalog.find((entry) => entry.id === expectation.garmentId);
  if (!garment) {
    issues.push(`missing garment for monotonic expectation: ${expectation.garmentId}`);
    continue;
  }

  const looser = fitReviewArchetypes.find((entry) => entry.id === expectation.looserArchetypeId);
  const tighter = fitReviewArchetypes.find((entry) => entry.id === expectation.tighterArchetypeId);

  if (!looser || !tighter) {
    issues.push(`missing archetype in monotonic expectation: ${expectation.garmentId}`);
    continue;
  }

  const looserAssessment = assessGarmentPhysicalFit(garment, looser.profile);
  const tighterAssessment = assessGarmentPhysicalFit(garment, tighter.profile);

  if (!looserAssessment || !tighterAssessment) {
    issues.push(`missing assessment in monotonic expectation: ${expectation.garmentId}`);
    continue;
  }

  const looserRank = fitStateRank[looserAssessment.overallState];
  const tighterRank = fitStateRank[tighterAssessment.overallState];
  if (looserRank < tighterRank) {
    issues.push(
      `${expectation.garmentId}: ${expectation.reason} (${expectation.looserArchetypeId}=${looserAssessment.overallState}, ${expectation.tighterArchetypeId}=${tighterAssessment.overallState})`,
    );
  }
}

for (const expectation of adaptiveMaskExpectations) {
  const garment = starterGarmentCatalog.find((entry) => entry.id === expectation.garmentId);
  const archetype = fitReviewArchetypes.find((entry) => entry.id === expectation.archetypeId);

  if (!garment || !archetype) {
    issues.push(`missing adaptive-mask fixture: ${expectation.garmentId}/${expectation.archetypeId}`);
    continue;
  }

  const zones = getGarmentAdaptiveBodyMaskZones(garment, archetype.profile).sort();
  if (JSON.stringify(zones) !== JSON.stringify(expectation.expectedZones)) {
    issues.push(
      `${expectation.garmentId}: expected adaptive mask zones ${expectation.expectedZones.join(", ")} for ${expectation.archetypeId}, got ${zones.join(", ") || "none"}`,
    );
  }
}

const outputDir = path.join(process.cwd(), "output", "fit-calibration");
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "latest.json"), JSON.stringify(parsedReport, null, 2));

if (issues.length > 0) {
  console.error("Fit calibration validation failed:");
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log(
  `Fit calibration validation passed for ${starterGarmentCatalog.length} starter garments across ${fitReviewArchetypes.length} archetypes.`,
);
