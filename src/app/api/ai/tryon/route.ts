import { NextResponse } from "next/server";
import { getVtoQueue } from "@/lib/vtoQueue";
import { createJobId } from "@/lib/assetProcessing";
import { BadRequestError, readJsonObject } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const modelImage = body.modelImage;
    const items = body.items;

    if (!modelImage || typeof modelImage !== "string") {
      return NextResponse.json({ error: "Missing model image." }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided." }, { status: 400 });
    }

    const jobId = createJobId();
    const vtoQueue = getVtoQueue();
    await vtoQueue.add(
      "vto-tryon",
      { modelImage, items },
      { jobId, attempts: 1 }
    );

    return NextResponse.json({ jobId, status: "queued" });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to request try-on." }, { status: 500 });
  }
}
