import assert from "node:assert/strict";
import test from "node:test";
import { FreestyleViewerHost } from "./freestyle-viewer-host.js";
import {
  loadConfiguredAvatarStageComponent,
  preloadViewerAssets,
  resolveViewerHost,
  type ViewerPreloadInput,
} from "./host-selection.js";

test("resolveViewerHost defaults to viewer-react and only falls back to runtime-3d when requested", () => {
  assert.equal(resolveViewerHost(undefined), "viewer-react");
  assert.equal(resolveViewerHost("invalid"), "viewer-react");
  assert.equal(resolveViewerHost("viewer-react"), "viewer-react");
  assert.equal(resolveViewerHost("runtime-3d"), "runtime-3d");
});

test("loadConfiguredAvatarStageComponent returns the local host for viewer-react mode", async () => {
  const component = await loadConfiguredAvatarStageComponent("viewer-react");
  assert.equal(component, FreestyleViewerHost);
});

test("loadConfiguredAvatarStageComponent resolves the runtime-3d shim lazily", async () => {
  const runtimeComponent = () => null;

  const component = await loadConfiguredAvatarStageComponent("runtime-3d", async () => ({
    ReferenceClosetStageCanvas: runtimeComponent,
  }));

  assert.equal(component, runtimeComponent);
});

test("preloadViewerAssets delegates runtime asset warming only for the compatibility host", async () => {
  const calls: ViewerPreloadInput[] = [];
  const input: ViewerPreloadInput = {
    avatarVariantIds: ["female-base"],
    garmentAssets: [],
    garmentVariantId: "female-base",
  };

  await preloadViewerAssets(input, "viewer-react", async () => {
    throw new Error("viewer-react preload must not import runtime-3d");
  });

  await preloadViewerAssets(input, "runtime-3d", async () => ({
    preloadRuntimeAssets(next) {
      calls.push(next ?? {});
    },
  }));

  assert.deepEqual(calls, [input]);
});
