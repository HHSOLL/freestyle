import { NextResponse } from "next/server";
import { assertSafeRemoteUrl } from "@/lib/assetProcessing";
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

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const url = readOptionalString(body.url) || "";
    const name = readOptionalString(body.name);
    const categoryRaw = readOptionalString(body.category) || "custom";
    const category = editableCategories.has(categoryRaw) ? categoryRaw : "custom";

    if (!url) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    assertSafeRemoteUrl(url);
    const imported = await importAssetFromUrlAndSave({
      url,
      category,
      name: name || undefined,
      source: "import",
      sourceUrl: url,
      maxCandidates: 8,
      maxRemovebgAttempts: 3,
    });

    return NextResponse.json({
      status: "completed",
      asset: imported.asset,
      warnings: imported.warnings,
      selectedImageUrl: imported.selectedImageUrl,
      ...(includeDebugAttempts ? { attempts: imported.attempts } : {}),
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AssetImportError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          ...(includeDebugAttempts ? { attempts: error.attempts } : {}),
        },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to import image.";
    console.error("Direct import error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
