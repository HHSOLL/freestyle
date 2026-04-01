import { z } from "zod";
export * from "../../contracts/src/index.js";

export const JOB_TYPES = {
  IMPORT_PRODUCT_URL: "import.product_url",
  IMPORT_CART_URL: "import.cart_url",
  IMPORT_UPLOAD_IMAGE: "import.upload_image",
  BACKGROUND_REMOVAL_PROCESS: "background_removal.process",
  ASSET_PROCESSOR_PROCESS: "asset_processor.process",
  EVALUATOR_OUTFIT: "evaluator.outfit",
  TRYON_GENERATE: "tryon.generate",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export const JOB_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const jobTypeList = Object.values(JOB_TYPES) as JobType[];

export const importProductJobInputSchema = z.object({
  product_url: z.url(),
  category_hint: z.string().trim().min(1).max(64).optional(),
  item_name: z.string().trim().min(1).max(120).optional(),
  selected_image_url: z.url().optional(),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
});

export const importProductBatchJobInputSchema = z.object({
  product_urls: z.array(z.url()).min(1).max(100),
  category_hint: z.string().trim().min(1).max(64).optional(),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
});

export const importCartJobInputSchema = z.object({
  cart_url: z.url(),
  max_items: z.number().int().min(1).max(100).optional(),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
});

export const importUploadJobInputSchema = z.object({
  category_hint: z.string().trim().min(1).max(64).optional(),
  item_name: z.string().trim().min(1).max(120).optional(),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
});

const measurementValueSchema = z.number().min(0).max(400);

export const garmentMeasurementsSchema = z
  .object({
    chestCm: measurementValueSchema.optional(),
    waistCm: measurementValueSchema.optional(),
    hipCm: measurementValueSchema.optional(),
    shoulderCm: measurementValueSchema.optional(),
    sleeveLengthCm: measurementValueSchema.optional(),
    lengthCm: measurementValueSchema.optional(),
    inseamCm: measurementValueSchema.optional(),
    riseCm: measurementValueSchema.optional(),
    hemCm: measurementValueSchema.optional(),
  })
  .strict();

export const garmentFitProfileSchema = z
  .object({
    silhouette: z.enum(["tailored", "regular", "relaxed", "oversized"]).optional(),
    layer: z.enum(["base", "mid", "outer"]).optional(),
    structure: z.enum(["soft", "balanced", "structured"]).optional(),
    stretch: z.number().min(0).max(1).optional(),
    drape: z.number().min(0).max(1).optional(),
  })
  .strict();

export const garmentProfileSchema = z
  .object({
    version: z.literal(1),
    category: z.string().trim().min(1).max(64),
    image: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict(),
    bbox: z
      .object({
        left: z.number().int().nonnegative(),
        top: z.number().int().nonnegative(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict(),
    normalizedBounds: z
      .object({
        left: z.number().min(0).max(1),
        top: z.number().min(0).max(1),
        width: z.number().min(0).max(1),
        height: z.number().min(0).max(1),
        centerX: z.number().min(0).max(1),
      })
      .strict(),
    silhouetteSamples: z.array(
      z
        .object({
          yRatio: z.number().min(0).max(1),
          widthRatio: z.number().min(0).max(1),
          centerRatio: z.number().min(0).max(1),
        })
        .strict()
    ),
    coverage: z
      .object({
        topRatio: z.number().min(0).max(1),
        bottomRatio: z.number().min(0).max(1),
        lengthRatio: z.number().min(0).max(1),
      })
      .strict(),
    widthProfile: z
      .object({
        shoulderRatio: z.number().min(0).max(1),
        chestRatio: z.number().min(0).max(1),
        waistRatio: z.number().min(0).max(1),
        hipRatio: z.number().min(0).max(1),
        hemRatio: z.number().min(0).max(1),
      })
      .strict(),
  })
  .strict();

export const assetMetadataSchema = z
  .object({
    sourceTitle: z.string().trim().min(1).max(256).optional(),
    sourceBrand: z.string().trim().min(1).max(128).optional(),
    sourceUrl: z.url().optional(),
    originalSize: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict()
      .optional(),
    cutout: z
      .object({
        removedBackground: z.boolean().optional(),
        strategy: z.enum(["remote_remove_bg", "embedded_alpha", "local_heuristic"]).optional(),
        fallbackUsed: z.boolean().optional(),
        quality: z.record(z.string(), z.unknown()).optional(),
        trimRect: z
          .object({
            left: z.number().int().nonnegative(),
            top: z.number().int().nonnegative(),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
            padding: z.number().int().nonnegative(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    measurements: garmentMeasurementsSchema.optional(),
    fitProfile: garmentFitProfileSchema.optional(),
    garmentProfile: garmentProfileSchema.optional(),
    dominantColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  })
  .strict();

export const assetUpdateInputSchema = z
  .object({
    category: z.string().trim().min(1).max(64).optional(),
    metadata: assetMetadataSchema.optional(),
  })
  .strict();

export const evaluateOutfitInputSchema = z.object({
  request_payload: z.record(z.string(), z.unknown()),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
});

export const createTryonInputSchema = z.object({
  asset_id: z.uuid(),
  input_image_url: z.union([z.url(), z.string().startsWith("data:image/")]),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
});

export type ImportProductJobInput = z.infer<typeof importProductJobInputSchema>;
export type ImportProductBatchJobInput = z.infer<typeof importProductBatchJobInputSchema>;
export type ImportCartJobInput = z.infer<typeof importCartJobInputSchema>;
export type ImportUploadJobInput = z.infer<typeof importUploadJobInputSchema>;
export type GarmentMeasurements = z.infer<typeof garmentMeasurementsSchema>;
export type GarmentFitProfile = z.infer<typeof garmentFitProfileSchema>;
export type GarmentProfile = z.infer<typeof garmentProfileSchema>;
export type AssetMetadata = z.infer<typeof assetMetadataSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateInputSchema>;
export type EvaluateOutfitInput = z.infer<typeof evaluateOutfitInputSchema>;
export type CreateTryonInput = z.infer<typeof createTryonInputSchema>;

export type ImportProductJobPayload = {
  product_id: string;
  source_url: string;
  category_hint?: string;
  item_name?: string;
  selected_image_url?: string;
};

export type ImportCartJobPayload = {
  cart_url: string;
  max_items?: number;
};

export type ImportUploadJobPayload = {
  product_id: string;
  image_url: string;
  category_hint?: string;
  item_name?: string;
};

export type BackgroundRemovalJobPayload = {
  asset_id: string;
  image_url: string;
  category_hint?: string;
};

export type AssetProcessorJobPayload = {
  asset_id: string;
  category_hint?: string;
};

export type EvaluatorJobPayload = {
  evaluation_id: string;
  request_payload: Record<string, unknown>;
};

export type TryonJobPayload = {
  tryon_id: string;
  asset_id: string;
  input_image_url: string;
};

export type JobRecord = {
  id: string;
  user_id: string;
  job_type: JobType;
  status: JobStatus;
  priority: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  attempt: number;
  max_attempts: number;
  run_after: string;
  locked_by: string | null;
  locked_at: string | null;
  heartbeat_at: string | null;
  parent_job_id: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type ProductRecord = {
  id: string;
  user_id: string;
  source_type: "product_url" | "cart_url" | "upload_image";
  source_url: string;
  merchant: string | null;
  merchant_product_id: string | null;
  title: string | null;
  brand: string | null;
  status: "queued" | "imported" | "failed";
  created_at: string;
  updated_at: string;
};

export type ProductImageRecord = {
  id: string;
  product_id: string;
  source_url: string;
  normalized_url: string;
  candidate_rank: number | null;
  score: number | null;
  is_selected: boolean;
  width: number | null;
  height: number | null;
  sha256: string | null;
  storage_key: string | null;
  created_at: string;
};

export type AssetRecord = {
  id: string;
  user_id: string;
  product_id: string | null;
  name: string | null;
  brand: string | null;
  source_url: string | null;
  original_image_url: string;
  cutout_image_url: string | null;
  mask_url: string | null;
  thumbnail_small_url: string | null;
  thumbnail_medium_url: string | null;
  category: string | null;
  embedding_model: string | null;
  perceptual_hash: string | null;
  metadata: AssetMetadata | null;
  status: "pending" | "ready" | "failed";
  created_at: string;
  updated_at: string;
};

export type OutfitEvaluationRecord = {
  id: string;
  user_id: string;
  request_payload: Record<string, unknown>;
  compatibility_score: number | null;
  explanation: Record<string, unknown> | null;
  model_provider: string | null;
  model_name: string | null;
  status: "queued" | "processing" | "succeeded" | "failed";
  created_at: string;
  updated_at: string;
};

export type TryonRecord = {
  id: string;
  user_id: string;
  asset_id: string;
  input_image_url: string;
  output_image_url: string | null;
  status: "queued" | "processing" | "succeeded" | "failed";
  provider: string | null;
  provider_job_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};
