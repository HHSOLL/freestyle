import test from "node:test";
import assert from "node:assert/strict";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { configureRuntimeGLTFLoader, runtimeDracoDecoderPath } from "./runtime-gltf-loader.js";

test("configureRuntimeGLTFLoader installs DRACO and meshopt decoders on runtime loaders", () => {
  let assignedDracoLoader: unknown = null;
  let assignedMeshoptDecoder: unknown = null;

  configureRuntimeGLTFLoader({
    setDRACOLoader(dracoLoader: unknown) {
      assignedDracoLoader = dracoLoader;
    },
    setMeshoptDecoder(decoder: typeof MeshoptDecoder) {
      assignedMeshoptDecoder = decoder;
    },
  });

  assert.ok(assignedDracoLoader);
  assert.equal((assignedDracoLoader as { decoderPath?: string }).decoderPath, runtimeDracoDecoderPath);
  assert.equal(assignedMeshoptDecoder, MeshoptDecoder);
});

test("configureRuntimeGLTFLoader tolerates loaders without meshopt support", () => {
  let assignedDracoLoader: unknown = null;

  assert.doesNotThrow(() =>
    configureRuntimeGLTFLoader({
      setDRACOLoader(dracoLoader: unknown) {
        assignedDracoLoader = dracoLoader;
      },
    }),
  );

  assert.ok(assignedDracoLoader);
  assert.equal((assignedDracoLoader as { decoderPath?: string }).decoderPath, runtimeDracoDecoderPath);
});
