import { randomUUID } from "node:crypto";
import { claimJobs, completeJob, failJob, heartbeatJobs, requeueStaleJobs } from "@freestyle/db";
import {
  buildJobResultEnvelope,
  normalizeJobResultEnvelope,
  readJobPayloadEnvelope,
  readJobResultEnvelope,
  type CanonicalJobResultEnvelope,
  type JobRecord,
  type JobType,
} from "@freestyle/shared";
import { logger } from "@freestyle/observability";

export type WorkerHandlerContext = {
  workerName: string;
  job: JobRecord;
};

export type WorkerHandler = (ctx: WorkerHandlerContext) => Promise<Record<string, unknown>>;

export type WorkerDefinition = {
  workerName: string;
  jobTypes: JobType[];
  handler: WorkerHandler;
};

export type WorkerLoopOptions = {
  workerName?: string;
  jobTypes: JobType[];
  pollIntervalMs?: number;
  claimBatchSize?: number;
  heartbeatIntervalMs?: number;
  staleJobMinutes?: number;
  handler: WorkerHandler;
};

export type WorkerRouterOptions = Omit<WorkerLoopOptions, "jobTypes" | "handler"> & {
  workers: WorkerDefinition[];
  jobTypes?: JobType[];
};

const toJobTraceContext = (job: Pick<JobRecord, "id" | "idempotency_key" | "payload" | "result">) => {
  const resultEnvelope = readJobResultEnvelope(job.result);
  const payloadEnvelope = readJobPayloadEnvelope(job.payload);

  return {
    traceId: resultEnvelope?.trace_id ?? payloadEnvelope?.trace_id ?? job.id,
    idempotencyKey: payloadEnvelope?.idempotency_key ?? job.idempotency_key ?? null,
  };
};

export const normalizeWorkerJobResult = (
  job: Pick<JobRecord, "id" | "job_type" | "idempotency_key" | "payload" | "result">,
  result: Record<string, unknown> | null | undefined,
): CanonicalJobResultEnvelope => {
  const { traceId } = toJobTraceContext(job);
  return (
    normalizeJobResultEnvelope({
      jobType: job.job_type,
      result: result ?? {},
      fallbackTraceId: traceId,
    }) ??
    buildJobResultEnvelope(job.job_type, {}, {
      traceId,
    })
  );
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toError = (error: unknown) => {
  if (error instanceof Error) {
    const record = error as Error & { result?: Record<string, unknown> | null };
    return {
      code: error.name || "WorkerError",
      message: error.message,
      result: record.result ?? null,
      retryable: (record as { retryable?: boolean }).retryable ?? true,
    };
  }
  return { code: "WorkerError", message: "Unknown worker error", result: null, retryable: true };
};

export const runWorkerLoop = async (options: WorkerLoopOptions) => {
  const workerName = options.workerName || `${process.env.WORKER_NAME || "worker"}-${randomUUID().slice(0, 8)}`;
  const pollIntervalMs = options.pollIntervalMs ?? Number(process.env.WORKER_POLL_INTERVAL_MS ?? 750);
  const claimBatchSize = options.claimBatchSize ?? Number(process.env.WORKER_CLAIM_BATCH ?? 10);
  const heartbeatIntervalMs =
    options.heartbeatIntervalMs ?? Number(process.env.WORKER_HEARTBEAT_SEC ?? 10) * 1000;
  const staleJobMinutes = options.staleJobMinutes ?? Number(process.env.WORKER_STALE_JOB_MINUTES ?? 5);

  logger.info("worker.start", {
    workerName,
    jobTypes: options.jobTypes,
    pollIntervalMs,
    claimBatchSize,
    heartbeatIntervalMs,
    staleJobMinutes,
  });

  while (true) {
    try {
      await requeueStaleJobs(staleJobMinutes, 100);
      const jobs = await claimJobs(workerName, options.jobTypes, claimBatchSize);

      if (jobs.length === 0) {
        await delay(pollIntervalMs);
        continue;
      }

      await Promise.all(
        jobs.map(async (job) => {
          const heartbeatTimer = setInterval(() => {
            heartbeatJobs(workerName, [job.id]).catch((error) => {
              const details = toError(error);
              logger.warn("worker.heartbeat_failed", {
                workerName,
                jobId: job.id,
                code: details.code,
                message: details.message,
              });
            });
          }, heartbeatIntervalMs);

          try {
            const result = await options.handler({ workerName, job });
            const jobContext = toJobTraceContext(job);
            await completeJob(job.id, workerName, normalizeWorkerJobResult(job, result));
            logger.info("worker.job_succeeded", {
              workerName,
              jobId: job.id,
              userId: job.user_id,
              jobType: job.job_type,
              traceId: jobContext.traceId,
              idempotencyKey: jobContext.idempotencyKey,
            });
          } catch (error) {
            const details = toError(error);
            const jobContext = toJobTraceContext(job);
            await failJob(job.id, workerName, {
              code: details.code,
              message: details.message,
              result: normalizeWorkerJobResult(job, details.result ?? {}),
              forceTerminal: details.retryable === false,
            });
            logger.warn("worker.job_failed", {
              workerName,
              jobId: job.id,
              userId: job.user_id,
              jobType: job.job_type,
              code: details.code,
              message: details.message,
              traceId: jobContext.traceId,
              idempotencyKey: jobContext.idempotencyKey,
            });
          } finally {
            clearInterval(heartbeatTimer);
          }
        })
      );
    } catch (error) {
      const details = toError(error);
      logger.error("worker.loop_error", {
        workerName,
        code: details.code,
        message: details.message,
      });
      await delay(Math.max(1000, pollIntervalMs));
    }
  }
};

export const runWorkerRouter = async (options: WorkerRouterOptions) => {
  const routeMap = new Map<JobType, WorkerDefinition>();

  for (const worker of options.workers) {
    for (const jobType of worker.jobTypes) {
      if (routeMap.has(jobType)) {
        throw new Error(`Duplicate worker route detected for job type "${jobType}".`);
      }
      routeMap.set(jobType, worker);
    }
  }

  const configuredJobTypes = options.jobTypes?.length ? options.jobTypes : Array.from(routeMap.keys());
  const selectedJobTypes = configuredJobTypes.filter((jobType) => routeMap.has(jobType));

  if (selectedJobTypes.length === 0) {
    throw new Error("No worker job types are configured.");
  }

  return runWorkerLoop({
    workerName: options.workerName,
    jobTypes: selectedJobTypes,
    pollIntervalMs: options.pollIntervalMs,
    claimBatchSize: options.claimBatchSize,
    heartbeatIntervalMs: options.heartbeatIntervalMs,
    staleJobMinutes: options.staleJobMinutes,
    handler: async (ctx) => {
      const worker = routeMap.get(ctx.job.job_type);
      if (!worker) {
        throw new Error(`No handler registered for job type "${ctx.job.job_type}".`);
      }

      return worker.handler(ctx);
    },
  });
};
