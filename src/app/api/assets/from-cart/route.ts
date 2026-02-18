import { NextResponse } from "next/server";
import { fetchProductLinksFromCartUrl } from "@/lib/assetProcessing";
import { AssetImportError, importAssetFromUrlAndSave } from "@/lib/assetImport";
import { BadRequestError, readJsonObject, readOptionalString } from "@/lib/http";

export const runtime = "nodejs";
const includeDebugAttempts = process.env.NODE_ENV !== "production";

const editableCategories = new Set([
  "tops",
  "bottoms",
  "outerwear",
  "shoes",
  "accessories",
  "custom",
]);

const parseMaxItems = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 12;
  const normalized = Math.floor(value);
  if (normalized < 1) return 1;
  if (normalized > 30) return 30;
  return normalized;
};

const mapWithConcurrency = async <T, R>(
  list: T[],
  concurrency: number,
  mapper: (entry: T) => Promise<R>
) => {
  const limit = Math.max(1, Math.min(concurrency, list.length));
  const out: R[] = new Array(list.length);
  let next = 0;

  const worker = async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= list.length) return;
      out[index] = await mapper(list[index]);
    }
  };

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return out;
};

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const url = readOptionalString(body.url);
    const categoryRaw = readOptionalString(body.category) || "custom";
    const category = editableCategories.has(categoryRaw) ? categoryRaw : "custom";
    const maxItems = parseMaxItems(body.maxItems);

    if (!url) {
      return NextResponse.json({ error: "Cart URL is required." }, { status: 400 });
    }

    const { productUrls } = await fetchProductLinksFromCartUrl(url, maxItems);
    const assets: Array<{
      id: string;
      name: string;
      category: string;
      source: string;
      imageSrc: string;
      removedBackground: boolean;
      sourceUrl?: string;
      selectedImageUrl?: string;
      warnings?: string[];
      processing?: Record<string, unknown>;
    }> = [];
    const failed: Array<{ url: string; error: string; code: string; attempts?: unknown[] }> = [];

    const results = await mapWithConcurrency(productUrls, 3, async (productUrl) => {
      try {
        const imported = await importAssetFromUrlAndSave({
          url: productUrl,
          category,
          source: "import",
          sourceUrl: productUrl,
          maxCandidates: 8,
          maxRemovebgAttempts: 3,
        });
        return {
          ok: true as const,
          asset: imported.asset,
        };
      } catch (error) {
        if (error instanceof AssetImportError) {
          return {
            ok: false as const,
            failed: {
              url: productUrl,
              error: error.message,
              code: error.code,
              ...(includeDebugAttempts ? { attempts: error.attempts } : {}),
            },
          };
        }
        return {
          ok: false as const,
          failed: {
            url: productUrl,
            error: error instanceof Error ? error.message : "Failed to import product.",
            code: "UNKNOWN_IMPORT_ERROR",
          },
        };
      }
    });

    for (const result of results) {
      if (result.ok) {
        assets.push(result.asset);
      } else {
        failed.push(result.failed);
      }
    }

    if (assets.length === 0) {
      return NextResponse.json(
        {
          error: "Could not import any products from this cart link.",
          totalProducts: productUrls.length,
          importedCount: 0,
          failedCount: failed.length,
          failed,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      status: "completed",
      assets,
      totalProducts: productUrls.length,
      importedCount: assets.length,
      failedCount: failed.length,
      failed,
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to import products from cart link.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
