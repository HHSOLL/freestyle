#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  collectGarmentRuntimeModelPaths,
  starterGarmentCatalog,
  validateGarmentAuthoringBundleAgainstStarterCatalog,
  validateGarmentPatternSpecAgainstStarterCatalog,
  validateStarterGarment,
} from "../packages/domain-garment/src/index.ts";
import {
  garmentAuthoringSummarySchema,
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
}

if (issues.length > 0) {
  console.error(`Garment 3D validation failed with ${issues.length} issue(s).\n`);
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Garment 3D validation passed for ${starterGarmentCatalog.length} starter garments.`);
