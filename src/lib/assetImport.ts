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

export class AssetImportError extends Error {
  code: AssetImportFailureCode;
  status: number;
  attempts?: ImportAttemptLog[];

  constructor(code: AssetImportFailureCode, message: string, status = 422, attempts?: ImportAttemptLog[]) {
    super(message);
    this.name = "AssetImportError";
    this.code = code;
    this.status = status;
    this.attempts = attempts;
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

const isModelLikeCandidate = (candidate: ResolvedImageCandidate) =>
  (candidate.human?.facesOverMinArea ?? 0) > 0;

const isTrustedNoFaceCandidate = (candidate: ResolvedImageCandidate) =>
  candidate.human?.detector === "blazeface" && (candidate.human.facesOverMinArea ?? 0) === 0;

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

export const importAssetFromUrlAndSave = async (
  options: ImportAssetAndSaveOptions
): Promise<ImportedAssetResult> => {
  const source = options.source ?? "import";
  const maxCandidates = Math.max(1, Math.floor(options.maxCandidates ?? 8));
  const maxRemovebgAttempts = Math.max(1, Math.floor(options.maxRemovebgAttempts ?? 3));
  const attempts: ImportAttemptLog[] = [];
  const mergedWarnings = new Set<string>();

  let resolvedCandidates: Awaited<ReturnType<typeof resolveProductImageCandidates>>;
  try {
    resolvedCandidates = await resolveProductImageCandidates(options.url, {
      maxCandidatesCollected: 200,
      maxCandidatesScored: 40,
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
  const enforceTrustedNoFace = strictNoModel && serverConfig.humanDetectionMode === "face";
  const noFaceCandidates = enforceTrustedNoFace
    ? candidates.filter((candidate) => isTrustedNoFaceCandidate(candidate))
    : candidates.filter((candidate) => !isModelLikeCandidate(candidate));
  const modelCandidates = candidates.filter((candidate) => isModelLikeCandidate(candidate));

  if (strictNoModel && noFaceCandidates.length === 0) {
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
      selectionAttempts
    );
  }

  const attemptWindow = noFaceCandidates.slice(0, Math.min(noFaceCandidates.length, maxRemovebgAttempts));
  if (!strictNoModel && modelCandidates.length > 0) {
    const fallbackModelCandidate = modelCandidates[0];
    if (
      fallbackModelCandidate &&
      !attemptWindow.some((candidate) => candidate.url === fallbackModelCandidate.url)
    ) {
      attemptWindow.push(fallbackModelCandidate);
    }
  }

  for (let index = 0; index < attemptWindow.length; index += 1) {
    const candidate = attemptWindow[index];

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

    if (!processed.quality.pass) {
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

    const imageDataUrl = toImageDataUrl(processed.buffer, processed.mime);
    const warnings = removed.warnings ?? [];
    for (const warning of warnings) {
      mergedWarnings.add(warning);
    }
    const processingMeta = buildProcessingMeta(candidate, processed.quality, {
      rect: processed.trimRect,
      originalSize: processed.originalSize,
    });

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

  throw new AssetImportError(finalCode, defaultMessageByCode[finalCode], 422, attempts);
};
