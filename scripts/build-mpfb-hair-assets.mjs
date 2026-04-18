#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const blenderBin = process.env.BLENDER_BIN || "/Applications/Blender.app/Contents/MacOS/Blender";
const builderScript = path.join(repoRoot, "authoring", "garments", "mpfb", "scripts", "build_runtime_hair.py");
const mpfbDataDir =
  process.env.MPFB_DATA_DIR || path.join(process.env.HOME || "", "Library/Application Support/Blender/4.4/extensions/.user/src/mpfb/data");

const builds = [
  { styleId: "ponytail01", slug: "signature_ponytail", color: "#3d2f29" },
  { styleId: "bob01", slug: "soft_bob", color: "#47362f" },
  { styleId: "long01", slug: "long_fall", color: "#2f2724" },
  { styleId: "short03", slug: "textured_crop", color: "#332824" },
  { styleId: "braid01", slug: "studio_braid", color: "#382a25" },
  { styleId: "bob02", slug: "volume_bob", color: "#4a382f" },
  { styleId: "short04", slug: "clean_sweep", color: "#342925" },
  { styleId: "afro01", slug: "afro_cloud", color: "#241d1b" },
].flatMap((style) => [
  {
    hairStyle: style.styleId,
    variantId: "female-base",
    hairColor: style.color,
    avatarBlend: path.join(repoRoot, "authoring", "avatar", "exports", "raw", "mpfb-female-base.blend"),
    outputBlend: path.join(repoRoot, "authoring", "garments", "exports", "raw", `mpfb-female-hair_${style.slug}.blend`),
    summaryJson: path.join(repoRoot, "authoring", "garments", "exports", "raw", `mpfb-female-hair_${style.slug}.summary.json`),
    outputGlb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "female", `hair_${style.slug}.glb`),
  },
  {
    hairStyle: style.styleId,
    variantId: "male-base",
    hairColor: style.color,
    avatarBlend: path.join(repoRoot, "authoring", "avatar", "exports", "raw", "mpfb-male-base.blend"),
    outputBlend: path.join(repoRoot, "authoring", "garments", "exports", "raw", `mpfb-male-hair_${style.slug}.blend`),
    summaryJson: path.join(repoRoot, "authoring", "garments", "exports", "raw", `mpfb-male-hair_${style.slug}.summary.json`),
    outputGlb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "male", `hair_${style.slug}.glb`),
  },
]);

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
      "--hair-style",
      build.hairStyle,
      "--output-blend",
      build.outputBlend,
      "--output-glb",
      build.outputGlb,
      "--summary-json",
      build.summaryJson,
      "--variant-id",
      build.variantId,
      "--hair-color",
      build.hairColor,
      "--mpfb-data-dir",
      mpfbDataDir,
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    throw new Error(`${build.hairStyle} (${build.variantId}) failed with exit code ${result.status ?? "unknown"}`);
  }
}

for (const build of builds) {
  if (!fs.existsSync(build.avatarBlend)) {
    throw new Error(`Missing avatar blend: ${build.avatarBlend}`);
  }
  runBuild(build);
}

console.log(`Built ${builds.length} MPFB hair runtime assets.`);
