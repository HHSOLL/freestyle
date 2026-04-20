#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  collectGarmentRuntimeModelPaths,
  starterGarmentCatalog,
  validateStarterGarment,
} from "../packages/domain-garment/src/index.ts";
import { garmentAuthoringSummarySchema, garmentPatternSpecSchema } from "../packages/contracts/src/index.ts";

const repoRoot = process.cwd();
const issues = [];
const seenIds = new Set();
const rawSummaryRoot = path.join(repoRoot, "authoring/garments/exports/raw");
const starterCatalogById = new Map(starterGarmentCatalog.map((item) => [item.id, item]));

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

const sortForStableCompare = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortForStableCompare);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortForStableCompare(nestedValue)]),
    );
  }
  return value;
};

const comparePatternSpecWithRuntimeMetadata = (summaryLabel, patternSpec) => {
  const starter = starterCatalogById.get(patternSpec.runtimeStarterId);
  if (!starter) {
    issues.push(`${summaryLabel}: pattern spec starter id ${patternSpec.runtimeStarterId} does not exist.`);
    return;
  }

  if (starter.category !== patternSpec.category) {
    issues.push(
      `${summaryLabel}: pattern spec category ${patternSpec.category} does not match starter catalog category ${starter.category}.`,
    );
  }

  const metadata = starter.metadata ?? {};
  const checks = [
    ["measurements", metadata.measurements ?? null, patternSpec.measurements],
    ["measurementModes", metadata.measurementModes ?? null, patternSpec.measurementModes],
    ["sizeChart", metadata.sizeChart ?? null, patternSpec.sizeChart],
    ["selectedSizeLabel", metadata.selectedSizeLabel ?? null, patternSpec.selectedSizeLabel],
    ["physicalProfile", metadata.physicalProfile ?? null, patternSpec.physicalProfile],
  ];

  for (const [label, runtimeValue, patternValue] of checks) {
    if (JSON.stringify(sortForStableCompare(runtimeValue)) !== JSON.stringify(sortForStableCompare(patternValue))) {
      issues.push(`${summaryLabel}: pattern spec ${label} does not match starter runtime metadata.`);
    }
  }
};

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

  const patternSpecPath = path.join(repoRoot, parsedSummary.data.patternSpec.relativePath);
  if (!fs.existsSync(patternSpecPath)) {
    issues.push(`${summaryFile}: missing pattern spec ${parsedSummary.data.patternSpec.relativePath}.`);
    continue;
  }

  const parsedPatternSpec = garmentPatternSpecSchema.safeParse(readJson(patternSpecPath));
  if (!parsedPatternSpec.success) {
    issues.push(
      `${summaryFile}: pattern spec failed schema validation (${parsedPatternSpec.error.issues
        .map((issue) => issue.path.join(".") || "(root)")
        .join(", ")}).`,
    );
    continue;
  }

  comparePatternSpecWithRuntimeMetadata(summaryFile, parsedPatternSpec.data);
}

if (issues.length > 0) {
  console.error(`Garment 3D validation failed with ${issues.length} issue(s).\n`);
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Garment 3D validation passed for ${starterGarmentCatalog.length} starter garments.`);
