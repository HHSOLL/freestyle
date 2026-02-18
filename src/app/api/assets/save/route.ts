import { NextResponse } from "next/server";
import { saveAsset } from "@/lib/assetStore";
import { BadRequestError, readJsonObject, readOptionalString } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const name = readOptionalString(body.name);
    const category = readOptionalString(body.category) || "custom";
    const source = readOptionalString(body.source) || "upload";
    const imageDataUrl = readOptionalString(body.imageDataUrl);

    if (!name || !imageDataUrl) {
      return NextResponse.json({ error: "Missing asset data." }, { status: 400 });
    }

    const record = await saveAsset({
      name,
      category,
      source,
      imageDataUrl,
      removedBackground: Boolean(body?.removedBackground),
      sourceUrl: readOptionalString(body.sourceUrl) ?? null,
    });

    return NextResponse.json({
      asset: {
        id: record.id,
        name: record.name,
        category: record.category,
        source: record.source,
        imageSrc: imageDataUrl,
        removedBackground: record.removed_background,
        sourceUrl: record.source_url ?? undefined,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save asset." }, { status: 500 });
  }
}
