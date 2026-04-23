import type {
  AssetApprovalState,
  AvatarSourceSystem,
} from "@freestyle/shared-types";
import {
  getPublishedRuntimeAvatarCatalogItemById,
  listPublishedRuntimeAvatarCatalogItems,
} from "@freestyle/runtime-3d/avatar-publication-catalog";

export const listPublishedRuntimeAvatars = (filters?: {
  approvalState?: AssetApprovalState;
  sourceSystem?: AvatarSourceSystem;
}) => {
  return listPublishedRuntimeAvatarCatalogItems({
    approvalState: filters?.approvalState,
    sourceSystem: filters?.sourceSystem,
  });
};

export const getPublishedRuntimeAvatarById = (id: string) => getPublishedRuntimeAvatarCatalogItemById(id);

export const getPublishedRuntimeAvatarByVariantId = (variantId: string) =>
  getPublishedRuntimeAvatarById(variantId);
