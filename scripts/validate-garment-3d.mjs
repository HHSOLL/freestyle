#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  collectGarmentRuntimeModelPaths,
  starterGarmentCatalog,
  validateStarterGarment,
} from "../packages/domain-garment/src/index.ts";

const repoRoot = process.cwd();
const issues = [];
const seenIds = new Set();

const resolvePublicPath = (assetPath) => {
  if (!assetPath.startsWith("/")) {
    issues.push(`asset path must start with '/': ${assetPath}`);
    return null;
  }
  return path.join(repoRoot, "apps/web/public", assetPath.replace(/^\//, ""));
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

if (issues.length > 0) {
  console.error(`Garment 3D validation failed with ${issues.length} issue(s).\n`);
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Garment 3D validation passed for ${starterGarmentCatalog.length} starter garments.`);
