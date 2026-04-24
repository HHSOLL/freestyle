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

const nowIso = () => new Date().toISOString();

const buildCertificationGate = () => ({
  approval_state: "TECH_CANDIDATE" as const,
  auto_publish_allowed: false as const,
  required_artifacts: [...requiredGeneratedGarmentArtifacts],
  hard_blockers: [
    "Generated assets are intake candidates only and cannot be published automatically.",
    "Display mesh, fit mesh, material contract, collision policy, body mask policy, fit metrics, and golden fit report must pass certification.",
  ],
});

const buildProviderTask = (input: AssetGenerationRequestInput) => {
  if (input.provider === "mock" || input.provider === "manual-dcc" || input.provider === "internal-blender") {
    return {
      provider_task_id: `local-${randomUUID()}`,
      webhook_expected: false,
      raw_status: "LOCAL_INTAKE",
    };
  }

  // External providers are intentionally abstracted behind this seam. Provider
  // credentials and paid API calls must be approved before a concrete adapter is enabled.
  return {
    provider_task_id: `external-pending-${randomUUID()}`,
    webhook_expected: true,
    raw_status: "PENDING_PROVIDER_APPROVAL",
  };
};

export const createAssetGenerationRequest = (
  input: unknown,
  actorId: string,
): AssetGenerationCreateResponse => {
  const parsed = assetGenerationRequestInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AssetGenerationValidationError(parsed.error.issues.map((issue) => issue.message));
  }

  const createdAt = nowIso();
  const record: AssetGenerationRecord = {
    ...parsed.data,
    id: `assetgen_${randomUUID()}`,
    created_by: actorId,
    status: parsed.data.provider === "external-api" ? "submitted" : "certification-blocked",
    approval_state: "TECH_CANDIDATE",
    provider_task: buildProviderTask(parsed.data),
    output: null,
    certification_gate: buildCertificationGate(),
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
