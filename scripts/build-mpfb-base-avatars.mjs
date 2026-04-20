#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const cacheRoot = path.join(repoRoot, "authoring", "avatar", ".cache");
const mpfbRepoRoot = process.env.MPFB_REPO_ROOT || path.join(cacheRoot, "mpfb2");
const mpfbSourceDir = process.env.MPFB_SOURCE_DIR || path.join(mpfbRepoRoot, "src");
const assetPackZip = process.env.MPFB_ASSET_PACK_ZIP || path.join(cacheRoot, "makehuman_system_assets_cc0.zip");
const blenderBin = process.env.BLENDER_BIN || "/Applications/Blender.app/Contents/MacOS/Blender";
const builderScript = path.join(repoRoot, "authoring", "avatar", "mpfb", "scripts", "build_runtime_avatar.py");

const officialSource = "https://github.com/makehumancommunity/mpfb2.git";
const assetMirrors = [
  "https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip",
  "https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip",
];

const presets = [
  {
    variantId: "female-base",
    preset: path.join(repoRoot, "authoring", "avatar", "mpfb", "presets", "female-base.json"),
    blend: path.join(repoRoot, "authoring", "avatar", "exports", "raw", "mpfb-female-base.blend"),
    summary: path.join(repoRoot, "authoring", "avatar", "exports", "raw", "mpfb-female-base.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "avatars", "mpfb-female-base.glb"),
    runtimeModelPath: "/assets/avatars/mpfb-female-base.glb",
  },
  {
    variantId: "male-base",
    preset: path.join(repoRoot, "authoring", "avatar", "mpfb", "presets", "male-base.json"),
    blend: path.join(repoRoot, "authoring", "avatar", "exports", "raw", "mpfb-male-base.blend"),
    summary: path.join(repoRoot, "authoring", "avatar", "exports", "raw", "mpfb-male-base.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "avatars", "mpfb-male-base.glb"),
    runtimeModelPath: "/assets/avatars/mpfb-male-base.glb",
  },
];

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: repoRoot,
    env: process.env,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function ensureMpfbSource() {
  if (fs.existsSync(path.join(mpfbSourceDir, "mpfb", "blender_manifest.toml"))) {
    return;
  }
  ensureDir(cacheRoot);
  if (!fs.existsSync(mpfbRepoRoot)) {
    run("git", ["clone", "--depth", "1", officialSource, mpfbRepoRoot]);
    return;
  }
  run("git", ["-C", mpfbRepoRoot, "fetch", "--depth", "1", "origin"]);
  run("git", ["-C", mpfbRepoRoot, "reset", "--hard", "origin/master"]);
}

function ensureAssetPack() {
  if (fs.existsSync(assetPackZip) && fs.statSync(assetPackZip).size > 100_000_000) {
    return;
  }
  ensureDir(path.dirname(assetPackZip));
  for (const url of assetMirrors) {
    try {
      run("curl", ["-L", "--fail", "--output", assetPackZip, url]);
      if (fs.existsSync(assetPackZip) && fs.statSync(assetPackZip).size > 100_000_000) {
        return;
      }
    } catch {
      continue;
    }
  }
  throw new Error("Failed to download makehuman_system_assets pack from official mirrors");
}

function buildPreset({ variantId, preset, blend, summary, glb, runtimeModelPath }) {
  ensureDir(path.dirname(blend));
  ensureDir(path.dirname(glb));
  run(blenderBin, [
    "--background",
    "--factory-startup",
    "--python",
    builderScript,
    "--",
    "--mpfb-source-dir",
    mpfbSourceDir,
    "--preset-json",
    preset,
    "--variant-id",
    variantId,
    "--output-blend",
    blend,
    "--output-glb",
    glb,
    "--runtime-model-path",
    runtimeModelPath,
    "--summary-json",
    summary,
    "--asset-pack-zip",
    assetPackZip,
    "--subdiv-levels",
    "1",
  ]);
}

function main() {
  ensureMpfbSource();
  ensureAssetPack();
  for (const preset of presets) {
    buildPreset(preset);
  }
}

main();
