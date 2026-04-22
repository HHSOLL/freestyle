import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveAvatarStageComponent,
  resolveViewerHost,
} from "./viewer-host";

test("resolveViewerHost defaults to runtime-3d", () => {
  assert.equal(resolveViewerHost(undefined), "runtime-3d");
  assert.equal(resolveViewerHost("invalid"), "runtime-3d");
});

test("resolveViewerHost enables the viewer-react seam only when explicitly configured", () => {
  assert.equal(resolveViewerHost("viewer-react"), "viewer-react");
});

test("resolveAvatarStageComponent picks the correct export for each host", () => {
  const runtimeComponent = () => null;
  const viewerReactComponent = () => null;

  assert.equal(
    resolveAvatarStageComponent({ ReferenceClosetStageCanvas: runtimeComponent }, "runtime-3d"),
    runtimeComponent,
  );
  assert.equal(
    resolveAvatarStageComponent({ FreestyleViewerHost: viewerReactComponent }, "viewer-react"),
    viewerReactComponent,
  );
  assert.equal(resolveAvatarStageComponent({}, "viewer-react"), null);
});
