import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ViewerStageFallback } from "./stage-fallback.js";

test("ViewerStageFallback renders a loading message", () => {
  const html = renderToStaticMarkup(<ViewerStageFallback state="loading" />);

  assert.match(html, /Preparing 3D fitting stage/);
  assert.doesNotMatch(html, /Try loading again/);
});

test("ViewerStageFallback renders a retry action for error state", () => {
  const html = renderToStaticMarkup(<ViewerStageFallback state="error" onRetry={() => undefined} />);

  assert.match(html, /Try loading again/);
});
