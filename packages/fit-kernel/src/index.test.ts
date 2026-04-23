import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultFitKernelBufferTransport,
  defaultFitKernelExecutionMode,
  fitKernelBufferTransports,
  fitKernelExecutionModes,
  resolveFitKernelBufferTransport,
} from "./index.js";

test("fit-kernel exposes canonical execution modes and transports", () => {
  assert.deepEqual(fitKernelExecutionModes, ["wasm-preview", "static-fit"]);
  assert.deepEqual(fitKernelBufferTransports, [
    "transferable-array-buffer",
    "shared-array-buffer",
  ]);
  assert.equal(defaultFitKernelExecutionMode, "wasm-preview");
  assert.equal(defaultFitKernelBufferTransport, "transferable-array-buffer");
});

test("fit-kernel only enables SharedArrayBuffer on the optional fast path", () => {
  assert.equal(resolveFitKernelBufferTransport(), "transferable-array-buffer");
  assert.equal(
    resolveFitKernelBufferTransport({
      crossOriginIsolated: true,
      sharedArrayBufferRequested: true,
    }),
    "shared-array-buffer",
  );
});
