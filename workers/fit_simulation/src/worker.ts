import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { logger } from "@freestyle/observability";
import { runWorkerLoop, type WorkerDefinition } from "@freestyle/queue";
import { getStorageAdapter } from "@freestyle/storage";
import {
  buildJobResultEnvelope,
  fitSimulateHQResultEnvelopeSchema,
  JOB_TYPES,
  normalizeQueuedJobPayload,
  fitSimulationJobPayloadSchema,
  type FitSimulationJobPayload,
  type FitSimulationArtifact,
  type FitSimulationQualityTier,
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

const fitMapSchemaVersion = "fit-map-json.v1";

const getFitSimulationArtifactStorePath = () =>
  process.env.FIT_SIMULATION_ARTIFACT_STORE_PATH?.trim() ||
  path.join(process.cwd(), ".data", "fit-simulation-artifacts");

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
): Promise<FitSimulationArtifact> => {
  const key = path.posix.join("fit-simulations", fitSimulationId, fileName);

  if (hasRemoteStorageConfig()) {
    const uploaded = await getStorageAdapter().uploadBuffer(key, buffer, contentType);
    return {
      kind,
      url: uploaded.url,
      key: uploaded.key,
      label: fileName,
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

      const warnings = [
        "Baseline Phase D worker emits fit_map_json only; draped_glb and preview_png artifacts remain pending.",
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

      const fitMapArtifactPayload = {
        schemaVersion: fitMapSchemaVersion,
        generatedAt: new Date().toISOString(),
        fitSimulationId: row.id,
        request: {
          bodyVersionId: row.bodyVersionId,
          garmentVariantId: row.garmentVariantId,
          avatarVariantId: row.avatarVariantId,
          avatarManifestUrl: row.avatarManifestUrl,
          garmentManifestUrl: row.garmentManifestUrl,
          materialPreset: row.materialPreset,
          qualityTier: row.qualityTier,
        },
        garment: {
          id: row.garmentSnapshot.id,
          name: row.garmentSnapshot.name,
          category: row.garmentSnapshot.category,
        },
        fitAssessment,
        instantFit,
        warnings,
      };

      const artifact = await persistFitSimulationArtifact(
        row.id,
        "fit_map_json",
        "fit-map.json",
        "application/json",
        Buffer.from(JSON.stringify(fitMapArtifactPayload, null, 2), "utf8"),
      );

      const completedAt = new Date().toISOString();
      const nextRecord = await upsertFitSimulationRecord({
        ...row,
        status: "succeeded",
        fitAssessment,
        instantFit,
        artifacts: [artifact],
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
