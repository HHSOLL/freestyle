#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  buildStarterGarmentCertificationSeed,
  collectGarmentRuntimeModelPaths,
  starterGarmentById,
  starterGarmentCatalog,
  validateGarmentAuthoringBundleAgainstStarterCatalog,
  validateGarmentPatternSpecAgainstStarterCatalog,
  validateStarterGarment,
} from "../packages/domain-garment/src/index.ts";
import {
  garmentAuthoringSummarySchema,
  garmentCertificationReportSchema,
  garmentCertificationReportSchemaVersion,
  garmentCollisionProxySchema,
  garmentHQArtifactSpecSchema,
  garmentMaterialProfileSchema,
  garmentPatternSpecSchema,
  garmentSimProxySchema,
} from "../packages/contracts/src/index.ts";

const repoRoot = process.cwd();
const issues = [];
const seenIds = new Set();
const rawSummaryRoot = path.join(repoRoot, "authoring/garments/exports/raw");
const garmentCertificationGeneratedAt = "2026-04-23T00:00:00.000Z";
const garmentCertificationReportPath = path.join(repoRoot, "output", "garment-certification", "latest.json");
const garmentBudgetReportPath = "output/asset-budget-report/latest.json";
const garmentCertificationBundles = new Map();

const heroFitAuditExpectations = [
  {
    summaryFile: "mpfb-female-top_soft_casual.summary.json",
    label: "female top_soft_casual",
    maxThreeMm: 95,
    maxPenetrating: 0,
  },
  {
    summaryFile: "mpfb-male-top_soft_casual.summary.json",
    label: "male top_soft_casual",
    maxThreeMm: 75,
    maxPenetrating: 0,
  },
  {
    summaryFile: "mpfb-female-top_city_relaxed.summary.json",
    label: "female top_city_relaxed",
    maxThreeMm: 340,
    maxPenetrating: 60,
  },
  {
    summaryFile: "mpfb-male-top_city_relaxed.summary.json",
    label: "male top_city_relaxed",
    maxThreeMm: 850,
    maxPenetrating: 30,
  },
  {
    summaryFile: "mpfb-female-bottom_soft_wool.summary.json",
    label: "female bottom_soft_wool",
    maxThreeMm: 40,
    maxPenetrating: 0,
  },
  {
    summaryFile: "mpfb-male-bottom_soft_wool.summary.json",
    label: "male bottom_soft_wool",
    maxThreeMm: 40,
    maxPenetrating: 0,
  },
  {
    summaryFile: "mpfb-female-outer_tailored_layer.summary.json",
    label: "female outer_tailored_layer",
    maxThreeMm: 710,
    maxPenetrating: 50,
  },
  {
    summaryFile: "mpfb-male-outer_tailored_layer.summary.json",
    label: "male outer_tailored_layer",
    maxThreeMm: 960,
    maxPenetrating: 50,
  },
];

