import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getBgRemovalQueue } from "@/lib/bgRemovalQueue";
import { readFileAsDataUrl } from "@/lib/assetProcessing";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { jobId } = await params;
  const bgRemovalQueue = getBgRemovalQueue();
  const job = await bgRemovalQueue.getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const state = await job.getState();

  if (state === "failed") {
    return NextResponse.json(
      { status: "failed", error: job.failedReason || "Job failed." },
      { status: 500 }
    );
  }

  if (state !== "completed") {
    return NextResponse.json({ status: state });
  }

  const result = job.returnvalue as { outputPath?: string; mime?: string; removedBackground?: boolean; warnings?: string[] };
  if (!result?.outputPath || !result?.mime) {
    return NextResponse.json({ status: "completed", error: "Missing output." }, { status: 500 });
  }

  const dataUrl = await readFileAsDataUrl(result.outputPath, result.mime);
  await fs.unlink(result.outputPath).catch(() => undefined);
  await job.remove().catch(() => undefined);

  return NextResponse.json({
    status: "completed",
    imageDataUrl: dataUrl,
    removedBackground: result.removedBackground,
    warnings: result.warnings,
  });
}
