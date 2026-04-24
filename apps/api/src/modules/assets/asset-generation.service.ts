import { randomUUID } from "node:crypto";
import {
  assetGenerationCreateResponseSchema,
  assetGenerationListResponseSchema,
  assetGenerationRequestInputSchema,
  type AssetGenerationCreateResponse,
  type AssetGenerationListResponse,
  type AssetGenerationRecord,
  type AssetGenerationRequestInput,
} from "@freestyle/contracts";
import {
  Ai3DProviderPolicyError,
  type Ai3DProviderTask,
  Ai3DProviderRequestError,
  Ai3DProviderUnconfiguredError,
  getConfiguredAi3DProvider,
} from "./ai-3d-providers.js";

const requiredGeneratedGarmentArtifacts = [
  "display_glb",
  "fit_mesh_glb",
  "material_json",
  "body_mask_policy_json",
  "collision_policy_json",
  "fit_metrics_json",
  "golden_fit_report",
] as const;

const records = new Map<string, AssetGenerationRecord>();

export class AssetGenerationValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(issues[0] ?? "Invalid asset generation request.");
    this.name = "AssetGenerationValidationError";
  }
}

export class AssetGenerationProviderUnconfiguredError extends Error {
  constructor(readonly providerId: string, message: string) {
    super(message);
    this.name = "AssetGenerationProviderUnconfiguredError";
  }
}

export class AssetGenerationProviderRequestError extends Error {
  constructor(readonly providerId: string, message: string) {
    super(message);
    this.name = "AssetGenerationProviderRequestError";
  }
}

const nowIso = () => new Date().toISOString();

const buildCertificationGate = (extraBlockers: string[] = []) => ({
  approval_state: "TECH_CANDIDATE" as const,
  auto_publish_allowed: false as const,
  required_artifacts: [...requiredGeneratedGarmentArtifacts],
  hard_blockers: [
    ...new Set([
      "Generated assets are intake candidates only and cannot be published automatically.",
      "Display mesh, fit mesh, material contract, collision policy, body mask policy, fit metrics, and golden fit report must pass certification.",
      ...extraBlockers,
    ]),
  ],
});

const buildLocalProviderTask = (input: AssetGenerationRequestInput): Ai3DProviderTask | null => {
  if (input.provider === "mock" || input.provider === "manual-dcc" || input.provider === "internal-blender") {
    return {
      provider_task_id: `local-${randomUUID()}`,
      webhook_expected: false,
      raw_status: "LOCAL_INTAKE",
    };
  }

  return null;
};

const buildProviderPrompt = (input: AssetGenerationRequestInput) =>
  [
    input.name,
    input.material_class ? `material: ${input.material_class}` : null,
    `size: ${input.measurement_constraints.size_label}`,
    input.notes ?? null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("; ");

const buildExternalProviderTask = async (input: AssetGenerationRequestInput) => {
  const provider = getConfiguredAi3DProvider();
  const prompt = buildProviderPrompt(input);

  if (input.source_images.length > 1) {
    const providerTask = await provider.createMultiViewTo3DTask({
      assetName: input.name,
      prompt,
      sourceImages: input.source_images,
    });

    const draftRegistration = provider.registerDraftAsset({
      assetName: input.name,
      desiredApprovalState: "TECH_CANDIDATE",
      sourceKind: "ai-generated",
    });

    return {
      providerTask,
      draftRegistration,
    };
  }

  const providerTask = await provider.createImageTo3DTask({
    assetName: input.name,
    prompt,
    sourceImage: input.source_images[0],
  });

  const draftRegistration = provider.registerDraftAsset({
    assetName: input.name,
    desiredApprovalState: "TECH_CANDIDATE",
    sourceKind: "ai-generated",
  });

  return {
    providerTask,
    draftRegistration,
  };
};

export const createAssetGenerationRequest = (
  input: unknown,
  actorId: string,
): Promise<AssetGenerationCreateResponse> => {
  return createAssetGenerationRequestInternal(input, actorId);
};

const createAssetGenerationRequestInternal = async (
  input: unknown,
  actorId: string,
): Promise<AssetGenerationCreateResponse> => {
  const parsed = assetGenerationRequestInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AssetGenerationValidationError(parsed.error.issues.map((issue) => issue.message));
  }

  let providerTask: Ai3DProviderTask | null = buildLocalProviderTask(parsed.data);
  let approvalState: AssetGenerationRecord["approval_state"] = "TECH_CANDIDATE";
  let extraHardBlockers: string[] = [];

  try {
    if (parsed.data.provider === "external-api") {
      const externalProvider = await buildExternalProviderTask(parsed.data);
      providerTask = externalProvider.providerTask;
      approvalState = externalProvider.draftRegistration.approvalState === "DRAFT" ? "TECH_CANDIDATE" : externalProvider.draftRegistration.approvalState;
      extraHardBlockers = externalProvider.draftRegistration.blockers;
    }
  } catch (error) {
    if (error instanceof Ai3DProviderUnconfiguredError) {
      throw new AssetGenerationProviderUnconfiguredError(error.providerId, error.message);
    }

    if (error instanceof Ai3DProviderRequestError) {
      throw new AssetGenerationProviderRequestError(error.providerId, error.message);
    }

    if (error instanceof Ai3DProviderPolicyError) {
      throw new AssetGenerationValidationError([error.message]);
    }

    throw error;
  }

  const createdAt = nowIso();
  const record: AssetGenerationRecord = {
    ...parsed.data,
    id: `assetgen_${randomUUID()}`,
    created_by: actorId,
    status: parsed.data.provider === "external-api" ? "submitted" : "certification-blocked",
    approval_state: approvalState,
    provider_task: providerTask,
    output: null,
    certification_gate: buildCertificationGate(extraHardBlockers),
    created_at: createdAt,
    updated_at: createdAt,
  };

  const normalized = assetGenerationCreateResponseSchema.parse({ item: record }).item;
  records.set(normalized.id, normalized);

  return assetGenerationCreateResponseSchema.parse({ item: normalized });
};

export const listAssetGenerationRequests = (filters?: {
  status?: AssetGenerationRecord["status"];
  provider?: AssetGenerationRecord["provider"];
}): AssetGenerationListResponse => {
  const items = [...records.values()].filter((record) => {
    if (filters?.status && record.status !== filters.status) {
      return false;
    }
    if (filters?.provider && record.provider !== filters.provider) {
      return false;
    }
    return true;
  });

  return assetGenerationListResponseSchema.parse({
    items,
    total: items.length,
  });
};

export const getAssetGenerationRequestById = (id: string): AssetGenerationRecord | null =>
  records.get(id) ?? null;

export const resetAssetGenerationRequestsForTest = () => {
  records.clear();
};
