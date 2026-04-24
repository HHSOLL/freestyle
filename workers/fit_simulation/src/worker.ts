import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL, fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import {
  EXTMeshoptCompression,
  EXTTextureAVIF,
  EXTTextureWebP,
  KHRONOS_EXTENSIONS,
} from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
import { applyFitKernelDisplayDeformationTransfer } from "@freestyle/fit-kernel";
import { logger } from "@freestyle/observability";
import { runWorkerLoop, type WorkerDefinition } from "@freestyle/queue";
import { getStorageAdapter } from "@freestyle/storage";
import {
  buildFitSimulationArtifactLineageId,
  buildFitSimulationCacheKey,
  buildJobResultEnvelope,
  fitMapArtifactSchemaVersion,
  fitMapArtifactDataSchema,
  fitSimulationMetricsArtifactDataSchema,
  fitSimulationMetricsArtifactSchemaVersion,
  fitSimulateHQResultEnvelopeSchema,
  JOB_TYPES,
  normalizeQueuedJobPayload,
  fitSimulationJobPayloadSchema,
  type FitSimulationJobPayload,
  type FitSimulationArtifact,
  type FitSimulationArtifactLineage,
  type FitSimulationQualityTier,
  type FitMapArtifactData,
  type FitMapOverlay,
  type FitMapRegionScore,
  type FitSimulationMetricsArtifactData,
  type GarmentFitAssessment,
  type GarmentInstantFitReport,
  type JobRecord,
} from "@freestyle/shared";
import {
  assessGarmentInstantFit,
  assessGarmentPhysicalFit,
  buildFitMapSummary,
} from "@freestyle/domain-garment";
import { getFitSimulationById } from "../../../apps/api/src/modules/fit-simulations/fit-simulations.service.js";
import { upsertFitSimulationRecord } from "../../../apps/api/src/modules/fit-simulations/fit-simulations.repository.js";

const execFileAsync = promisify(execFile);

const createTerminalFitSimulationError = (code: string, message: string) => {
  const error = new Error(message) as Error & { retryable?: boolean };
  error.name = code;
  error.retryable = false;
  return error;
};

const fitSimulationPreviewWidth = 1200;
const fitSimulationPreviewHeight = 675;

const getFitSimulationArtifactStorePath = () =>
  process.env.FIT_SIMULATION_ARTIFACT_STORE_PATH?.trim() ||
  path.join(process.cwd(), ".data", "fit-simulation-artifacts");

const svgLabel = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const hasRemoteStorageConfig = () => {
  const provider = process.env.STORAGE_PROVIDER?.trim().toLowerCase() || "supabase";
  if (provider === "s3") {
    return Boolean(
      process.env.S3_ENDPOINT?.trim() &&
        process.env.S3_BUCKET?.trim() &&
        process.env.S3_ACCESS_KEY_ID?.trim() &&
        process.env.S3_SECRET_ACCESS_KEY?.trim() &&
        process.env.S3_PUBLIC_BASE_URL?.trim(),
    );
  }

  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
};

const getFitSimulationArtifactStorageBackend = (): FitSimulationArtifactLineage["storageBackend"] =>
  hasRemoteStorageConfig() ? "remote-storage" : "local-file";

const persistFitSimulationFile = async (
  fitSimulationId: string,
  fileName: string,
  contentType: string,
  buffer: Buffer,
) => {
  const key = path.posix.join("fit-simulations", fitSimulationId, fileName);

  if (hasRemoteStorageConfig()) {
    const uploaded = await getStorageAdapter().uploadBuffer(key, buffer, contentType);
    return {
      key: uploaded.key,
      url: uploaded.url,
    };
  }

  const artifactStorePath = getFitSimulationArtifactStorePath();
  const absolutePath = path.join(artifactStorePath, fitSimulationId, fileName);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return {
    key,
    url: pathToFileURL(absolutePath).toString(),
  };
};

const persistFitSimulationArtifact = async (
  fitSimulationId: string,
  kind: FitSimulationArtifact["kind"],
  fileName: string,
  contentType: string,
  buffer: Buffer,
  metadata?: FitSimulationArtifact["metadata"],
): Promise<FitSimulationArtifact> => {
  const stored = await persistFitSimulationFile(fitSimulationId, fileName, contentType, buffer);
  return {
    kind,
    url: stored.url,
    key: stored.key,
    label: fileName,
    metadata,
  };
};

type FitSimulationDrapeSource = FitSimulationArtifactLineage["drapeSource"];
type FitSimulationDrapedGlbBuildResult = {
  buffer: Buffer;
  drapeSource: FitSimulationDrapeSource;
  warnings: string[];
  solverOutput?: {
    appliedPrimitiveCount: number;
    appliedVertexCount: number;
    maxDisplacementMm: number;
  };
};

const authoredSceneMergeDrapeWarning =
  "Phase 4 baseline draped_glb is an authored-scene merge artifact; solver-deformed cloth remains future work.";
