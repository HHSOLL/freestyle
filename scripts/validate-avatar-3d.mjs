#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  avatarManifestSchemaVersion,
  avatarRenderManifest,
  avatarSummarySchemaVersion,
  referenceRigAliasPatterns,
} from "../packages/runtime-3d/src/avatar-manifest.ts";

const repoRoot = process.cwd();
const issues = [];

const resolvePublicPath = (assetPath) => {
  if (!assetPath.startsWith("/")) {
    issues.push(`asset path must start with '/': ${assetPath}`);
    return null;
  }
  return path.join(repoRoot, "apps/web/public", assetPath.replace(/^\//, ""));
};

const resolveWorkspacePath = (value) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  return path.isAbsolute(value) ? path.normalize(value) : path.join(repoRoot, value);
};

const requiredAliases = Object.keys(referenceRigAliasPatterns);

const isKnownAuthoringSource = (value) => {
  return ["mpfb2", "charmorph", "runtime-fallback"].includes(value);
};

const validateAliasMap = (label, aliasMap) => {
  for (const alias of requiredAliases) {
    const values = aliasMap[alias];
    if (!Array.isArray(values) || values.length === 0 || values.some((value) => typeof value !== "string" || value.trim().length === 0)) {
      issues.push(`${label}: aliasPatterns.${alias} must contain at least one non-empty string`);
    }
  }
};

const validateAssetPath = (label, assetPath) => {
  const absolute = resolvePublicPath(assetPath);
  if (!absolute) return;
  if (!fs.existsSync(absolute)) {
    issues.push(`${label}: missing file ${assetPath}`);
  }
};

const validateSourceProvenance = (label, entry) => {
  if (!entry.sourceProvenance) {
    issues.push(`${label}: sourceProvenance required for mpfb2 variant`);
    return;
  }

  const { sourceProvenance } = entry;

  if (sourceProvenance.sourceSystem !== "mpfb2") {
    issues.push(`${label}: sourceProvenance.sourceSystem must be mpfb2`);
  }

  if (sourceProvenance.schemaVersion !== avatarSummarySchemaVersion) {
    issues.push(`${label}: sourceProvenance.schemaVersion must be ${avatarSummarySchemaVersion}`);
  }

  for (const key of ["presetPath", "summaryPath", "outputModelPath"]) {
    if (typeof sourceProvenance[key] !== "string" || sourceProvenance[key].trim().length === 0) {
      issues.push(`${label}: sourceProvenance.${key} is required`);
    }
  }

  if (typeof sourceProvenance.outputModelPath === "string" && sourceProvenance.outputModelPath !== entry.modelPath) {
    issues.push(`${label}: sourceProvenance.outputModelPath must match modelPath`);
  }
};

const validateMpfbSummary = (variantId, entry) => {
  if (!entry.sourceProvenance || typeof entry.sourceProvenance.summaryPath !== "string") {
    return;
  }

  const summaryPath = resolveWorkspacePath(entry.sourceProvenance.summaryPath);
  if (!summaryPath) {
    issues.push(`${variantId}: sourceProvenance.summaryPath is invalid`);
    return;
  }

  if (!fs.existsSync(summaryPath)) {
    issues.push(`${variantId}: missing authoring summary ${path.relative(repoRoot, summaryPath)}`);
    return;
  }

  let summary;
  try {
    const raw = fs.readFileSync(summaryPath, "utf8");
    summary = JSON.parse(raw);
  } catch (error) {
    issues.push(`${variantId}: authoring summary parse failed (${error instanceof Error ? error.message : "unknown"})`);
    return;
  }

  const shapeKeys = summary?.basemesh?.shapeKeys;
  if (!Array.isArray(shapeKeys) || shapeKeys.length < 2) {
    issues.push(`${variantId}: expected MPFB summary to include exported body morph shape keys`);
  }

  if (summary?.schemaVersion !== avatarSummarySchemaVersion) {
    issues.push(`${variantId}: summary schemaVersion must be ${avatarSummarySchemaVersion}`);
  }

  const authoringProvenance = summary?.authoringProvenance;

  if (!authoringProvenance || typeof authoringProvenance !== "object") {
    issues.push(`${variantId}: summary authoringProvenance is required`);
    return;
  }

  for (const key of ["variantId", "presetPath", "outputModelPath"]) {
    if (typeof authoringProvenance[key] !== "string" || authoringProvenance[key].trim().length === 0) {
      issues.push(`${variantId}: summary authoringProvenance.${key} is required`);
    }
  }

  if (typeof authoringProvenance.variantId === "string" && authoringProvenance.variantId !== variantId) {
    issues.push(`${variantId}: summary authoringProvenance.variantId mismatch (${authoringProvenance.variantId})`);
  }

  if (authoringProvenance.sourceSystem !== "mpfb2") {
    issues.push(`${variantId}: summary authoringProvenance.sourceSystem must be mpfb2`);
  }

  if (typeof authoringProvenance.presetPath === "string" && entry.sourceProvenance?.presetPath) {
    const summaryPresetPath = resolveWorkspacePath(authoringProvenance.presetPath);
    const manifestPresetPath = resolveWorkspacePath(entry.sourceProvenance.presetPath);
    if (summaryPresetPath && manifestPresetPath && summaryPresetPath !== manifestPresetPath) {
      issues.push(`${variantId}: summary authoringProvenance.presetPath must match sourceProvenance.presetPath`);
    }
  }

  if (typeof authoringProvenance.outputModelPath === "string" && entry.sourceProvenance?.outputModelPath) {
    if (path.normalize(authoringProvenance.outputModelPath) !== path.normalize(entry.sourceProvenance.outputModelPath)) {
      issues.push(`${variantId}: summary authoringProvenance.outputModelPath must match sourceProvenance.outputModelPath`);
    }
  }

  const segmentation = summary?.segmentation ?? {};
  const requiredSegmentationZones = [
    ...Object.keys(entry.meshZones).filter((zone) => zone !== "fullBody"),
    "exposed",
  ];
  for (const zone of requiredSegmentationZones) {
    if (typeof segmentation[zone] !== "number" || segmentation[zone] <= 0) {
      issues.push(`${variantId}: segmentation.${zone} must be a positive number`);
    }
  }

  const manifestModelPath = resolvePublicPath(entry.modelPath);
  if (typeof summary?.outputGlb === "string") {
    const absoluteSummaryModel = path.resolve(summary.outputGlb);
    if (manifestModelPath && absoluteSummaryModel !== path.resolve(manifestModelPath)) {
      issues.push(`${variantId}: summary outputGlb must match manifest modelPath`);
    }
  } else {
    issues.push(`${variantId}: summary outputGlb is required`);
  }

  const summaryPresetPath = typeof summary?.preset === "string" ? summary.preset : null;
  const manifestPresetPath = entry.sourceProvenance?.presetPath ? resolveWorkspacePath(entry.sourceProvenance.presetPath) : null;
  if (summaryPresetPath && manifestPresetPath) {
    if (path.resolve(summaryPresetPath) !== path.resolve(manifestPresetPath)) {
      issues.push(`${variantId}: summary preset must match sourceProvenance.presetPath`);
    }
  } else if (!summaryPresetPath) {
    issues.push(`${variantId}: summary preset is required`);
  }
};

for (const [variantId, entry] of Object.entries(avatarRenderManifest)) {
  if (entry.id !== variantId) {
    issues.push(`${variantId}: manifest id must match object key`);
  }

  if (entry.schemaVersion !== avatarManifestSchemaVersion) {
    issues.push(`${variantId}: manifest schemaVersion must be ${avatarManifestSchemaVersion}`);
  }

  if (!isKnownAuthoringSource(entry.authoringSource)) {
    issues.push(`${variantId}: unexpected authoringSource ${entry.authoringSource}`);
  }

  if (!["named-mesh-zones", "none"].includes(entry.bodyMaskStrategy)) {
    issues.push(`${variantId}: unexpected bodyMaskStrategy ${entry.bodyMaskStrategy}`);
  }

  if (typeof entry.stageOffsetY !== "number" || Number.isNaN(entry.stageOffsetY)) {
    issues.push(`${variantId}: stageOffsetY must be a number`);
  }

  if (typeof entry.stageScale !== "number" || entry.stageScale <= 0) {
    issues.push(`${variantId}: stageScale must be a positive number`);
  }

  validateAssetPath(variantId, entry.modelPath);
  validateAliasMap(variantId, entry.aliasPatterns);

  if (entry.authoringSource === "mpfb2") {
    validateSourceProvenance(variantId, entry);
    validateMpfbSummary(variantId, entry);
  }

  for (const [zone, meshNames] of Object.entries(entry.meshZones)) {
    if (entry.bodyMaskStrategy === "none") {
      if (!Array.isArray(meshNames)) {
        issues.push(`${variantId}: meshZones.${zone} must still be an array`);
      }
      continue;
    }
    if (!Array.isArray(meshNames) || meshNames.length === 0) {
      issues.push(`${variantId}: meshZones.${zone} must list at least one mesh name`);
      continue;
    }
    if (meshNames.some((meshName) => typeof meshName !== "string" || meshName.trim().length === 0)) {
      issues.push(`${variantId}: meshZones.${zone} must contain only non-empty string names`);
    }
  }
}

if (issues.length > 0) {
  console.error(`Avatar 3D validation failed with ${issues.length} issue(s).\n`);
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Avatar 3D validation passed for ${Object.keys(avatarRenderManifest).length} render variants.`);
