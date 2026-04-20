import type { AssetMetadata, AssetRecord } from "@freestyle/shared";

const legacyAssetsOptionalColumns = ["name", "brand", "source_url", "metadata"] as const;

type AssetInsertRow = {
  user_id: string;
  product_id: string | null;
  name: string | null;
  brand: string | null;
  source_url: string | null;
  original_image_url: string;
  category: string | null;
  metadata: AssetMetadata;
  status: "pending";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const isLegacyAssetsColumnDriftError = (message: string) =>
  legacyAssetsOptionalColumns.some(
    (column) => message.includes(`'${column}'`) && message.includes("'assets'"),
  );

export const buildLegacyCompatibleAssetInsert = (input: AssetInsertRow) => ({
  user_id: input.user_id,
  product_id: input.product_id,
  original_image_url: input.original_image_url,
  category: input.category,
  status: input.status,
});

export const normalizeAssetRecord = (input: AssetRecord | (Record<string, unknown> & Partial<AssetRecord>)): AssetRecord => ({
  ...(input as AssetRecord),
  name: typeof input.name === "string" ? input.name : null,
  brand: typeof input.brand === "string" ? input.brand : null,
  source_url: typeof input.source_url === "string" ? input.source_url : null,
  metadata: isRecord(input.metadata) ? (input.metadata as AssetMetadata) : null,
});
