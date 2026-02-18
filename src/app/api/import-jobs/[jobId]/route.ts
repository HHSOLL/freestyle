import { NextResponse } from "next/server";
import type { ImportJobResult } from "@/lib/importQueue";
import { getImportQueue } from "@/lib/importQueue";

export const runtime = "nodejs";
const includeDebugAttempts = process.env.NODE_ENV !== "production";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

const withoutAttempts = (result: ImportJobResult): ImportJobResult => {
  if (result.type === "url") {
    const rest = { ...result };
    delete (rest as { attempts?: unknown }).attempts;
    return rest;
  }

  if (result.type === "cart") {
    return {
      ...result,
      failed: result.failed.map((failedItem) => {
        const nextItem = { ...failedItem };
        delete (nextItem as { attempts?: unknown }).attempts;
        return nextItem;
      }),
    };
  }

  return result;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { jobId } = await params;
  const queue = getImportQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const state = await job.getState();

  if (state === "failed") {
    await job.remove().catch(() => undefined);
    return NextResponse.json(
      { status: "failed", code: "WORKER_FAILURE", error: job.failedReason || "Job failed." },
      { status: 500 }
    );
  }

  if (state !== "completed") {
    const progress = job.progress ?? null;
    return NextResponse.json({ status: state, progress });
  }

  const result = job.returnvalue as ImportJobResult | undefined;
  if (!result) {
    await job.remove().catch(() => undefined);
    return NextResponse.json(
      { status: "failed", code: "MISSING_RESULT", error: "Job completed without result." },
      { status: 500 }
    );
  }

  const payload = includeDebugAttempts ? result : withoutAttempts(result);
  await job.remove().catch(() => undefined);

  const statusCode = result.status === "failed" ? 422 : 200;
  return NextResponse.json(payload, { status: statusCode });
}
