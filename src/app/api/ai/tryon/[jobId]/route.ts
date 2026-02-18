import { NextResponse } from "next/server";
import { getVtoQueue } from "@/lib/vtoQueue";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { jobId } = await params;
  const vtoQueue = getVtoQueue();
  const job = await vtoQueue.getJob(jobId);

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

  const result = job.returnvalue as { status?: string; imageDataUrl?: string; error?: string };
  if (result?.status === "not_configured") {
    await job.remove().catch(() => undefined);
    return NextResponse.json(
      { status: "failed", error: result.error || "VTO not configured." },
      { status: 501 }
    );
  }

  if (!result?.imageDataUrl) {
    await job.remove().catch(() => undefined);
    return NextResponse.json({ status: "failed", error: "Missing output." }, { status: 500 });
  }

  await job.remove().catch(() => undefined);
  return NextResponse.json({
    status: "completed",
    imageDataUrl: result.imageDataUrl,
  });
}