const solverOutputBaselineDrapeWarning =
  "Reference-quality baseline draped_glb contains deterministic fit-refiner vertex deformation for the covered starter path; certification-grade cloth remains gated by golden fit review.";

const getPublicAssetBaseHost = () => {
  try {
    return new URL(process.env.PUBLIC_ASSET_BASE_URL?.trim() || "https://freestyle.local").host;
  } catch {
    return "freestyle.local";
  }
};

const runtimeAssetPathFromUrl = async (value: string) => {
  const url = new URL(value);

  if (url.protocol === "file:") {
    return fileURLToPath(url);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return null;
  }

  const isLocalAssetHost =
    url.host === getPublicAssetBaseHost() ||
    ["freestyle.local", "localhost", "127.0.0.1"].includes(url.hostname);

  if (!isLocalAssetHost || !url.pathname.startsWith("/assets/")) {
    return null;
  }

  const absolutePath = path.join(
    process.cwd(),
    "apps",
    "web",
    "public",
    decodeURIComponent(url.pathname).replace(/^\/+/, ""),
  );

  await fs.access(absolutePath);
  return absolutePath;
};

const getGltfTransformBinaryPath = () =>
  path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "gltf-transform.cmd" : "gltf-transform");

const createFitSimulationGltfIO = async () => {
  await MeshoptDecoder.ready;
  await MeshoptEncoder.ready;
  return new NodeIO()
    .registerExtensions([
      ...KHRONOS_EXTENSIONS,
      EXTMeshoptCompression,
      EXTTextureWebP,
      EXTTextureAVIF,
    ])
    .registerDependencies({
      "meshopt.decoder": MeshoptDecoder,
      "meshopt.encoder": MeshoptEncoder,
    });
};

const readAccessorPositions = (accessor: {
  getCount: () => number;
  getElement: (index: number, target: number[]) => number[];
}) => {
  const count = accessor.getCount();
  const positions = new Float32Array(count * 3);
  const target = [0, 0, 0];
  for (let index = 0; index < count; index += 1) {
    accessor.getElement(index, target);
    positions[index * 3] = target[0] ?? 0;
    positions[index * 3 + 1] = target[1] ?? 0;
    positions[index * 3 + 2] = target[2] ?? 0;
  }
  return positions;
};

const boundsForPositions = (positions: Float32Array) => {
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  };
  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index] ?? 0;
    const y = positions[index + 1] ?? 0;
    const z = positions[index + 2] ?? 0;
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.minZ = Math.min(bounds.minZ, z);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
    bounds.maxZ = Math.max(bounds.maxZ, z);
  }
  return bounds;
};

