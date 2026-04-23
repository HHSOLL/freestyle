import path from "node:path";
import { ensureDir, parseArgs, repoRoot, runCommand } from "./phase3-asset-lib.mts";

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

  await ensureDir(path.dirname(lod1Output));
  await ensureDir(path.dirname(lod2Output));

  runCommand(
    "npx",
    ["gltf-transform", "simplify", resolvedInput, lod1Output, "--ratio", ratio1, "--error", "0.0005"],
    { dryRun },
  );
  runCommand(
    "npx",
    ["gltf-transform", "simplify", resolvedInput, lod2Output, "--ratio", ratio2, "--error", "0.001"],
    { dryRun },
  );
};

await main();
