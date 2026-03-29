import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AssetRecord,
  JobRecord,
  JobType,
  OutfitEvaluationRecord,
  ProductImageRecord,
  ProductRecord,
  TryonRecord,
} from "@freestyle/shared";

const required = (key: string) => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required.`);
  }
  return value;
};

let adminClient: SupabaseClient | null = null;

export const assertAdminClientConfig = () => {
  required("SUPABASE_URL");
  required("SUPABASE_SERVICE_ROLE_KEY");
};

export const getAdminClient = () => {
  if (adminClient) return adminClient;
  assertAdminClientConfig();
  adminClient = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  return adminClient;
};

const parseRows = <T>(input: unknown): T[] => {
  if (!Array.isArray(input)) return [];
  return input as T[];
};

const isMissingRpcError = (message: string) =>
  message.includes("Could not find the function public.claim_jobs") ||
  message.includes("Could not find the function public.heartbeat_jobs") ||
  message.includes("Could not find the function public.requeue_stale_jobs");

type StaleJobRow = Pick<
  JobRecord,
  "id" | "attempt" | "max_attempts" | "run_after" | "error_code" | "error_message" | "completed_at"
>;

const claimJobsWithoutRpc = async (supabase: SupabaseClient, workerName: string, jobTypes: JobType[], batchSize: number) => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "queued")
    .in("job_type", jobTypes)
    .lte("run_after", now)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(Math.max(batchSize, batchSize * 3));

  if (error) {
    throw new Error(error.message);
  }

  const claimed: JobRecord[] = [];
  for (const candidate of parseRows<JobRecord>(data)) {
    if (claimed.length >= batchSize) break;

    const timestamp = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("jobs")
      .update({
        status: "processing",
        locked_by: workerName,
        locked_at: timestamp,
        heartbeat_at: timestamp,
        attempt: Number(candidate.attempt ?? 0) + 1,
        updated_at: timestamp,
      })
      .eq("id", candidate.id)
      .eq("status", "queued")
      .is("locked_by", null)
      .select("*")
      .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (updated) {
      claimed.push(updated as JobRecord);
    }
  }

  return claimed;
};

const heartbeatJobsWithoutRpc = async (supabase: SupabaseClient, workerName: string, jobIds: string[]) => {
  const { error } = await supabase
    .from("jobs")
    .update({
      heartbeat_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("id", jobIds)
    .eq("locked_by", workerName)
    .eq("status", "processing");

  if (error) {
    throw new Error(error.message);
  }
};

const requeueStaleJobsWithoutRpc = async (supabase: SupabaseClient, minutes: number, limit: number) => {
  const staleBefore = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, attempt, max_attempts, run_after, error_code, error_message, completed_at")
    .eq("status", "processing")
    .lt("heartbeat_at", staleBefore)
    .order("heartbeat_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  let count = 0;
  for (const stale of parseRows<StaleJobRow>(data)) {
    const attempt = Number(stale.attempt ?? 0);
    const maxAttempts = Number(stale.max_attempts ?? 5);
    const isTerminal = attempt >= maxAttempts;
    const patch: Record<string, unknown> = {
      status: isTerminal ? "failed" : "queued",
      locked_by: null,
      locked_at: null,
      heartbeat_at: null,
      updated_at: new Date().toISOString(),
      error_code: isTerminal ? stale.error_code ?? "STALE_TIMEOUT" : stale.error_code ?? null,
      error_message: isTerminal
        ? stale.error_message ?? "Job became stale and exceeded max attempts."
        : stale.error_message ?? null,
      completed_at: isTerminal ? new Date().toISOString() : stale.completed_at ?? null,
    };

    if (!isTerminal) {
      const backoffSeconds = Math.min(300, Math.max(3, Math.round(Math.pow(2, attempt))));
      patch.run_after = new Date(Date.now() + backoffSeconds * 1000).toISOString();
    }

    const { error: updateError } = await supabase
      .from("jobs")
      .update(patch)
      .eq("id", stale.id)
      .eq("status", "processing");

    if (updateError) {
      throw new Error(updateError.message);
    }

    count += 1;
  }

  return count;
};

export const createJob = async (input: {
  userId: string;
  jobType: JobType;
  payload: Record<string, unknown>;
  priority?: number;
  maxAttempts?: number;
  runAfter?: string;
  parentJobId?: string;
  idempotencyKey?: string;
}) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      user_id: input.userId,
      job_type: input.jobType,
      status: "queued",
      payload: input.payload,
      priority: input.priority ?? 100,
      max_attempts: input.maxAttempts ?? 5,
      run_after: input.runAfter ?? new Date().toISOString(),
      parent_job_id: input.parentJobId ?? null,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505" && input.idempotencyKey) {
      const { data: existing, error: existingError } = await supabase
        .from("jobs")
        .select("*")
        .eq("job_type", input.jobType)
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();
      if (existingError) {
        throw new Error(existingError.message);
      }
      if (existing) {
        return existing as JobRecord;
      }
    }
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Failed to create job.");
  }
  return data as JobRecord;
};

export const getJobByIdForUser = async (jobId: string, userId: string) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as JobRecord;
};

export const getProductBySourceForUser = async (input: {
  userId: string;
  sourceType: ProductRecord["source_type"];
  sourceUrl: string;
}) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", input.userId)
    .eq("source_type", input.sourceType)
    .eq("source_url", input.sourceUrl)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = parseRows<ProductRecord>(data);
  return rows[0] ?? null;
};

export const claimJobs = async (workerName: string, jobTypes: JobType[], batchSize: number) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("claim_jobs", {
    p_worker_name: workerName,
    p_job_types: jobTypes,
    p_batch_size: batchSize,
  });

  if (error) {
    if (isMissingRpcError(error.message)) {
      return claimJobsWithoutRpc(supabase, workerName, jobTypes, batchSize);
    }
    throw new Error(error.message);
  }

  return parseRows<JobRecord>(data);
};

export const heartbeatJobs = async (workerName: string, jobIds: string[]) => {
  if (jobIds.length === 0) return;
  const supabase = getAdminClient();
  const { error } = await supabase.rpc("heartbeat_jobs", {
    p_worker_name: workerName,
    p_job_ids: jobIds,
  });
  if (error) {
    if (isMissingRpcError(error.message)) {
      await heartbeatJobsWithoutRpc(supabase, workerName, jobIds);
      return;
    }
    throw new Error(error.message);
  }
};

export const completeJob = async (jobId: string, workerName: string, result: Record<string, unknown>) => {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "succeeded",
      result,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      locked_by: null,
      locked_at: null,
      heartbeat_at: null,
      error_code: null,
      error_message: null,
    })
    .eq("id", jobId)
    .eq("locked_by", workerName)
    .eq("status", "processing");

  if (error) throw new Error(error.message);
};

export const failJob = async (
  jobId: string,
  workerName: string,
  input: {
    code: string;
    message: string;
    result?: Record<string, unknown> | null;
    forceTerminal?: boolean;
  }
) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("attempt, max_attempts")
    .eq("id", jobId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Missing job.");
  }

  const attempt = Number(data.attempt ?? 0);
  const maxAttempts = Number(data.max_attempts ?? 5);
  const isTerminal = input.forceTerminal === true || attempt >= maxAttempts;

  const patch: Record<string, unknown> = {
    status: isTerminal ? "failed" : "queued",
    error_code: input.code,
    error_message: input.message,
    result: input.result ?? null,
    updated_at: new Date().toISOString(),
    locked_by: null,
    locked_at: null,
    heartbeat_at: null,
  };

  if (isTerminal) {
    patch.completed_at = new Date().toISOString();
  } else {
    const backoffSeconds = Math.min(300, Math.max(3, Math.round(Math.pow(2, attempt) + Math.random() * 3)));
    patch.run_after = new Date(Date.now() + backoffSeconds * 1000).toISOString();
  }

  const { error: updateError } = await supabase
    .from("jobs")
    .update(patch)
    .eq("id", jobId)
    .eq("locked_by", workerName)
    .eq("status", "processing");

  if (updateError) throw new Error(updateError.message);
};

export const requeueStaleJobs = async (minutes = 5, limit = 100) => {
  const supabase = getAdminClient();
  const staleBefore = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data, error } = await supabase.rpc("requeue_stale_jobs", {
    p_stale_before: staleBefore,
    p_limit: limit,
  });
  if (error) {
    if (isMissingRpcError(error.message)) {
      return requeueStaleJobsWithoutRpc(supabase, minutes, limit);
    }
    throw new Error(error.message);
  }
  return Number(data ?? 0);
};

export const createProduct = async (input: {
  userId: string;
  sourceType: "product_url" | "cart_url" | "upload_image";
  sourceUrl: string;
  merchant?: string;
  merchantProductId?: string;
  title?: string;
  brand?: string;
}) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      user_id: input.userId,
      source_type: input.sourceType,
      source_url: input.sourceUrl,
      merchant: input.merchant ?? null,
      merchant_product_id: input.merchantProductId ?? null,
      title: input.title ?? null,
      brand: input.brand ?? null,
      status: "queued",
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to create product.");
  return data as ProductRecord;
};

export const updateProductStatus = async (productId: string, status: ProductRecord["status"]) => {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", productId);
  if (error) throw new Error(error.message);
};

export const insertProductImages = async (images: Array<{
  productId: string;
  sourceUrl: string;
  normalizedUrl: string;
  candidateRank: number;
  score: number;
  isSelected: boolean;
  width?: number;
  height?: number;
  sha256?: string;
  storageKey?: string;
}>) => {
  if (images.length === 0) return [] as ProductImageRecord[];
  const supabase = getAdminClient();
  const rows = images.map((item) => ({
    product_id: item.productId,
    source_url: item.sourceUrl,
    normalized_url: item.normalizedUrl,
    candidate_rank: item.candidateRank,
    score: item.score,
    is_selected: item.isSelected,
    width: item.width ?? null,
    height: item.height ?? null,
    sha256: item.sha256 ?? null,
    storage_key: item.storageKey ?? null,
  }));
  const { data, error } = await supabase.from("product_images").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return parseRows<ProductImageRecord>(data);
};

export const createAsset = async (input: {
  userId: string;
  productId?: string;
  originalImageUrl: string;
  category?: string;
}) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("assets")
    .insert({
      user_id: input.userId,
      product_id: input.productId ?? null,
      original_image_url: input.originalImageUrl,
      category: input.category ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to create asset.");
  return data as AssetRecord;
};

export const updateAsset = async (assetId: string, patch: Record<string, unknown>) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("assets")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", assetId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to update asset.");
  return data as AssetRecord;
};

export const listAssetsForUser = async (input: {
  userId: string;
  status?: "pending" | "ready" | "failed";
  category?: string;
  page: number;
  pageSize: number;
}) => {
  const supabase = getAdminClient();
  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;

  let query = supabase
    .from("assets")
    .select("*", { count: "exact" })
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (input.status) query = query.eq("status", input.status);
  if (input.category) query = query.eq("category", input.category);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return {
    items: parseRows<AssetRecord>(data),
    total: count ?? 0,
    page: input.page,
    pageSize: input.pageSize,
  };
};

export const getAssetById = async (assetId: string) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from("assets").select("*").eq("id", assetId).single();
  if (error || !data) return null;
  return data as AssetRecord;
};

export const getAssetByIdForUser = async (assetId: string, userId: string) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data as AssetRecord;
};

export const deleteAssetByIdForUser = async (assetId: string, userId: string) => {
  const supabase = getAdminClient();
  const { error } = await supabase.from("assets").delete().eq("id", assetId).eq("user_id", userId);
  if (error) throw new Error(error.message);
};

export const createOutfitEvaluation = async (input: {
  userId: string;
  requestPayload: Record<string, unknown>;
}) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("outfit_evaluations")
    .insert({
      user_id: input.userId,
      request_payload: input.requestPayload,
      status: "queued",
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to create evaluation.");
  return data as OutfitEvaluationRecord;
};

export const updateOutfitEvaluation = async (evaluationId: string, patch: Record<string, unknown>) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("outfit_evaluations")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", evaluationId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to update evaluation.");
  return data as OutfitEvaluationRecord;
};

export const getOutfitEvaluationForUser = async (evaluationId: string, userId: string) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("outfit_evaluations")
    .select("*")
    .eq("id", evaluationId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as OutfitEvaluationRecord;
};

export const getOutfitEvaluationById = async (evaluationId: string) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("outfit_evaluations")
    .select("*")
    .eq("id", evaluationId)
    .single();
  if (error || !data) return null;
  return data as OutfitEvaluationRecord;
};

export const createTryon = async (input: {
  userId: string;
  assetId: string;
  inputImageUrl: string;
}) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("tryons")
    .insert({
      user_id: input.userId,
      asset_id: input.assetId,
      input_image_url: input.inputImageUrl,
      status: "queued",
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to create tryon.");
  return data as TryonRecord;
};

export const updateTryon = async (tryonId: string, patch: Record<string, unknown>) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("tryons")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", tryonId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to update tryon.");
  return data as TryonRecord;
};

export const getTryonForUser = async (tryonId: string, userId: string) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("tryons")
    .select("*")
    .eq("id", tryonId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as TryonRecord;
};

export const getTryonById = async (tryonId: string) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from("tryons").select("*").eq("id", tryonId).single();
  if (error || !data) return null;
  return data as TryonRecord;
};

export type OutfitListItem = {
  id: string;
  share_slug: string;
  title: string;
  preview_image: string;
  created_at: string;
};

export type OutfitRow = OutfitListItem & {
  user_id: string;
  description: string | null;
  data: Record<string, unknown> | null;
  is_public: boolean;
  updated_at: string;
};

export const createOutfit = async (input: {
  userId: string;
  shareSlug: string;
  title: string;
  description?: string | null;
  previewImage: string;
  data: Record<string, unknown>;
  isPublic?: boolean;
}) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("outfits")
    .insert({
      user_id: input.userId,
      share_slug: input.shareSlug,
      title: input.title,
      description: input.description ?? null,
      preview_image: input.previewImage,
      data: input.data,
      is_public: input.isPublic ?? true,
    })
    .select("id, share_slug")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create outfit.");
  }

  return data as Pick<OutfitRow, "id" | "share_slug">;
};

export const listOutfits = async () => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("outfits")
    .select("id, share_slug, title, preview_image, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  if (error || !data) return [] as OutfitListItem[];
  return parseRows<OutfitListItem>(data);
};

export const listOutfitsForUser = async (userId: string) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("outfits")
    .select("id, share_slug, title, preview_image, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [] as OutfitListItem[];
  return parseRows<OutfitListItem>(data);
};

export const deleteOutfitById = async (id: string) => {
  const supabase = getAdminClient();
  const { error } = await supabase.from("outfits").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const getOutfitByIdForUser = async (id: string, userId: string) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("outfits")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as OutfitRow;
};

export const deleteOutfitByIdForUser = async (id: string, userId: string) => {
  const supabase = getAdminClient();
  const { error } = await supabase.from("outfits").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
};

export const getOutfitBySlug = async (slug: string) => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("outfits")
    .select("*")
    .eq("share_slug", slug)
    .eq("is_public", true)
    .single();
  if (error || !data) return null;
  return data as OutfitRow;
};
