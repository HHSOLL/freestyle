import assert from "node:assert/strict";
import test from "node:test";
import {
  detectViewerStageSupport,
  reduceViewerStageLifecycle,
  resolveViewerStageQualityTier,
  resolveViewerStageRenderState,
  shouldApplyViewerStageLoadResult,
  viewerStageInitialLifecycleState,
} from "./stage-lifecycle.js";

test("resolveViewerStageQualityTier clamps requested quality to detected device capability", () => {
  assert.equal(resolveViewerStageQualityTier(undefined, "balanced"), "balanced");
  assert.equal(resolveViewerStageQualityTier("low", "high"), "low");
  assert.equal(resolveViewerStageQualityTier("high", "low"), "low");
  assert.equal(resolveViewerStageQualityTier("balanced", "high"), "balanced");
});

test("detectViewerStageSupport reports unsupported when WebGL contexts are unavailable", () => {
  const supportState = detectViewerStageSupport(() => ({
    getContext() {
      return null;
    },
  }));

  assert.equal(supportState, "unsupported");
});

test("detectViewerStageSupport reports supported when a WebGL context exists", () => {
  const supportState = detectViewerStageSupport(() => ({
    getContext(contextId: string) {
      return contextId === "webgl2" ? {} : null;
    },
  }));

  assert.equal(supportState, "supported");
});

test("reduceViewerStageLifecycle retries by incrementing attempt and resetting to loading", () => {
  const supported = reduceViewerStageLifecycle(viewerStageInitialLifecycleState, {
    type: "support-detected",
    supportState: "supported",
  });
  const failed = reduceViewerStageLifecycle(supported, {
    type: "load-resolved",
    attempt: supported.attempt,
    loadState: "error",
  });
  const retried = reduceViewerStageLifecycle(failed, { type: "retry-requested" });

  assert.equal(retried.attempt, 1);
  assert.equal(retried.loadState, "loading");
});

test("reduceViewerStageLifecycle ignores stale load resolutions from older attempts", () => {
  const supported = reduceViewerStageLifecycle(viewerStageInitialLifecycleState, {
    type: "support-detected",
    supportState: "supported",
  });
  const retried = reduceViewerStageLifecycle(supported, { type: "retry-requested" });
  const staleResolution = reduceViewerStageLifecycle(retried, {
    type: "load-resolved",
    attempt: 0,
    loadState: "ready",
  });

  assert.equal(staleResolution.attempt, 1);
  assert.equal(staleResolution.loadState, "loading");
});

test("shouldApplyViewerStageLoadResult blocks cancelled and stale load results", () => {
  assert.equal(
    shouldApplyViewerStageLoadResult({
      cancelled: true,
      supportState: "supported",
      activeAttempt: 0,
      resolvedAttempt: 0,
    }),
    false,
  );

  assert.equal(
    shouldApplyViewerStageLoadResult({
      cancelled: false,
      supportState: "supported",
      activeAttempt: 1,
      resolvedAttempt: 0,
    }),
    false,
  );

  assert.equal(
    shouldApplyViewerStageLoadResult({
      cancelled: false,
      supportState: "supported",
      activeAttempt: 1,
      resolvedAttempt: 1,
    }),
    true,
  );
});

test("resolveViewerStageRenderState keeps unsupported and error above generic loading", () => {
  assert.equal(
    resolveViewerStageRenderState(
      {
        ...viewerStageInitialLifecycleState,
        supportState: "unsupported",
      },
      false,
    ),
    "unsupported",
  );

  assert.equal(
    resolveViewerStageRenderState(
      {
        ...viewerStageInitialLifecycleState,
        supportState: "supported",
        loadState: "error",
      },
      false,
    ),
    "error",
  );

  assert.equal(
    resolveViewerStageRenderState(
      {
        ...viewerStageInitialLifecycleState,
        supportState: "supported",
        loadState: "loading",
      },
      true,
    ),
    "loading",
  );

  assert.equal(
    resolveViewerStageRenderState(
      {
        ...viewerStageInitialLifecycleState,
        supportState: "supported",
        loadState: "ready",
      },
      true,
    ),
    "ready",
  );
});
