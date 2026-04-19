import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateOutfitWithGemini } from "@freestyle/ai";
import { getOutfitEvaluationById, updateOutfitEvaluation } from "@freestyle/db";
import { logger } from "@freestyle/observability";
import { runWorkerLoop, type WorkerDefinition } from "@freestyle/queue";
import {
  evaluatorJobPayloadSchema,
  JOB_TYPES,
  normalizeQueuedJobPayload,
  type EvaluatorJobPayload,
  type JobRecord,
} from "@freestyle/shared";

const createTerminalEvaluatorError = (code: string, message: string) => {
  const error = new Error(message) as Error & { retryable?: boolean };
  error.name = code;
  error.retryable = false;
  return error;
};

export const parseEvaluatorJobPayload = (
  job: Pick<JobRecord, "id" | "job_type" | "payload" | "idempotency_key">,
) =>
  normalizeQueuedJobPayload({
    jobType: JOB_TYPES.EVALUATOR_OUTFIT,
    payload: job.payload,
    schema: evaluatorJobPayloadSchema,
    fallbackTraceId: job.id,
    idempotencyKey: job.idempotency_key,
  });

export const evaluatorWorkerDefinition: WorkerDefinition = {
  workerName: "worker_evaluator",
  jobTypes: [JOB_TYPES.EVALUATOR_OUTFIT],
  handler: async ({ job }) => {
    const payloadEnvelope = parseEvaluatorJobPayload(job);
    const payload: EvaluatorJobPayload = payloadEnvelope.data;
    if (!payload.evaluation_id) {
      throw createTerminalEvaluatorError("EVALUATOR_INVALID_PAYLOAD", "Invalid evaluator payload.");
    }

    const row = await getOutfitEvaluationById(payload.evaluation_id);
    if (!row) {
      throw createTerminalEvaluatorError("EVALUATION_NOT_FOUND", `Evaluation ${payload.evaluation_id} not found.`);
    }

    await updateOutfitEvaluation(payload.evaluation_id, {
      status: "processing",
    });

    try {
      const evaluated = await evaluateOutfitWithGemini(payload.request_payload || {});
      const updated = await updateOutfitEvaluation(payload.evaluation_id, {
        compatibility_score: evaluated.compatibilityScore,
        explanation: evaluated.explanation,
        model_provider: evaluated.provider,
        model_name: evaluated.model,
        status: "succeeded",
      });

      return {
        progress: 100,
        evaluation_id: updated.id,
        compatibility_score: updated.compatibility_score,
        explanation: updated.explanation,
        model_provider: updated.model_provider,
        model_name: updated.model_name,
        metrics: {
          provider: evaluated.provider,
          model: evaluated.model,
        },
      };
    } catch (error) {
      await updateOutfitEvaluation(payload.evaluation_id, {
        status: "failed",
      }).catch(() => undefined);
      throw error;
    }
  },
};

export const runEvaluatorWorker = () =>
  runWorkerLoop({
    workerName: process.env.WORKER_NAME || evaluatorWorkerDefinition.workerName,
    jobTypes: evaluatorWorkerDefinition.jobTypes,
    handler: evaluatorWorkerDefinition.handler,
  });

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isDirectRun) {
  runEvaluatorWorker().catch((error) => {
    logger.error("worker.evaluator.crash", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  });
}
