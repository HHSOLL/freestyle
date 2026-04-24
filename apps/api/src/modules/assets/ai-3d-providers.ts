import { randomUUID } from "node:crypto";
import type {
  AssetGenerationSourceImage,
} from "@freestyle/contracts";

export type Ai3DProviderVendor = "meshy" | "tripo" | "rodin";

export type Ai3DProviderTask = {
  provider_task_id: string;
  status_url?: string;
  webhook_expected: boolean;
  raw_status: string;
};

export type Ai3DDraftApprovalState = "DRAFT" | "TECH_CANDIDATE";

export type Ai3DSourceKind = "manual" | "vendor-generated" | "ai-generated";

type Ai3DTaskKind = "text-to-3d" | "image-to-3d" | "multi-view-to-3d";

type ProviderTaskRecord = {
  vendor: Ai3DProviderVendor;
  kind: Ai3DTaskKind;
  sourceImageUrls: string[];
  prompt: string | null;
  createdAt: string;
};

export type CreateTextTo3DTaskInput = {
  assetName: string;
  prompt: string;
};

export type CreateImageTo3DTaskInput = {
  assetName: string;
  prompt?: string;
  sourceImage: AssetGenerationSourceImage;
};

export type CreateMultiViewTo3DTaskInput = {
  assetName: string;
  prompt?: string;
  sourceImages: AssetGenerationSourceImage[];
};

export type PollAi3DTaskResult = {
  providerTask: Ai3DProviderTask;
  ready: false;
  modelUrl: null;
};

export type DownloadAi3DModelInput = {
  providerTaskId: string;
};

export type DownloadAi3DModelResult = {
  providerTaskId: string;
  modelUrl: string;
  downloadedAt: string;
};

export type RegisterDraftAssetInput = {
  assetName: string;
  desiredApprovalState: Ai3DDraftApprovalState | "CERTIFIED" | "PUBLISHED";
  sourceKind: Ai3DSourceKind;
  licenseMetadata?: Record<string, unknown> | null;
  sourceMetadata?: Record<string, unknown> | null;
};

export type RegisterDraftAssetResult = {
  approvalState: Ai3DDraftApprovalState;
  autoPublishAllowed: false;
  productionRegistrationAllowed: false;
  blockers: string[];
};

export interface Ai3DProvider {
  readonly vendor: Ai3DProviderVendor;
  createTextTo3DTask(input: CreateTextTo3DTaskInput): Promise<Ai3DProviderTask>;
  createImageTo3DTask(input: CreateImageTo3DTaskInput): Promise<Ai3DProviderTask>;
  createMultiViewTo3DTask(input: CreateMultiViewTo3DTaskInput): Promise<Ai3DProviderTask>;
  pollTask(providerTaskId: string): Promise<PollAi3DTaskResult>;
  downloadModel(input: DownloadAi3DModelInput): Promise<DownloadAi3DModelResult>;
  registerDraftAsset(input: RegisterDraftAssetInput): RegisterDraftAssetResult;
}

const providerTasks = new Map<string, ProviderTaskRecord>();

const providerEnvConfig: Record<
  Ai3DProviderVendor,
  {
    apiKeyEnv: string;
    defaultStatusUrlBase: string;
  }
> = {
  meshy: {
    apiKeyEnv: "MESHY_API_KEY",
    defaultStatusUrlBase: "https://api.meshy.ai/openapi/v2/text-to-3d",
  },
  tripo: {
    apiKeyEnv: "TRIPO_API_KEY",
    defaultStatusUrlBase: "https://api.tripo3d.ai/v2/openapi/task",
  },
  rodin: {
    apiKeyEnv: "RODIN_API_KEY",
    defaultStatusUrlBase: "https://api.rodin.ai/v1/tasks",
  },
};

const nowIso = () => new Date().toISOString();

const compactRecord = (value: Record<string, unknown> | null | undefined) =>
  value && Object.keys(value).length > 0 ? value : null;

export class Ai3DProviderUnconfiguredError extends Error {
  constructor(readonly providerId: "external-api" | Ai3DProviderVendor, message: string) {
    super(message);
    this.name = "Ai3DProviderUnconfiguredError";
  }
}

export class Ai3DProviderRequestError extends Error {
  constructor(readonly providerId: Ai3DProviderVendor, message: string) {
    super(message);
    this.name = "Ai3DProviderRequestError";
  }
}

export class Ai3DProviderPolicyError extends Error {
  constructor(readonly code: "APPROVAL_STATE_FORBIDDEN" | "PRODUCTION_METADATA_REQUIRED", message: string) {
    super(message);
    this.name = "Ai3DProviderPolicyError";
  }
}

class StubAi3DProvider implements Ai3DProvider {
  constructor(readonly vendor: Ai3DProviderVendor) {}

