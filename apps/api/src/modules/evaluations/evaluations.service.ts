import {
  createJob,
  createOutfitEvaluation,
  getOutfitEvaluationForUser,
} from "@freestyle/db";
import { JOB_TYPES, type EvaluateOutfitInput } from "@freestyle/shared";

export const createEvaluationJob = async (userId: string, input: EvaluateOutfitInput) => {
  const evaluation = await createOutfitEvaluation({
    userId,
    requestPayload: input.request_payload,
  });

  const job = await createJob({
    userId,
    jobType: JOB_TYPES.EVALUATOR_OUTFIT,
    payload: {
      evaluation_id: evaluation.id,
      request_payload: input.request_payload,
    },
    idempotencyKey: input.idempotency_key,
  });

  return { evaluation, job };
};

export const getEvaluationForUser = async (userId: string, evaluationId: string) => {
  return getOutfitEvaluationForUser(evaluationId, userId);
};
