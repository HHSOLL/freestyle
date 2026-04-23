import { randomUUID } from "node:crypto";
import {
  createJob,
  getJobByIdempotencyKeyForUser,
} from "@freestyle/db";
import {
  assessGarmentInstantFit,
  assessGarmentPhysicalFit,
  resolveGarmentRuntimeModelPath,
} from "@freestyle/domain-garment";
import { resolveAvatarVariantFromProfile } from "@freestyle/domain-avatar";
import {
  buildFitSimulationCacheKey,
  buildPublishedGarmentRevision,
  JOB_TYPES,
  createFitSimulationInputSchema,
  fitSimulationJobPayloadSchema,
  normalizeQueuedJobPayload,
  type BodyProfileRecord,
  type CreateFitSimulationInput,
  type FitSimulationJobPayload,
  type JobRecord,
} from "@freestyle/shared";
import type {
  FitSimulationRecord as PublicFitSimulationRecord,
  PublishedGarmentAsset,
} from "@freestyle/contracts";
import { getPublishedRuntimeAvatarByVariantId } from "../avatars/runtime-avatars.service.js";
import { getBodyProfileRecordForUser } from "../profile/body-profile.repository.js";
import { getPublishedRuntimeGarmentById } from "../garments/runtime-garments.service.js";
import {
  deleteFitSimulationRecord,
  getFitSimulationRecordById,
  getFitSimulationRecordForUser,
  upsertFitSimulationRecord,
} from "./fit-simulations.repository.js";

const fitSimulationArtifactPriority = {
  draped_glb: 0,
  preview_png: 1,
  fit_map_json: 2,
  metrics_json: 3,
} as const satisfies Record<PublicFitSimulationRecord["artifacts"][number]["kind"], number>;

const sortFitSimulationArtifactsForPresentation = (
  artifacts: PublicFitSimulationRecord["artifacts"],
) =>
  [...artifacts].sort((left, right) => {
    const leftRank = fitSimulationArtifactPriority[left.kind] ?? Number.MAX_SAFE_INTEGER;
    const rightRank = fitSimulationArtifactPriority[right.kind] ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank || left.kind.localeCompare(right.kind);
  });

const publicAssetBaseUrl = () => process.env.PUBLIC_ASSET_BASE_URL?.trim() || "https://freestyle.local";

const resolvePublicAssetUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return new URL(normalizedPath, publicAssetBaseUrl()).toString();
};

const buildBodyVersionId = (userId: string, revision: BodyProfileRecord["revision"]) =>
  `body-profile:${userId}:${revision}`;

const inferFitSimulationMaterialPreset = (item: PublishedGarmentAsset) => {
  const stretchRatio =
    item.metadata?.physicalProfile?.materialStretchRatio ?? item.metadata?.fitProfile?.stretch ?? 0;
  const stretchProfile =
    stretchRatio >= 0.18 ? "high" : stretchRatio >= 0.08 ? "medium" : stretchRatio >= 0.02 ? "low" : "none";
  const fabricFamily =
    item.category === "shoes"
      ? "synthetic"
      : item.metadata?.fitProfile?.structure === "structured"
        ? "woven"
        : stretchRatio >= 0.08
          ? "knit"
          : "blended";
  return `${fabricFamily}_${stretchProfile}`;
};

