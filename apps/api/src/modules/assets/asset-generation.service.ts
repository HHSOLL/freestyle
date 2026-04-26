import { randomUUID } from "node:crypto";
import {
  assetGenerationCreateRequestSchema,
  type AssetGenerationCreateRequest,
  type AssetGenerationProvider,
  type AssetGenerationRequestRecord,
  type AssetGenerationStatus,
} from "@freestyle/contracts";

const assetGenerationRequests = new Map<string, AssetGenerationRequestRecord>();

const blockedSourceImageHosts = new Set(["localhost", "localhost.localdomain", "127.0.0.1", "0.0.0.0", "::", "::1"]);

const normalizeSourceHostname = (hostname: string) =>
  hostname
    .trim()
    .toLowerCase()
    .replace(/^\[(.*)\]$/, "$1")
    .replace(/\.$/, "");

const isPrivateIpv4Host = (hostname: string) => {
  const parts = hostname.split(".").map((value) => Number.parseInt(value, 10));
  if (
    parts.length !== 4 ||
    parts.some((value) => Number.isNaN(value) || value < 0 || value > 255)
  ) {
    return false;
  }

  const [first, second] = parts;
  if (first === 0) return true;
  if (first === 10 || first === 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 192 && second === 168) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  return false;
};

const expandIpv6Hextets = (hostname: string) => {
  const hostWithoutZoneId = hostname.split("%")[0] ?? hostname;
  if (!hostWithoutZoneId.includes(":")) {
    return null;
  }

  let host = hostWithoutZoneId;
  const dottedIpv4Match = /(^|:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(host);
  if (dottedIpv4Match) {
    const ipv4 = dottedIpv4Match[2];
    const parts = ipv4.split(".").map((value) => Number.parseInt(value, 10));
    if (parts.length !== 4 || parts.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
      return null;
    }
    const ipv4Hextets = [
      ((parts[0] << 8) | parts[1]).toString(16),
      ((parts[2] << 8) | parts[3]).toString(16),
    ].join(":");
    host = `${host.slice(0, dottedIpv4Match.index + dottedIpv4Match[1].length)}${ipv4Hextets}`;
  }

  const compressionCount = (host.match(/::/g) ?? []).length;
  if (compressionCount > 1) {
    return null;
  }

  const [head = "", tail = ""] = host.split("::");
  const headParts = head ? head.split(":").filter(Boolean) : [];
  const tailParts = tail ? tail.split(":").filter(Boolean) : [];
  const missingZeroes = compressionCount === 1 ? 8 - headParts.length - tailParts.length : 0;
  const parts = [
    ...headParts,
    ...Array(Math.max(0, missingZeroes)).fill("0"),
    ...tailParts,
  ];

  if (parts.length !== 8) {
    return null;
  }

  const hextets = parts.map((value) => Number.parseInt(value || "0", 16));
  if (hextets.some((value) => Number.isNaN(value) || value < 0 || value > 0xffff)) {
    return null;
  }

  return hextets;
};

const extractIpv4MappedIpv6Host = (hostname: string) => {
  const hextets = expandIpv6Hextets(hostname);
  if (!hextets) {
    return null;
  }

  const isIpv4Mapped =
    hextets.slice(0, 5).every((value) => value === 0) && hextets[5] === 0xffff;
  if (!isIpv4Mapped) {
    return null;
  }

  const high = hextets[6];
  const low = hextets[7];
  return [
    (high >> 8) & 0xff,
    high & 0xff,
    (low >> 8) & 0xff,
    low & 0xff,
  ].join(".");
};

const isBlockedIpv6Host = (hostname: string) => {
  const hextets = expandIpv6Hextets(hostname);
  if (!hextets) {
    return false;
  }

  const first = hextets[0];
  const isUnspecified = hextets.every((value) => value === 0);
  const isLoopback = hextets.slice(0, 7).every((value) => value === 0) && hextets[7] === 1;
  const isUniqueLocal = (first & 0xfe00) === 0xfc00;
  const isLinkLocal = (first & 0xffc0) === 0xfe80;
  const mappedIpv4 = extractIpv4MappedIpv6Host(hostname);

  return (
    isUnspecified ||
    isLoopback ||
    isUniqueLocal ||
    isLinkLocal ||
    (mappedIpv4 ? isPrivateIpv4Host(mappedIpv4) : false)
  );
};

const validateHttpsSourceUrl = (value: string, issues: string[], fieldPath: string) => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    issues.push(`${fieldPath} must be a valid URL.`);
    return;
  }

  if (parsed.protocol !== "https:") {
    issues.push(`${fieldPath} must use https.`);
  }

  if (parsed.username || parsed.password) {
    issues.push(`${fieldPath} must not include embedded credentials.`);
  }

  const hostname = normalizeSourceHostname(parsed.hostname);
  if (!hostname) {
    issues.push(`${fieldPath} must include a hostname.`);
    return;
  }

  if (blockedSourceImageHosts.has(hostname) || isPrivateIpv4Host(hostname) || isBlockedIpv6Host(hostname)) {
    issues.push(`${fieldPath} must point to a public remote host.`);
  }
};

