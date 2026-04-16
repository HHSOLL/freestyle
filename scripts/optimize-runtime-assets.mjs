import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoots = [
  path.join(repoRoot, "apps/web/public/assets/avatars"),
  path.join(repoRoot, "apps/web/public/assets/garments/mpfb"),
];
const reportPath = path.join(repoRoot, "output/runtime-optimization/latest.json");

async function collectGlbFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        return collectGlbFiles(entryPath);
      }
      if (entry.isFile() && entry.name.endsWith(".glb")) {
        return [entryPath];
      }
      return [];
    }),
  );
  return nested.flat();
}

function getTextureSize(filePath) {
  const normalized = filePath.replaceAll(path.sep, "/");
  if (normalized.includes("/assets/avatars/")) return 1536;
  if (normalized.includes("/hair_")) return 1024;
  if (normalized.includes("/accessory_")) return 768;
  return 1024;
}

function optimizeAsset(filePath) {
  const relativePath = path.relative(repoRoot, filePath);
  const tempOutput = path.join(
    os.tmpdir(),
    `${path.basename(filePath, ".glb")}.opt-${Date.now()}-${Math.random().toString(36).slice(2)}.glb`,
  );
  const textureSize = getTextureSize(filePath);
  const beforeSize = Number(spawnSync("stat", ["-f%z", filePath], { encoding: "utf8" }).stdout.trim());
  const args = [
    "gltf-transform",
    "optimize",
    relativePath,
    tempOutput,
    "--compress",
    "meshopt",
    "--flatten",
    "false",
    "--instance",
    "false",
    "--join",
    "false",
    "--palette",
    "false",
    "--simplify",
    "false",
    "--texture-compress",
    "webp",
    "--texture-size",
    String(textureSize),
  ];
  const optimizeResult = spawnSync("npx", args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:${process.env.PATH ?? ""}`,
    },
    stdio: "inherit",
  });

  if (optimizeResult.status !== 0) {
    throw new Error(`Failed to optimize ${relativePath}`);
  }

  const afterSize = Number(spawnSync("stat", ["-f%z", tempOutput], { encoding: "utf8" }).stdout.trim());
  if (afterSize < beforeSize) {
    spawnSync("mv", [tempOutput, filePath], { stdio: "inherit" });
  } else {
    spawnSync("rm", ["-f", tempOutput], { stdio: "inherit" });
  }

  return {
    filePath: relativePath,
    beforeBytes: beforeSize,
    afterBytes: afterSize < beforeSize ? afterSize : beforeSize,
    savedBytes: afterSize < beforeSize ? beforeSize - afterSize : 0,
    textureSize,
  };
}

async function main() {
  const glbFiles = (await Promise.all(runtimeRoots.map((root) => collectGlbFiles(root)))).flat().sort();
  const optimized = glbFiles.map((filePath) => optimizeAsset(filePath));
  const totals = optimized.reduce(
    (sum, item) => {
      sum.beforeBytes += item.beforeBytes;
      sum.afterBytes += item.afterBytes;
      sum.savedBytes += item.savedBytes;
      return sum;
    },
    { beforeBytes: 0, afterBytes: 0, savedBytes: 0 },
  );

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totals,
        optimized,
      },
      null,
      2,
    ),
  );

  console.log(`Optimized ${optimized.length} runtime assets.`);
  console.log(`Saved ${(totals.savedBytes / (1024 * 1024)).toFixed(2)} MB.`);
  console.log(`Report: ${path.relative(repoRoot, reportPath)}`);
}

await main();
