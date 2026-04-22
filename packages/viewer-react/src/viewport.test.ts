import assert from "node:assert/strict";
import test from "node:test";
import { hasViewerViewportChanged, measureViewerViewport } from "./viewport.js";

test("measureViewerViewport clamps viewport dimensions and keeps dpr", () => {
  assert.deepEqual(
    measureViewerViewport(
      {
        clientWidth: 0,
        clientHeight: 412.9,
      },
      2,
    ),
    {
      widthCssPx: 1,
      heightCssPx: 412,
      devicePixelRatio: 2,
    },
  );
});

test("hasViewerViewportChanged only flips when a viewport field changes", () => {
  const base = {
    widthCssPx: 320,
    heightCssPx: 480,
    devicePixelRatio: 2,
  };

  assert.equal(hasViewerViewportChanged(null, base), true);
  assert.equal(hasViewerViewportChanged(base, base), false);
  assert.equal(hasViewerViewportChanged(base, { ...base, widthCssPx: 321 }), true);
});
