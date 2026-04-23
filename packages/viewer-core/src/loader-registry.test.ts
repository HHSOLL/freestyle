import assert from "node:assert/strict";
import test from "node:test";
import { viewerAssetLoaderPolicy } from "@freestyle/shared-types";
import { resolveSharedLoaderRegistryPolicy } from "./loader-registry.js";

test("resolveSharedLoaderRegistryPolicy defaults to the canonical viewer asset loader policy", () => {
  assert.deepEqual(resolveSharedLoaderRegistryPolicy(), {
    dracoDecoderPath: viewerAssetLoaderPolicy.dracoDecoderPath,
    ktx2TranscoderPath: viewerAssetLoaderPolicy.ktx2TranscoderPath,
    ktx2WorkerLimit: viewerAssetLoaderPolicy.ktx2WorkerLimit,
    runtimeMaterialTextureExtensions: viewerAssetLoaderPolicy.runtimeMaterialTextureExtensions,
    preferredUiTextureExtensions: viewerAssetLoaderPolicy.preferredUiTextureExtensions,
    geometryCompression: viewerAssetLoaderPolicy.geometryCompression,
  });
});

test("resolveSharedLoaderRegistryPolicy allows path and worker overrides without changing format policy", () => {
  assert.deepEqual(
    resolveSharedLoaderRegistryPolicy({
      dracoDecoderPath: "/custom/draco/",
      ktx2TranscoderPath: "/custom/basis/",
      ktx2WorkerLimit: 4,
    }),
    {
      dracoDecoderPath: "/custom/draco/",
      ktx2TranscoderPath: "/custom/basis/",
      ktx2WorkerLimit: 4,
      runtimeMaterialTextureExtensions: viewerAssetLoaderPolicy.runtimeMaterialTextureExtensions,
      preferredUiTextureExtensions: viewerAssetLoaderPolicy.preferredUiTextureExtensions,
      geometryCompression: viewerAssetLoaderPolicy.geometryCompression,
    },
  );
});
