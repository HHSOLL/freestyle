import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { phase3AssetBudgetTargets } from "@freestyle/asset-schema";
import {
  resolveDefaultClosetLoadout,
  resolveGarmentRuntimeModelPath,
  starterGarmentCatalog,
} from "@freestyle/domain-garment";
import type { QualityTier } from "@freestyle/shared-types";
import { viewerAssetLoaderPolicy } from "@freestyle/shared-types";
import { resolveAvatarRuntimeModelPath } from "../packages/runtime-3d/src/avatar-manifest.ts";
import { runtimeAssetBudget } from "../packages/runtime-3d/src/runtime-asset-budget.ts";
import { listFilesRecursive, relativeFromRepo, resolveRepoPath, statIfExists, writeJson } from "./phase3-asset-lib.mts";

const reportPath = resolveRepoPath("output", "asset-budget-report", "latest.json");
const assetsRoot = resolveRepoPath("apps", "web", "public", "assets");
const publicRoot = resolveRepoPath("apps", "web", "public");

type AssetFamily = "avatar" | "garment" | "hair" | "shoes" | "accessory";
type TransferStatus = "pass" | "warn" | "fail";

type InspectedGlbStats = {
  bytes: number;
  drawCalls: number;
  triangles: number;
  gpuTextureBytes: number;
};

type QualityTierStats = {
  path: string;
  bytes: number;
  drawCalls: number;
  triangles: number;
  gpuTextureBytes: number;
  transferStatus: TransferStatus;
};

const starterCatalogById = new Map(starterGarmentCatalog.map((item) => [item.id, item]));

