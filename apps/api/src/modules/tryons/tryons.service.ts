import {
  createJob,
  createTryon,
  deleteTryonById,
  getAssetById,
  getJobByIdempotencyKeyForUser,
  getTryonForUser,
} from "@freestyle/db";
import {
  JOB_TYPES,
  normalizeQueuedJobPayload,
  tryonJobPayloadSchema,
  type CreateTryonInput,
  type JobRecord,
} from "@freestyle/shared";

export class TryonAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TryonAccessError";
  }
}

export const getTryonIdFromJob = (job: Pick<JobRecord, "id" | "job_type" | "payload" | "idempotency_key">) =>
  normalizeQueuedJobPayload({
    jobType: JOB_TYPES.TRYON_GENERATE,
    payload: job.payload,
    schema: tryonJobPayloadSchema,
    fallbackTraceId: job.id,
    idempotencyKey: job.idempotency_key,
  }).data.tryon_id;

export const createTryonJob = async (userId: string, input: CreateTryonInput) => {
  const asset = await getAssetById(input.asset_id);
  if (!asset || asset.user_id !== userId) {
    throw new TryonAccessError("Asset not found or not owned by the authenticated user.");
  }

  if (input.idempotency_key) {
    const existingJob = await getJobByIdempotencyKeyForUser({
      userId,
      jobType: JOB_TYPES.TRYON_GENERATE,
      idempotencyKey: input.idempotency_key,
    });

    if (existingJob) {
      const existingTryon = await getTryonForUser(getTryonIdFromJob(existingJob), userId);
      if (existingTryon) {
        return { tryon: existingTryon, job: existingJob };
      }
    }
  }

  const tryon = await createTryon({
    userId,
    assetId: input.asset_id,
    inputImageUrl: input.input_image_url,
  });

  const job = await createJob({
    userId,
    jobType: JOB_TYPES.TRYON_GENERATE,
    payload: {
      tryon_id: tryon.id,
      asset_id: input.asset_id,
      input_image_url: input.input_image_url,
    },
    idempotencyKey: input.idempotency_key,
  });

  const boundTryonId = getTryonIdFromJob(job);
  if (boundTryonId !== tryon.id) {
    await deleteTryonById(tryon.id).catch(() => undefined);
    const existingTryon = await getTryonForUser(boundTryonId, userId);
    if (existingTryon) {
      return { tryon: existingTryon, job };
    }
    throw new Error("Idempotent try-on binding is missing.");
  }

  return { tryon, job };
};

export const getTryonForOwner = async (userId: string, tryonId: string) => {
  return getTryonForUser(tryonId, userId);
};
