import { NextResponse } from "next/server";
import { deleteOutfitById } from "@/lib/outfitStore";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing outfit id." }, { status: 400 });
  }

  try {
    await deleteOutfitById(id);
    return NextResponse.json({ status: "deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete outfit." }, { status: 500 });
  }
}
