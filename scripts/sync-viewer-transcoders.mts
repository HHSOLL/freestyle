import path from "node:path";
import { viewerAssetLoaderPolicy } from "@freestyle/shared-types";
import { copyFileIfChanged, relativeFromRepo, repoRoot, resolveRepoPath, statIfExists } from "./phase3-asset-lib.mts";

const basisSourceRoot = resolveRepoPath("node_modules", "three", "examples", "jsm", "libs", "basis");
const basisTargetRoot = path.join(repoRoot, "apps", "web", "public", viewerAssetLoaderPolicy.ktx2TranscoderPath);
const dracoTargetRoot = resolveRepoPath("apps", "web", "public", "draco", "gltf");

const normalizePublicPath = (publicPath: string) => publicPath.replace(/^\/+/u, "").replace(/\/+$/u, "");

const main = async () => {
  const copied: string[] = [];
  const unchanged: string[] = [];

  for (const fileName of viewerAssetLoaderPolicy.ktx2TranscoderFiles) {
    const sourcePath = path.join(basisSourceRoot, fileName);
    const targetPath = path.join(repoRoot, "apps", "web", "public", normalizePublicPath(viewerAssetLoaderPolicy.ktx2TranscoderPath), fileName);
    const didCopy = await copyFileIfChanged(sourcePath, targetPath);
    if (didCopy) {
      copied.push(relativeFromRepo(targetPath));
    } else {
      unchanged.push(relativeFromRepo(targetPath));
    }
  }

  const dracoStatus = await statIfExists(dracoTargetRoot);

  console.log("Viewer transcoder sync complete.");
  console.log(`KTX2 target root: ${relativeFromRepo(basisTargetRoot)}`);
  console.log(`Copied: ${copied.length}`);
  if (copied.length > 0) {
    copied.forEach((item) => console.log(`  + ${item}`));
  }
  if (unchanged.length > 0) {
    unchanged.forEach((item) => console.log(`  = ${item}`));
  }
  console.log(`DRACO path present: ${dracoStatus ? "yes" : "no"} (${relativeFromRepo(dracoTargetRoot)})`);
};

await main();
