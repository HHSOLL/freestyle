import { createHash } from "node:crypto";
import { createJob, getJobByIdForUser } from "@freestyle/db";
import {
  JOB_TYPES,
  jobStatusResponseSchema,
  normalizeJobResultEnvelope,
  readJobPayloadEnvelope,
  type ImportCartJobInput,
  type ImportProductBatchJobInput,
  type ImportProductJobInput,
  type JobRecord,
} from "@freestyle/shared";
import { createImportedProduct } from "../products/products.service.js";

export const createProductImportJob = async (userId: string, input: ImportProductJobInput) => {
  const product = await createImportedProduct({
    userId,
    sourceType: "product_url",
    sourceUrl: input.product_url,
  });

  const job = await createJob({
    userId,
    jobType: JOB_TYPES.IMPORT_PRODUCT_URL,
    payload: {
      product_id: product.id,
      source_url: input.product_url,
      category_hint: input.category_hint,
      item_name: input.item_name,
      selected_image_url: input.selected_image_url,
    },
    idempotencyKey: input.idempotency_key,
  });

  return { product, job };
};

const normalizeProductUrl = (value: string) => new URL(value).toString();

const buildItemIdempotencyKey = (batchIdempotencyKey: string | undefined, productUrl: string) => {
  if (!batchIdempotencyKey) return undefined;
  const normalizedUrl = normalizeProductUrl(productUrl);
  const digest = createHash("sha256").update(normalizedUrl).digest("hex");
  return `${batchIdempotencyKey}:${digest}`;
};

const normalizeIsoDateTime = (value: string | null) => {
  if (!value) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
};

const toJobImportFailure = (productUrl: string, error: unknown) => {
  if (error instanceof Error) {
    return {
      product_url: productUrl,
      error_code: error.name || "IMPORT_FAILED",
      message: error.message,
    };
  }

  return {
    product_url: productUrl,
    error_code: "IMPORT_FAILED",
    message: "Failed to import product.",
  };
};

export const createProductImportJobs = async (userId: string, input: ImportProductBatchJobInput) => {
  const items: Array<{
    product_url: string;
    product_id: string;
    job_id: string;
  }> = [];
  const failed: Array<{
    product_url: string;
    error_code: string;
    message: string;
  }> = [];

  for (const productUrl of input.product_urls) {
    const normalizedUrl = normalizeProductUrl(productUrl);

    try {
      const { product, job } = await createProductImportJob(userId, {
        product_url: normalizedUrl,
        category_hint: input.category_hint,
        idempotency_key: buildItemIdempotencyKey(input.idempotency_key, normalizedUrl),
      });

      items.push({
        product_url: normalizedUrl,
        product_id: product.id,
        job_id: job.id,
      });
    } catch (error) {
      failed.push(toJobImportFailure(normalizedUrl, error));
    }
  }

  return { items, failed };
};

export const createCartImportJob = async (userId: string, input: ImportCartJobInput) => {
  const job = await createJob({
    userId,
    jobType: JOB_TYPES.IMPORT_CART_URL,
    payload: {
      cart_url: input.cart_url,
      max_items: input.max_items,
    },
    idempotencyKey: input.idempotency_key,
  });

  return { job };
};

export const createUploadImportJob = async (input: {
  userId: string;
  imageUrl: string;
  categoryHint?: string;
  itemName?: string;
  idempotencyKey?: string;
}) => {
  const product = await createImportedProduct({
    userId: input.userId,
    sourceType: "upload_image",
    sourceUrl: input.imageUrl,
  });

  const job = await createJob({
    userId: input.userId,
    jobType: JOB_TYPES.IMPORT_UPLOAD_IMAGE,
    payload: {
      product_id: product.id,
      image_url: input.imageUrl,
      category_hint: input.categoryHint,
      item_name: input.itemName,
    },
    idempotencyKey: input.idempotencyKey,
  });

  return { product, job };
};

export const buildUserJobResponse = (job: JobRecord) => {
  const payloadTraceId = readJobPayloadEnvelope(job.payload)?.trace_id ?? job.id;
  const result = normalizeJobResultEnvelope({
    jobType: job.job_type,
    result: job.result,
    fallbackTraceId: payloadTraceId,
  });
  const traceId = result?.trace_id ?? payloadTraceId;

  return jobStatusResponseSchema.parse({
    id: job.id,
    job_type: job.job_type,
    status: job.status,
    trace_id: traceId,
    progress: result?.progress,
    result,
    error: job.error_code
      ? {
          code: job.error_code,
          message: job.error_message ?? "Unknown job error.",
        }
      : null,
    created_at: normalizeIsoDateTime(job.created_at),
    updated_at: normalizeIsoDateTime(job.updated_at),
    completed_at: normalizeIsoDateTime(job.completed_at),
  });
};

export const getUserJob = async (userId: string, jobId: string) => {
  const job = await getJobByIdForUser(jobId, userId);
  if (!job) return null;

  return buildUserJobResponse(job);
};
