import path from "node:path";
import { parseArgs, repoRoot, runCommand } from "./phase3-asset-lib.mts";

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const input = typeof args.input === "string" ? args.input : null;
  const dryRun = Boolean(args["dry-run"]);
  const reportOnly = Boolean(args["report-only"]);

  if (!input) {
    throw new Error("build-display-asset requires --input <path>.");
  }

  const resolvedInput = path.isAbsolute(input) ? input : path.join(repoRoot, input);

  runCommand("node", ["--import", "tsx", "scripts/sync-viewer-transcoders.mts"], { dryRun });

  if (!reportOnly) {
    runCommand("node", ["--import", "tsx", "scripts/generate-lods.mts", "--input", resolvedInput], { dryRun });
  }

  runCommand("node", ["--import", "tsx", "scripts/report-asset-budget.mts"], { dryRun });
};

await main();
