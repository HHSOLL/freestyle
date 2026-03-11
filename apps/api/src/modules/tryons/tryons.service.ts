import { createJob, createTryon, getAssetById, getTryonForUser } from "@freestyle/db";
import { JOB_TYPES, type CreateTryonInput } from "@freestyle/shared";

export class TryonAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TryonAccessError";
  }
}

export const createTryonJob = async (userId: string, input: CreateTryonInput) => {
  const asset = await getAssetById(input.asset_id);
  if (!asset || asset.user_id !== userId) {
    throw new TryonAccessError("Asset not found or not owned by the authenticated user.");
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

  return { tryon, job };
};

export const getTryonForOwner = async (userId: string, tryonId: string) => {
  return getTryonForUser(tryonId, userId);
};
