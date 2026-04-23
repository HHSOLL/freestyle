import assert from "node:assert/strict";
import test from "node:test";
import { createViewerRouteTelemetryTracker } from "./route-telemetry.js";

test("viewer route telemetry tracker records first avatar paint on the initial preview-ready event", () => {
  let currentTime = 100;
  const tracker = createViewerRouteTelemetryTracker(() => currentTime);

  tracker.startScene({
    avatar: {
      avatarId: "female-base",
    },
    garments: [
      {
        garmentId: "starter-top-soft-casual",
        size: "M",
      },
    ],
    cameraPreset: "full-body-front",
    qualityMode: "balanced",
    selectedItemId: "starter-top-soft-casual",
  });

  currentTime = 184;
  const result = tracker.recordPreviewReady({
    garments: [
      {
        garmentId: "starter-top-soft-casual",
        size: "M",
      },
    ],
    source: "static-fit",
  });

  assert.equal(result.snapshot.firstAvatarPaintMs, 84);
  assert.equal(result.snapshot.lastGarmentSwapMs, null);
  assert.equal(result.emitted[0]?.name, "viewer.host.first-avatar-paint");
});

test("viewer route telemetry tracker records garment swap latency when the garment scene changes", () => {
  let currentTime = 0;
  const tracker = createViewerRouteTelemetryTracker(() => currentTime);

  tracker.startScene({
    avatar: {
      avatarId: "female-base",
    },
    garments: [
      {
        garmentId: "starter-top-soft-casual",
        size: "M",
      },
    ],
    cameraPreset: "full-body-front",
    qualityMode: "balanced",
    selectedItemId: "starter-top-soft-casual",
  });
  currentTime = 120;
  tracker.recordPreviewReady({
    garments: [
      {
        garmentId: "starter-top-soft-casual",
        size: "M",
      },
    ],
    source: "static-fit",
  });

  tracker.startScene({
    avatar: {
      avatarId: "female-base",
    },
    garments: [
      {
        garmentId: "starter-top-soft-casual",
        size: "M",
      },
    ],
    cameraPreset: "full-body-front",
    qualityMode: "balanced",
    selectedItemId: "starter-shoe-soft-day",
  });
  currentTime = 245;
  const result = tracker.recordPreviewReady({
    garments: [
      {
        garmentId: "starter-top-soft-casual",
        size: "M",
      },
    ],
    source: "static-fit",
  });

  assert.equal(result.snapshot.lastGarmentSwapMs, 125);
  assert.equal(result.snapshot.lastPreviewSource, "static-fit");
  assert.equal(result.emitted[0]?.name, "viewer.host.garment-swap.preview-latency");
});

test("viewer route telemetry tracker treats unchanged garment scenes as generic refreshes", () => {
  let currentTime = 0;
  const tracker = createViewerRouteTelemetryTracker(() => currentTime);

  tracker.startScene({
    avatar: {
      avatarId: "female-base",
    },
    garments: [],
    cameraPreset: "full-body-front",
    qualityMode: "balanced",
    selectedItemId: null,
  });
  currentTime = 80;
  tracker.recordPreviewReady({
    garments: [],
    source: "static-fit",
  });

  const nextSnapshot = tracker.startScene({
    avatar: {
      avatarId: "female-base",
    },
    garments: [],
    cameraPreset: "full-body-front",
    qualityMode: "balanced",
    selectedItemId: null,
  });

  assert.equal(nextSnapshot.activeSceneKind, "scene-refresh");
});
