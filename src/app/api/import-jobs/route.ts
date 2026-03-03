import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import {
  assertSafeRemoteUrl,
  buildAssetPath,
  createJobId,
  ensureAssetStorageDir,
  MAX_UPLOAD_BYTES,
  mimeToExtension,
} from "@/lib/assetProcessing";
import { getImportQueue, type ImportJobData } from "@/lib/importQueue";
import { BadRequestError, readJsonObject, readOptionalString } from "@/lib/http";

export const runtime = "nodejs";

const editableCategories = new Set([
  "tops",
  "bottoms",
  "outerwear",
  "shoes",
  "accessories",
  "custom",
]);

const normalizeCategory = (value: unknown) => {
  const asString = readOptionalString(value);
  if (!asString) return "custom";
  return editableCategories.has(asString) ? asString : "custom";
};

const parseMaxItems = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 12;
  const normalized = Math.floor(value);
  if (normalized < 1) return 1;
  if (normalized > 30) return 30;
  return normalized;
};

const parseTypeFromJsonBody = (body: Record<string, unknown>): ImportJobData["type"] => {
  const explicitType = readOptionalString(body.type);
  if (explicitType === "cart" || explicitType === "file" || explicitType === "url") {
    return explicitType;
  }

  if (typeof body.maxItems === "number") {
    return "cart";
  }

  return "url";
};

const queueImportJob = async (jobId: string, data: ImportJobData) => {
  const importQueue = getImportQueue();
  await importQueue.add("asset-import", data, {
    jobId,
    attempts: 1,
  });
};

const queueFileImport = async (request: Request) => {
  const formData = await request.formData();
  const type = readOptionalString(formData.get("type"));
  if (type && type !== "file") {
    throw new BadRequestError("Multipart requests only support type=file.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new BadRequestError("No file provided.");
  }
  if (!file.type.startsWith("image/")) {
    throw new BadRequestError("Only image files are supported.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new BadRequestError("File is too large.");
  }

  const jobId = createJobId();
  await ensureAssetStorageDir();

  const mime = file.type || "image/png";
  const extension = mimeToExtension(mime);
  const filePath = buildAssetPath(jobId, "import-input", extension);
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, inputBuffer);

  const category = normalizeCategory(formData.get("category"));
  const name = readOptionalString(formData.get("name"));
  const sourceUrl = readOptionalString(formData.get("sourceUrl"));

  try {
    await queueImportJob(jobId, {
      type: "file",
      filePath,
      mime,
      category,
      name,
      sourceUrl,
    });
  } catch (error) {
    await fs.unlink(filePath).catch(() => undefined);
    throw error;
  }

  return NextResponse.json({ jobId, status: "queued" });
};

const queueJsonImport = async (request: Request) => {
  const body = await readJsonObject(request);
  const type = parseTypeFromJsonBody(body);
  const jobId = createJobId();

  if (type === "file") {
    throw new BadRequestError("File import requires multipart/form-data.");
  }

  const url = readOptionalString(body.url);
  if (!url) {
    throw new BadRequestError("URL is required.");
  }

  assertSafeRemoteUrl(url);

  const category = normalizeCategory(body.category);

  if (type === "cart") {
    await queueImportJob(jobId, {
      type: "cart",
      url,
      category,
      maxItems: parseMaxItems(body.maxItems),
    });
    return NextResponse.json({ jobId, status: "queued" });
  }

  const name = readOptionalString(body.name);
  const selectedImageUrl = readOptionalString(body.selectedImageUrl);
  await queueImportJob(jobId, {
    type: "url",
    url,
    category,
    name,
    sourceUrl: url,
    selectedImageUrl,
  });

  return NextResponse.json({ jobId, status: "queued" });
};

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.toLowerCase().includes("multipart/form-data")) {
      return await queueFileImport(request);
    }
    return await queueJsonImport(request);
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to queue import job.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
