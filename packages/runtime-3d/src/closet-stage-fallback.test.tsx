import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { ClosetStageLoadingFallback } from "./closet-stage-fallback.js";

test("ClosetStageLoadingFallback renders a named placeholder group", () => {
  const element = ClosetStageLoadingFallback();
  const children = React.Children.toArray(element.props.children) as React.ReactElement[];

  assert.equal(element.props.name, "closet-stage-loading-fallback");
  assert.deepEqual(
    children.map((child) => child.props.name),
    ["closet-stage-loading-head", "closet-stage-loading-body", "closet-stage-loading-base"],
  );
});
