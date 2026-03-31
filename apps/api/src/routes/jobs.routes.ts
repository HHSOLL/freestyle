import { randomUUID } from "node:crypto";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { getStorageAdapter } from "@freestyle/storage";
import {
  importCartJobInputSchema,
  importProductBatchJobInputSchema,
  importProductJobInputSchema,
  importUploadJobInputSchema,
} from "@freestyle/shared";
import { requireAuth } from "../modules/auth/auth.js";
import {
  createCartImportJob,
  createProductImportJobs,
  createProductImportJob,
  createUploadImportJob,
  getUserJob,
} from "../modules/jobs/jobs.service.js";

const extFromMime = (mime: string | undefined, fallbackName: string | undefined) => {
  if (mime?.includes("png")) return ".png";
  if (mime?.includes("webp")) return ".webp";
  if (mime?.includes("gif")) return ".gif";
  if (mime?.includes("jpeg") || mime?.includes("jpg")) return ".jpg";
  if (fallbackName) {
    const ext = path.extname(fallbackName).trim();
    if (ext) return ext.toLowerCase();
  }
  return ".jpg";
};

export const registerJobRoutes = (app: FastifyInstance) => {
  app.post("/jobs/import/product", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const parsed = importProductJobInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload.",
      });
    }

    const { product, job } = await createProductImportJob(userId, parsed.data);
    return reply.code(201).send({ job_id: job.id, product_id: product.id });
  });

  app.post("/jobs/import/products/batch", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const parsed = importProductBatchJobInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload.",
      });
    }

    const { items, failed } = await createProductImportJobs(userId, parsed.data);
    const statusCode = items.length === 0 ? 500 : failed.length > 0 ? 207 : 201;

    return reply.code(statusCode).send({
      requested_count: parsed.data.product_urls.length,
      queued_count: items.length,
      failed_count: failed.length,
      items,
      failed,
    });
  });

  app.post("/jobs/import/cart", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const parsed = importCartJobInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload.",
      });
    }

    const { job } = await createCartImportJob(userId, parsed.data);
    return reply.code(201).send({ job_id: job.id });
  });

  app.post("/jobs/import/upload", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const file = await request.file();
    if (!file) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Multipart image file is required.",
      });
    }

    const fields = (file.fields ?? {}) as Record<string, { value?: unknown }>;
    const parsedBody = importUploadJobInputSchema.safeParse({
      category_hint:
        typeof fields.category_hint?.value === "string"
          ? fields.category_hint.value
          : typeof fields.category?.value === "string"
            ? fields.category.value
            : undefined,
      item_name:
        typeof fields.item_name?.value === "string"
          ? fields.item_name.value
          : typeof fields.name?.value === "string"
            ? fields.name.value
            : undefined,
      idempotency_key:
        typeof fields.idempotency_key?.value === "string" ? fields.idempotency_key.value : undefined,
    });

    if (!parsedBody.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: parsedBody.error.issues[0]?.message ?? "Invalid payload.",
      });
    }

    const buffer = await file.toBuffer();
    const extension = extFromMime(file.mimetype, file.filename);
    const key = `imports/${userId}/${randomUUID()}${extension}`;
    const storage = getStorageAdapter();
    const uploaded = await storage.uploadBuffer(key, buffer, file.mimetype || "application/octet-stream");

    const { product, job } = await createUploadImportJob({
      userId,
      imageUrl: uploaded.url,
      categoryHint: parsedBody.data.category_hint,
      itemName: parsedBody.data.item_name,
      idempotencyKey: parsedBody.data.idempotency_key,
    });

    return reply.code(201).send({
      job_id: job.id,
      product_id: product.id,
      uploaded_image_url: uploaded.url,
    });
  });

  app.get("/jobs/:job_id", async (request, reply) => {
    const userId = await requireAuth(request, reply);
    if (!userId) return;

    const params = request.params as { job_id?: string };
    const jobId = params.job_id?.trim();
    if (!jobId) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "job_id is required.",
      });
    }

    const job = await getUserJob(userId, jobId);
    if (!job) {
      return reply.code(404).send({
        error: "NOT_FOUND",
        message: "Job not found.",
      });
    }

    return reply.send(job);
  });
};
