import test from "node:test";
import assert from "node:assert/strict";
import {
  avatarStageViewportInitialLifecycleState,
  detectAvatarStageViewportSupport,
  reduceAvatarStageViewportLifecycle,
  resolveAvatarStageViewportQualityTier,
  resolveAvatarStageViewportRenderState,
  shouldApplyAvatarStageViewportLoadResult,
} from "./avatar-stage-viewport-lifecycle.js";

test("resolveAvatarStageViewportQualityTier clamps requested quality to detected device capability", () => {
  assert.equal(resolveAvatarStageViewportQualityTier(undefined, "balanced"), "balanced");
  assert.equal(resolveAvatarStageViewportQualityTier("low", "high"), "low");
  assert.equal(resolveAvatarStageViewportQualityTier("high", "low"), "low");
  assert.equal(resolveAvatarStageViewportQualityTier("balanced", "high"), "balanced");
});

test("detectAvatarStageViewportSupport reports unsupported when WebGL contexts are unavailable", () => {
  const supportState = detectAvatarStageViewportSupport(() => ({
    getContext() {
      return null;
    },
  }));

  assert.equal(supportState, "unsupported");
});

test("detectAvatarStageViewportSupport reports supported when a WebGL context exists", () => {
  const supportState = detectAvatarStageViewportSupport(() => ({
    getContext(contextId: string) {
      return contextId === "webgl2" ? { version: 2 } : null;
    },
  }));

  assert.equal(supportState, "supported");
});

test("reduceAvatarStageViewportLifecycle retries by incrementing attempt and resetting to loading", () => {
  const supported = reduceAvatarStageViewportLifecycle(avatarStageViewportInitialLifecycleState, {
    type: "support-detected",
    supportState: "supported",
  });
  const failed = reduceAvatarStageViewportLifecycle(supported, {
    type: "load-resolved",
    attempt: 0,
    loadState: "error",
  });
  const retried = reduceAvatarStageViewportLifecycle(failed, { type: "retry-requested" });

  assert.equal(retried.attempt, 1);
  assert.equal(retried.supportState, "supported");
  assert.equal(retried.loadState, "loading");
});

test("reduceAvatarStageViewportLifecycle ignores stale load resolutions from older attempts", () => {
  const supported = reduceAvatarStageViewportLifecycle(avatarStageViewportInitialLifecycleState, {
    type: "support-detected",
    supportState: "supported",
  });
  const retried = reduceAvatarStageViewportLifecycle(supported, { type: "retry-requested" });
  const staleResolution = reduceAvatarStageViewportLifecycle(retried, {
    type: "load-resolved",
    attempt: 0,
    loadState: "ready",
  });

  assert.deepEqual(staleResolution, retried);
});

test("shouldApplyAvatarStageViewportLoadResult blocks cancelled and stale load results", () => {
  assert.equal(
    shouldApplyAvatarStageViewportLoadResult({
      cancelled: false,
      supportState: "supported",
      activeAttempt: 1,
      resolvedAttempt: 1,
    }),
    true,
  );
  assert.equal(
    shouldApplyAvatarStageViewportLoadResult({
      cancelled: true,
      supportState: "supported",
      activeAttempt: 1,
      resolvedAttempt: 1,
    }),
    false,
  );
  assert.equal(
    shouldApplyAvatarStageViewportLoadResult({
      cancelled: false,
      supportState: "supported",
      activeAttempt: 2,
      resolvedAttempt: 1,
    }),
    false,
  );
});

test("resolveAvatarStageViewportRenderState keeps unsupported and error above generic loading", () => {
  assert.equal(
    resolveAvatarStageViewportRenderState(
      { ...avatarStageViewportInitialLifecycleState, supportState: "unsupported" },
      false,
    ),
    "unsupported",
  );
  assert.equal(
    resolveAvatarStageViewportRenderState(
      { ...avatarStageViewportInitialLifecycleState, supportState: "supported", loadState: "error" },
      false,
    ),
    "error",
  );
  assert.equal(
    resolveAvatarStageViewportRenderState(
      { ...avatarStageViewportInitialLifecycleState, supportState: "supported", loadState: "ready" },
      false,
    ),
    "loading",
  );
  assert.equal(
    resolveAvatarStageViewportRenderState(
      { ...avatarStageViewportInitialLifecycleState, supportState: "supported", loadState: "ready" },
      true,
    ),
    "ready",
  );
});
