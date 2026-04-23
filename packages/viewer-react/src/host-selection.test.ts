import assert from "node:assert/strict";
import test from "node:test";
import { FreestyleViewerHost } from "./freestyle-viewer-host.js";
import {
  loadConfiguredAvatarStageComponent,
  preloadViewerAssets,
  resolveViewerHost,
  type ViewerPreloadInput,
} from "./host-selection.js";

test("resolveViewerHost defaults to runtime-3d and only enables viewer-react when requested", () => {
  assert.equal(resolveViewerHost(undefined), "runtime-3d");
  assert.equal(resolveViewerHost("invalid"), "runtime-3d");
  assert.equal(resolveViewerHost("viewer-react"), "viewer-react");
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

test("preloadViewerAssets delegates runtime asset warming for both product hosts", async () => {
  const calls: ViewerPreloadInput[] = [];
  const input: ViewerPreloadInput = {
    avatarVariantIds: ["female-base"],
    garmentAssets: [],
    garmentVariantId: "female-base",
  };

  await preloadViewerAssets(input, "runtime-3d", async () => ({
    preloadRuntimeAssets(next) {
      calls.push(next ?? {});
    },
  }));

  await preloadViewerAssets(input, "viewer-react", async () => ({
    preloadRuntimeAssets(next) {
      calls.push(next ?? {});
    },
  }));

  assert.deepEqual(calls, [input, input]);
});