  private assertConfigured() {
    const config = providerEnvConfig[this.vendor];
    const apiKey = process.env[config.apiKeyEnv]?.trim();
    if (!apiKey) {
      throw new Ai3DProviderUnconfiguredError(
        this.vendor,
        `${this.vendor} provider is not configured. Set ${config.apiKeyEnv}.`,
      );
    }

    return {
      statusUrlBase:
        process.env[`${this.vendor.toUpperCase()}_API_BASE_URL`]?.trim() || config.defaultStatusUrlBase,
    };
  }

  private createTask(kind: Ai3DTaskKind, prompt: string | null, sourceImageUrls: string[]) {
    const { statusUrlBase } = this.assertConfigured();
    const providerTaskId = `${this.vendor}-${kind}-${randomUUID()}`;
    providerTasks.set(providerTaskId, {
      vendor: this.vendor,
      kind,
      sourceImageUrls,
      prompt,
      createdAt: nowIso(),
    });

    return {
      provider_task_id: providerTaskId,
      status_url: `${statusUrlBase}/${providerTaskId}`,
      webhook_expected: false,
      raw_status: "SUBMITTED",
    } satisfies Ai3DProviderTask;
  }

  async createTextTo3DTask(input: CreateTextTo3DTaskInput) {
    return this.createTask("text-to-3d", `${input.assetName}: ${input.prompt}`.trim(), []);
  }

  async createImageTo3DTask(input: CreateImageTo3DTaskInput) {
    return this.createTask(
      "image-to-3d",
      input.prompt ? `${input.assetName}: ${input.prompt}`.trim() : input.assetName,
      [input.sourceImage.url],
    );
  }

  async createMultiViewTo3DTask(input: CreateMultiViewTo3DTaskInput) {
    return this.createTask(
      "multi-view-to-3d",
      input.prompt ? `${input.assetName}: ${input.prompt}`.trim() : input.assetName,
      input.sourceImages.map((sourceImage) => sourceImage.url),
    );
  }

  async pollTask(providerTaskId: string) {
    this.assertConfigured();
    const task = providerTasks.get(providerTaskId);
    if (!task || task.vendor !== this.vendor) {
      throw new Ai3DProviderRequestError(this.vendor, `Unknown provider task: ${providerTaskId}`);
    }

    return {
      providerTask: {
        provider_task_id: providerTaskId,
        webhook_expected: false,
        raw_status: "SUBMITTED",
      },
      ready: false,
      modelUrl: null,
    } satisfies PollAi3DTaskResult;
  }

  async downloadModel(input: DownloadAi3DModelInput): Promise<DownloadAi3DModelResult> {
    this.assertConfigured();
    const task = providerTasks.get(input.providerTaskId);
    if (!task || task.vendor !== this.vendor) {
      throw new Ai3DProviderRequestError(this.vendor, `Unknown provider task: ${input.providerTaskId}`);
    }

    throw new Ai3DProviderRequestError(
      this.vendor,
      `Provider task ${input.providerTaskId} is not ready for download.`,
    );
  }

  registerDraftAsset(input: RegisterDraftAssetInput) {
    if (input.desiredApprovalState !== "DRAFT" && input.desiredApprovalState !== "TECH_CANDIDATE") {
      throw new Ai3DProviderPolicyError(
        "APPROVAL_STATE_FORBIDDEN",
        "Generated provider output can only be registered as DRAFT or TECH_CANDIDATE.",
      );
    }

    const blockers = [
      "Generated provider output cannot auto-promote to CERTIFIED or PUBLISHED.",
      "Manual certification is required before any production registration.",
    ];

    if (input.sourceKind !== "manual" && !compactRecord(input.licenseMetadata)) {
      blockers.push("Vendor or AI-generated assets need license metadata before production registration.");
    }

    if (input.sourceKind !== "manual" && !compactRecord(input.sourceMetadata)) {
      blockers.push("Vendor or AI-generated assets need source metadata before production registration.");
    }

    return {
      approvalState: input.desiredApprovalState,
      autoPublishAllowed: false,
      productionRegistrationAllowed: false,
      blockers,
    } satisfies RegisterDraftAssetResult;
  }
}

const parseSelectedVendor = (value: string | undefined): Ai3DProviderVendor | null => {
  switch (value?.trim().toLowerCase()) {
    case "meshy":
    case "tripo":
    case "rodin":
      return value.trim().toLowerCase() as Ai3DProviderVendor;
    default:
      return null;
  }
};

export const getConfiguredAi3DProvider = (): Ai3DProvider => {
  const vendor =
    parseSelectedVendor(process.env.AI_3D_PROVIDER) ??
    parseSelectedVendor(process.env.ASSET_GENERATION_AI_3D_PROVIDER);

  if (!vendor) {
    throw new Ai3DProviderUnconfiguredError(
      "external-api",
      "AI 3D provider is not configured. Set AI_3D_PROVIDER to meshy, tripo, or rodin and provide that vendor credential.",
    );
  }

  return new StubAi3DProvider(vendor);
};

export const resetAi3DProviderStateForTest = () => {
  providerTasks.clear();
};
