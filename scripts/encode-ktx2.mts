import path from "node:path";
import { parseArgs, relativeFromRepo, repoRoot, runCommand, statIfExists } from "./phase3-asset-lib.mts";

const resolveToktxCommand = async () => {
  const repoLocalToktx = path.join(repoRoot, "tools", "ktx-software", "current", "bin", "toktx");
  const repoLocalStatus = await statIfExists(repoLocalToktx);
  if (repoLocalStatus) {
    return repoLocalToktx;
  }

  return "toktx";
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const input = typeof args.input === "string" ? args.input : null;
  const output = typeof args.output === "string" ? args.output : null;
  const textureRole = typeof args["texture-role"] === "string" ? args["texture-role"] : "runtime-color";
  const dryRun = Boolean(args["dry-run"]);

  if (!input) {
    throw new Error("encode-ktx2 requires --input <path>.");
  }

  const resolvedInput = path.isAbsolute(input) ? input : path.join(repoRoot, input);
  const resolvedOutput = output
    ? path.isAbsolute(output)
      ? output
      : path.join(repoRoot, output)
    : resolvedInput.replace(/\.[^.]+$/u, ".ktx2");

  const encodeMode = textureRole === "runtime-linear" ? "uastc" : "etc1s";
  const assignOetf = textureRole === "runtime-linear" ? "linear" : "srgb";
  const toktxCommand = await resolveToktxCommand();
  const commandArgs = [
    "--t2",
    "--genmipmap",
    "--encode",
    encodeMode,
    "--assign_oetf",
    assignOetf,
    resolvedOutput,
    resolvedInput,
  ];

  console.log(`Encoding ${relativeFromRepo(resolvedInput)} -> ${relativeFromRepo(resolvedOutput)}`);
  console.log(`Texture role: ${textureRole}`);
  if (toktxCommand !== "toktx") {
    console.log(`toktx command: ${relativeFromRepo(toktxCommand)}`);
  }
  runCommand(toktxCommand, commandArgs, {
    dryRun,
    env: {
      DYLD_LIBRARY_PATH: path.join(repoRoot, "tools", "ktx-software", "current", "lib"),
    },
  });
};

await main();
