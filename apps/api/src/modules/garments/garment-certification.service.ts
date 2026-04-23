import { promises as fs } from "node:fs";
import path from "node:path";
import {
  garmentCertificationItemResponseSchema,
  garmentCertificationListResponseSchema,
  type AssetCategory,
  type GarmentCertificationItemResponse,
  type GarmentCertificationListResponse,
} from "@freestyle/contracts";

export const resolveGarmentCertificationBundlePath = (rootDir = process.cwd()) =>
  process.env.GARMENT_CERTIFICATION_BUNDLE_PATH?.trim() ||
  path.join(rootDir, "output/garment-certification/latest.json");

export class GarmentCertificationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GarmentCertificationUnavailableError";
  }
}

const readGarmentCertificationBundle = async () => {
  try {
    const raw = await fs.readFile(resolveGarmentCertificationBundlePath(), "utf8");
    return garmentCertificationListResponseSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new GarmentCertificationUnavailableError("Garment certification bundle is not available.");
    }
    throw error;
  }
};

export const listGarmentCertifications = async (filters?: {
  category?: AssetCategory;
}): Promise<GarmentCertificationListResponse> => {
  const bundle = await readGarmentCertificationBundle();
  const items = filters?.category
    ? bundle.items.filter((item) => item.category === filters.category)
    : bundle.items;

  return garmentCertificationListResponseSchema.parse({
    schemaVersion: bundle.schemaVersion,
    generatedAt: bundle.generatedAt,
    items,
    total: items.length,
  });
};

export const getGarmentCertificationById = async (
  id: string,
): Promise<GarmentCertificationItemResponse | null> => {
  const bundle = await readGarmentCertificationBundle();
  const item = bundle.items.find((entry) => entry.id === id);
  if (!item) {
    return null;
  }

  return garmentCertificationItemResponseSchema.parse({
    schemaVersion: bundle.schemaVersion,
    generatedAt: bundle.generatedAt,
    item,
  });
};
