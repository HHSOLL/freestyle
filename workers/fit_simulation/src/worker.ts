import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import sharp from "sharp";
import { logger } from "@freestyle/observability";
import { runWorkerLoop, type WorkerDefinition } from "@freestyle/queue";
import { getStorageAdapter } from "@freestyle/storage";
import {
  buildJobResultEnvelope,
  fitMapArtifactSchemaVersion,
  fitMapArtifactDataSchema,
  fitSimulateHQResultEnvelopeSchema,
  JOB_TYPES,
  normalizeQueuedJobPayload,
  fitSimulationJobPayloadSchema,
  type FitSimulationJobPayload,
  type FitSimulationArtifact,
  type FitSimulationQualityTier,
  type FitMapArtifactData,
  type FitMapOverlay,
  type FitMapRegionScore,
  type GarmentFitAssessment,
  type GarmentInstantFitReport,
  type JobRecord,
} from "@freestyle/shared";
import { assessGarmentInstantFit, assessGarmentPhysicalFit } from "@freestyle/domain-garment";
import { getFitSimulationById } from "../../../apps/api/src/modules/fit-simulations/fit-simulations.service.js";
import { upsertFitSimulationRecord } from "../../../apps/api/src/modules/fit-simulations/fit-simulations.repository.js";

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

const persistFitSimulationArtifact = async (
  fitSimulationId: string,
  kind: FitSimulationArtifact["kind"],
  fileName: string,
  contentType: string,
  buffer: Buffer,
  metadata?: FitSimulationArtifact["metadata"],
): Promise<FitSimulationArtifact> => {
  const key = path.posix.join("fit-simulations", fitSimulationId, fileName);

  if (hasRemoteStorageConfig()) {
    const uploaded = await getStorageAdapter().uploadBuffer(key, buffer, contentType);
    return {
      kind,
      url: uploaded.url,
      key: uploaded.key,
      label: fileName,
      metadata,
    };
  }

  const artifactStorePath = getFitSimulationArtifactStorePath();
  const absolutePath = path.join(artifactStorePath, fitSimulationId, fileName);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return {
    kind,
    url: pathToFileURL(absolutePath).toString(),
    key,
    label: fileName,
    metadata,
  };
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

export const buildFitSimulationPreviewSvg = (
  fitSimulationId: string,
  fitMap: FitMapArtifactData,
) => {
  const collisionOverlay = fitMap.overlays.find((entry) => entry.kind === "collisionRiskMap") ?? fitMap.overlays[0];
  const confidenceOverlay = fitMap.overlays.find((entry) => entry.kind === "confidenceMap") ?? fitMap.overlays[0];
  const topRegions = [...collisionOverlay.regions].sort((left, right) => right.score - left.score).slice(0, 4);
  const confidencePercent = Math.round((fitMap.instantFit?.confidence ?? confidenceOverlay.overallScore) * 100);
  const primaryRegion = fitMap.instantFit?.primaryRegionId ?? topRegions[0]?.regionId ?? "chest";

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
      <text x="716" y="340" fill="#d3dbe5" font-size="20" font-family="Arial, sans-serif">primary region: ${svgLabel(primaryRegion)}</text>

      <text x="70" y="404" fill="#9aa7b6" font-size="20" font-family="Arial, sans-serif">region pressure summary</text>
      ${regionRows}

      <text x="70" y="612" fill="#9aa7b6" font-size="18" font-family="Arial, sans-serif">Phase D baseline now persists typed fit-map overlays and a preview image. Full draped mesh output remains pending.</text>
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

      const warnings = [
        "Baseline Phase D worker emits fit_map_json plus preview_png; draped_glb remains pending.",
      ];
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
          garmentVariantId: row.garmentVariantId,
          avatarVariantId: row.avatarVariantId,
          avatarManifestUrl: row.avatarManifestUrl,
          garmentManifestUrl: row.garmentManifestUrl,
          materialPreset: row.materialPreset,
          qualityTier: row.qualityTier,
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
          primaryRegionId: instantFit.primaryRegionId,
        },
      );

      const completedAt = new Date().toISOString();
      const nextRecord = await upsertFitSimulationRecord({
        ...row,
        status: "succeeded",
        fitAssessment,
        instantFit,
        artifacts: [fitMapArtifact, previewArtifact],
        metrics,
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
            garmentVariantId: nextRecord.garmentVariantId,
            qualityTier: nextRecord.qualityTier,
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
