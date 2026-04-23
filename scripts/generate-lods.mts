import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ensureDir, parseArgs, relativeFromRepo, repoRoot, runCommand } from "./phase3-asset-lib.mts";

const resolveTextureSize = (targetPath: string) => {
  const normalized = relativeFromRepo(targetPath);
  if (normalized.includes("/assets/avatars/")) return "1536";
  if (normalized.includes("/accessory_")) return "768";
  if (normalized.includes("/hair_")) return "768";
  return "1024";
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const input = typeof args.input === "string" ? args.input : null;
  const dryRun = Boolean(args["dry-run"]);

  if (!input) {
    throw new Error("generate-lods requires --input <path>.");
  }

  const resolvedInput = path.isAbsolute(input) ? input : path.join(repoRoot, input);
  const lod1Output = typeof args.lod1 === "string" ? args.lod1 : resolvedInput.replace(/\.glb$/u, ".lod1.glb");
  const lod2Output = typeof args.lod2 === "string" ? args.lod2 : resolvedInput.replace(/\.glb$/u, ".lod2.glb");
  const ratio1 = typeof args.ratio1 === "string" ? args.ratio1 : "0.65";
  const ratio2 = typeof args.ratio2 === "string" ? args.ratio2 : "0.35";
  const textureSize = resolveTextureSize(resolvedInput);

  await ensureDir(path.dirname(lod1Output));
  await ensureDir(path.dirname(lod2Output));

  const tempLod1 = path.join(os.tmpdir(), `${path.basename(lod1Output)}.${Date.now()}.tmp.glb`);
  const tempLod2 = path.join(os.tmpdir(), `${path.basename(lod2Output)}.${Date.now()}.tmp.glb`);

  try {
    runCommand(
      "npx",
      ["gltf-transform", "simplify", resolvedInput, tempLod1, "--ratio", ratio1, "--error", "0.0005"],
      { dryRun },
    );
    runCommand(
      "npx",
      [
        "gltf-transform",
        "optimize",
        tempLod1,
        lod1Output,
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
        textureSize,
      ],
      { dryRun },
    );

    runCommand(
      "npx",
      ["gltf-transform", "simplify", resolvedInput, tempLod2, "--ratio", ratio2, "--error", "0.001"],
      { dryRun },
    );
    runCommand(
      "npx",
      [
        "gltf-transform",
        "optimize",
        tempLod2,
        lod2Output,
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
        textureSize,
      ],
      { dryRun },
    );
  } finally {
    await fs.rm(tempLod1, { force: true }).catch(() => undefined);
    await fs.rm(tempLod2, { force: true }).catch(() => undefined);
  }
};

await main();
