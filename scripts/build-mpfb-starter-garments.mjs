#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const cacheRoot = path.join(repoRoot, "authoring", "garments", ".cache");
const officialPackRoot = path.join(cacheRoot, "official-packs");
const officialPackExtractedRoot = path.join(officialPackRoot, "extracted");
const mpfbRepoRoot = process.env.MPFB_REPO_ROOT || path.join(cacheRoot, "mpfb2");
const mpfbSourceDir = process.env.MPFB_SOURCE_DIR || path.join(mpfbRepoRoot, "src");
const assetPackZip = process.env.MPFB_ASSET_PACK_ZIP || path.join(cacheRoot, "makehuman_system_assets_cc0.zip");
const blenderBin = process.env.BLENDER_BIN || "/Applications/Blender.app/Contents/MacOS/Blender";
const builderScript = path.join(repoRoot, "authoring", "garments", "mpfb", "scripts", "build_runtime_garment.py");

const officialSource = "https://github.com/makehumancommunity/mpfb2.git";
const assetMirrors = [
  "https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip",
  "https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip",
];
const officialPackMirrors = {
  shirts01: [
    "https://files2.makehumancommunity.org/asset_packs/shirts01/shirts01_cc0.zip",
    "https://files.makehumancommunity.org/asset_packs/shirts01/shirts01_cc0.zip",
  ],
  pants01: [
    "https://files2.makehumancommunity.org/asset_packs/pants01/pants01_cc0.zip",
    "https://files.makehumancommunity.org/asset_packs/pants01/pants01_cc0.zip",
  ],
  shoes01: [
    "https://files2.makehumancommunity.org/asset_packs/shoes01/shoes01_cc0.zip",
    "https://files.makehumancommunity.org/asset_packs/shoes01/shoes01_cc0.zip",
  ],
};

const femalePreset = path.join(repoRoot, "authoring", "avatar", "mpfb", "presets", "female-base.json");
const malePreset = path.join(repoRoot, "authoring", "avatar", "mpfb", "presets", "male-base.json");
const patternSpec = (name) => path.join(repoRoot, "authoring", "garments", "mpfb", "specs", `${name}.pattern-spec.json`);

const officialAssetPath = (pack, ...parts) => path.join(officialPackExtractedRoot, pack, ...parts);

