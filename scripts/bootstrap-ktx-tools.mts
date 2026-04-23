import fs from "node:fs/promises";
import path from "node:path";
import {
  copyFileIfChanged,
  ensureDir,
  parseArgs,
  relativeFromRepo,
  repoRoot,
  runCommand,
  statIfExists,
  writeJson,
} from "./phase3-asset-lib.mts";

const ktxVersion = "4.4.2";
const manifestPath = path.join(repoRoot, "tools", "ktx-software", "manifest.json");
const installRoot = path.join(repoRoot, "tools", "ktx-software", "current");
const cacheRoot = path.join(repoRoot, "tools", "ktx-software", ".cache");

const resolvePlatformPackageName = () => {
  if (process.platform !== "darwin") {
    throw new Error(`KTX tool bootstrap currently supports macOS only. Detected ${process.platform}.`);
  }

  if (process.arch === "arm64") {
    return `KTX-Software-${ktxVersion}-Darwin-arm64.pkg`;
  }

  if (process.arch === "x64") {
    return `KTX-Software-${ktxVersion}-Darwin-x86_64.pkg`;
  }

  throw new Error(`Unsupported macOS architecture ${process.arch}.`);
};

const packageName = resolvePlatformPackageName();
const packageUrl = `https://github.com/KhronosGroup/KTX-Software/releases/download/v${ktxVersion}/${packageName}`;

const extractPkgPayload = (pkgPath: string, destination: string) => {
  runCommand("bash", ["-lc", `mkdir -p "${destination}" && cd "${destination}" && gzip -dc "${pkgPath}" | cpio -idmu`]);
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args["dry-run"]);
  const packageCachePath = path.join(cacheRoot, packageName);
  const expandedRoot = path.join(cacheRoot, `pkg-expanded-${ktxVersion}-${process.arch}`);
  const toolsPayloadRoot = path.join(cacheRoot, `tools-payload-${ktxVersion}-${process.arch}`);
  const libraryPayloadRoot = path.join(cacheRoot, `library-payload-${ktxVersion}-${process.arch}`);
  const packageCacheStatus = await statIfExists(packageCachePath);

  await ensureDir(cacheRoot);

  if (!packageCacheStatus) {
    runCommand("curl", ["-L", packageUrl, "-o", packageCachePath], { dryRun });
  }

  if (!(await statIfExists(expandedRoot))) {
    runCommand("pkgutil", ["--expand", packageCachePath, expandedRoot], { dryRun });
  }

  const toolsPkgPayload = path.join(expandedRoot, `${packageName.replace(".pkg", "")}-tools.pkg`, "Payload");
  const libraryPkgPayload = path.join(expandedRoot, `${packageName.replace(".pkg", "")}-library.pkg`, "Payload");

  if (!(await statIfExists(toolsPayloadRoot))) {
    await ensureDir(toolsPayloadRoot);
    extractPkgPayload(toolsPkgPayload, toolsPayloadRoot);
  }

  if (!(await statIfExists(libraryPayloadRoot))) {
    await ensureDir(libraryPayloadRoot);
    extractPkgPayload(libraryPkgPayload, libraryPayloadRoot);
  }

  const installedBinRoot = path.join(installRoot, "bin");
  const installedLibRoot = path.join(installRoot, "lib");
  await ensureDir(installedBinRoot);
  await ensureDir(installedLibRoot);

  const toolSourceRoot = path.join(toolsPayloadRoot, "usr", "local", "bin");
  const librarySourceRoot = path.join(libraryPayloadRoot, "usr", "local", "lib");
  const binaries = ["toktx", "ktx", "ktx2check", "ktx2ktx2", "ktxinfo", "ktxsc"] as const;
  const libraries = ["libktx.4.4.2.dylib"] as const;

  for (const binaryName of binaries) {
    const installedPath = path.join(installedBinRoot, binaryName);
    await copyFileIfChanged(path.join(toolSourceRoot, binaryName), installedPath);
    await fs.chmod(installedPath, 0o755);
  }

  for (const libraryName of libraries) {
    const installedPath = path.join(installedLibRoot, libraryName);
    await copyFileIfChanged(path.join(librarySourceRoot, libraryName), installedPath);
    await fs.chmod(installedPath, 0o755);
  }

  await Promise.all([
    fs.rm(path.join(installedLibRoot, "libktx.4.dylib"), { force: true }),
    fs.rm(path.join(installedLibRoot, "libktx.dylib"), { force: true }),
  ]);

  await fs.symlink("libktx.4.4.2.dylib", path.join(installedLibRoot, "libktx.4.dylib"));
  await fs.symlink("libktx.4.dylib", path.join(installedLibRoot, "libktx.dylib"));

  const manifest = {
    version: ktxVersion,
    packageName,
    packageUrl,
    installedAt: new Date().toISOString(),
    bin: relativeFromRepo(path.join(installedBinRoot, "toktx")),
    lib: relativeFromRepo(path.join(installedLibRoot, "libktx.4.dylib")),
  };

  await writeJson(manifestPath, manifest);

  console.log(`KTX tools bootstrapped to ${relativeFromRepo(installRoot)}`);
  console.log(`toktx: ${relativeFromRepo(path.join(installedBinRoot, "toktx"))}`);
};

await main();
