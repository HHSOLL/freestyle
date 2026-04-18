import { publishedGarmentAssetSchema } from "@freestyle/contracts";
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
