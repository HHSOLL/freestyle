import { NextResponse } from "next/server";
import { listAssets } from "@/lib/assetStore";

export const runtime = "nodejs";

export async function GET() {
  try {
    const assets = await listAssets();
    return NextResponse.json({ assets });
  } catch {
    return NextResponse.json({ error: "Failed to load assets." }, { status: 500 });
  }
}