const classifyAsset = (filePath: string): AssetFamily => {
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

const resolveTransferStatus = (family: AssetFamily, bytes: number): TransferStatus => {
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

const resolveLegacyHardGate = (family: AssetFamily, bytes: number) => {
  if (family === "avatar") {
    return bytes <= runtimeAssetBudget.avatarGlbBytes ? "pass" : "fail";
  }
  if (family === "hair") {
    return bytes <= runtimeAssetBudget.hairGlbBytes ? "pass" : "fail";
  }
  return bytes <= runtimeAssetBudget.garmentGlbBytes ? "pass" : "fail";
};

const buildSiblingLodPath = (filePath: string, suffix: "lod1" | "lod2") => filePath.replace(/\.glb$/u, `.${suffix}.glb`);

const readGlbInspection = async (filePath: string) => {
  const payload = await fs.readFile(filePath);

  if (payload.length < 20 || payload.toString("utf8", 0, 4) !== "glTF") {
    return null;
  }

  const jsonChunkLength = payload.readUInt32LE(12);
  const jsonChunkType = payload.toString("utf8", 16, 20);
  if (jsonChunkType !== "JSON") {
    return null;
  }

  const jsonChunkStart = 20;
  const jsonChunkEnd = jsonChunkStart + jsonChunkLength;
  const json = JSON.parse(payload.toString("utf8", jsonChunkStart, jsonChunkEnd));
  const binChunkStart = jsonChunkEnd + 8;
  const binChunkLength = jsonChunkEnd + 8 <= payload.length ? payload.readUInt32LE(jsonChunkEnd) : 0;
  const binChunk = binChunkLength > 0 ? payload.subarray(binChunkStart, binChunkStart + binChunkLength) : null;

  return {
    bytes: payload.length,
    gltf: json as Record<string, unknown>,
    binChunk,
  };
};

const resolveBufferViewBuffer = (
  inspection: Awaited<ReturnType<typeof readGlbInspection>>,
  bufferViewIndex: number,
) => {
  if (!inspection?.binChunk) {
    return null;
  }

  const bufferViews = Array.isArray(inspection.gltf.bufferViews) ? inspection.gltf.bufferViews : [];
  const bufferView = bufferViews[bufferViewIndex] as { byteOffset?: number; byteLength?: number } | undefined;
  if (!bufferView || typeof bufferView.byteLength !== "number") {
    return null;
  }

  const byteOffset = bufferView.byteOffset ?? 0;
  return inspection.binChunk.subarray(byteOffset, byteOffset + bufferView.byteLength);
};

const resolveExternalImagePath = (glbPath: string, uri: string) => {
  if (uri.startsWith("data:")) {
    return null;
  }

  if (uri.startsWith("/")) {
    return path.join(publicRoot, uri.replace(/^\//u, ""));
  }

  return path.resolve(path.dirname(glbPath), uri);
};

const inspectTextureGpuBytes = async (glbPath: string, inspection: Awaited<ReturnType<typeof readGlbInspection>>) => {
  if (!inspection) {
    return 0;
  }

  const images = Array.isArray(inspection.gltf.images) ? inspection.gltf.images : [];
  let gpuTextureBytes = 0;

  for (const image of images) {
    try {
      let metadataBuffer: Buffer | null = null;
      const typedImage = image as { bufferView?: number; uri?: string };
      if (typeof typedImage.bufferView === "number") {
        const embeddedBuffer = resolveBufferViewBuffer(inspection, typedImage.bufferView);
        metadataBuffer = embeddedBuffer ? Buffer.from(embeddedBuffer) : null;
      } else if (typeof typedImage.uri === "string") {
        const externalPath = resolveExternalImagePath(glbPath, typedImage.uri);
        metadataBuffer = externalPath ? await fs.readFile(externalPath) : null;
      }

      if (!metadataBuffer) {
        continue;
      }

      const metadata = await sharp(metadataBuffer).metadata();
      if (!metadata.width || !metadata.height) {
        continue;
      }
      gpuTextureBytes += metadata.width * metadata.height * 4;
    } catch {
      continue;
    }
  }

  return gpuTextureBytes;
};

const inspectGlbStats = async (filePath: string): Promise<InspectedGlbStats | null> => {
  const inspection = await readGlbInspection(filePath);
  if (!inspection) {
    return null;
  }

  const accessors = Array.isArray(inspection.gltf.accessors) ? inspection.gltf.accessors : [];
  const meshes = Array.isArray(inspection.gltf.meshes) ? inspection.gltf.meshes : [];
  let drawCalls = 0;
  let triangles = 0;

  for (const mesh of meshes) {
    const primitives = Array.isArray((mesh as { primitives?: unknown[] }).primitives)
      ? ((mesh as { primitives: unknown[] }).primitives as Array<{ indices?: number; attributes?: Record<string, number> }>)
      : [];

    drawCalls += primitives.length;
    for (const primitive of primitives) {
      if (typeof primitive.indices === "number") {
        const accessor = accessors[primitive.indices] as { count?: number } | undefined;
        if (typeof accessor?.count === "number") {
          triangles += Math.floor(accessor.count / 3);
          continue;
        }
      }

      const positionAccessorIndex = primitive.attributes?.POSITION;
      if (typeof positionAccessorIndex === "number") {
        const accessor = accessors[positionAccessorIndex] as { count?: number } | undefined;
        if (typeof accessor?.count === "number") {
          triangles += Math.floor(accessor.count / 3);
        }
      }
    }
  }

  return {
    bytes: inspection.bytes,
    drawCalls,
    triangles,
    gpuTextureBytes: await inspectTextureGpuBytes(filePath, inspection),
  };
};

const resolveQualityTierStats = (
  family: AssetFamily,
  filePath: string,
  allStats: Map<string, InspectedGlbStats>,
): QualityTierStats => {
  const relativePath = relativeFromRepo(filePath);
  const stats = allStats.get(relativePath);
  if (!stats) {
    throw new Error(`Missing GLB inspection stats for ${relativePath}`);
  }

  return {
    path: relativePath,
    bytes: stats.bytes,
    drawCalls: stats.drawCalls,
    triangles: stats.triangles,
    gpuTextureBytes: stats.gpuTextureBytes,
    transferStatus: resolveTransferStatus(family, stats.bytes),
  };
};

const resolveTextureBudgetStatus = (qualityTier: QualityTier, textureBytes: number) => {
  const target =
    qualityTier === "high"
      ? phase3AssetBudgetTargets.textureBytes.fullOutfitDesktop
      : phase3AssetBudgetTargets.textureBytes.fullOutfitMobileBalanced;
  return textureBytes <= target ? "pass" : "fail";
};

const resolveGeometryBudgetStatus = (qualityTier: QualityTier, value: number, key: "drawCalls" | "triangles") => {
  const target =
    qualityTier === "high"
      ? phase3AssetBudgetTargets[key].visibleDesktop
      : phase3AssetBudgetTargets[key].visibleMobileBalanced;
  return value <= target ? "pass" : "fail";
};

const main = async () => {
  const allGlbFiles = await listFilesRecursive(assetsRoot, (targetPath) => targetPath.endsWith(".glb"));
  const rootGlbFiles = allGlbFiles.filter((targetPath) => !/\.lod[12]\.glb$/u.test(targetPath));
  const runtimeKtx2Files = await listFilesRecursive(assetsRoot, (targetPath) => targetPath.endsWith(".ktx2")).catch(() => []);
  const uiTextureFiles = await listFilesRecursive(
    assetsRoot,
    (targetPath) =>
      viewerAssetLoaderPolicy.preferredUiTextureExtensions.some((extension) => targetPath.endsWith(extension)),
  ).catch(() => []);

  const allStatsEntries = await Promise.all(
    allGlbFiles.map(async (filePath) => {
      const inspected = await inspectGlbStats(filePath);
      return inspected ? [relativeFromRepo(filePath), inspected] : null;
    }),
  );
  const allStats = new Map(allStatsEntries.filter((entry) => entry !== null) as Array<[string, InspectedGlbStats]>);

  const assetEntries = await Promise.all(
    rootGlbFiles.map(async (filePath) => {
      const stat = await statIfExists(filePath);
      if (!stat) {
        return null;
      }

      const family = classifyAsset(filePath);
      const lod1Path = buildSiblingLodPath(filePath, "lod1");
      const lod2Path = buildSiblingLodPath(filePath, "lod2");
      const [lod1, lod2] = await Promise.all([statIfExists(lod1Path), statIfExists(lod2Path)]);
      const balancedPath = lod1 ? lod1Path : filePath;
      const lowPath = lod2 ? lod2Path : lod1 ? lod1Path : filePath;
      const qualityTierStats = {
        high: resolveQualityTierStats(family, filePath, allStats),
        balanced: resolveQualityTierStats(family, balancedPath, allStats),
        low: resolveQualityTierStats(family, lowPath, allStats),
      };

      return {
        path: relativeFromRepo(filePath),
        family,
        bytes: stat.size,
        transferStatus: resolveTransferStatus(family, stat.size),
        legacyHardGateStatus: resolveLegacyHardGate(family, stat.size),
        lodCoverage: {
          lod1: Boolean(lod1),
          lod2: Boolean(lod2),
        },
        qualityTierPaths: {
          high: qualityTierStats.high.path,
          balanced: qualityTierStats.balanced.path,
          low: qualityTierStats.low.path,
        },
        qualityTierStats,
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

  const defaultClosetSceneByVariant = Object.fromEntries(
    (["female-base", "male-base"] as const).map((variantId) => {
      const loadout = resolveDefaultClosetLoadout(variantId);
      const starterItems = Object.values(loadout)
        .flatMap((itemId) => (itemId ? [starterCatalogById.get(itemId)] : []))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      const byQualityTier = Object.fromEntries(
        (["high", "balanced", "low"] as const).map((qualityTier) => {
          const assetPaths = [
            resolveAvatarRuntimeModelPath(variantId, qualityTier),
            ...starterItems.map((item) => resolveGarmentRuntimeModelPath(item.runtime, variantId, qualityTier)),
          ]
            .filter(Boolean)
            .map((assetPath) => relativeFromRepo(path.join(publicRoot, assetPath!.replace(/^\//u, ""))));

          const aggregate = assetPaths.reduce(
            (sum, assetPath) => {
              const stats = allStats.get(assetPath);
              if (!stats) {
                return sum;
              }
              return {
                bytes: sum.bytes + stats.bytes,
                drawCalls: sum.drawCalls + stats.drawCalls,
                triangles: sum.triangles + stats.triangles,
                gpuTextureBytes: sum.gpuTextureBytes + stats.gpuTextureBytes,
              };
            },
            { bytes: 0, drawCalls: 0, triangles: 0, gpuTextureBytes: 0 },
          );

          return [
            qualityTier,
            {
              paths: assetPaths,
              ...aggregate,
              transferStatus:
                aggregate.bytes <= phase3AssetBudgetTargets.transferBytes.defaultClosetScene ? "pass" : "fail",
              textureStatus: resolveTextureBudgetStatus(qualityTier, aggregate.gpuTextureBytes),
              drawCallStatus: resolveGeometryBudgetStatus(qualityTier, aggregate.drawCalls, "drawCalls"),
              triangleStatus: resolveGeometryBudgetStatus(qualityTier, aggregate.triangles, "triangles"),
            },
          ];
        }),
      );

      return [variantId, byQualityTier];
    }),
  );

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
      transcodersPresent: basisFiles.every(Boolean),
      defaultClosetSceneByVariant,
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
      ...(["female-base", "male-base"] as const).flatMap((variantId) =>
        (["high", "balanced", "low"] as const).flatMap((qualityTier) => {
          const scene = defaultClosetSceneByVariant[variantId][qualityTier];
          const issues: string[] = [];
          if (scene.transferStatus === "fail") {
            issues.push(`${variantId} ${qualityTier} default closet scene exceeds transfer budget.`);
          }
          if (scene.textureStatus === "fail") {
            issues.push(`${variantId} ${qualityTier} default closet scene exceeds texture budget.`);
          }
          if (scene.drawCallStatus === "fail") {
            issues.push(`${variantId} ${qualityTier} default closet scene exceeds draw-call budget.`);
          }
          if (scene.triangleStatus === "fail") {
            issues.push(`${variantId} ${qualityTier} default closet scene exceeds triangle budget.`);
          }
          return issues;
        }),
      ),
    ],
  };

  await writeJson(reportPath, report);

  console.log(`Asset budget report written to ${relativeFromRepo(reportPath)}`);
  console.log(`Analyzed ${filteredEntries.length} root GLB assets and ${allStats.size} total GLB variants.`);
  console.log(`Runtime KTX2 textures: ${runtimeKtx2Files.length}`);
  console.log(`Missing sibling LOD variants: ${missingLodEntries.length}`);
};

await main();
