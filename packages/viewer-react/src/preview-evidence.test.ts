import assert from "node:assert/strict";
import test from "node:test";
import {
  buildViewerReactPreviewEngineEnvelope,
  buildViewerReactPreviewRuntimeEnvelope,
  createViewerReactPreviewEngineStatus,
  createViewerReactPreviewRuntimeSnapshot,
} from "./preview-evidence.js";

test("viewer-react preview engine evidence stays on the static-fit compatibility contract", () => {
  const status = createViewerReactPreviewEngineStatus();
  assert.equal(status.schemaVersion, "preview-engine-status.v1");
  assert.equal(status.engineKind, "static-fit-compat");
  assert.equal(status.executionMode, "static-fit");
  assert.equal(status.backend, "static-fit");
  assert.equal(status.transport, "main-thread");
  assert.equal(status.status, "fallback");
  assert.equal(status.fallbackReason, "no-continuous-motion");

  const envelope = buildViewerReactPreviewEngineEnvelope(status);
  assert.equal(envelope.type, "fit:preview-engine-status");
});

test("viewer-react preview runtime evidence stays on the static-fit snapshot contract", () => {
  const snapshot = createViewerReactPreviewRuntimeSnapshot({
    sessionId: "viewer-react:female-base:4",
    sequence: 4,
  });
  assert.equal(snapshot.schemaVersion, "preview-runtime-snapshot.v1");
  assert.equal(snapshot.executionMode, "static-fit");
  assert.equal(snapshot.backend, "static-fit");
  assert.equal(snapshot.sequence, 4);
  assert.equal(snapshot.settled, true);

  const envelope = buildViewerReactPreviewRuntimeEnvelope(snapshot);
  assert.equal(envelope.type, "fit:preview-runtime-updated");
});
