import { NextResponse } from "next/server";
import { createShareSlug } from "@/lib/outfitUtils";
import { listOutfits, saveOutfit } from "@/lib/outfitStore";
import { BadRequestError, readJsonObject, readOptionalString } from "@/lib/http";
import type { Json } from "@/lib/supabase.types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const title = readOptionalString(body.title) || "Untitled outfit";
    const description = readOptionalString(body.description) ?? null;
    const previewImage = readOptionalString(body.previewImage);
    const data = body.items
      ? ({ items: body.items, modelPhoto: body.modelPhoto || null } as unknown as Json)
      : (body.data as Json | undefined);

    if (!previewImage) {
      return NextResponse.json({ error: "Missing preview image." }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: "Missing outfit data." }, { status: 400 });
    }

    const shareSlug = createShareSlug();
    const result = await saveOutfit(
      {
        title,
        description,
        previewImage,
        data,
      },
      shareSlug
    );

    return NextResponse.json({ id: result.id, shareSlug: result.shareSlug, storage: result.storage });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save outfit." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const outfits = await listOutfits();
    return NextResponse.json({ outfits });
  } catch {
    return NextResponse.json({ error: "Failed to load outfits." }, { status: 500 });
  }
}
