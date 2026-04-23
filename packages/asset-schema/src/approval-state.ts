import { z } from "zod";

export const assetApprovalStateSchema = z.enum([
  "DRAFT",
  "TECH_CANDIDATE",
  "VISUAL_CANDIDATE",
  "FIT_CANDIDATE",
  "CERTIFIED",
  "PUBLISHED",
  "DEPRECATED",
  "REJECTED",
]);

export const assetApprovalStates = [...assetApprovalStateSchema.options];
export const assetReviewApprovalStates = [
  "TECH_CANDIDATE",
  "VISUAL_CANDIDATE",
  "FIT_CANDIDATE",
] as const;
export const assetCertificationRequiredApprovalStates = [
  "CERTIFIED",
  "PUBLISHED",
  "DEPRECATED",
] as const;
export const assetCanonicalManifestRequiredApprovalStates = [
  "FIT_CANDIDATE",
  "CERTIFIED",
  "PUBLISHED",
  "DEPRECATED",
] as const;

export type AssetApprovalState = z.infer<typeof assetApprovalStateSchema>;

export const isAssetReviewApprovalState = (
  state: AssetApprovalState,
): state is (typeof assetReviewApprovalStates)[number] =>
  (assetReviewApprovalStates as readonly string[]).includes(state);

export const requiresCertificationMetadataForApprovalState = (
  state: AssetApprovalState,
): state is (typeof assetCertificationRequiredApprovalStates)[number] =>
  (assetCertificationRequiredApprovalStates as readonly string[]).includes(state);

export const requiresCanonicalManifestForApprovalState = (
  state: AssetApprovalState,
): state is (typeof assetCanonicalManifestRequiredApprovalStates)[number] =>
  (assetCanonicalManifestRequiredApprovalStates as readonly string[]).includes(state);
