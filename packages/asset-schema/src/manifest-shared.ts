import { z } from "zod";
import { assetApprovalStateSchema } from "./approval-state.js";

export const repoAssetPathSchema = z.string().trim().min(1).max(512);

export const productionMetadataSchema = z
  .object({
    approvalState: assetApprovalStateSchema.default("DRAFT"),
    reviewNotes: z.array(z.string().trim().min(1)).default([]),
    approvedAt: z.iso.datetime().optional(),
    approvedBy: z.string().trim().min(1).max(160).optional(),
    certificationNotes: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

export type ProductionMetadata = z.infer<typeof productionMetadataSchema>;
