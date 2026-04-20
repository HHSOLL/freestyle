import { z } from "zod";
import {
  type AssetMetadata,
  fitSimulationQualityTierSchema,
  fitSimulateHQJobPayloadSchema,
  fitSimulateHQJobType,
  jobArtifactSchema,
  jobPayloadEnvelopeSchema,
  jobResultEnvelopeSchema,
} from "../../contracts/src/index.js";

export * from "../../contracts/src/index.js";

export const JOB_TYPES = {
  IMPORT_PRODUCT_URL: "import.product_url",
  IMPORT_CART_URL: "import.cart_url",
  IMPORT_UPLOAD_IMAGE: "import.upload_image",
  BACKGROUND_REMOVAL_PROCESS: "background_removal.process",
  ASSET_PROCESSOR_PROCESS: "asset_processor.process",
  EVALUATOR_OUTFIT: "evaluator.outfit",
  TRYON_GENERATE: "tryon.generate",
  FIT_SIMULATE_HQ: fitSimulateHQJobType,
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export const jobTypeSchema = z.enum([
  JOB_TYPES.IMPORT_PRODUCT_URL,
  JOB_TYPES.IMPORT_CART_URL,
  JOB_TYPES.IMPORT_UPLOAD_IMAGE,
  JOB_TYPES.BACKGROUND_REMOVAL_PROCESS,
  JOB_TYPES.ASSET_PROCESSOR_PROCESS,
  JOB_TYPES.EVALUATOR_OUTFIT,
  JOB_TYPES.TRYON_GENERATE,
  JOB_TYPES.FIT_SIMULATE_HQ,
]);

export const JOB_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const jobTypeList = [...jobTypeSchema.options] as JobType[];

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

export const evaluateOutfitInputSchema = z.object({
  request_payload: z.record(z.string(), z.unknown()),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
});

export const createTryonInputSchema = z.object({
  asset_id: z.uuid(),
  input_image_url: z.union([z.url(), z.string().startsWith("data:image/")]),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
});

export const createFitSimulationInputSchema = z.object({
  garment_id: z.string().trim().min(1).max(160),
  material_preset: z.string().trim().min(1).max(120).optional(),
  quality_tier: fitSimulationQualityTierSchema.optional(),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
});

export type ImportProductJobInput = z.infer<typeof importProductJobInputSchema>;
export type ImportProductBatchJobInput = z.infer<typeof importProductBatchJobInputSchema>;
export type ImportCartJobInput = z.infer<typeof importCartJobInputSchema>;
export type ImportUploadJobInput = z.infer<typeof importUploadJobInputSchema>;
export type EvaluateOutfitInput = z.infer<typeof evaluateOutfitInputSchema>;
export type CreateTryonInput = z.infer<typeof createTryonInputSchema>;
export type CreateFitSimulationInput = z.infer<typeof createFitSimulationInputSchema>;

const unknownRecordSchema = z.record(z.string(), z.unknown());

export const importProductJobPayloadSchema = z
  .object({
    product_id: z.uuid(),
    source_url: z.url(),
    category_hint: z.string().trim().min(1).max(64).optional(),
    item_name: z.string().trim().min(1).max(120).optional(),
    selected_image_url: z.url().optional(),
  })
  .strict();

export const importCartJobPayloadSchema = z
  .object({
    cart_url: z.url(),
    max_items: z.number().int().min(1).max(100).optional(),
  })
  .strict();

export const importUploadJobPayloadSchema = z
  .object({
    product_id: z.uuid(),
    image_url: z.url(),
    category_hint: z.string().trim().min(1).max(64).optional(),
    item_name: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export const backgroundRemovalJobPayloadSchema = z
  .object({
    asset_id: z.uuid(),
    image_url: z.url(),
    category_hint: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export const assetProcessorJobPayloadSchema = z
  .object({
    asset_id: z.uuid(),
    category_hint: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export const evaluatorJobPayloadSchema = z
  .object({
    evaluation_id: z.uuid(),
    request_payload: unknownRecordSchema,
  })
  .strict();

export const tryonJobPayloadSchema = z
  .object({
    tryon_id: z.uuid(),
    asset_id: z.uuid(),
    input_image_url: z.union([z.url(), z.string().startsWith("data:image/")]),
  })
  .strict();

export const fitSimulationJobPayloadSchema = fitSimulateHQJobPayloadSchema
  .extend({
    fit_simulation_id: z.uuid(),
  })
  .strict();

export type ImportProductJobPayload = z.infer<typeof importProductJobPayloadSchema>;
export type ImportCartJobPayload = z.infer<typeof importCartJobPayloadSchema>;
export type ImportUploadJobPayload = z.infer<typeof importUploadJobPayloadSchema>;
export type BackgroundRemovalJobPayload = z.infer<typeof backgroundRemovalJobPayloadSchema>;
export type AssetProcessorJobPayload = z.infer<typeof assetProcessorJobPayloadSchema>;
export type EvaluatorJobPayload = z.infer<typeof evaluatorJobPayloadSchema>;
export type TryonJobPayload = z.infer<typeof tryonJobPayloadSchema>;
export type FitSimulationJobPayload = z.infer<typeof fitSimulationJobPayloadSchema>;

export type CanonicalJobPayloadEnvelope<TData extends Record<string, unknown> = Record<string, unknown>> = {
  schema_version: "job-payload.v1";
  job_type: JobType;
  trace_id: string;
  idempotency_key?: string;
  data: TData;
};

export type CanonicalJobResultEnvelope<TData extends Record<string, unknown> = Record<string, unknown>> = {
  schema_version: "job-result.v1";
  job_type: JobType;
  trace_id: string;
  progress?: number;
  artifacts: Array<z.infer<typeof jobArtifactSchema>>;
  metrics: Record<string, unknown>;
  warnings: string[];
  data: TData;
};

const buildTypedJobPayloadEnvelopeSchema = <TData extends z.ZodTypeAny>(
  jobType: JobType,
  dataSchema: TData,
) =>
  jobPayloadEnvelopeSchema.extend({
    job_type: z.literal(jobType),
    data: dataSchema,
  });

const buildTypedJobResultEnvelopeSchema = (jobType: JobType) =>
  jobResultEnvelopeSchema.extend({
    job_type: z.literal(jobType),
  });

const asUnknownRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const coerceProgress = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.min(100, Math.max(0, value));
};

const coerceWarnings = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const coerceArtifacts = (value: unknown) => {
  if (!Array.isArray(value)) return [] as Array<z.infer<typeof jobArtifactSchema>>;
  return value
    .map((item) => jobArtifactSchema.safeParse(item))
    .flatMap((result) => (result.success ? [result.data] : []));
};

const coerceMetrics = (value: unknown) => asUnknownRecord(value) ?? {};

export const buildJobPayloadEnvelope = <TData extends Record<string, unknown>>(
  jobType: JobType,
  data: TData,
  options: {
    traceId: string;
    idempotencyKey?: string | null;
  },
): CanonicalJobPayloadEnvelope<TData> =>
  buildTypedJobPayloadEnvelopeSchema(jobType, unknownRecordSchema).parse({
    schema_version: "job-payload.v1",
    job_type: jobType,
    trace_id: options.traceId,
    idempotency_key: options.idempotencyKey ?? undefined,
    data,
  }) as CanonicalJobPayloadEnvelope<TData>;

export const normalizeQueuedJobPayload = <TData extends z.ZodTypeAny>(input: {
  jobType: JobType;
  payload: unknown;
  schema: TData;
  fallbackTraceId: string;
  idempotencyKey?: string | null;
}): CanonicalJobPayloadEnvelope<z.infer<TData> & Record<string, unknown>> => {
  const envelopeSchema = buildTypedJobPayloadEnvelopeSchema(input.jobType, input.schema);
  const canonical = envelopeSchema.safeParse(input.payload);
  if (canonical.success) {
    return canonical.data as CanonicalJobPayloadEnvelope<z.infer<TData> & Record<string, unknown>>;
  }

  const legacy = input.schema.safeParse(input.payload);
  if (!legacy.success) {
    throw new Error(legacy.error.issues[0]?.message ?? "Invalid job payload.");
  }

  return buildJobPayloadEnvelope(input.jobType, legacy.data as z.infer<TData> & Record<string, unknown>, {
    traceId: input.fallbackTraceId,
    idempotencyKey: input.idempotencyKey,
  }) as CanonicalJobPayloadEnvelope<z.infer<TData> & Record<string, unknown>>;
};

export const buildJobResultEnvelope = <TData extends Record<string, unknown>>(
  jobType: JobType,
  data: TData,
  options: {
    traceId: string;
    progress?: number;
    artifacts?: Array<z.infer<typeof jobArtifactSchema>>;
    metrics?: Record<string, unknown>;
    warnings?: string[];
  },
): CanonicalJobResultEnvelope<TData> =>
  buildTypedJobResultEnvelopeSchema(jobType).parse({
    schema_version: "job-result.v1",
    job_type: jobType,
    trace_id: options.traceId,
    progress: options.progress,
    artifacts: options.artifacts ?? [],
    metrics: options.metrics ?? {},
    warnings: options.warnings ?? [],
    data,
  }) as CanonicalJobResultEnvelope<TData>;

export const normalizeJobResultEnvelope = (input: {
  jobType: JobType;
  result: unknown;
  fallbackTraceId: string;
}): CanonicalJobResultEnvelope | null => {
  if (input.result == null) {
    return null;
  }

  const envelopeSchema = buildTypedJobResultEnvelopeSchema(input.jobType);
  const canonical = envelopeSchema.safeParse(input.result);
  if (canonical.success) {
    return canonical.data as CanonicalJobResultEnvelope;
  }

  const legacy = asUnknownRecord(input.result);
  if (!legacy) {
    return null;
  }

  return buildJobResultEnvelope(input.jobType, legacy, {
    traceId: input.fallbackTraceId,
    progress: coerceProgress(legacy.progress),
    artifacts: coerceArtifacts(legacy.artifacts),
    metrics: coerceMetrics(legacy.metrics),
    warnings: coerceWarnings(legacy.warnings),
  });
};

export const readJobPayloadEnvelope = (payload: unknown) => {
  const parsed = jobPayloadEnvelopeSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
};

export const readJobResultEnvelope = (result: unknown) => {
  const parsed = jobResultEnvelopeSchema.safeParse(result);
  return parsed.success ? parsed.data : null;
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