const normalizeAxis = (value: number, min: number, max: number) => {
  const span = max - min;
  return Math.abs(span) < 1e-8 ? 0 : ((value - min) / span) * 2 - 1;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const buildHqSolverProxyFromDisplayPositions = (
  displayRestPositions: Float32Array,
  fitAssessment: GarmentFitAssessment,
) => {
  const displayVertexCount = displayRestPositions.length / 3;
  const sampleCount = Math.min(128, Math.max(8, displayVertexCount));
  const stride = Math.max(1, Math.floor(displayVertexCount / sampleCount));
  const bounds = boundsForPositions(displayRestPositions);
  const fitRestPositions: number[] = [];
  const fitDisplacements: number[] = [];
  const stretchLoad = clampNumber(fitAssessment.stretchLoad, 0, 1.5);
  const limitingBias = clampNumber(fitAssessment.limitingKeys.length / 4, 0, 1);
  const collisionBias = fitAssessment.clippingRisk === "high" ? 1 : fitAssessment.clippingRisk === "medium" ? 0.65 : 0.35;

  for (let vertex = 0; vertex < displayVertexCount; vertex += stride) {
    const offset = vertex * 3;
    const x = displayRestPositions[offset] ?? 0;
    const y = displayRestPositions[offset + 1] ?? 0;
    const z = displayRestPositions[offset + 2] ?? 0;
    const normalizedX = normalizeAxis(x, bounds.minX, bounds.maxX);
    const normalizedY = normalizeAxis(y, bounds.minY, bounds.maxY);
    const normalizedZ = normalizeAxis(z, bounds.minZ, bounds.maxZ);
    const waistInfluence = 1 - Math.min(1, Math.abs(normalizedY));
    const hemInfluence = Math.max(0, -normalizedY);
    const sideSign = normalizedX < 0 ? -1 : 1;
    const depthSign = normalizedZ < 0 ? -1 : 1;
    const inwardCompression = stretchLoad * waistInfluence * 0.006;
    const drapeSag = (0.0025 + stretchLoad * 0.004 + limitingBias * 0.002) * hemInfluence;
    const collisionLift = collisionBias * waistInfluence * 0.0035;

    fitRestPositions.push(x, y, z);
    fitDisplacements.push(
      -sideSign * inwardCompression,
      -drapeSag,
      depthSign * collisionLift,
    );
  }

  return {
    fitRestPositions: Float32Array.from(fitRestPositions),
    fitDisplacements: Float32Array.from(fitDisplacements),
  };
};

export const buildFitSimulationSolverDeformedGarmentGlbBuffer = async (input: {
  garmentManifestUrl: string;
  fitAssessment: GarmentFitAssessment;
  qualityTier: FitSimulationQualityTier;
}) => {
  const garmentInput =
    (await runtimeAssetPathFromUrl(input.garmentManifestUrl).catch(() => null)) ?? input.garmentManifestUrl;
  const io = await createFitSimulationGltfIO();
  const document = await io.read(garmentInput);
  let appliedPrimitiveCount = 0;
  let appliedVertexCount = 0;
  let maxDisplacementMm = 0;
  const strength =
    input.qualityTier === "high" ? 0.95 : input.qualityTier === "balanced" ? 0.78 : 0.62;

  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const positionAccessor = primitive.getAttribute("POSITION");
      if (!positionAccessor || positionAccessor.getCount() < 8) {
        continue;
      }
      const displayRestPositions = readAccessorPositions(positionAccessor);
      const { fitRestPositions, fitDisplacements } = buildHqSolverProxyFromDisplayPositions(
        displayRestPositions,
        input.fitAssessment,
      );
      const transfer = applyFitKernelDisplayDeformationTransfer({
        displayRestPositions,
        fitRestPositions,
        fitDisplacements,
        strength,
      });
      if (transfer.appliedVertexCount <= 0 || transfer.maxDisplacementMm <= 0.05) {
        continue;
      }
      const nextPositions: Float32Array<ArrayBuffer> = new Float32Array(transfer.positions.length);
      nextPositions.set(transfer.positions);
      positionAccessor.setArray(nextPositions);
      appliedPrimitiveCount += 1;
      appliedVertexCount += transfer.appliedVertexCount;
      maxDisplacementMm = Math.max(maxDisplacementMm, transfer.maxDisplacementMm);
    }
  }

  if (appliedPrimitiveCount <= 0 || appliedVertexCount <= 0 || maxDisplacementMm <= 0.05) {
    return null;
  }

  return {
    buffer: Buffer.from(await io.writeBinary(document)),
    appliedPrimitiveCount,
    appliedVertexCount,
    maxDisplacementMm: Number(maxDisplacementMm.toFixed(4)),
  };
};

