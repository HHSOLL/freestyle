import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BottomModeBar, SurfacePanel } from "./index.js";

test("ui primitives render without crashing", () => {
  const html = renderToStaticMarkup(
    <SurfacePanel>
      <BottomModeBar
        active="closet"
        items={[
          { id: "closet", label: "Closet", href: "/app/closet" },
          { id: "canvas", label: "Canvas", href: "/app/canvas" },
        ]}
      />
    </SurfacePanel>,
  );

  assert.match(html, /Closet/);
  assert.match(html, /Canvas/);
});
