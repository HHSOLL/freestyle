import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fitReviewArchetypes } from "@freestyle/domain-avatar";
import {
  assessGarmentPhysicalFit,
  formatGarmentFitSummary,
  starterGarmentCatalog,
} from "@freestyle/domain-garment";

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

const report = {
  generatedAt: new Date().toISOString(),
  archetypes: fitReviewArchetypes.map((entry) => ({
    id: entry.id,
    gender: entry.profile.gender,
    bodyFrame: entry.profile.bodyFrame,
    heightCm: entry.profile.simple.heightCm,
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

const outputDir = path.join(process.cwd(), "output", "fit-calibration");
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "latest.json"), JSON.stringify(report, null, 2));

if (issues.length > 0) {
  console.error("Fit calibration validation failed:");
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log(
  `Fit calibration validation passed for ${starterGarmentCatalog.length} starter garments across ${fitReviewArchetypes.length} archetypes.`,
);
