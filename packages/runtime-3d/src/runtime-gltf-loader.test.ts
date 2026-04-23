import test from "node:test";
import assert from "node:assert/strict";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import {
  configureRuntimeGLTFLoader,
  disposeRuntimeGLTFLoaderSupport,
  primeRuntimeGLTFLoaderSupport,
  runtimeDracoDecoderPath,
  runtimeKtx2TranscoderPath,
  runtimeKtx2WorkerLimit,
} from "./runtime-gltf-loader.js";

test.afterEach(() => {
  disposeRuntimeGLTFLoaderSupport();
});

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

test("primeRuntimeGLTFLoaderSupport configures a shared KTX2 loader and configureRuntimeGLTFLoader reuses it", () => {
  const originalDetectSupport = KTX2Loader.prototype.detectSupport;
  const originalSetTranscoderPath = KTX2Loader.prototype.setTranscoderPath;
  const originalSetWorkerLimit = KTX2Loader.prototype.setWorkerLimit;
  let detectSupportRenderer: unknown = null;
  let transcoderPath: string | null = null;
  let workerLimit: number | null = null;
  let assignedKtx2Loader: unknown = null;

  KTX2Loader.prototype.setTranscoderPath = function patchedSetTranscoderPath(path: string) {
    transcoderPath = path;
    return originalSetTranscoderPath.call(this, path);
  };

  KTX2Loader.prototype.setWorkerLimit = function patchedSetWorkerLimit(limit: number) {
    workerLimit = limit;
    return originalSetWorkerLimit.call(this, limit);
  };

  KTX2Loader.prototype.detectSupport = function detectSupport(renderer: unknown) {
    detectSupportRenderer = renderer;
    return this;
  };

  try {
    const fakeRenderer = { capabilities: {}, extensions: {}, properties: {} } as never;
    const ktx2Loader = primeRuntimeGLTFLoaderSupport(fakeRenderer);

    configureRuntimeGLTFLoader({
      setDRACOLoader() {},
      setMeshoptDecoder() {},
      setKTX2Loader(loader: unknown) {
        assignedKtx2Loader = loader;
      },
    });

    assert.equal(detectSupportRenderer, fakeRenderer);
    assert.equal(assignedKtx2Loader, ktx2Loader);
    assert.equal(transcoderPath, runtimeKtx2TranscoderPath);
    assert.equal(workerLimit, runtimeKtx2WorkerLimit);
  } finally {
    KTX2Loader.prototype.setTranscoderPath = originalSetTranscoderPath;
    KTX2Loader.prototype.setWorkerLimit = originalSetWorkerLimit;
    KTX2Loader.prototype.detectSupport = originalDetectSupport;
  }
});
