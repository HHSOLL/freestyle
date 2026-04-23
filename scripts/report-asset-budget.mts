import path from "node:path";
import { phase3AssetBudgetTargets } from "@freestyle/asset-schema";
import { viewerAssetLoaderPolicy } from "@freestyle/shared-types";
import { runtimeAssetBudget } from "../packages/runtime-3d/src/runtime-asset-budget.ts";
import { listFilesRecursive, relativeFromRepo, resolveRepoPath, statIfExists, writeJson } from "./phase3-asset-lib.mts";

const reportPath = resolveRepoPath("output", "asset-budget-report", "latest.json");
const assetsRoot = resolveRepoPath("apps", "web", "public", "assets");
const publicRoot = resolveRepoPath("apps", "web", "public");

const classifyAsset = (filePath: string) => {
  const normalized = relativeFromRepo(filePath);
  const name = path.basename(filePath);

  if (normalized.startsWith("apps/web/public/assets/avatars/")) {
    return "avatar";
  }
  if (name.startsWith("hair_")) {
    return "hair";
  }
  if (name.startsWith("shoes_")) {
    return "shoes";
  }
  if (name.startsWith("accessory_")) {
    return "accessory";
  }

  return "garment";
};

const resolveTransferStatus = (family: ReturnType<typeof classifyAsset>, bytes: number) => {
  if (family === "avatar") {
    if (bytes > phase3AssetBudgetTargets.transferBytes.firstVisibleAvatarDesktop) {
      return "fail";
    }
    if (bytes > phase3AssetBudgetTargets.transferBytes.firstVisibleAvatarMobileBalanced) {
      return "warn";
    }
    return "pass";
  }

  if (bytes > phase3AssetBudgetTargets.transferBytes.selectedGarmentCriticalDesktop) {
    return "fail";
  }
  if (bytes > phase3AssetBudgetTargets.transferBytes.selectedGarmentCriticalMobileBalanced) {
    return "warn";
  }
  return "pass";
};

const resolveLegacyHardGate = (family: ReturnType<typeof classifyAsset>, bytes: number) => {
  if (family === "avatar") {
    return bytes <= runtimeAssetBudget.avatarGlbBytes ? "pass" : "fail";
  }
  if (family === "hair") {
    return bytes <= runtimeAssetBudget.hairGlbBytes ? "pass" : "fail";
  }
  return bytes <= runtimeAssetBudget.garmentGlbBytes ? "pass" : "fail";
};

const buildSiblingLodPath = (filePath: string, suffix: "lod1" | "lod2") => filePath.replace(/\.glb$/u, `.${suffix}.glb`);

const resolveTransferTargets = (family: ReturnType<typeof classifyAsset>) => {
  if (family === "avatar") {
    return {
      mobileBalanced: phase3AssetBudgetTargets.transferBytes.firstVisibleAvatarMobileBalanced,
      desktop: phase3AssetBudgetTargets.transferBytes.firstVisibleAvatarDesktop,
    };
  }

  return {
    mobileBalanced: phase3AssetBudgetTargets.transferBytes.selectedGarmentCriticalMobileBalanced,
    desktop: phase3AssetBudgetTargets.transferBytes.selectedGarmentCriticalDesktop,
  };
};

