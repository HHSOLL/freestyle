import assert from "node:assert/strict";
import test from "node:test";
import { createRenderScheduler, type RenderFrame, type RenderSchedulerAdapter } from "./render-scheduler.js";

test("render scheduler coalesces invalidations until the pending frame runs", () => {
  const callbacks: Array<(timestamp: number) => void> = [];
  const frames: RenderFrame[] = [];

  const adapter: RenderSchedulerAdapter = {
    requestFrame(callback) {
      callbacks.push(callback);
      return callbacks.length;
    },
    cancelFrame() {
      return;
    },
    now() {
      return 77;
    },
  };

  const scheduler = createRenderScheduler((frame) => {
    frames.push(frame);
  }, adapter);

  scheduler.invalidate("scene");
  scheduler.invalidate("camera");

  assert.equal(callbacks.length, 1);
  callbacks[0]?.(12);

  assert.deepEqual(frames, [
    {
      reason: "camera",
      timestamp: 12,
    },
  ]);
});

test("render scheduler flushes immediately and cancels a pending frame", () => {
  let cancelledHandle: number | null = null;
  const frames: RenderFrame[] = [];

  const adapter: RenderSchedulerAdapter = {
    requestFrame() {
      return 42;
    },
    cancelFrame(handle) {
      cancelledHandle = handle;
    },
    now() {
      return 123;
    },
  };

  const scheduler = createRenderScheduler((frame) => {
    frames.push(frame);
  }, adapter);

  scheduler.invalidate("scene");
  scheduler.flush("manual-resize");

  assert.equal(cancelledHandle, 42);
  assert.deepEqual(frames, [
    {
      reason: "manual-resize",
      timestamp: 123,
    },
  ]);
});

test("render scheduler dispose prevents pending or future frames", () => {
  const callbacks: Array<(timestamp: number) => void> = [];
  const frames: RenderFrame[] = [];

  const adapter: RenderSchedulerAdapter = {
    requestFrame(next) {
      callbacks.push(next);
      return 7;
    },
    cancelFrame() {
      return;
    },
    now() {
      return 0;
    },
  };

  const scheduler = createRenderScheduler((frame) => {
    frames.push(frame);
  }, adapter);

  scheduler.invalidate("scene");
  scheduler.dispose();
  callbacks[0]?.(99);
  scheduler.flush("late");

  assert.deepEqual(frames, []);
});