const validateAssetGenerationRequest = (input: AssetGenerationCreateRequest) => {
  const issues: string[] = [];
  const sourceImageViews = new Set(input.source_images.map((image) => image.view));

  input.source_images.forEach((image, index) => {
    validateHttpsSourceUrl(image.url, issues, `source_images[${index}].url`);
  });

  if (input.source_context.source_page_url) {
    validateHttpsSourceUrl(input.source_context.source_page_url, issues, "source_context.source_page_url");
  }

  if (!sourceImageViews.has("front")) {
    issues.push("source_images must include a front view.");
  }

  if (new Set(input.source_images.map((image) => image.view)).size !== input.source_images.length) {
    issues.push("source_images must not contain duplicate view entries.");
  }

  if (!input.output_requirements.require_fit_mesh) {
    issues.push("output_requirements.require_fit_mesh must be true for certification intake.");
  }

  if (!input.output_requirements.require_collision_policy) {
    issues.push("output_requirements.require_collision_policy must be true for certification intake.");
  }

  if (input.certification_request.requested_approval_state === "TECH_CANDIDATE") {
    if (!sourceImageViews.has("back")) {
      issues.push("TECH_CANDIDATE intake requires at least one back source image.");
    }
  }

  return issues;
};

const buildProviderTask = (provider: AssetGenerationProvider, itemId: string) => {
  switch (provider) {
    case "external-api":
      return {
        provider_task_id: `external-pending-${itemId}`,
        status: "pending" as const,
      };
    case "partner-pipeline":
      return {
        provider_task_id: `partner-pending-${itemId}`,
        status: "submitted" as const,
      };
    default:
      return null;
  }
};

const buildCertificationGate = (input: AssetGenerationCreateRequest) => ({
  requested_approval_state: input.certification_request.requested_approval_state,
  auto_publish_allowed: false as const,
  required_evidence: [
    "license-attestation",
    "source-provenance",
    "technical-review",
  ],
  review_notes: input.certification_request.review_notes,
});

export class AssetGenerationValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues[0] ?? "Invalid asset generation payload.");
    this.name = "AssetGenerationValidationError";
    this.issues = issues;
  }
}

export const listAssetGenerationRequests = (filters?: {
  status?: AssetGenerationStatus;
  provider?: AssetGenerationProvider;
}) => {
  const items = [...assetGenerationRequests.values()].filter((item) => {
    if (filters?.status && item.status !== filters.status) return false;
    if (filters?.provider && item.provider !== filters.provider) return false;
    return true;
  });

  return {
    items,
    total: items.length,
  };
};

export const getAssetGenerationRequestById = (id: string) => {
  return assetGenerationRequests.get(id) ?? null;
};

export const createAssetGenerationRequest = (payload: unknown, actorUserId: string) => {
  const parsed = assetGenerationCreateRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AssetGenerationValidationError(parsed.error.issues.map((issue) => issue.message));
  }

  const issues = validateAssetGenerationRequest(parsed.data);
  if (issues.length > 0) {
    throw new AssetGenerationValidationError(issues);
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const item: AssetGenerationRequestRecord = {
    id,
    provider: parsed.data.provider,
    intent: parsed.data.intent,
    category: parsed.data.category,
    garment_id: parsed.data.garment_id,
    name: parsed.data.name,
    material_class: parsed.data.material_class,
    status: "submitted",
    approval_state: parsed.data.certification_request.requested_approval_state,
    source_images: parsed.data.source_images,
    source_context: parsed.data.source_context,
    measurement_constraints: parsed.data.measurement_constraints,
    output_requirements: {
      ...parsed.data.output_requirements,
      allow_auto_publish: false,
    },
    certification_gate: buildCertificationGate(parsed.data),
    provider_task: buildProviderTask(parsed.data.provider, id),
    created_by: actorUserId,
    created_at: now,
    updated_at: now,
  };

  assetGenerationRequests.set(id, item);

  return {
    item,
  };
};

export const resetAssetGenerationRequestsForTest = () => {
  assetGenerationRequests.clear();
};
