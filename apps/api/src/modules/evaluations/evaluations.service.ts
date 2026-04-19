import {
  createJob,
  createOutfitEvaluation,
  deleteOutfitEvaluationById,
  getJobByIdempotencyKeyForUser,
  getOutfitEvaluationForUser,
} from "@freestyle/db";
import {
  evaluatorJobPayloadSchema,
  JOB_TYPES,
  normalizeQueuedJobPayload,
  type EvaluateOutfitInput,
  type JobRecord,
} from "@freestyle/shared";

export const getEvaluationIdFromJob = (job: Pick<JobRecord, "id" | "job_type" | "payload" | "idempotency_key">) =>
  normalizeQueuedJobPayload({
    jobType: JOB_TYPES.EVALUATOR_OUTFIT,
    payload: job.payload,
    schema: evaluatorJobPayloadSchema,
    fallbackTraceId: job.id,
    idempotencyKey: job.idempotency_key,
  }).data.evaluation_id;

export const createEvaluationJob = async (userId: string, input: EvaluateOutfitInput) => {
  if (input.idempotency_key) {
    const existingJob = await getJobByIdempotencyKeyForUser({
      userId,
      jobType: JOB_TYPES.EVALUATOR_OUTFIT,
      idempotencyKey: input.idempotency_key,
    });

    if (existingJob) {
      const existingEvaluation = await getOutfitEvaluationForUser(getEvaluationIdFromJob(existingJob), userId);
      if (existingEvaluation) {
        return { evaluation: existingEvaluation, job: existingJob };
      }
    }
  }

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

  const boundEvaluationId = getEvaluationIdFromJob(job);
  if (boundEvaluationId !== evaluation.id) {
    await deleteOutfitEvaluationById(evaluation.id).catch(() => undefined);
    const existingEvaluation = await getOutfitEvaluationForUser(boundEvaluationId, userId);
    if (existingEvaluation) {
      return { evaluation: existingEvaluation, job };
    }
    throw new Error("Idempotent evaluation binding is missing.");
  }

  return { evaluation, job };
};

export const getEvaluationForUser = async (userId: string, evaluationId: string) => {
  return getOutfitEvaluationForUser(evaluationId, userId);
};
