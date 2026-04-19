import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AvatarStageViewportFallback } from "./AvatarStageViewportFallback.js";

test("AvatarStageViewportFallback renders a loading message", () => {
  const html = renderToStaticMarkup(<AvatarStageViewportFallback state="loading" />);

  assert.match(html, /Closet Stage/);
  assert.match(html, /Preparing 3D fitting stage/);
});

test("AvatarStageViewportFallback renders a retry action for error state", () => {
  const html = renderToStaticMarkup(<AvatarStageViewportFallback state="error" onRetry={() => undefined} />);

  assert.match(html, /3D stage did not open/);
  assert.match(html, /Try loading again/);
});
