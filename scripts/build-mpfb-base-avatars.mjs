#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const cacheRoot = path.join(repoRoot, "authoring", "avatar", ".cache");
const sourceLockPath = path.join(repoRoot, "authoring", "avatar", "mpfb", "source-lock.json");
const mpfbRepoRoot = process.env.MPFB_REPO_ROOT || path.join(cacheRoot, "mpfb2");
const mpfbSourceDir = process.env.MPFB_SOURCE_DIR || path.join(mpfbRepoRoot, "src");
const assetPackZip = process.env.MPFB_ASSET_PACK_ZIP || path.join(cacheRoot, "makehuman_system_assets_cc0.zip");
const blenderBin = process.env.BLENDER_BIN || "/Applications/Blender.app/Contents/MacOS/Blender";
const builderScript = path.join(repoRoot, "authoring", "avatar", "mpfb", "scripts", "build_runtime_avatar.py");

const officialSource = "https://github.com/makehumancommunity/mpfb2.git";
const sourceLockSchemaVersion = "mpfb-source-lock-v1";

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

function capture(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
  return result.stdout.trim();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function toRepoRelative(targetPath) {
  const absolute = path.resolve(targetPath);
  const relative = path.relative(repoRoot, absolute);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.replaceAll(path.sep, "/");
  }
  return absolute;
}

function sha256File(targetPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(targetPath)).digest("hex");
}

function readSourceLock() {
  const raw = JSON.parse(fs.readFileSync(sourceLockPath, "utf8"));
  if (raw.schemaVersion !== sourceLockSchemaVersion) {
    throw new Error(`Unexpected MPFB source lock schema version: ${raw.schemaVersion}`);
  }
  return raw;
}

function ensureMpfbSource(lock) {
  ensureDir(cacheRoot);
  if (!fs.existsSync(mpfbRepoRoot)) {
    run("git", ["clone", lock.mpfb.repoUrl || officialSource, mpfbRepoRoot]);
  }
  run("git", ["-C", mpfbRepoRoot, "remote", "set-url", "origin", lock.mpfb.repoUrl || officialSource]);
  run("git", ["-C", mpfbRepoRoot, "fetch", "--depth", "1", "origin", lock.mpfb.revision]);
  run("git", ["-C", mpfbRepoRoot, "checkout", "--force", lock.mpfb.revision]);
  const repoUrl = capture("git", ["-C", mpfbRepoRoot, "config", "--get", "remote.origin.url"]);
  const revision = capture("git", ["-C", mpfbRepoRoot, "rev-parse", "HEAD"]);
  if (repoUrl !== lock.mpfb.repoUrl) {
    throw new Error(`MPFB repo URL drift: expected ${lock.mpfb.repoUrl}, got ${repoUrl}`);
  }
  if (revision !== lock.mpfb.revision) {
    throw new Error(`MPFB revision drift: expected ${lock.mpfb.revision}, got ${revision}`);
  }
  return {
    repoUrl,
    revision,
    sourceDir: toRepoRelative(mpfbSourceDir),
  };
}

function ensureAssetPack(lock) {
  let sourceRef = process.env.MPFB_ASSET_PACK_ZIP
    ? `provided-local:${path.basename(assetPackZip)}`
    : `cached:${path.basename(assetPackZip)}`;
  if (fs.existsSync(assetPackZip) && fs.statSync(assetPackZip).size > 100_000_000 && sha256File(assetPackZip) === lock.assetPack.sha256) {
    return {
      path: toRepoRelative(assetPackZip),
      fileName: lock.assetPack.fileName,
      sha256: sha256File(assetPackZip),
      sourceRef,
    };
  }
  ensureDir(path.dirname(assetPackZip));
  for (const url of lock.assetPack.sourceUrls) {
    try {
      run("curl", ["-L", "--fail", "--output", assetPackZip, url]);
      if (
        fs.existsSync(assetPackZip)
        && fs.statSync(assetPackZip).size > 100_000_000
        && sha256File(assetPackZip) === lock.assetPack.sha256
      ) {
        sourceRef = url;
        return {
          path: toRepoRelative(assetPackZip),
          fileName: lock.assetPack.fileName,
          sha256: lock.assetPack.sha256,
          sourceRef,
        };
      }
    } catch {
      continue;
    }
  }
  throw new Error("Failed to download makehuman_system_assets pack from official mirrors");
}

function buildPreset({ variantId, preset, blend, summary, glb, runtimeModelPath }, buildProvenance) {
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
    "--mpfb-repo-url",
    buildProvenance.mpfb.repoUrl,
    "--mpfb-revision",
    buildProvenance.mpfb.revision,
    "--mpfb-source-path",
    buildProvenance.mpfb.sourceDir,
    "--asset-pack-path",
    buildProvenance.assetPack.path,
    "--asset-pack-file-name",
    buildProvenance.assetPack.fileName,
    "--asset-pack-sha256",
    buildProvenance.assetPack.sha256,
    "--asset-pack-source-ref",
    buildProvenance.assetPack.sourceRef,
    "--summary-json",
    summary,
    "--asset-pack-zip",
    assetPackZip,
    "--subdiv-levels",
    "1",
  ]);
}

function main() {
  const sourceLock = readSourceLock();
  const mpfb = ensureMpfbSource(sourceLock);
  const assetPack = ensureAssetPack(sourceLock);
  const buildProvenance = { mpfb, assetPack };
  for (const preset of presets) {
    buildPreset(preset, buildProvenance);
  }
}

main();
