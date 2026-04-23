import assert from "node:assert/strict";
import test from "node:test";
import { createViewerRendererRuntime } from "./renderer-runtime.js";

test("renderer runtime falls back to noop when the canvas has no context API", () => {
  const runtime = createViewerRendererRuntime({} as HTMLCanvasElement);

  runtime.invalidate("scene");
  runtime.renderNow("manual");
  runtime.setViewport({
    widthCssPx: 320,
    heightCssPx: 480,
    devicePixelRatio: 2,
  });

  assert.deepEqual(runtime.getMetrics(), {
    backend: "noop",
    renderCount: 2,
    resizeCount: 0,
    width: 320,
    height: 480,
    pixelRatio: 2,
    lastRenderReason: "manual",
  });
});
