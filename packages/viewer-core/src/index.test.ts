import assert from "node:assert/strict";
import test from "node:test";
import { createFreestyleViewer, type FreestyleViewerEventMap } from "./index.js";

test("createFreestyleViewer emits preview and HQ events through the imperative controller", async () => {
  const telemetry: Array<FreestyleViewerEventMap["metrics"]> = [];
  const viewer = await createFreestyleViewer({} as HTMLCanvasElement, {
    telemetry: {
      emit: (event) => {
        telemetry.push(event);
      },
    },
  });

  let previewEvent: FreestyleViewerEventMap["fit:preview-ready"] | null = null;
  let hqEvent: FreestyleViewerEventMap["fit:hq-ready"] | null = null;

  viewer.on("fit:preview-ready", (event) => {
    previewEvent = event;
  });
  viewer.on("fit:hq-ready", (event) => {
    hqEvent = event;
  });

  await viewer.loadAvatar({
    avatarId: "female-base",
    bodySignature: "body-profile:test",
  });
  await viewer.applyGarments([
    {
      garmentId: "starter-top-soft-casual",
      size: "M",
    },
  ]);
  await viewer.requestHighQualityFit();

  assert.deepEqual(previewEvent, {
    garments: [
      {
        garmentId: "starter-top-soft-casual",
        size: "M",
      },
    ],
    source: "static-fit",
  });
  assert.deepEqual(hqEvent, {
    cacheKey: "starter-top-soft-casual:M",
  });
  assert.ok(
    telemetry.some((event) => event.name === "viewer.created"),
    "expected viewer.created telemetry",
  );
});

test("FreestyleViewerController rejects commands after dispose", async () => {
  const viewer = await createFreestyleViewer({} as HTMLCanvasElement);
  viewer.dispose();

  assert.throws(() => viewer.setCameraPreset("full-body-front"), /disposed/);
});

test("setScene updates the viewer through one idempotent scene payload", async () => {
  const viewer = await createFreestyleViewer({} as HTMLCanvasElement);
  let previewEvent: FreestyleViewerEventMap["fit:preview-ready"] | null = null;

  viewer.on("fit:preview-ready", (event) => {
    previewEvent = event;
  });

  await viewer.setScene({
    avatar: {
      avatarId: "female-base",
      bodySignature: "body-profile:test",
    },
    garments: [
      {
        garmentId: "starter-bottom-soft-wool",
        size: "S",
      },
    ],
    cameraPreset: "full-body-front",
    qualityMode: "balanced",
    selectedItemId: "starter-bottom-soft-wool",
    backgroundColor: "#101820",
  });

  assert.deepEqual(previewEvent, {
    garments: [
      {
        garmentId: "starter-bottom-soft-wool",
        size: "S",
      },
    ],
    source: "static-fit",
  });
});

test('createFreestyleViewer fails closed for the reserved "webgpu" backend', async () => {
  await assert.rejects(
    () =>
      createFreestyleViewer({} as HTMLCanvasElement, {
        renderBackend: "webgpu",
      }),
    /not implemented/,
  );
});
