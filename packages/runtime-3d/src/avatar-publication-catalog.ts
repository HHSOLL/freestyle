import type {
  AssetApprovalState,
  AvatarPublicationEvidence,
  AvatarPublicationRecord,
  AvatarRenderVariantId,
  PublishedRuntimeAvatarCatalogItem,
} from "@freestyle/shared-types";
import { runtimeAvatarRenderManifestSchemaVersion } from "@freestyle/shared-types";
import { avatarRenderManifest } from "./avatar-manifest.js";

const avatarPublicationCatalogGeneratedAt = "2026-04-23T00:00:00.000Z";
const avatarPublicationCatalogApprovalState: AssetApprovalState = "PUBLISHED";
const avatarBodySignatureModelVersion = "body-signature.v1";

const baseCertificationNote = "Phase 5 batch 1 read-only avatar publication seam on committed MPFB base assets.";
const approvedBy = "phase5-avatar-publication@freestyle.local";

const buildAvatarPublicationRecord = (
  variantId: AvatarRenderVariantId,
  sourceSystem: PublishedRuntimeAvatarCatalogItem["publication"]["sourceSystem"],
): AvatarPublicationRecord => ({
  sourceSystem,
  publishedAt: avatarPublicationCatalogGeneratedAt,
  assetVersion: `${variantId}@2026-04-23`,
  approvalState: avatarPublicationCatalogApprovalState,
  approvedAt: avatarPublicationCatalogGeneratedAt,
  approvedBy,
  certificationNotes: [baseCertificationNote],
  runtimeManifestVersion: runtimeAvatarRenderManifestSchemaVersion,
  bodySignatureModelVersion: avatarBodySignatureModelVersion,
});

const buildAvatarEvidence = (
  variantId: AvatarRenderVariantId,
  sourceProvenance: PublishedRuntimeAvatarCatalogItem["sourceProvenance"],
): AvatarPublicationEvidence => ({
  summaryPath: sourceProvenance.summaryPath,
  skeletonPath: sourceProvenance.skeletonPath,
  measurementsPath: sourceProvenance.measurementsPath,
  morphMapPath: sourceProvenance.morphMapPath,
  visualReportPath: `output/avatar-certification/${variantId}.visual-report.json`,
  fitCompatibilityReportPath: `output/avatar-certification/${variantId}.fit-compatibility-report.json`,
  budgetReportPath: "output/asset-budget-report/latest.json",
  bodySignatureModelPath: `output/avatar-certification/${variantId}.body-signature-model.json`,
});

const buildPublishedRuntimeAvatarCatalogItem = (
  variantId: AvatarRenderVariantId,
): PublishedRuntimeAvatarCatalogItem => {
  const entry = avatarRenderManifest[variantId];

  return {
    ...entry,
    publication: buildAvatarPublicationRecord(variantId, entry.authoringSource),
    evidence: buildAvatarEvidence(variantId, entry.sourceProvenance),
  };
};

const avatarPublicationCatalogVariantIds = Object.keys(avatarRenderManifest).sort() as AvatarRenderVariantId[];

export const publishedRuntimeAvatarCatalog = avatarPublicationCatalogVariantIds.map((variantId) =>
  buildPublishedRuntimeAvatarCatalogItem(variantId),
);

export const listPublishedRuntimeAvatarCatalogItems = (filters?: {
  approvalState?: PublishedRuntimeAvatarCatalogItem["publication"]["approvalState"];
  sourceSystem?: PublishedRuntimeAvatarCatalogItem["publication"]["sourceSystem"];
}) =>
  publishedRuntimeAvatarCatalog.filter((item) => {
    if (filters?.approvalState && item.publication.approvalState !== filters.approvalState) {
      return false;
    }
    if (filters?.sourceSystem && item.publication.sourceSystem !== filters.sourceSystem) {
      return false;
    }
    return true;
  });

export const getPublishedRuntimeAvatarCatalogItemById = (id: string) =>
  publishedRuntimeAvatarCatalog.find((item) => item.id === id) ?? null;

export const avatarPublicationCatalogMetadata = {
  schemaVersion: "avatar-publication-catalog.v1",
  generatedAt: avatarPublicationCatalogGeneratedAt,
} as const;
