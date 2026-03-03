import { saveAsset } from "@/lib/assetStore";
import { serverConfig } from "@/lib/serverConfig";
import {
  postProcessCutout,
  removeBackground,
  resolveProductImageCandidates,
  type CutoutQuality,
  type CutoutQualityReason,
  type ResolvedImageCandidate,
} from "@/lib/assetProcessing";

export type AssetImportFailureCode =
  | "NO_IMAGE_FOUND"
  | "ONLY_MODEL_IMAGES_FOUND"
  | "CUTOUT_NOT_AVAILABLE"
  | "CUTOUT_QUALITY_TOO_LOW"
  | "FETCH_BLOCKED_OR_LOGIN_REQUIRED"
  | "UNKNOWN_IMPORT_ERROR";

export type ImportAttemptLog = {
  candidateUrl: string;
  source: string;
  finalScore: number;
  stage: "selection" | "remove-bg" | "trim";
  code: AssetImportFailureCode;
  reason: string;
  warnings?: string[];
  quality?: CutoutQuality;
};

export type ImportImageCandidate = {
  id: string;
  url: string;
  source: string;
  finalScore: number;
  width: number;
  height: number;
  isModelLike: boolean;
  facesOverMinArea: number;
  detector?: string;
};

export class AssetImportError extends Error {
  code: AssetImportFailureCode;
  status: number;
  attempts?: ImportAttemptLog[];
  candidates?: ImportImageCandidate[];

  constructor(
    code: AssetImportFailureCode,
    message: string,
    status = 422,
    attempts?: ImportAttemptLog[],
    candidates?: ImportImageCandidate[]
  ) {
    super(message);
    this.name = "AssetImportError";
    this.code = code;
    this.status = status;
    this.attempts = attempts;
    this.candidates = candidates;
  }
}

export type ImportAssetAndSaveOptions = {
  url: string;
  category: string;
  source?: "import" | "upload";
  name?: string;
  sourceUrl?: string;
  maxCandidates?: number;
  maxRemovebgAttempts?: number;
  selectedImageUrl?: string;
};

export type ImportedAssetResult = {
  asset: {
    id: string;
    name: string;
    category: string;
    source: string;
    imageSrc: string;
    removedBackground: boolean;
    sourceUrl?: string;
    selectedImageUrl?: string;
    warnings?: string[];
    processing?: Record<string, unknown>;
  };
  selectedImageUrl: string;
  warnings: string[];
  attempts: ImportAttemptLog[];
};

const toImageDataUrl = (buffer: Buffer, mime: string) => `data:${mime};base64,${buffer.toString("base64")}`;

const mapQualityReasonToCode = (reason: CutoutQualityReason): AssetImportFailureCode => {
  if (reason === "BBOX_TOO_LARGE" || reason === "FOREGROUND_TOO_LARGE") {
    return "ONLY_MODEL_IMAGES_FOUND";
  }
  return "CUTOUT_QUALITY_TOO_LOW";
};

const isLikelyAccessError = (message: string) => {
  const lower = message.toLowerCase();
  return (
    lower.includes("403") ||
    lower.includes("401") ||
    lower.includes("forbidden") ||
    lower.includes("unauthorized") ||
    lower.includes("login") ||
    lower.includes("blocked")
  );
};

const decideFinalFailureCode = (attempts: ImportAttemptLog[], fallbackMessage: string): AssetImportFailureCode => {
  if (attempts.length === 0) {
    return isLikelyAccessError(fallbackMessage)
      ? "FETCH_BLOCKED_OR_LOGIN_REQUIRED"
      : "NO_IMAGE_FOUND";
  }

  if (attempts.every((attempt) => attempt.code === "ONLY_MODEL_IMAGES_FOUND")) {
    return "ONLY_MODEL_IMAGES_FOUND";
  }
  if (attempts.some((attempt) => attempt.code === "CUTOUT_NOT_AVAILABLE")) {
    return "CUTOUT_NOT_AVAILABLE";
  }
  if (attempts.some((attempt) => attempt.code === "CUTOUT_QUALITY_TOO_LOW")) {
    return "CUTOUT_QUALITY_TOO_LOW";
  }
  return "UNKNOWN_IMPORT_ERROR";
};

