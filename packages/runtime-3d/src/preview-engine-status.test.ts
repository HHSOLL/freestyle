import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPreviewEngineStatusDataAttributes,
  buildPreviewEngineStatusEventEnvelope,
  createPreviewEngineStatus,
  hasPreviewEngineStatusChanged,
  resolveObservedPreviewEngineFallbackStatus,
} from "./preview-engine-status.js";

test("preview engine status helpers expose typed fallback evidence attrs and events", () => {
  const status = createPreviewEngineStatus({
    engineKind: "reduced-preview-compat",
    executionMode: "reduced-preview",
    backend: "worker-reduced",
    transport: "worker-message",
    status: "ready",
    featureSnapshot: {
      hasWorker: true,
      hasOffscreenCanvas: false,
      hasWebGPU: false,
      crossOriginIsolated: false,
    },
  });
  const fallbackStatus = createPreviewEngineStatus({
    engineKind: "reduced-preview-compat",
    executionMode: "reduced-preview",
    backend: "worker-reduced",
    transport: "main-thread",
    status: "fallback",
    fallbackReason: "engine-boot-failed",
    featureSnapshot: {
      hasWorker: true,
      hasOffscreenCanvas: false,
      hasWebGPU: false,
      crossOriginIsolated: false,
    },
  });
  const element = { dataset: {} } as HTMLElement;

  applyPreviewEngineStatusDataAttributes(element, fallbackStatus);

  assert.equal(element.dataset.previewEngineKind, "reduced-preview-compat");
  assert.equal(element.dataset.previewEngineExecutionMode, "reduced-preview");
  assert.equal(element.dataset.previewEngineBackend, "worker-reduced");
  assert.equal(element.dataset.previewEngineTransport, "main-thread");
  assert.equal(element.dataset.previewEngineStatus, "fallback");
  assert.equal(element.dataset.previewEngineFallbackReason, "engine-boot-failed");
  assert.equal(hasPreviewEngineStatusChanged(status, status), false);
  assert.equal(hasPreviewEngineStatusChanged(status, fallbackStatus), true);
  assert.equal(
    buildPreviewEngineStatusEventEnvelope(fallbackStatus).type,
    "fit:preview-engine-status",
  );
});

test("preview engine status reports observed WASM to CPU worker fallback", () => {
  const requested = createPreviewEngineStatus({
    engineKind: "wasm-preview",
    executionMode: "wasm-preview",
    backend: "wasm-preview",
    transport: "worker-message",
    status: "ready",
    featureSnapshot: {
      hasWorker: true,
      hasOffscreenCanvas: false,
      hasWebGPU: false,
      crossOriginIsolated: false,
    },
  });

  const observed = resolveObservedPreviewEngineFallbackStatus({
    requested,
    runtime: {
      schemaVersion: "preview-runtime-snapshot.v1",
      sessionId: "preview:1",
      sequence: 1,
      executionMode: "cpu-xpbd-preview",
      backend: "cpu-xpbd",
      solverKind: "xpbd-cloth-preview",
      solveDurationMs: 4.2,
      angularEnergy: 0,
      positionalEnergy: 0,
      anchorEnergy: 0,
      shouldContinue: false,
      settled: true,
    },
  });

  assert.equal(observed?.engineKind, "cpu-xpbd-preview");
  assert.equal(observed?.executionMode, "cpu-xpbd-preview");
  assert.equal(observed?.backend, "cpu-xpbd");
  assert.equal(observed?.status, "fallback");
  assert.equal(observed?.fallbackReason, "wasm-preview-runtime-fallback");
});
