import { NextResponse } from "next/server";
import { getOutfitBySlug } from "@/lib/outfitStore";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const outfit = await getOutfitBySlug(slug);

  if (!outfit) {
    return NextResponse.json({ error: "Outfit not found." }, { status: 404 });
  }

  return NextResponse.json({ outfit });
}
