import assert from "node:assert/strict";
import test from "node:test";

import {
  createFitKernelWasmXpbdAdapter,
  fitKernelWasmXpbdAbiVersion,
} from "./wasm-xpbd.js";
import {
  fitKernelXpbdDeformationBufferSchemaVersion,
  fitKernelXpbdPreviewSolveSchemaVersion,
  solveFitKernelXpbdPreview,
  type FitKernelXpbdSolveInput,
} from "./xpbd-preview.js";

const sampleSolveInput: FitKernelXpbdSolveInput = {
  schemaVersion: fitKernelXpbdPreviewSolveSchemaVersion,
  sessionId: "session-a",
  garmentId: "garment-a",
  sequence: 5,
  positions: new Float32Array([0, 0, 0, 0.15, 1, 0]),
  previousPositions: new Float32Array([0, 0, 0, 0.2, 1.05, 0]),
  inverseMasses: new Float32Array([0, 1]),
  constraints: [
    {
      kind: "pin",
      particle: 0,
      target: [0, 0, 0],
    },
    {
      kind: "stretch",
      particleA: 0,
      particleB: 1,
      restLengthMeters: 1,
    },
  ],
  iterations: 5,
  deltaSeconds: 1 / 60,
  gravity: [0, -9.81, 0],
  damping: 0.98,
};

test("wasm XPBD adapter reports CPU fallback when WebAssembly is unavailable", async () => {
  const adapter = createFitKernelWasmXpbdAdapter({
    webAssembly: null,
  });

  const capability = await adapter.getCapability();

  assert.deepEqual(capability, {
    available: false,
    engineKind: "cpu-xpbd-preview",
    executionMode: "cpu-xpbd-preview",
    artifactSource: "cpu-fallback",
    fallbackReason: "webassembly-unavailable",
  });
});

test("wasm XPBD adapter marks CPU fallback explicitly when no artifact loader is configured", async () => {
  const adapter = createFitKernelWasmXpbdAdapter({
    webAssembly: {},
  });

  const result = await adapter.solve(sampleSolveInput);

  assert.equal(result.capability.available, false);
  assert.equal(result.capability.engineKind, "cpu-xpbd-preview");
  assert.equal(result.capability.executionMode, "cpu-xpbd-preview");
  assert.equal(result.capability.fallbackReason, "artifact-missing");
  assert.equal(result.deformation.schemaVersion, fitKernelXpbdDeformationBufferSchemaVersion);
  assert.equal(result.deformation.transferMode, "fit-mesh-deformation-buffer");
});

test("wasm XPBD adapter executes the artifact contract when a wasm module is present", async () => {
  let initializedWith: string | URL | undefined;
  let solveCalls = 0;
  const expected = solveFitKernelXpbdPreview(sampleSolveInput);

  const moduleNamespace = {
    default: async (input?: string | URL) => {
      initializedWith = input;
    },
    xpbd_solver_metadata_json: () =>
      JSON.stringify({
        abiVersion: fitKernelWasmXpbdAbiVersion,
        solveSchemaVersion: fitKernelXpbdPreviewSolveSchemaVersion,
        deformationSchemaVersion: fitKernelXpbdDeformationBufferSchemaVersion,
        engineKind: "wasm-preview",
        executionMode: "wasm-preview",
      }),
    solve_xpbd_preview: (inputJson: string) => {
      solveCalls += 1;
      const parsed = JSON.parse(inputJson) as FitKernelXpbdSolveInput;
      const result = solveFitKernelXpbdPreview({
        ...parsed,
        positions: Float32Array.from(parsed.positions),
        previousPositions: parsed.previousPositions
          ? Float32Array.from(parsed.previousPositions)
          : undefined,
        inverseMasses: Float32Array.from(parsed.inverseMasses),
      });

      return JSON.stringify({
        ...result,
        positions: Array.from(result.positions),
        displacements: Array.from(result.displacements),
      });
    },
  };

  const adapter = createFitKernelWasmXpbdAdapter({
    webAssembly: {},
    wasmArtifactPath: "/tmp/fit-kernel_bg.wasm",
    loadModule: async () => moduleNamespace,
  });

  const capability = await adapter.getCapability();
  const result = await adapter.solve(sampleSolveInput);

  assert.equal(initializedWith, "/tmp/fit-kernel_bg.wasm");
  assert.equal(solveCalls, 1);
  assert.deepEqual(capability, {
    available: true,
    engineKind: "wasm-preview",
    executionMode: "wasm-preview",
    artifactSource: "wasm-artifact",
    metadata: {
      abiVersion: fitKernelWasmXpbdAbiVersion,
      solveSchemaVersion: fitKernelXpbdPreviewSolveSchemaVersion,
      deformationSchemaVersion: fitKernelXpbdDeformationBufferSchemaVersion,
      engineKind: "wasm-preview",
      executionMode: "wasm-preview",
    },
  });
  assert.equal(result.capability.available, true);
  assert.equal(result.capability.engineKind, "wasm-preview");
  assert.deepEqual(Array.from(result.deformation.positions), Array.from(expected.positions));
  assert.deepEqual(
    Array.from(result.deformation.displacements),
    Array.from(expected.displacements),
  );
});

test("wasm XPBD adapter falls back honestly when the artifact solve path fails", async () => {
  const adapter = createFitKernelWasmXpbdAdapter({
    webAssembly: {},
    loadModule: async () => ({
      solve_xpbd_preview: () => {
        throw new Error("boom");
      },
    }),
  });

  const result = await adapter.solve(sampleSolveInput);

  assert.equal(result.capability.available, false);
  assert.equal(result.capability.fallbackReason, "artifact-solve-failed");
  assert.equal(result.capability.engineKind, "cpu-xpbd-preview");
});

test("wasm XPBD adapter can fail closed when CPU fallback is disabled", async () => {
  const adapter = createFitKernelWasmXpbdAdapter({
    webAssembly: {},
    allowCpuFallback: false,
  });

  await assert.rejects(
    () => adapter.solve(sampleSolveInput),
    /WASM XPBD unavailable: artifact-missing/,
  );
});
