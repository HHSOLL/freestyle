import { z } from "zod";

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
  selected_image_url: z.url().optional(),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
});

export const importCartJobInputSchema = z.object({
  cart_url: z.url(),
  max_items: z.number().int().min(1).max(100).optional(),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
});

export const importUploadJobInputSchema = z.object({
  category_hint: z.string().trim().min(1).max(64).optional(),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
});

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
export type ImportCartJobInput = z.infer<typeof importCartJobInputSchema>;
export type ImportUploadJobInput = z.infer<typeof importUploadJobInputSchema>;
export type EvaluateOutfitInput = z.infer<typeof evaluateOutfitInputSchema>;
export type CreateTryonInput = z.infer<typeof createTryonInputSchema>;

export type ImportProductJobPayload = {
  product_id: string;
  source_url: string;
  category_hint?: string;
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
  original_image_url: string;
  cutout_image_url: string | null;
  mask_url: string | null;
  thumbnail_small_url: string | null;
  thumbnail_medium_url: string | null;
  category: string | null;
  embedding_model: string | null;
  perceptual_hash: string | null;
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
