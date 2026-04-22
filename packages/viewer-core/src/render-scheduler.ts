export type RenderFrame = {
  reason: string;
  timestamp: number;
};

export type RenderSchedulerAdapter = {
  requestFrame: (callback: (timestamp: number) => void) => number;
  cancelFrame: (handle: number) => void;
  now: () => number;
};

export type RenderScheduler = {
  invalidate: (reason?: string) => void;
  flush: (reason?: string) => void;
  isScheduled: () => boolean;
  dispose: () => void;
};

const resolveDefaultSchedulerAdapter = (): RenderSchedulerAdapter => {
  if (typeof globalThis.requestAnimationFrame === "function" && typeof globalThis.cancelAnimationFrame === "function") {
    return {
      requestFrame: (callback) => globalThis.requestAnimationFrame(callback),
      cancelFrame: (handle) => globalThis.cancelAnimationFrame(handle),
      now: () => performance.now(),
    };
  }

  return {
    requestFrame: (callback) =>
      globalThis.setTimeout(() => {
        callback(Date.now());
      }, 16) as unknown as number,
    cancelFrame: (handle) => {
      globalThis.clearTimeout(handle);
    },
    now: () => Date.now(),
  };
};

export const createRenderScheduler = (
  onFrame: (frame: RenderFrame) => void,
  adapter: RenderSchedulerAdapter = resolveDefaultSchedulerAdapter(),
): RenderScheduler => {
  let scheduledHandle: number | null = null;
  let scheduledReason = "unspecified";
  let disposed = false;

  const runFrame = (timestamp: number) => {
    scheduledHandle = null;
    if (disposed) {
      return;
    }

    onFrame({
      reason: scheduledReason,
      timestamp,
    });
  };

  return {
    invalidate(reason = "unspecified") {
      if (disposed) {
        return;
      }

      scheduledReason = reason;
      if (scheduledHandle !== null) {
        return;
      }

      scheduledHandle = adapter.requestFrame(runFrame);
    },
    flush(reason = "manual") {
      if (disposed) {
        return;
      }

      if (scheduledHandle !== null) {
        adapter.cancelFrame(scheduledHandle);
        scheduledHandle = null;
      }

      onFrame({
        reason,
        timestamp: adapter.now(),
      });
    },
    isScheduled() {
      return scheduledHandle !== null;
    },
    dispose() {
      if (scheduledHandle !== null) {
        adapter.cancelFrame(scheduledHandle);
        scheduledHandle = null;
      }
      disposed = true;
    },
  };
};
