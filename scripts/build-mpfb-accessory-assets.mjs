#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const blenderBin = process.env.BLENDER_BIN || "/Applications/Blender.app/Contents/MacOS/Blender";
const builderScript = path.join(repoRoot, "authoring", "garments", "mpfb", "scripts", "build_runtime_accessory.py");

const builds = [
  {
    accessoryType: "bucket_hat",
    variantId: "female-base",
    avatarBlend: path.join(repoRoot, "authoring", "avatar", "exports", "raw", "mpfb-female-base.blend"),
    outputBlend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-accessory_city_bucket_hat.blend"),
    summaryJson: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-accessory_city_bucket_hat.summary.json"),
    outputGlb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "female", "accessory_city_bucket_hat.glb"),
  },
  {
    accessoryType: "bucket_hat",
    variantId: "male-base",
    avatarBlend: path.join(repoRoot, "authoring", "avatar", "exports", "raw", "mpfb-male-base.blend"),
    outputBlend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-accessory_city_bucket_hat.blend"),
    summaryJson: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-accessory_city_bucket_hat.summary.json"),
    outputGlb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "male", "accessory_city_bucket_hat.glb"),
  },
  {
    accessoryType: "oval_shades",
    variantId: "female-base",
    avatarBlend: path.join(repoRoot, "authoring", "avatar", "exports", "raw", "mpfb-female-base.blend"),
    outputBlend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-accessory_oval_shades.blend"),
    summaryJson: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-accessory_oval_shades.summary.json"),
    outputGlb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "female", "accessory_oval_shades.glb"),
  },
  {
    accessoryType: "oval_shades",
    variantId: "male-base",
    avatarBlend: path.join(repoRoot, "authoring", "avatar", "exports", "raw", "mpfb-male-base.blend"),
    outputBlend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-accessory_oval_shades.blend"),
    summaryJson: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-accessory_oval_shades.summary.json"),
    outputGlb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "male", "accessory_oval_shades.glb"),
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function runBuild(build) {
  ensureDir(path.dirname(build.outputBlend));
  ensureDir(path.dirname(build.outputGlb));
  ensureDir(path.dirname(build.summaryJson));

  const result = spawnSync(
    blenderBin,
    [
      build.avatarBlend,
      "--background",
      "--factory-startup",
      "--python",
      builderScript,
      "--",
      "--accessory-type",
      build.accessoryType,
      "--output-blend",
      build.outputBlend,
      "--output-glb",
      build.outputGlb,
      "--summary-json",
      build.summaryJson,
      "--variant-id",
      build.variantId,
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    throw new Error(`${build.accessoryType} (${build.variantId}) failed with exit code ${result.status ?? "unknown"}`);
  }
}

for (const build of builds) {
  if (!fs.existsSync(build.avatarBlend)) {
    throw new Error(`Missing avatar blend: ${build.avatarBlend}`);
  }
  runBuild(build);
}

console.log(`Built ${builds.length} MPFB accessory runtime assets.`);