const builds = [
  {
    preset: femalePreset,
    clothesAsset: officialAssetPath("shirts01", "clothes", "toigo_basic_tucked_t-shirt", "toigo_basic_tucked_t-shirt.mhclo"),
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-top_soft_casual.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-top_soft_casual.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "female", "top_soft_casual_v4.glb"),
    patternSpecJson: patternSpec("top_soft_casual"),
    baseColor: "#eef0f4",
    roughness: 0.92,
  },
  {
    preset: malePreset,
    clothesAsset: officialAssetPath("shirts01", "clothes", "toigo_basic_tucked_t-shirt", "toigo_basic_tucked_t-shirt.mhclo"),
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-top_soft_casual.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-top_soft_casual.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "male", "top_soft_casual_v4.glb"),
    patternSpecJson: patternSpec("top_soft_casual"),
    baseColor: "#f0f2f5",
    roughness: 0.92,
  },
  {
    preset: femalePreset,
    clothesAsset: officialAssetPath("pants01", "clothes", "toigo_wool_pants", "toigo_wool_pants.mhclo"),
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-bottom_soft_wool.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-bottom_soft_wool.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "female", "bottom_soft_wool_v1.glb"),
    patternSpecJson: patternSpec("bottom_soft_wool"),
    baseColor: "#353a42",
    roughness: 0.96,
  },
  {
    preset: malePreset,
    clothesAsset: officialAssetPath("pants01", "clothes", "toigo_wool_pants", "toigo_wool_pants.mhclo"),
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-bottom_soft_wool.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-bottom_soft_wool.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "male", "bottom_soft_wool_v1.glb"),
    patternSpecJson: patternSpec("bottom_soft_wool"),
    baseColor: "#3c4149",
    roughness: 0.96,
  },
  {
    preset: femalePreset,
    clothesAsset: officialAssetPath("shoes01", "clothes", "toigo_flats", "toigo_flats.mhclo"),
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-shoes_soft_flat.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-shoes_soft_flat.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "female", "shoes_soft_flat_v1.glb"),
    patternSpecJson: patternSpec("shoes_soft_flat"),
    baseColor: "#15181d",
    roughness: 0.88,
  },
  {
    preset: femalePreset,
    clothesAsset: "clothes/female_casualsuit02/female_casualsuit02.mhclo",
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-top_city_relaxed.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-top_city_relaxed.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "female", "top_city_relaxed.glb"),
    patternSpecJson: patternSpec("top_city_relaxed"),
    baseColor: "#cfd5de",
    roughness: 0.9,
  },
  {
    preset: malePreset,
    clothesAsset: "clothes/male_casualsuit02/male_casualsuit02.mhclo",
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-top_city_relaxed.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-top_city_relaxed.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "male", "top_city_relaxed.glb"),
    patternSpecJson: patternSpec("top_city_relaxed"),
    baseColor: "#c7ced7",
    roughness: 0.9,
  },
  {
    preset: femalePreset,
    clothesAsset: "clothes/female_elegantsuit01/female_elegantsuit01.mhclo",
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-outer_tailored_layer.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-outer_tailored_layer.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "female", "outer_tailored_layer.glb"),
    patternSpecJson: patternSpec("outer_tailored_layer"),
    baseColor: "#4b4748",
    roughness: 0.86,
    metalness: 0.04,
  },
  {
    preset: malePreset,
    clothesAsset: "clothes/male_elegantsuit01/male_elegantsuit01.mhclo",
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-outer_tailored_layer.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-outer_tailored_layer.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "male", "outer_tailored_layer.glb"),
    patternSpecJson: patternSpec("outer_tailored_layer"),
    baseColor: "#4a4647",
    roughness: 0.86,
    metalness: 0.04,
  },
  {
    preset: femalePreset,
    clothesAsset: "clothes/shoes01/shoes01.mhclo",
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-shoes_soft_sneaker.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-shoes_soft_sneaker.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "female", "shoes_soft_sneaker.glb"),
    patternSpecJson: patternSpec("shoes_soft_sneaker"),
  },
  {
    preset: malePreset,
    clothesAsset: "clothes/shoes01/shoes01.mhclo",
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-shoes_soft_sneaker.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-shoes_soft_sneaker.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "male", "shoes_soft_sneaker.glb"),
    patternSpecJson: patternSpec("shoes_soft_sneaker"),
  },
  {
    preset: femalePreset,
    clothesAsset: "clothes/shoes04/shoes04.mhclo",
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-shoes_night_runner.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-female-shoes_night_runner.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "female", "shoes_night_runner.glb"),
    patternSpecJson: patternSpec("shoes_night_runner"),
  },
  {
    preset: malePreset,
    clothesAsset: "clothes/shoes04/shoes04.mhclo",
    blend: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-shoes_night_runner.blend"),
    summary: path.join(repoRoot, "authoring", "garments", "exports", "raw", "mpfb-male-shoes_night_runner.summary.json"),
    glb: path.join(repoRoot, "apps", "web", "public", "assets", "garments", "mpfb", "male", "shoes_night_runner.glb"),
    patternSpecJson: patternSpec("shoes_night_runner"),
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

function ensureOfficialPack(packName) {
  const zipPath = path.join(officialPackRoot, `${packName}_cc0.zip`);
  if (!(packName in officialPackMirrors)) {
    throw new Error(`Unknown official pack ${packName}`);
  }
  if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size < 10_000_000) {
    ensureDir(officialPackRoot);
    for (const url of officialPackMirrors[packName]) {
      try {
        run("curl", ["-L", "--fail", "--output", zipPath, url]);
        if (fs.existsSync(zipPath) && fs.statSync(zipPath).size > 10_000_000) {
          break;
        }
      } catch {
        continue;
      }
    }
  }
  if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size < 10_000_000) {
    throw new Error(`Failed to download official pack ${packName}`);
  }

  const extractionDir = path.join(officialPackExtractedRoot, packName);
  const marker = path.join(extractionDir, "packs", `${packName}.json`);
  if (!fs.existsSync(marker)) {
    ensureDir(extractionDir);
    run("unzip", ["-oq", zipPath, "-d", extractionDir]);
  }
}

function buildPreset({ preset, clothesAsset, blend, summary, glb, patternSpecJson, baseColor, roughness, metalness }) {
  ensureDir(path.dirname(blend));
  ensureDir(path.dirname(glb));
  const args = [
    "--background",
    "--factory-startup",
    "--python",
    builderScript,
    "--",
    "--mpfb-source-dir",
    mpfbSourceDir,
    "--preset-json",
    preset,
    "--clothes-asset",
    clothesAsset,
    "--output-blend",
    blend,
    "--output-glb",
    glb,
    "--summary-json",
    summary,
    "--asset-pack-zip",
    assetPackZip,
  ];
  if (baseColor) {
    args.push("--base-color", baseColor);
  }
  if (patternSpecJson) {
    args.push("--pattern-spec-json", patternSpecJson);
  }
  if (typeof roughness === "number") {
    args.push("--roughness", String(roughness));
  }
  if (typeof metalness === "number") {
    args.push("--metalness", String(metalness));
  }
  run(blenderBin, args);
}

function main() {
  ensureMpfbSource();
  ensureAssetPack();
  ensureOfficialPack("shirts01");
  ensureOfficialPack("pants01");
  ensureOfficialPack("shoes01");
  for (const build of builds) {
    buildPreset(build);
  }
}

main();
