import {
  closetRuntimeGarmentListResponseSchema,
  publishedGarmentAssetSchema,
  type GarmentInstantFitReport,
} from "@freestyle/contracts";
import { validatePublishedGarmentAsset } from "@freestyle/domain-garment";
import type { PublishedGarmentAsset } from "@freestyle/shared-types";

export const parsePublishedRuntimeGarment = (value: unknown): PublishedGarmentAsset | null => {
  const parsed = publishedGarmentAssetSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return validatePublishedGarmentAsset(parsed.data).length === 0 ? parsed.data : null;
};

export const parsePublishedRuntimeGarmentList = (value: unknown): PublishedGarmentAsset[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const parsed = parsePublishedRuntimeGarment(entry);
    return parsed ? [parsed] : [];
  });
};

export const parseClosetRuntimeGarmentCatalog = (
  value: unknown,
): {
  items: PublishedGarmentAsset[];
  instantFitById: Record<string, GarmentInstantFitReport>;
} => {
  const parsed = closetRuntimeGarmentListResponseSchema.safeParse(value);
  if (!parsed.success) {
    return {
      items: [],
      instantFitById: {},
    };
  }

  return parsed.data.items.reduce<{
    items: PublishedGarmentAsset[];
    instantFitById: Record<string, GarmentInstantFitReport>;
  }>(
    (catalog, entry) => {
      const item = parsePublishedRuntimeGarment(entry.item);
      if (!item) {
        return catalog;
      }

      catalog.items.push(item);
      if (entry.instantFit) {
        catalog.instantFitById[item.id] = entry.instantFit;
      }
      return catalog;
    },
    {
      items: [],
      instantFitById: {},
    },
  );
};