const resolvePublicPath = (assetPath) => {
  if (!assetPath.startsWith("/")) {
    issues.push(`asset path must start with '/': ${assetPath}`);
    return null;
  }
  return path.join(repoRoot, "apps/web/public", assetPath.replace(/^\//, ""));
};

const readJson = (absolutePath) => JSON.parse(fs.readFileSync(absolutePath, "utf8"));

const toRepoRelativePath = (absolutePath) => path.relative(repoRoot, absolutePath).replace(/\\/g, "/");

for (const item of starterGarmentCatalog) {
  if (seenIds.has(item.id)) {
    issues.push(`${item.id}: garment id must be unique`);
  } else {
    seenIds.add(item.id);
  }

  issues.push(...validateStarterGarment(item));

  for (const modelPath of collectGarmentRuntimeModelPaths(item.runtime)) {
    const absolute = resolvePublicPath(modelPath);
    if (!absolute) {
      continue;
    }
    if (!fs.existsSync(absolute)) {
      issues.push(`${item.id}: missing file ${modelPath}`);
    }
  }
}

for (const expectation of heroFitAuditExpectations) {
  const summaryPath = path.join(rawSummaryRoot, expectation.summaryFile);
  if (!fs.existsSync(summaryPath)) {
    issues.push(`missing measured garment summary: ${path.relative(repoRoot, summaryPath)}`);
    continue;
  }
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const parsedSummary = garmentAuthoringSummarySchema.safeParse(summary);
  if (!parsedSummary.success) {
    issues.push(
      `${expectation.label}: authoring summary failed schema validation (${parsedSummary.error.issues
        .map((issue) => issue.path.join(".") || "(root)")
        .join(", ")}).`,
    );
    continue;
  }
  const fitAudit = parsedSummary.data.fitAudit;
  if (!fitAudit) {
    issues.push(`${expectation.label}: fitAudit is required in garment summary.`);
    continue;
  }
  const thresholdCounts = fitAudit.thresholdCounts ?? {};
  const countWithinThreeMm = Number(thresholdCounts["0.003"] ?? NaN);
  const penetratingVertexCount = Number(fitAudit.penetratingVertexCount ?? NaN);
  if (!Number.isFinite(countWithinThreeMm)) {
    issues.push(`${expectation.label}: fitAudit.thresholdCounts["0.003"] is required.`);
  } else if (countWithinThreeMm > expectation.maxThreeMm) {
    issues.push(
      `${expectation.label}: countWithin3mm ${countWithinThreeMm} exceeds regression budget ${expectation.maxThreeMm}.`,
    );
  }
  if (!Number.isFinite(penetratingVertexCount)) {
    issues.push(`${expectation.label}: fitAudit.penetratingVertexCount is required.`);
  } else if (penetratingVertexCount > expectation.maxPenetrating) {
    issues.push(
      `${expectation.label}: penetratingVertexCount ${penetratingVertexCount} exceeds regression budget ${expectation.maxPenetrating}.`,
    );
  }
}

const committedRawSummaries = fs
  .readdirSync(rawSummaryRoot)
  .filter((entry) => entry.startsWith("mpfb-") && entry.endsWith(".summary.json"))
  .sort();

for (const summaryFile of committedRawSummaries) {
  const summaryPath = path.join(rawSummaryRoot, summaryFile);
  const summary = readJson(summaryPath);
  if (summary?.kind !== "garment") {
    continue;
  }

  const parsedSummary = garmentAuthoringSummarySchema.safeParse(summary);
  if (!parsedSummary.success) {
    issues.push(
      `${summaryFile}: garment authoring summary failed schema validation (${parsedSummary.error.issues
        .map((issue) => issue.path.join(".") || "(root)")
        .join(", ")}).`,
    );
    continue;
  }

  if (!parsedSummary.data.patternSpec?.relativePath) {
    issues.push(`${summaryFile}: garment authoring summary is missing patternSpec.relativePath.`);
    continue;
  }
  if (!parsedSummary.data.materialProfile?.relativePath) {
    issues.push(`${summaryFile}: garment authoring summary is missing materialProfile.relativePath.`);
    continue;
  }
  if (!parsedSummary.data.simProxy?.relativePath) {
    issues.push(`${summaryFile}: garment authoring summary is missing simProxy.relativePath.`);
    continue;
  }
  if (!parsedSummary.data.collisionProxy?.relativePath) {
    issues.push(`${summaryFile}: garment authoring summary is missing collisionProxy.relativePath.`);
    continue;
  }
  if (!parsedSummary.data.hqArtifact?.relativePath) {
    issues.push(`${summaryFile}: garment authoring summary is missing hqArtifact.relativePath.`);
    continue;
  }

  const patternSpecPath = path.join(repoRoot, parsedSummary.data.patternSpec.relativePath);
  const materialProfilePath = path.join(repoRoot, parsedSummary.data.materialProfile.relativePath);
  const simProxyPath = path.join(repoRoot, parsedSummary.data.simProxy.relativePath);
  const collisionProxyPath = path.join(repoRoot, parsedSummary.data.collisionProxy.relativePath);
  const hqArtifactPath = path.join(repoRoot, parsedSummary.data.hqArtifact.relativePath);
  if (!fs.existsSync(patternSpecPath)) {
    issues.push(`${summaryFile}: missing pattern spec ${parsedSummary.data.patternSpec.relativePath}.`);
    continue;
  }
  if (!fs.existsSync(materialProfilePath)) {
    issues.push(`${summaryFile}: missing material profile ${parsedSummary.data.materialProfile.relativePath}.`);
    continue;
  }
  if (!fs.existsSync(simProxyPath)) {
    issues.push(`${summaryFile}: missing sim proxy ${parsedSummary.data.simProxy.relativePath}.`);
    continue;
  }
  if (!fs.existsSync(collisionProxyPath)) {
    issues.push(`${summaryFile}: missing collision proxy ${parsedSummary.data.collisionProxy.relativePath}.`);
    continue;
  }
  if (!fs.existsSync(hqArtifactPath)) {
    issues.push(`${summaryFile}: missing HQ artifact spec ${parsedSummary.data.hqArtifact.relativePath}.`);
    continue;
  }

  const parsedPatternSpec = garmentPatternSpecSchema.safeParse(readJson(patternSpecPath));
  const parsedMaterialProfile = garmentMaterialProfileSchema.safeParse(readJson(materialProfilePath));
  const parsedSimProxy = garmentSimProxySchema.safeParse(readJson(simProxyPath));
  const parsedCollisionProxy = garmentCollisionProxySchema.safeParse(readJson(collisionProxyPath));
  const parsedHQArtifact = garmentHQArtifactSpecSchema.safeParse(readJson(hqArtifactPath));
  if (!parsedPatternSpec.success) {
    issues.push(
      `${summaryFile}: pattern spec failed schema validation (${parsedPatternSpec.error.issues
        .map((issue) => issue.path.join(".") || "(root)")
        .join(", ")}).`,
    );
    continue;
  }
  if (!parsedMaterialProfile.success) {
    issues.push(
      `${summaryFile}: material profile failed schema validation (${parsedMaterialProfile.error.issues
        .map((issue) => issue.path.join(".") || "(root)")
        .join(", ")}).`,
    );
    continue;
  }
  if (!parsedSimProxy.success) {
    issues.push(
      `${summaryFile}: sim proxy failed schema validation (${parsedSimProxy.error.issues
        .map((issue) => issue.path.join(".") || "(root)")
        .join(", ")}).`,
    );
    continue;
  }
  if (!parsedCollisionProxy.success) {
    issues.push(
      `${summaryFile}: collision proxy failed schema validation (${parsedCollisionProxy.error.issues
        .map((issue) => issue.path.join(".") || "(root)")
        .join(", ")}).`,
    );
    continue;
  }
  if (!parsedHQArtifact.success) {
    issues.push(
      `${summaryFile}: HQ artifact spec failed schema validation (${parsedHQArtifact.error.issues
        .map((issue) => issue.path.join(".") || "(root)")
        .join(", ")}).`,
    );
    continue;
  }

  issues.push(
    ...validateGarmentPatternSpecAgainstStarterCatalog(parsedPatternSpec.data, starterGarmentCatalog).map(
      (issue) => `${summaryFile}: ${issue}`,
    ),
  );
  issues.push(
    ...validateGarmentAuthoringBundleAgainstStarterCatalog(
      {
        patternSpec: parsedPatternSpec.data,
        materialProfile: parsedMaterialProfile.data,
        simProxy: parsedSimProxy.data,
        collisionProxy: parsedCollisionProxy.data,
        hqArtifact: parsedHQArtifact.data,
      },
      starterGarmentCatalog,
    ).map((issue) => `${summaryFile}: ${issue}`),
  );

  const starterId = parsedPatternSpec.data.runtimeStarterId;
  const currentBundle = garmentCertificationBundles.get(starterId);
  const nextBundle = {
    patternSpecPath: parsedSummary.data.patternSpec.relativePath,
    materialProfilePath: parsedSummary.data.materialProfile.relativePath,
    simProxyPath: parsedSummary.data.simProxy.relativePath,
    collisionProxyPath: parsedSummary.data.collisionProxy.relativePath,
    hqArtifactPath: parsedSummary.data.hqArtifact.relativePath,
    summaries: [
      {
        variantId: parsedSummary.data.variantId,
        summaryPath: toRepoRelativePath(summaryPath),
        outputBlend: parsedSummary.data.outputBlend,
        outputGlb: parsedSummary.data.outputGlb,
        fitAudit: parsedSummary.data.fitAudit,
      },
    ],
  };

  if (!currentBundle) {
    garmentCertificationBundles.set(starterId, nextBundle);
    continue;
  }

  for (const [field, nextValue] of Object.entries({
    patternSpecPath: nextBundle.patternSpecPath,
    materialProfilePath: nextBundle.materialProfilePath,
    simProxyPath: nextBundle.simProxyPath,
    collisionProxyPath: nextBundle.collisionProxyPath,
    hqArtifactPath: nextBundle.hqArtifactPath,
  })) {
    if (currentBundle[field] !== nextValue) {
      issues.push(
        `${summaryFile}: ${field} ${nextValue} does not match ${starterId} canonical value ${currentBundle[field]}.`,
      );
    }
  }

  const duplicateVariant = currentBundle.summaries.find((entry) => entry.variantId === parsedSummary.data.variantId);
  if (duplicateVariant) {
    issues.push(`${summaryFile}: duplicate summary for ${starterId} variant ${parsedSummary.data.variantId}.`);
    continue;
  }

  currentBundle.summaries.push(nextBundle.summaries[0]);
}

if (issues.length > 0) {
  if (fs.existsSync(garmentCertificationReportPath)) {
    fs.rmSync(garmentCertificationReportPath);
  }
  console.error(`Garment 3D validation failed with ${issues.length} issue(s).\n`);
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

const certificationItems = Array.from(garmentCertificationBundles.entries())
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([starterId, bundle]) => {
    const starter = starterGarmentById.get(starterId);
    if (!starter) {
      throw new Error(`Missing starter garment ${starterId} for certification bundle.`);
    }
    const seed = buildStarterGarmentCertificationSeed(starter, {
      authoredVariantIds: bundle.summaries.map((entry) => entry.variantId),
    });
    if (!seed) {
      throw new Error(`Starter garment ${starterId} does not expose a certification seed.`);
    }

    return {
      ...seed,
      authoring: {
        patternSpecPath: bundle.patternSpecPath,
        materialProfilePath: bundle.materialProfilePath,
        simProxyPath: bundle.simProxyPath,
        collisionProxyPath: bundle.collisionProxyPath,
        hqArtifactPath: bundle.hqArtifactPath,
        summaries: bundle.summaries.sort((left, right) => left.variantId.localeCompare(right.variantId)),
      },
      evidence: {
        budgetReportPath: garmentBudgetReportPath,
      },
    };
  });

const certificationReport = garmentCertificationReportSchema.parse({
  schemaVersion: garmentCertificationReportSchemaVersion,
  generatedAt: garmentCertificationGeneratedAt,
  items: certificationItems,
  total: certificationItems.length,
});

fs.mkdirSync(path.dirname(garmentCertificationReportPath), { recursive: true });
fs.writeFileSync(garmentCertificationReportPath, `${JSON.stringify(certificationReport, null, 2)}\n`);

console.log(`Garment 3D validation passed for ${starterGarmentCatalog.length} starter garments.`);