const buildSimulationRequest = (
  userId: string,
  garment: PublishedGarmentAsset,
  avatar: {
    avatarVariantId: ReturnType<typeof resolveAvatarVariantFromProfile>;
    avatarManifestUrl: string;
  },
  input: CreateFitSimulationInput,
  bodyProfileRecord: NonNullable<Awaited<ReturnType<typeof getBodyProfileRecordForUser>>>,
) => {
  const bodyProfileRevision = bodyProfileRecord.revision;
  const bodyVersionId = buildBodyVersionId(userId, bodyProfileRevision);
  const garmentVariantId = garment.id;
  const garmentRevision = buildPublishedGarmentRevision(garment);
  const garmentManifestUrl = resolvePublicAssetUrl(
    resolveGarmentRuntimeModelPath(garment.runtime, avatar.avatarVariantId),
  );
  const materialPreset = input.material_preset ?? inferFitSimulationMaterialPreset(garment);
  const qualityTier = input.quality_tier ?? "balanced";
  const cacheKey = buildFitSimulationCacheKey({
    avatarVariantId: avatar.avatarVariantId,
    bodyProfileRevision,
    garmentVariantId,
    garmentRevision,
    materialPreset,
    qualityTier,
  });

  return {
    avatarVariantId: avatar.avatarVariantId,
    bodyProfileRevision,
    bodyVersionId,
    garmentVariantId,
    garmentRevision,
    avatarManifestUrl: avatar.avatarManifestUrl,
    garmentManifestUrl,
    materialPreset,
    qualityTier,
    cacheKey,
  } as const;
};

export class FitSimulationCreateError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = "FitSimulationCreateError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const resolvePublishedAvatarSimulationInput = (profile: BodyProfileRecord["profile"]) => {
  const avatarVariantId = resolveAvatarVariantFromProfile(profile);
  const avatar = getPublishedRuntimeAvatarByVariantId(avatarVariantId);
  if (!avatar || avatar.publication.approvalState !== "PUBLISHED") {
    throw new FitSimulationCreateError(
      "AVATAR_NOT_PUBLISHED",
      "Published runtime avatar not found for HQ fit simulation.",
      409,
    );
  }

  return {
    avatarVariantId,
    avatarManifestUrl: resolvePublicAssetUrl(avatar.modelPath),
  } as const;
};

export const getFitSimulationIdFromJob = (
  job: Pick<JobRecord, "id" | "job_type" | "payload" | "idempotency_key">,
) =>
  normalizeQueuedJobPayload({
    jobType: JOB_TYPES.FIT_SIMULATE_HQ,
    payload: job.payload,
    schema: fitSimulationJobPayloadSchema,
    fallbackTraceId: job.id,
    idempotencyKey: job.idempotency_key,
  }).data.fit_simulation_id;

const buildCreateInput = async (userId: string, input: CreateFitSimulationInput) => {
  const bodyProfileRecord = await getBodyProfileRecordForUser(userId);
  if (!bodyProfileRecord) {
    throw new FitSimulationCreateError(
      "BODY_PROFILE_REQUIRED",
      "Body profile is required before starting an HQ fit simulation.",
      409,
    );
  }

  const garment = await getPublishedRuntimeGarmentById(input.garment_id);
  if (!garment) {
    throw new FitSimulationCreateError(
      "GARMENT_NOT_FOUND",
      "Published garment not found for HQ fit simulation.",
      404,
    );
  }

  const avatar = resolvePublishedAvatarSimulationInput(bodyProfileRecord.profile);

  return {
    bodyProfileRecord,
    garment,
    request: buildSimulationRequest(userId, garment, avatar, input, bodyProfileRecord),
  };
};