const main = async () => {
  const glbFiles = await listFilesRecursive(
    assetsRoot,
    (targetPath) => targetPath.endsWith(".glb") && !/\.lod[12]\.glb$/u.test(targetPath),
  );
  const runtimeKtx2Files = await listFilesRecursive(assetsRoot, (targetPath) => targetPath.endsWith(".ktx2")).catch(() => []);
  const uiTextureFiles = await listFilesRecursive(
    assetsRoot,
    (targetPath) =>
      viewerAssetLoaderPolicy.preferredUiTextureExtensions.some((extension) => targetPath.endsWith(extension)),
  ).catch(() => []);

  const assetEntries = await Promise.all(
    glbFiles.map(async (filePath) => {
      const stat = await statIfExists(filePath);
      if (!stat) {
        return null;
      }

      const family = classifyAsset(filePath);
      const lod1Path = buildSiblingLodPath(filePath, "lod1");
      const lod2Path = buildSiblingLodPath(filePath, "lod2");
      const [lod1, lod2] = await Promise.all([statIfExists(lod1Path), statIfExists(lod2Path)]);
      const balancedBytes = lod1?.size ?? stat.size;
      const lowBytes = lod2?.size ?? lod1?.size ?? stat.size;
      const balancedPath = lod1 ? lod1Path : filePath;
      const lowPath = lod2 ? lod2Path : lod1 ? lod1Path : filePath;

      return {
        path: relativeFromRepo(filePath),
        family,
        bytes: stat.size,
        transferTargets: resolveTransferTargets(family),
        transferStatus: resolveTransferStatus(family, stat.size),
        legacyHardGateStatus: resolveLegacyHardGate(family, stat.size),
        lodCoverage: {
          lod1: Boolean(lod1),
          lod2: Boolean(lod2),
        },
        qualityTierBytes: {
          high: stat.size,
          balanced: balancedBytes,
          low: lowBytes,
        },
        qualityTierTransferStatus: {
          high: resolveTransferStatus(family, stat.size),
          balanced: resolveTransferStatus(family, balancedBytes),
          low: resolveTransferStatus(family, lowBytes),
        },
        qualityTierPaths: {
          high: relativeFromRepo(filePath),
          balanced: relativeFromRepo(balancedPath),
          low: relativeFromRepo(lowPath),
        },
      };
    }),
  );

  const filteredEntries = assetEntries.filter((entry) => entry !== null);
  const missingLodEntries = filteredEntries.filter((entry) => !entry.lodCoverage.lod1 || !entry.lodCoverage.lod2);
  const basisFiles = await Promise.all(
    viewerAssetLoaderPolicy.ktx2TranscoderFiles.map((fileName) =>
      statIfExists(path.join(publicRoot, viewerAssetLoaderPolicy.ktx2TranscoderPath, fileName)),
    ),
  );

  const defaultClosetScenePaths = [
    resolveRepoPath("apps", "web", "public", "assets", "avatars", "mpfb-female-base.glb"),
    resolveRepoPath("apps", "web", "public", "assets", "garments", "mpfb", "female", "top_soft_casual.glb"),
    resolveRepoPath("apps", "web", "public", "assets", "garments", "mpfb", "female", "bottom_soft_wool_v1.glb"),
    resolveRepoPath("apps", "web", "public", "assets", "garments", "mpfb", "female", "shoes_soft_sneaker.glb"),
    resolveRepoPath("apps", "web", "public", "assets", "garments", "mpfb", "female", "hair_clean_sweep.glb"),
  ];
  const defaultClosetSceneStats = await Promise.all(defaultClosetScenePaths.map((entry) => statIfExists(entry)));
  const defaultClosetSceneBytes = defaultClosetSceneStats.reduce((sum, entry) => sum + (entry?.size ?? 0), 0);

  const report = {
    generatedAt: new Date().toISOString(),
    policy: viewerAssetLoaderPolicy,
    targets: phase3AssetBudgetTargets,
    compatibilityHardGates: runtimeAssetBudget,
    summary: {
      assetCount: filteredEntries.length,
      runtimeKtx2TextureCount: runtimeKtx2Files.length,
      uiTextureCount: uiTextureFiles.length,
      missingLodCount: missingLodEntries.length,
      balancedReadyAssetCount: filteredEntries.filter((entry) => entry.lodCoverage.lod1).length,
      lowReadyAssetCount: filteredEntries.filter((entry) => entry.lodCoverage.lod2).length,
      defaultClosetSceneBytes,
      defaultClosetSceneStatus:
        defaultClosetSceneBytes <= phase3AssetBudgetTargets.transferBytes.defaultClosetScene ? "pass" : "fail",
      transcodersPresent: basisFiles.every(Boolean),
    },
    assets: filteredEntries,
    nonBlockingIssues: [
      ...(runtimeKtx2Files.length === 0
        ? ["No runtime KTX2 textures are committed under apps/web/public/assets yet."]
        : []),
      ...(missingLodEntries.length > 0
        ? [`${missingLodEntries.length} runtime GLBs are still missing sibling .lod1/.lod2 variants.`]
        : []),
      ...(!basisFiles.every(Boolean)
        ? ["KTX2 transcoder files are missing from apps/web/public/basis; run npm run viewer:sync:transcoders."]
        : []),
    ],
  };

  await writeJson(reportPath, report);

  console.log(`Asset budget report written to ${relativeFromRepo(reportPath)}`);
  console.log(`Analyzed ${filteredEntries.length} GLB assets.`);
  console.log(`Runtime KTX2 textures: ${runtimeKtx2Files.length}`);
  console.log(`Missing sibling LOD variants: ${missingLodEntries.length}`);
};

await main();
