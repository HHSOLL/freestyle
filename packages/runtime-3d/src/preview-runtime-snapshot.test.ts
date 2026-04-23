import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPreviewRuntimeSnapshotDataAttributes,
  buildPreviewRuntimeEventEnvelope,
  buildPreviewRuntimeSnapshot,
  createPreviewRuntimeSnapshot,
  hasPreviewRuntimeSnapshotChanged,
} from "./preview-runtime-snapshot.js";

test("buildPreviewRuntimeSnapshot keeps worker envelope metrics explicit", () => {
  const snapshot = buildPreviewRuntimeSnapshot({
    payload: {
      type: "PREVIEW_FRAME_RESULT",
      result: {
        schemaVersion: "preview-simulation-frame.v1",
        sessionId: "preview-session",
        sequence: 3,
        backend: "worker-reduced",
        state: {
          initialized: true,
          lastAnchorWorld: [0, 1.4, 0],
          rotationRad: [0.01, 0.02, 0.03],
          rotationVelocity: [0.001, 0.002, 0.003],
          positionOffset: [0.001, 0.002, 0],
          positionVelocity: [0.0001, 0.0002, 0],
        },
        rotationRad: [0.01, 0.02, 0.03],
        position: [0.001, 0.032, 0],
        targetRotationRad: [0.02, 0.03, 0.01],
        targetPosition: [0.004, 0.035, 0],
        angularEnergy: 0.12,
        positionalEnergy: 0.02,
        anchorEnergy: 0.3,
        shouldContinue: true,
      },
      metrics: {
        solverKind: "reduced-preview-spring",
        executionMode: "reduced-preview",
        backend: "worker-reduced",
        solveDurationMs: 0.42,
        angularEnergy: 0.12,
        positionalEnergy: 0.02,
        anchorEnergy: 0.3,
        shouldContinue: true,
      },
    },
  });

  assert.equal(snapshot.executionMode, "reduced-preview");
  assert.equal(snapshot.backend, "worker-reduced");
  assert.equal(snapshot.solverKind, "reduced-preview-spring");
  assert.equal(snapshot.solveDurationMs, 0.42);
  assert.equal(snapshot.settled, false);
});

test("buildPreviewRuntimeSnapshot derives static-fit truth from raw preview frames", () => {
  const snapshot = buildPreviewRuntimeSnapshot({
    payload: {
      schemaVersion: "preview-simulation-frame.v1",
      sessionId: "static-session",
      sequence: 0,
      backend: "static-fit",
      state: {
        initialized: true,
        lastAnchorWorld: [0, 1.4, 0],
        rotationRad: [0, 0, 0],
        rotationVelocity: [0, 0, 0],
        positionOffset: [0, 0, 0],
        positionVelocity: [0, 0, 0],
      },
      rotationRad: [0, 0, 0],
      position: [0, 0.03, 0],
      targetRotationRad: [0, 0, 0],
      targetPosition: [0, 0.03, 0],
      angularEnergy: 0,
      positionalEnergy: 0,
      anchorEnergy: 0,
      shouldContinue: false,
    },
  });

  assert.equal(snapshot.executionMode, "static-fit");
  assert.equal(snapshot.backend, "static-fit");
  assert.equal(snapshot.solverKind, undefined);
  assert.equal(snapshot.settled, true);
});

test("preview runtime snapshot helpers expose read-only evidence attrs and events", () => {
  const snapshot = createPreviewRuntimeSnapshot({
    sessionId: "session-a",
    sequence: 4,
    backend: "cpu-reduced",
    solveDurationMs: 0.15,
    angularEnergy: 0.08,
    positionalEnergy: 0.01,
    anchorEnergy: 0.12,
    shouldContinue: true,
  });
  const nextSnapshot = createPreviewRuntimeSnapshot({
    sessionId: "session-a",
    sequence: 5,
    backend: "cpu-reduced",
    solveDurationMs: 0.14,
    angularEnergy: 0.04,
    positionalEnergy: 0.006,
    anchorEnergy: 0.05,
    shouldContinue: false,
  });
  const element = { dataset: {} } as HTMLElement;

  applyPreviewRuntimeSnapshotDataAttributes(element, snapshot);

  assert.equal(element.dataset.previewRuntimeExecutionMode, "reduced-preview");
  assert.equal(element.dataset.previewRuntimeBackend, "cpu-reduced");
  assert.equal(element.dataset.previewRuntimeSolverKind, "reduced-preview-spring");
  assert.equal(element.dataset.previewRuntimeSequence, "4");
  assert.equal(element.dataset.previewRuntimeSettled, "false");
  assert.equal(hasPreviewRuntimeSnapshotChanged(snapshot, snapshot), false);
  assert.equal(hasPreviewRuntimeSnapshotChanged(snapshot, nextSnapshot), true);
  assert.equal(
    buildPreviewRuntimeEventEnvelope(nextSnapshot).type,
    "fit:preview-runtime-updated",
  );
});