export const createFitSimulationJob = async (userId: string, input: CreateFitSimulationInput) => {
  const parsedInput = createFitSimulationInputSchema.parse(input);

  if (parsedInput.idempotency_key) {
    const existingJob = await getJobByIdempotencyKeyForUser({
      userId,
      jobType: JOB_TYPES.FIT_SIMULATE_HQ,
      idempotencyKey: parsedInput.idempotency_key,
    });

    if (existingJob) {
      const existingFitSimulation = await getFitSimulationRecordForUser(getFitSimulationIdFromJob(existingJob), userId);
      if (existingFitSimulation) {
        return { fitSimulation: existingFitSimulation, job: existingJob };
      }
    }
  }

  const { bodyProfileRecord, garment, request } = await buildCreateInput(userId, parsedInput);
  const idempotencyKey = parsedInput.idempotency_key ?? request.cacheKey;

  if (!parsedInput.idempotency_key) {
    const existingJob = await getJobByIdempotencyKeyForUser({
      userId,
      jobType: JOB_TYPES.FIT_SIMULATE_HQ,
      idempotencyKey,
    });

    if (existingJob) {
      const existingFitSimulation = await getFitSimulationRecordForUser(getFitSimulationIdFromJob(existingJob), userId);
      if (existingFitSimulation) {
        return { fitSimulation: existingFitSimulation, job: existingJob };
      }
    }
  }
  const now = new Date().toISOString();
  const fitSimulationId = randomUUID();
  const fitAssessment = assessGarmentPhysicalFit(garment, bodyProfileRecord.profile);
  const instantFit = assessGarmentInstantFit(garment, bodyProfileRecord.profile);

  const fitSimulation = await upsertFitSimulationRecord({
    id: fitSimulationId,
    jobId: null,
    userId,
    status: "queued",
    avatarVariantId: request.avatarVariantId,
    bodyVersionId: request.bodyVersionId,
    bodyProfileRevision: request.bodyProfileRevision,
    garmentVariantId: request.garmentVariantId,
    garmentRevision: request.garmentRevision,
    avatarManifestUrl: request.avatarManifestUrl,
    garmentManifestUrl: request.garmentManifestUrl,
    materialPreset: request.materialPreset,
    qualityTier: request.qualityTier,
    cacheKey: request.cacheKey,
    bodyProfile: bodyProfileRecord.profile,
    garmentSnapshot: garment,
    fitAssessment,
    instantFit,
    fitMap: null,
    fitMapSummary: null,
    artifacts: [],
    metrics: null,
    warnings: [],
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  });

  const job = await createJob({
    userId,
    jobType: JOB_TYPES.FIT_SIMULATE_HQ,
    payload: {
      fit_simulation_id: fitSimulation.id,
      bodyVersionId: request.bodyVersionId,
      bodyProfileRevision: request.bodyProfileRevision,
      garmentVariantId: request.garmentVariantId,
      garmentRevision: request.garmentRevision,
      avatarManifestUrl: request.avatarManifestUrl,
      garmentManifestUrl: request.garmentManifestUrl,
      materialPreset: request.materialPreset,
      qualityTier: request.qualityTier,
      cacheKey: request.cacheKey,
    } satisfies FitSimulationJobPayload,
    idempotencyKey,
  });

  const boundFitSimulationId = getFitSimulationIdFromJob(job);
  if (boundFitSimulationId !== fitSimulation.id) {
    await deleteFitSimulationRecord(fitSimulation.id).catch(() => undefined);
    const existingFitSimulation = await getFitSimulationRecordForUser(boundFitSimulationId, userId);
    if (existingFitSimulation) {
      return { fitSimulation: existingFitSimulation, job };
    }
    throw new Error("Idempotent fit simulation binding is missing.");
  }

  const boundRecord = await upsertFitSimulationRecord({
    ...fitSimulation,
    jobId: job.id,
    updatedAt: new Date().toISOString(),
  });

  return { fitSimulation: boundRecord, job };
};

export const getFitSimulationForUser = async (userId: string, fitSimulationId: string) => {
  const row = await getFitSimulationRecordForUser(fitSimulationId, userId);
  if (!row) {
    return null;
  }

  const publicRecord: PublicFitSimulationRecord = {
    id: row.id,
    jobId: row.jobId,
    status: row.status,
    avatarVariantId: row.avatarVariantId,
    bodyVersionId: row.bodyVersionId,
    bodyProfileRevision: row.bodyProfileRevision,
    garmentVariantId: row.garmentVariantId,
    garmentRevision: row.garmentRevision,
    avatarManifestUrl: row.avatarManifestUrl,
    garmentManifestUrl: row.garmentManifestUrl,
    materialPreset: row.materialPreset,
    qualityTier: row.qualityTier,
    cacheKey: row.cacheKey,
    instantFit: row.instantFit,
    fitMap: row.fitMap,
    fitMapSummary: row.fitMapSummary,
    artifacts: sortFitSimulationArtifactsForPresentation(row.artifacts),
    metrics: row.metrics,
    warnings: row.warnings,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };

  return publicRecord;
};

export const getFitSimulationById = async (fitSimulationId: string) => {
  return getFitSimulationRecordById(fitSimulationId);
};
