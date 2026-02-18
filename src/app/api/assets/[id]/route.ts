import { NextResponse } from "next/server";
import { deleteAssetById } from "@/lib/assetStore";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing asset id." }, { status: 400 });
  }

  try {
    await deleteAssetById(id);
    return NextResponse.json({ status: "deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete asset." }, { status: 500 });
  }
}