const buildAssetName = (explicitName: string | undefined, title: string | null, fallbackIndex?: number) => {
  const normalized = explicitName?.trim();
  if (normalized) return normalized;
  const normalizedTitle = title?.trim();
  if (normalizedTitle) return normalizedTitle;
  if (typeof fallbackIndex === "number") return `Imported item ${fallbackIndex + 1}`;
  return "Imported item";
};

const uniqueByCandidateUrl = (candidates: ResolvedImageCandidate[]) => {
  const seen = new Set<string>();
  const unique: ResolvedImageCandidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    unique.push(candidate);
  }
  return unique;
};

const isModelLikeCandidate = (candidate: ResolvedImageCandidate) =>
  (candidate.human?.facesOverMinArea ?? 0) > 0;

const isTrustedNoFaceCandidate = (candidate: ResolvedImageCandidate) =>
  candidate.human?.detector === "blazeface" && (candidate.human.facesOverMinArea ?? 0) === 0;

const isMusinsaProductUrl = (input: string) => {
  try {
    const parsed = new URL(input);
    return (
      (parsed.hostname === "musinsa.com" || parsed.hostname.endsWith(".musinsa.com")) &&
      /^\/products\/\d+/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
};

const isMusinsaModelLikeImageUrl = (inputUrl: string) => {
  const lower = inputUrl.toLowerCase();
  return (
    lower.includes("/images/style/") ||
    lower.includes("/images/snap/") ||
    lower.includes("/images/codimap/") ||
    lower.includes("/images/coordi/") ||
    lower.includes("lookbook") ||
    lower.includes("staff")
  );
};

const isDecorativeAssetUrl = (inputUrl: string) => {
  const lower = inputUrl.toLowerCase();
  return (
    lower.includes("logo") ||
    lower.includes("favicon") ||
    lower.includes("/images/brand/") ||
    lower.includes("/mfile_") ||
    lower.includes("/campaign_service/") ||
    lower.includes("/goodsdetail/banner/") ||
    lower.includes("/static/assets/")
  );
};

const isLikelyMusinsaStandaloneCandidate = (candidate: ResolvedImageCandidate) => {
  const lower = candidate.url.toLowerCase();
  if (isDecorativeAssetUrl(lower)) return false;
  if (isMusinsaModelLikeImageUrl(lower)) return false;
  if (candidate.source === "musinsa_goods_state" || candidate.source === "musinsa_structured") return true;
  if (
    lower.includes("msscdn") &&
    lower.includes("/images/") &&
    !lower.includes("/images/style/") &&
    !lower.includes("/images/snap/") &&
    !lower.includes("/images/codimap/") &&
    !lower.includes("/images/coordi/")
  ) {
    return true;
  }
  return (
    lower.includes("/images/goods/") ||
    lower.includes("/images/goods_img/") ||
    lower.includes("/images/prd_img/") ||
    lower.includes("/goods_img/") ||
    lower.includes("detail_") ||
    lower.includes("product_img") ||
    lower.includes("/product/") ||
    lower.includes("/products/")
  );
};

const prioritizeMusinsaStandaloneCandidates = (candidates: ResolvedImageCandidate[]) => {
  if (candidates.length <= 1) return candidates;

  const preferred = candidates.filter((candidate) => isLikelyMusinsaStandaloneCandidate(candidate));
  if (preferred.length === 0) return candidates;

  const preferredUrls = new Set(preferred.map((candidate) => candidate.url));
  const others = candidates.filter((candidate) => !preferredUrls.has(candidate.url));
  return [...preferred, ...others];
};

const buildProcessingMeta = (
  candidate: ResolvedImageCandidate,
  quality: CutoutQuality,
  trimMeta: {
    rect: {
      left: number;
      top: number;
      width: number;
      height: number;
      padding: number;
    };
    originalSize: {
      width: number;
      height: number;
    };
  }
) => {
  return {
    method: "removebg+alpha-trim",
    selectedImageUrl: candidate.url,
    candidateSource: candidate.source,
    candidateFinalScore: candidate.finalScore,
    candidateResolution: {
      width: candidate.width,
      height: candidate.height,
    },
    human: candidate.human,
    scoring: candidate.scoreBreakdown,
    quality,
    trim: trimMeta,
  };
};

const buildImportCandidatePreviews = (
  candidates: ResolvedImageCandidate[],
  maxCount = 12,
  isMusinsaImport = false
): ImportImageCandidate[] => {
  const uniqueCandidates = uniqueByCandidateUrl(candidates).filter(
    (candidate) =>
      candidate.url.trim().length > 0 &&
      !isDecorativeAssetUrl(candidate.url) &&
      candidate.width >= 220 &&
      candidate.height >= 220
  );

  const musinsaRepresentativeCandidates = uniqueCandidates.filter(
    (candidate) =>
      (candidate.source === "musinsa_goods_state" || candidate.source === "musinsa_structured") &&
      isLikelyMusinsaStandaloneCandidate(candidate)
  );
  const productLikeCandidates = uniqueCandidates.filter((candidate) =>
    isLikelyMusinsaStandaloneCandidate(candidate)
  );
  const fallbackCandidates = uniqueByCandidateUrl(candidates).filter(
    (candidate) => candidate.url.trim().length > 0
  );
  const previewPool = isMusinsaImport
    ? musinsaRepresentativeCandidates.length > 0
      ? musinsaRepresentativeCandidates
      : productLikeCandidates.length > 0
        ? productLikeCandidates
        : uniqueCandidates.length > 0
          ? uniqueCandidates
          : fallbackCandidates
    : productLikeCandidates.length > 0
      ? productLikeCandidates
      : uniqueCandidates.length > 0
        ? uniqueCandidates
        : fallbackCandidates;
  const previewLimit = Math.max(maxCount, previewPool.length);

  return previewPool
    .slice(0, previewLimit)
    .map((candidate) => ({
      id: `${candidate.discoveryIndex}:${candidate.source}:${candidate.url}`,
      url: candidate.url,
      source: candidate.source,
      finalScore: candidate.finalScore,
      width: candidate.width,
      height: candidate.height,
      isModelLike: isModelLikeCandidate(candidate),
      facesOverMinArea: candidate.human?.facesOverMinArea ?? 0,
      detector: candidate.human?.detector,
    }));
};

export const importAssetFromUrlAndSave = async (
  options: ImportAssetAndSaveOptions
): Promise<ImportedAssetResult> => {
  const source = options.source ?? "import";
  const selectedImageUrl = options.selectedImageUrl?.trim() || undefined;
  const maxCandidates = Math.max(1, Math.floor(options.maxCandidates ?? 8));
  const maxRemovebgAttempts = Math.max(1, Math.floor(options.maxRemovebgAttempts ?? 3));
  const attempts: ImportAttemptLog[] = [];
  const mergedWarnings = new Set<string>();

  let resolvedCandidates: Awaited<ReturnType<typeof resolveProductImageCandidates>>;
  try {
    const likelyMusinsaInput = isMusinsaProductUrl(options.url);
    resolvedCandidates = await resolveProductImageCandidates(options.url, {
      maxCandidatesCollected: likelyMusinsaInput ? 320 : 200,
      maxCandidatesScored: likelyMusinsaInput ? 160 : 40,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve image candidates.";
    const code = isLikelyAccessError(message)
      ? "FETCH_BLOCKED_OR_LOGIN_REQUIRED"
      : "NO_IMAGE_FOUND";
    throw new AssetImportError(code, message, 422);
  }

  const candidates = resolvedCandidates.candidates.slice(0, maxCandidates);
  for (const warning of resolvedCandidates.warnings) {
    mergedWarnings.add(warning);
  }

  if (candidates.length === 0) {
    throw new AssetImportError("NO_IMAGE_FOUND", "No image candidates were found for this URL.", 422);
  }

  const strictNoModel = serverConfig.strictNoModelImport;
  const isMusinsaImport =
    isMusinsaProductUrl(options.url) || isMusinsaProductUrl(resolvedCandidates.pageUrl);
  const candidatePoolBase = isMusinsaImport
    ? resolvedCandidates.candidates.slice(0, Math.max(maxCandidates, 120))
    : resolvedCandidates.candidates.slice(0, Math.max(maxCandidates, 40));
  const candidatePool = isMusinsaImport
    ? prioritizeMusinsaStandaloneCandidates(candidatePoolBase)
    : candidatePoolBase;
  const importCandidatePreviews = buildImportCandidatePreviews(
    candidatePool,
    isMusinsaImport ? 24 : 24,
    isMusinsaImport
  );
  const selectedCandidate = selectedImageUrl
    ? candidatePool.find((candidate) => candidate.url === selectedImageUrl)
    : undefined;
  const hasSelectedCandidate = Boolean(selectedCandidate);
  if (selectedImageUrl && !selectedCandidate) {
    throw new AssetImportError(
      "NO_IMAGE_FOUND",
      "The selected image candidate is no longer available.",
      422,
      undefined,
      importCandidatePreviews
    );
  }
  const enforceTrustedNoFace = strictNoModel && serverConfig.humanDetectionMode === "face";
  const noFaceCandidates = enforceTrustedNoFace
    ? candidatePool.filter((candidate) => isTrustedNoFaceCandidate(candidate))
    : candidatePool.filter((candidate) => !isModelLikeCandidate(candidate));
  const modelCandidates = candidatePool.filter((candidate) => isModelLikeCandidate(candidate));
  const prioritizedNoFaceCandidates = isMusinsaImport
    ? prioritizeMusinsaStandaloneCandidates(noFaceCandidates)
    : noFaceCandidates;

  if (strictNoModel && prioritizedNoFaceCandidates.length === 0 && !hasSelectedCandidate) {
    const selectionAttempts = candidates.slice(0, 3).map((candidate) => ({
      candidateUrl: candidate.url,
      source: candidate.source,
      finalScore: candidate.finalScore,
      stage: "selection" as const,
      code: "ONLY_MODEL_IMAGES_FOUND" as const,
      reason:
        modelCandidates.length > 0
          ? "Candidate includes a detectable human face and strict mode blocks import."
          : "No trusted no-face candidate is available under strict mode.",
    }));
    throw new AssetImportError(
      "ONLY_MODEL_IMAGES_FOUND",
      "Only model-like images were detected; strict mode blocked import.",
      422,
      selectionAttempts,
      importCandidatePreviews
    );
  }

  const attemptLimit = isMusinsaImport ? Math.max(maxRemovebgAttempts, 8) : maxRemovebgAttempts;
  const attemptWindow: ResolvedImageCandidate[] = [];
  const pushUniqueCandidate = (candidate: ResolvedImageCandidate | undefined) => {
    if (!candidate) return;
    if (attemptWindow.some((entry) => entry.url === candidate.url)) return;
    attemptWindow.push(candidate);
  };

  if (selectedCandidate) {
    pushUniqueCandidate(selectedCandidate);
  }

  const prioritizedWindow = prioritizedNoFaceCandidates.slice(
    0,
    Math.min(prioritizedNoFaceCandidates.length, attemptLimit)
  );
  for (const candidate of prioritizedWindow) {
    pushUniqueCandidate(candidate);
  }

  if (isMusinsaImport && attemptWindow.length < attemptLimit) {
    const standaloneFallbacks = prioritizeMusinsaStandaloneCandidates(resolvedCandidates.candidates)
      .filter((candidate) => isLikelyMusinsaStandaloneCandidate(candidate))
      .filter((candidate) => !attemptWindow.some((entry) => entry.url === candidate.url))
      .slice(0, attemptLimit - attemptWindow.length);
    for (const candidate of standaloneFallbacks) {
      pushUniqueCandidate(candidate);
    }
  }
  if (!strictNoModel && modelCandidates.length > 0) {
    const fallbackModelCandidate = modelCandidates[0];
    pushUniqueCandidate(fallbackModelCandidate);
  }

  for (let index = 0; index < attemptWindow.length; index += 1) {
    const candidate = attemptWindow[index];
    const isUserSelectedCandidate = Boolean(selectedImageUrl && candidate.url === selectedImageUrl);

    const removed = await removeBackground(candidate.buffer, candidate.mime, { crop: true });
    if (!removed.removedBackground) {
      const warnings = removed.warnings ?? [];
      for (const warning of warnings) {
        mergedWarnings.add(warning);
      }
      const code = warnings.some((warning) => warning === "MISSING_API_KEY")
        ? "CUTOUT_NOT_AVAILABLE"
        : "CUTOUT_QUALITY_TOO_LOW";
      attempts.push({
        candidateUrl: candidate.url,
        source: candidate.source,
        finalScore: candidate.finalScore,
        stage: "remove-bg",
        code,
        reason:
          code === "CUTOUT_NOT_AVAILABLE"
            ? "Background removal API is not configured."
            : "Background removal failed for this candidate.",
        warnings,
      });
      continue;
    }

    const processed = await postProcessCutout(removed.buffer, {
      alphaThreshold: 12,
      minAlphaAreaRatio: 0.02,
      maxAlphaAreaRatio: 0.9,
      maxBboxAreaRatio: 0.96,
      minTrimSizePx: 64,
    });

    const allowManualQualityBypass =
      isUserSelectedCandidate && processed.quality.reason !== "FOREGROUND_TOO_SMALL";

    if (!processed.quality.pass && !allowManualQualityBypass) {
      attempts.push({
        candidateUrl: candidate.url,
        source: candidate.source,
        finalScore: candidate.finalScore,
        stage: "trim",
        code: mapQualityReasonToCode(processed.quality.reason),
        reason: processed.quality.reason ?? "Cutout quality check failed.",
        warnings: removed.warnings,
        quality: processed.quality,
      });
      continue;
    }

    if (allowManualQualityBypass) {
      mergedWarnings.add(`MANUAL_SELECTION_QUALITY_BYPASS:${processed.quality.reason}`);
    }

    const imageDataUrl = toImageDataUrl(processed.buffer, processed.mime);
    const warnings = removed.warnings ?? [];
    for (const warning of warnings) {
      mergedWarnings.add(warning);
    }
    const baseProcessingMeta = buildProcessingMeta(candidate, processed.quality, {
      rect: processed.trimRect,
      originalSize: processed.originalSize,
    });
    const processingMeta: Record<string, unknown> = allowManualQualityBypass
      ? {
          ...baseProcessingMeta,
          manualSelectionBypass: {
            reason: processed.quality.reason,
          },
        }
      : baseProcessingMeta;

    const record = await saveAsset({
      name: buildAssetName(options.name, resolvedCandidates.title, index),
      category: options.category,
      source,
      imageDataUrl,
      removedBackground: true,
      sourceUrl: options.sourceUrl ?? options.url,
      selectedImageUrl: candidate.url,
      processing: processingMeta,
      warnings: Array.from(mergedWarnings),
    });

    return {
      asset: {
        id: record.id,
        name: record.name,
        category: record.category,
        source: record.source,
        imageSrc: imageDataUrl,
        removedBackground: record.removed_background,
        sourceUrl: record.source_url ?? undefined,
        selectedImageUrl: record.selected_image_url ?? undefined,
        warnings: Array.from(mergedWarnings),
        processing: processingMeta,
      },
      selectedImageUrl: candidate.url,
      warnings: Array.from(mergedWarnings),
      attempts,
    };
  }

  const finalCode = decideFinalFailureCode(attempts, "Could not build a valid cutout from candidates.");
  const defaultMessageByCode: Record<AssetImportFailureCode, string> = {
    NO_IMAGE_FOUND: "No product image candidates were found.",
    ONLY_MODEL_IMAGES_FOUND: "Only model-like images were detected; no standalone product cutout passed quality checks.",
    CUTOUT_NOT_AVAILABLE: "Background removal is unavailable right now.",
    CUTOUT_QUALITY_TOO_LOW: "Cutout quality was too low for all candidates.",
    FETCH_BLOCKED_OR_LOGIN_REQUIRED: "The product page requires login or blocks automated fetch.",
    UNKNOWN_IMPORT_ERROR: "Could not import a valid product asset.",
  };

  throw new AssetImportError(
    finalCode,
    defaultMessageByCode[finalCode],
    422,
    attempts,
    importCandidatePreviews
  );
};
