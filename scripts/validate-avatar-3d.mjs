#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { avatarRenderManifest, referenceRigAliasPatterns } from "../packages/runtime-3d/src/avatar-manifest.ts";

const repoRoot = process.cwd();
const issues = [];

const resolvePublicPath = (assetPath) => {
  if (!assetPath.startsWith("/")) {
    issues.push(`asset path must start with '/': ${assetPath}`);
    return null;
  }
  return path.join(repoRoot, "apps/web/public", assetPath.replace(/^\//, ""));
};

const requiredAliases = Object.keys(referenceRigAliasPatterns);
const mpfbSummaryPaths = {
  "female-base": path.join(repoRoot, "authoring", "avatar", "exports", "raw", "mpfb-female-base.summary.json"),
  "male-base": path.join(repoRoot, "authoring", "avatar", "exports", "raw", "mpfb-male-base.summary.json"),
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

const validateMpfbSummary = (variantId, entry) => {
  const summaryPath = mpfbSummaryPaths[variantId];
  if (!summaryPath) return;
  if (!fs.existsSync(summaryPath)) {
    issues.push(`${variantId}: missing authoring summary ${path.relative(repoRoot, summaryPath)}`);
    return;
  }

  const raw = fs.readFileSync(summaryPath, "utf8");
  const summary = JSON.parse(raw);
  const shapeKeys = summary?.basemesh?.shapeKeys;
  if (!Array.isArray(shapeKeys) || shapeKeys.length < 2) {
    issues.push(`${variantId}: expected MPFB summary to include exported body morph shape keys`);
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
};

for (const [variantId, entry] of Object.entries(avatarRenderManifest)) {
  if (entry.id !== variantId) {
    issues.push(`${variantId}: manifest id must match object key`);
  }
  if (!["mpfb2", "charmorph", "runtime-fallback"].includes(entry.authoringSource)) {
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
