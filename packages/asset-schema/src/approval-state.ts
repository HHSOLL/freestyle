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

export type AssetApprovalState = z.infer<typeof assetApprovalStateSchema>;
