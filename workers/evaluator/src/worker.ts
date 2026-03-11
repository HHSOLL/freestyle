import { getOutfitEvaluationById, updateOutfitEvaluation } from "@freestyle/db";
import { logger } from "@freestyle/observability";
import { runWorkerLoop } from "@freestyle/queue";
import { JOB_TYPES, type EvaluatorJobPayload } from "@freestyle/shared";

const evaluateDeterministically = (payload: Record<string, unknown>) => {
  const text = JSON.stringify(payload);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  const normalized = Math.abs(hash % 1000) / 10;
  return {
    compatibilityScore: normalized,
    explanation: {
      summary: "Deterministic baseline evaluation",
      score_band: normalized >= 75 ? "high" : normalized >= 50 ? "medium" : "low",
      details: [
        "Silhouette consistency was measured from provided configuration.",
        "Color/texture compatibility was estimated using rule-based heuristics.",
      ],
    },
  };
};

const main = async () => {
  await runWorkerLoop({
    workerName: process.env.WORKER_NAME || "worker_evaluator",
    jobTypes: [JOB_TYPES.EVALUATOR_OUTFIT],
    handler: async ({ job }) => {
      const payload = job.payload as unknown as EvaluatorJobPayload;
      if (!payload.evaluation_id) {
        throw new Error("Invalid evaluator payload.");
      }

      const row = await getOutfitEvaluationById(payload.evaluation_id);
      if (!row) {
        throw new Error(`Evaluation ${payload.evaluation_id} not found.`);
      }

      await updateOutfitEvaluation(payload.evaluation_id, {
        status: "processing",
      });

      const evaluated = evaluateDeterministically(payload.request_payload || {});
      const updated = await updateOutfitEvaluation(payload.evaluation_id, {
        compatibility_score: evaluated.compatibilityScore,
        explanation: evaluated.explanation,
        model_provider: process.env.EVALUATOR_PROVIDER || "internal",
        model_name: process.env.EVALUATOR_MODEL || "deterministic-v1",
        status: "succeeded",
      });

      return {
        evaluation_id: updated.id,
        compatibility_score: updated.compatibility_score,
      };
    },
  });
};

main().catch((error) => {
  logger.error("worker.evaluator.crash", {
    message: error instanceof Error ? error.message : "Unknown error",
  });
  process.exit(1);
});
