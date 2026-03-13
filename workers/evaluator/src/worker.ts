import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateOutfitWithGemini } from "@freestyle/ai";
import { getOutfitEvaluationById, updateOutfitEvaluation } from "@freestyle/db";
import { logger } from "@freestyle/observability";
import { runWorkerLoop, type WorkerDefinition } from "@freestyle/queue";
import { JOB_TYPES, type EvaluatorJobPayload } from "@freestyle/shared";

export const evaluatorWorkerDefinition: WorkerDefinition = {
  workerName: "worker_evaluator",
  jobTypes: [JOB_TYPES.EVALUATOR_OUTFIT],
  handler: async ({ job }) => {
    const payload = job.payload as EvaluatorJobPayload;
    if (!payload.evaluation_id) {
      const error = new Error("Invalid evaluator payload.");
      error.name = "EVALUATOR_INVALID_PAYLOAD";
      throw error;
    }

    const row = await getOutfitEvaluationById(payload.evaluation_id);
    if (!row) {
      throw new Error(`Evaluation ${payload.evaluation_id} not found.`);
    }

    await updateOutfitEvaluation(payload.evaluation_id, {
      status: "processing",
    });

    const evaluated = await evaluateOutfitWithGemini(payload.request_payload || {});
    const updated = await updateOutfitEvaluation(payload.evaluation_id, {
      compatibility_score: evaluated.compatibilityScore,
      explanation: evaluated.explanation,
      model_provider: evaluated.provider,
      model_name: evaluated.model,
      status: "succeeded",
    });

    return {
      evaluation_id: updated.id,
      compatibility_score: updated.compatibility_score,
      model_provider: updated.model_provider,
      model_name: updated.model_name,
    };
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