const mergeFitSimulationDrapedGlbBuffer = async (input: {
  fitSimulationId: string;
  avatarManifestUrl: string;
  garmentManifestUrl: string;
  garmentOverrideBuffer?: Buffer;
}) => {
  const workingDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "freestyle-fit-sim-"));
  try {
    const avatarInput =
      (await runtimeAssetPathFromUrl(input.avatarManifestUrl).catch(() => null)) ?? input.avatarManifestUrl;
    const garmentInput = input.garmentOverrideBuffer
      ? path.join(workingDirectory, `${input.fitSimulationId}.solver-garment.glb`)
      : (await runtimeAssetPathFromUrl(input.garmentManifestUrl).catch(() => null)) ?? input.garmentManifestUrl;
    if (input.garmentOverrideBuffer) {
      await fs.writeFile(garmentInput, input.garmentOverrideBuffer);
    }
    const outputPath = path.join(workingDirectory, `${input.fitSimulationId}.draped.glb`);
    const args = ["merge"];
    if (/^https?:\/\//i.test(avatarInput) || /^https?:\/\//i.test(garmentInput)) {
      args.push("--allow-net=true");
    }
    args.push(avatarInput, garmentInput, outputPath);

    await execFileAsync(getGltfTransformBinaryPath(), args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:${process.env.PATH ?? ""}`,
      },
    });

    return fs.readFile(outputPath);
  } finally {
    await fs.rm(workingDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
};

export const buildFitSimulationDrapedGlbArtifact = async (input: {
  fitSimulationId: string;
  avatarManifestUrl: string;
  garmentManifestUrl: string;
  fitAssessment?: GarmentFitAssessment | null;
  qualityTier?: FitSimulationQualityTier;
}): Promise<FitSimulationDrapedGlbBuildResult> => {
  const solverGarment = input.fitAssessment
    ? await buildFitSimulationSolverDeformedGarmentGlbBuffer({
        garmentManifestUrl: input.garmentManifestUrl,
        fitAssessment: input.fitAssessment,
        qualityTier: input.qualityTier ?? "balanced",
      }).catch(() => null)
    : null;

  const buffer = await mergeFitSimulationDrapedGlbBuffer({
    fitSimulationId: input.fitSimulationId,
    avatarManifestUrl: input.avatarManifestUrl,
    garmentManifestUrl: input.garmentManifestUrl,
    garmentOverrideBuffer: solverGarment?.buffer,
  });

  if (solverGarment) {
    return {
      buffer,
      drapeSource: "solver-output",
      warnings: [solverOutputBaselineDrapeWarning],
      solverOutput: solverGarment,
    };
  }

  return {
    buffer,
    drapeSource: "authored-scene-merge",
    warnings: [authoredSceneMergeDrapeWarning],
  };
};

export const buildFitSimulationDrapedGlbBuffer = async (input: {
  fitSimulationId: string;
  avatarManifestUrl: string;
  garmentManifestUrl: string;
}) => {
  const artifact = await buildFitSimulationDrapedGlbArtifact(input);
  return artifact.buffer;
};

const coercePenetrationRate = (qualityTier: FitSimulationQualityTier, limitingCount: number, stretchLoad: number) => {
  const tierBias = qualityTier === "high" ? 0.025 : qualityTier === "balanced" ? 0.02 : 0.015;
  return Number(Math.min(1, stretchLoad * 0.18 + limitingCount * tierBias).toFixed(3));
};

const coerceMaxStretchRatio = (requiredStretchRatios: number[]) =>
  Number(
    Math.max(
      1,
      ...requiredStretchRatios.map((value) => 1 + value),
    ).toFixed(3),
  );

const roundScore = (value: number) => Number(Math.min(1, Math.max(0, value)).toFixed(3));

const averageScore = (regions: FitMapRegionScore[]) =>
  roundScore(regions.reduce((sum, entry) => sum + entry.score, 0) / Math.max(regions.length, 1));

const maxScore = (regions: FitMapRegionScore[]) =>
  roundScore(Math.max(0, ...regions.map((entry) => entry.score)));

const collisionSeverityByState: Record<FitMapRegionScore["fitState"], number> = {
  compression: 0.95,
  snug: 0.66,
  regular: 0.3,
  relaxed: 0.16,
  oversized: 0.18,
};

const scoreEase = (easeCm: number, fitState: FitMapRegionScore["fitState"]) => {
  if (easeCm < 0) {
    return roundScore(0.65 + Math.min(0.35, Math.abs(easeCm) / 6));
  }

  if (fitState === "oversized") {
    return roundScore(0.24 + Math.min(0.28, Math.max(easeCm - 12, 0) / 18));
  }

  return roundScore(Math.max(0.05, 0.42 - Math.min(easeCm, 14) * 0.028));
};

const scoreStretch = (requiredStretchRatio: number, isLimiting: boolean) =>
  roundScore(requiredStretchRatio / 0.12 + (isLimiting ? 0.08 : 0));

const scoreCollisionRisk = (
  fitState: FitMapRegionScore["fitState"],
  isLimiting: boolean,
  clippingRisk: GarmentFitAssessment["clippingRisk"],
) => {
  const clippingBias = clippingRisk === "high" ? 0.16 : clippingRisk === "medium" ? 0.08 : 0;
  return roundScore(collisionSeverityByState[fitState] + (isLimiting ? 0.08 : 0) + clippingBias);
};

const scoreConfidence = (
  confidence: number,
  requiredStretchRatio: number,
  fitState: FitMapRegionScore["fitState"],
  isLimiting: boolean,
) => {
  const fitPenalty =
    fitState === "compression" ? 0.18 : fitState === "snug" ? 0.08 : fitState === "oversized" ? 0.04 : 0;
  return roundScore(confidence - requiredStretchRatio * 0.85 - fitPenalty - (isLimiting ? 0.04 : 0));
};

const overlayScoreColor = (score: number) => {
  if (score >= 0.8) return "#d64545";
  if (score >= 0.6) return "#ef8b17";
  if (score >= 0.4) return "#efc84c";
  return "#4a9f6c";
};

export const buildFitMapArtifactPayload = (
  fitSimulationId: string,
  request: FitMapArtifactData["request"],
  garment: FitMapArtifactData["garment"],
  fitAssessment: GarmentFitAssessment,
  instantFit: GarmentInstantFitReport,
  warnings: string[],
) => {
  const regionByKey = new Map(instantFit.regions.map((entry) => [entry.measurementKey, entry] as const));
  const baseRegions = fitAssessment.dimensions.map((dimension) => {
    const region = regionByKey.get(dimension.key);
    if (!region) {
      throw new Error(`Missing instant-fit region for ${dimension.key}.`);
    }

    return {
      regionId: region.regionId,
      measurementKey: dimension.key,
      fitState: dimension.state,
      easeCm: dimension.easeCm,
      requiredStretchRatio: dimension.requiredStretchRatio,
      isLimiting: fitAssessment.limitingKeys.includes(dimension.key),
    };
  });

  const overlays = [
    {
      kind: "easeMap",
      regions: baseRegions.map((entry) => ({
        ...entry,
        score: scoreEase(entry.easeCm, entry.fitState),
      })),
      overallScore: 0,
      maxRegionScore: 0,
    },
    {
      kind: "stretchMap",
      regions: baseRegions.map((entry) => ({
        ...entry,
        score: scoreStretch(entry.requiredStretchRatio, entry.isLimiting),
      })),
      overallScore: 0,
      maxRegionScore: 0,
    },
    {
      kind: "collisionRiskMap",
      regions: baseRegions.map((entry) => ({
        ...entry,
        score: scoreCollisionRisk(entry.fitState, entry.isLimiting, fitAssessment.clippingRisk),
      })),
      overallScore: 0,
      maxRegionScore: 0,
    },
    {
      kind: "confidenceMap",
      regions: baseRegions.map((entry) => ({
        ...entry,
        score: scoreConfidence(
          instantFit.confidence,
          entry.requiredStretchRatio,
          entry.fitState,
          entry.isLimiting,
        ),
      })),
      overallScore: 0,
      maxRegionScore: 0,
    },
  ] satisfies FitMapOverlay[];

  return fitMapArtifactDataSchema.parse({
    schemaVersion: fitMapArtifactSchemaVersion,
    generatedAt: new Date().toISOString(),
    fitSimulationId,
    request,
    garment,
    fitAssessment,
    instantFit,
    overlays: overlays.map((overlay) => ({
    ...overlay,
    overallScore: averageScore(overlay.regions),
    maxRegionScore: maxScore(overlay.regions),
    })),
    warnings,
  });
};

export const buildFitSimulationMetricsArtifactPayload = (
  fitSimulationId: string,
  request: FitSimulationMetricsArtifactData["request"],
  garment: FitSimulationMetricsArtifactData["garment"],
  fitMapSummary: FitSimulationMetricsArtifactData["fitMapSummary"],
  metrics: FitSimulationMetricsArtifactData["metrics"],
  artifactLineageId: FitSimulationMetricsArtifactData["artifactLineageId"],
  warnings: string[],
  artifactKinds: FitSimulationMetricsArtifactData["artifactKinds"],
  drapeSource: FitSimulationDrapeSource = "authored-scene-merge",
) =>
  fitSimulationMetricsArtifactDataSchema.parse({
    schemaVersion: fitSimulationMetricsArtifactSchemaVersion,
    generatedAt: new Date().toISOString(),
    fitSimulationId,
    request,
    garment,
    fitMapSummary,
    metrics,
    artifactLineageId,
    warnings,
    drapeSource,
    artifactKinds,
  });

export const buildFitSimulationPreviewSvg = (
  fitSimulationId: string,
  fitMap: FitMapArtifactData,
) => {
  const fitMapSummary = buildFitMapSummary(fitMap);
  const dominantOverlay =
    fitMap.overlays.find((entry) => entry.kind === fitMapSummary.dominantOverlayKind) ?? fitMap.overlays[0];
  const confidenceOverlay = fitMap.overlays.find((entry) => entry.kind === "confidenceMap") ?? fitMap.overlays[0];
  const topRegions = [...dominantOverlay.regions].sort((left, right) => right.score - left.score).slice(0, 4);
  const confidencePercent = Math.round((fitMap.instantFit?.confidence ?? confidenceOverlay.overallScore) * 100);
  const primaryRegion =
    fitMap.instantFit?.primaryRegionId ?? fitMapSummary.dominantRegionId ?? topRegions[0]?.regionId ?? "chest";

  const regionRows = topRegions
    .map((region, index) => {
      const width = Math.round(region.score * 290);
      const y = 436 + index * 48;
      return `
        <text x="70" y="${y}" fill="#eef2f7" font-size="22" font-family="Arial, sans-serif">${svgLabel(region.regionId)}</text>
        <text x="260" y="${y}" fill="#9aa7b6" font-size="16" font-family="Arial, sans-serif">${svgLabel(region.measurementKey)}</text>
        <rect x="490" y="${y - 16}" width="290" height="16" rx="8" fill="rgba(255,255,255,0.1)" />
        <rect x="490" y="${y - 16}" width="${width}" height="16" rx="8" fill="${overlayScoreColor(region.score)}" />
        <text x="804" y="${y}" fill="#eef2f7" font-size="16" font-family="Arial, sans-serif">${Math.round(region.score * 100)}%</text>
      `;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${fitSimulationPreviewWidth}" height="${fitSimulationPreviewHeight}" viewBox="0 0 ${fitSimulationPreviewWidth} ${fitSimulationPreviewHeight}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0d1117" />
          <stop offset="100%" stop-color="#1c2430" />
        </linearGradient>
      </defs>
      <rect width="${fitSimulationPreviewWidth}" height="${fitSimulationPreviewHeight}" rx="32" fill="url(#bg)" />
      <rect x="28" y="28" width="1144" height="619" rx="28" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
      <text x="70" y="92" fill="#9aa7b6" font-size="20" font-family="Arial, sans-serif">FreeStyle HQ Fit Preview</text>
      <text x="70" y="148" fill="#f7fafc" font-size="44" font-family="Arial, sans-serif">${svgLabel(fitMap.garment.name)}</text>
      <text x="70" y="186" fill="#d3dbe5" font-size="24" font-family="Arial, sans-serif">${svgLabel(fitMap.instantFit?.summary.en ?? "Fit simulation preview")}</text>

      <rect x="70" y="224" width="312" height="132" rx="22" fill="rgba(255,255,255,0.06)" />
      <text x="96" y="260" fill="#9aa7b6" font-size="18" font-family="Arial, sans-serif">overall fit</text>
      <text x="96" y="314" fill="#f7fafc" font-size="52" font-family="Arial, sans-serif">${svgLabel(fitMap.instantFit?.overallFit ?? "good")}</text>
      <text x="96" y="344" fill="#d3dbe5" font-size="20" font-family="Arial, sans-serif">quality tier: ${svgLabel(fitMap.request.qualityTier)}</text>

      <rect x="410" y="224" width="250" height="132" rx="22" fill="rgba(255,255,255,0.06)" />
      <text x="436" y="260" fill="#9aa7b6" font-size="18" font-family="Arial, sans-serif">confidence</text>
      <text x="436" y="314" fill="#f7fafc" font-size="52" font-family="Arial, sans-serif">${confidencePercent}%</text>
      <text x="436" y="344" fill="#d3dbe5" font-size="20" font-family="Arial, sans-serif">${svgLabel(fitMap.request.materialPreset)}</text>

      <rect x="690" y="224" width="420" height="132" rx="22" fill="rgba(255,255,255,0.06)" />
      <text x="716" y="260" fill="#9aa7b6" font-size="18" font-family="Arial, sans-serif">simulation</text>
      <text x="716" y="308" fill="#f7fafc" font-size="22" font-family="Arial, sans-serif">${svgLabel(fitSimulationId)}</text>
      <text x="716" y="340" fill="#d3dbe5" font-size="20" font-family="Arial, sans-serif">dominant overlay: ${svgLabel(fitMapSummary.dominantOverlayKind)}</text>
      <text x="716" y="368" fill="#d3dbe5" font-size="20" font-family="Arial, sans-serif">primary region: ${svgLabel(primaryRegion)}</text>

      <text x="70" y="404" fill="#9aa7b6" font-size="20" font-family="Arial, sans-serif">region ${svgLabel(fitMapSummary.dominantOverlayKind)} summary</text>
      ${regionRows}

      <text x="70" y="612" fill="#9aa7b6" font-size="18" font-family="Arial, sans-serif">${svgLabel(fitMap.warnings[0] ?? authoredSceneMergeDrapeWarning)}</text>
    </svg>
  `.trim();
};

export const buildFitSimulationPreviewPngBuffer = async (
  fitSimulationId: string,
  fitMap: FitMapArtifactData,
) => {
  const svg = buildFitSimulationPreviewSvg(fitSimulationId, fitMap);
  return sharp(Buffer.from(svg, "utf8"))
    .resize(fitSimulationPreviewWidth, fitSimulationPreviewHeight, { fit: "cover" })
    .png()
    .toBuffer();
};

export const parseFitSimulationJobPayload = (
  job: Pick<JobRecord, "id" | "job_type" | "payload" | "idempotency_key">,
) =>
  normalizeQueuedJobPayload({
    jobType: JOB_TYPES.FIT_SIMULATE_HQ,
    payload: job.payload,
    schema: fitSimulationJobPayloadSchema,
    fallbackTraceId: job.id,
    idempotencyKey: job.idempotency_key,
  });

export const fitSimulationWorkerDefinition: WorkerDefinition = {
  workerName: "worker_fit_simulate_hq",
  jobTypes: [JOB_TYPES.FIT_SIMULATE_HQ],
  handler: async ({ job }) => {
    const startedAt = Date.now();
    const payloadEnvelope = parseFitSimulationJobPayload(job);
    const payload: FitSimulationJobPayload = payloadEnvelope.data;
    if (!payload.fit_simulation_id) {
      throw createTerminalFitSimulationError(
        "FIT_SIMULATION_INVALID_PAYLOAD",
        "Invalid fit simulation payload.",
      );
    }

    const row = await getFitSimulationById(payload.fit_simulation_id);
    if (!row) {
      throw createTerminalFitSimulationError(
        "FIT_SIMULATION_NOT_FOUND",
        `Fit simulation ${payload.fit_simulation_id} not found.`,
      );
    }

    await upsertFitSimulationRecord({
      ...row,
      status: "processing",
      errorMessage: null,
      fitMap: row.fitMap ?? null,
      fitMapSummary: row.fitMapSummary ?? null,
      updatedAt: new Date().toISOString(),
    });

    try {
      const fitAssessment =
        row.fitAssessment ?? assessGarmentPhysicalFit(row.garmentSnapshot, row.bodyProfile);
      const instantFit =
        row.instantFit ?? assessGarmentInstantFit(row.garmentSnapshot, row.bodyProfile);

      if (!fitAssessment) {
        throw createTerminalFitSimulationError(
          "FIT_SIMULATION_ASSESSMENT_UNAVAILABLE",
          "Physical fit assessment could not be derived for this garment snapshot.",
        );
      }
      if (!instantFit) {
        throw createTerminalFitSimulationError(
          "FIT_SIMULATION_REPORT_UNAVAILABLE",
          "Instant fit report could not be derived for this garment snapshot.",
        );
      }

      const drapedGlbBuild = await buildFitSimulationDrapedGlbArtifact({
        fitSimulationId: row.id,
        avatarManifestUrl: row.avatarManifestUrl,
        garmentManifestUrl: row.garmentManifestUrl,
        fitAssessment,
        qualityTier: row.qualityTier,
      });
      const warnings = drapedGlbBuild.warnings;
      const drapeSource = drapedGlbBuild.drapeSource;
      const cacheKeyParts = {
        avatarVariantId: row.avatarVariantId,
        bodyProfileRevision: payload.bodyProfileRevision ?? row.bodyProfileRevision ?? payload.bodyVersionId,
        garmentVariantId: row.garmentVariantId,
        garmentRevision: payload.garmentRevision ?? row.garmentRevision ?? row.garmentVariantId,
        materialPreset: row.materialPreset,
        qualityTier: row.qualityTier,
      } as const;
      const cacheKey = row.cacheKey ?? buildFitSimulationCacheKey(cacheKeyParts);
      const artifactKinds = ["draped_glb", "preview_png", "fit_map_json", "metrics_json"] as const;
      const artifactLineageId = buildFitSimulationArtifactLineageId({
        cacheKey,
        cacheKeyParts,
        artifactKinds: [...artifactKinds],
        drapeSource,
      });
      const metrics = {
        durationMs: Math.max(1, Date.now() - startedAt),
        penetrationRate: coercePenetrationRate(
          payload.qualityTier,
          fitAssessment.limitingKeys.length,
          fitAssessment.stretchLoad,
        ),
        maxStretchRatio: coerceMaxStretchRatio(
          fitAssessment.dimensions.map((entry) => entry.requiredStretchRatio),
        ),
      };

      const fitMapArtifactPayload = buildFitMapArtifactPayload(
        row.id,
        {
          bodyVersionId: row.bodyVersionId,
          bodyProfileRevision: row.bodyProfileRevision,
          garmentVariantId: row.garmentVariantId,
          garmentRevision: row.garmentRevision,
          avatarVariantId: row.avatarVariantId,
          avatarManifestUrl: row.avatarManifestUrl,
          garmentManifestUrl: row.garmentManifestUrl,
          materialPreset: row.materialPreset,
          qualityTier: row.qualityTier,
          cacheKey,
        },
        {
          id: row.garmentSnapshot.id,
          name: row.garmentSnapshot.name,
          category: row.garmentSnapshot.category,
        },
        fitAssessment,
        instantFit,
        warnings,
      );
      const fitMapSummary = buildFitMapSummary(fitMapArtifactPayload);

      const drapedArtifact = await persistFitSimulationArtifact(
        row.id,
        "draped_glb",
        "draped.glb",
        "model/gltf-binary",
        drapedGlbBuild.buffer,
        {
          presentationRole: "hq-preview",
          drapeSource,
          solverOutput: drapedGlbBuild.solverOutput,
          avatarVariantId: row.avatarVariantId,
          garmentVariantId: row.garmentVariantId,
          qualityTier: row.qualityTier,
        },
      );

      const fitMapArtifact = await persistFitSimulationArtifact(
        row.id,
        "fit_map_json",
        "fit-map.json",
        "application/json",
        Buffer.from(JSON.stringify(fitMapArtifactPayload, null, 2), "utf8"),
      );
      const previewArtifact = await persistFitSimulationArtifact(
        row.id,
        "preview_png",
        "preview.png",
        "image/png",
        await buildFitSimulationPreviewPngBuffer(row.id, fitMapArtifactPayload),
        {
          width: fitSimulationPreviewWidth,
          height: fitSimulationPreviewHeight,
          overallFit: instantFit.overallFit,
          dominantOverlayKind: fitMapSummary.dominantOverlayKind,
          primaryRegionId: instantFit.primaryRegionId,
        },
      );
      const metricsArtifactPayload = buildFitSimulationMetricsArtifactPayload(
        row.id,
        {
          bodyVersionId: row.bodyVersionId,
          bodyProfileRevision: row.bodyProfileRevision,
          garmentVariantId: row.garmentVariantId,
          garmentRevision: row.garmentRevision,
          avatarVariantId: row.avatarVariantId,
          avatarManifestUrl: row.avatarManifestUrl,
          garmentManifestUrl: row.garmentManifestUrl,
          materialPreset: row.materialPreset,
          qualityTier: row.qualityTier,
          cacheKey,
        },
        {
          id: row.garmentSnapshot.id,
          name: row.garmentSnapshot.name,
          category: row.garmentSnapshot.category,
        },
        fitMapSummary,
        metrics,
        artifactLineageId,
        warnings,
        [...artifactKinds],
        drapeSource,
      );
      const metricsArtifact = await persistFitSimulationArtifact(
        row.id,
        "metrics_json",
        "metrics.json",
        "application/json",
        Buffer.from(JSON.stringify(metricsArtifactPayload, null, 2), "utf8"),
        {
          drapeSource,
          dominantOverlayKind: fitMapSummary.dominantOverlayKind,
        },
      );
      const completedAt = new Date().toISOString();
      const artifactLineage = {
        schemaVersion: "fit-simulation-artifact-lineage.v1" as const,
        artifactLineageId,
        generatedAt: completedAt,
        cacheKey,
        cacheKeyParts,
        avatarManifestUrl: row.avatarManifestUrl,
        garmentManifestUrl: row.garmentManifestUrl,
        storageBackend: getFitSimulationArtifactStorageBackend(),
        drapeSource,
        artifactKinds: [...artifactKinds],
        manifestKey: path.posix.join("fit-simulations", row.id, "artifact-lineage.json"),
        manifestUrl: "",
        warnings,
      } satisfies Omit<FitSimulationArtifactLineage, "manifestUrl"> & { manifestUrl: string };
      const storedLineage = await persistFitSimulationFile(
        row.id,
        "artifact-lineage.json",
        "application/json",
        Buffer.from(
          JSON.stringify(
            {
              ...artifactLineage,
              manifestUrl:
                artifactLineage.storageBackend === "remote-storage"
                  ? new URL(
                      `/${artifactLineage.manifestKey.replace(/^\/+/, "")}`,
                      process.env.PUBLIC_ASSET_BASE_URL?.trim() || "https://freestyle.local",
                    ).toString()
                  : "",
            },
            null,
            2,
          ),
          "utf8",
        ),
      );
      const finalizedArtifactLineage: FitSimulationArtifactLineage = {
        ...artifactLineage,
        manifestKey: storedLineage.key,
        manifestUrl: storedLineage.url,
      };
      await persistFitSimulationFile(
        row.id,
        "artifact-lineage.json",
        "application/json",
        Buffer.from(JSON.stringify(finalizedArtifactLineage, null, 2), "utf8"),
      );
      const artifacts = [drapedArtifact, previewArtifact, fitMapArtifact, metricsArtifact];
      const nextRecord = await upsertFitSimulationRecord({
        ...row,
        status: "succeeded",
        cacheKey,
        fitAssessment,
        instantFit,
        fitMap: fitMapArtifactPayload,
        fitMapSummary,
        artifacts,
        metrics,
        artifactLineage: finalizedArtifactLineage,
        warnings,
        errorMessage: null,
        updatedAt: completedAt,
        completedAt,
      });

      return fitSimulateHQResultEnvelopeSchema.parse(
        buildJobResultEnvelope(
          JOB_TYPES.FIT_SIMULATE_HQ,
          {
            schemaVersion: "fit-simulate-hq.v1",
            bodyVersionId: nextRecord.bodyVersionId,
            bodyProfileRevision: nextRecord.bodyProfileRevision,
            garmentVariantId: nextRecord.garmentVariantId,
            garmentRevision: nextRecord.garmentRevision,
            qualityTier: nextRecord.qualityTier,
            cacheKey: nextRecord.cacheKey,
          },
          {
            traceId: payloadEnvelope.trace_id,
            progress: 100,
            artifacts: nextRecord.artifacts,
            metrics,
            warnings,
          },
        ),
      );
    } catch (error) {
      const failedAt = new Date().toISOString();
      await upsertFitSimulationRecord({
        ...row,
        status: "failed",
        cacheKey: row.cacheKey ?? buildFitSimulationCacheKey({
          avatarVariantId: row.avatarVariantId,
          bodyProfileRevision: payload.bodyProfileRevision ?? row.bodyProfileRevision ?? payload.bodyVersionId,
          garmentVariantId: row.garmentVariantId,
          garmentRevision: payload.garmentRevision ?? row.garmentRevision ?? row.garmentVariantId,
          materialPreset: row.materialPreset,
          qualityTier: row.qualityTier,
        }),
        fitMap: row.fitMap ?? null,
        fitMapSummary: row.fitMapSummary ?? null,
        artifactLineage: row.artifactLineage ?? null,
        errorMessage: error instanceof Error ? error.message : "HQ fit simulation failed.",
        updatedAt: failedAt,
        completedAt: failedAt,
      }).catch(() => undefined);
      throw error;
    }
  },
};

export const runFitSimulationWorker = () =>
  runWorkerLoop({
    workerName: process.env.WORKER_NAME || fitSimulationWorkerDefinition.workerName,
    jobTypes: fitSimulationWorkerDefinition.jobTypes,
    handler: fitSimulationWorkerDefinition.handler,
  });

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isDirectRun) {
  runFitSimulationWorker().catch((error) => {
    logger.error("worker.fit_simulation.crash", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  });
}
