#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const artifactDir = path.join(root, "apps/web/public/workers/fit-kernel-wasm");
const gluePath = path.join(artifactDir, "freestyle_fit_kernel.js");
const wasmPath = path.join(artifactDir, "freestyle_fit_kernel_bg.wasm");

const [glue, wasm, wasmStat] = await Promise.all([
  readFile(gluePath, "utf8"),
  readFile(wasmPath),
  stat(wasmPath),
]);

const requiredGlueSymbols = [
  "wasm_bindgen",
  "solve_xpbd_preview",
  "xpbd_solver_metadata_json",
];
for (const symbol of requiredGlueSymbols) {
  if (!glue.includes(symbol)) {
    throw new Error(`fit-kernel WASM glue is missing ${symbol}. Run npm run build:fit-kernel:wasm.`);
  }
}

if (wasmStat.size <= 0) {
  throw new Error("fit-kernel WASM artifact is empty.");
}

await WebAssembly.compile(wasm);

const context = {
  WebAssembly,
  TextDecoder,
  TextEncoder,
  console,
  __wasmBytes: new Uint8Array(wasm),
};
vm.createContext(context);
vm.runInContext(glue, context, {
  filename: "freestyle_fit_kernel.js",
});
await vm.runInContext("wasm_bindgen({ module_or_path: __wasmBytes })", context);
const metadata = JSON.parse(vm.runInContext("wasm_bindgen.xpbd_solver_metadata_json()", context));
if (metadata.abiVersion !== "fit-kernel-wasm-xpbd.v1") {
  throw new Error(`Unexpected fit-kernel WASM ABI version: ${metadata.abiVersion}`);
}
context.__solveInput = JSON.stringify({
  schemaVersion: "xpbd-preview-solve.v1",
  sessionId: "verify-fit-kernel-wasm",
  garmentId: "verify-garment",
  sequence: 1,
  positions: [0, 0, 0, 0.24, 0, 0, 0, -0.24, 0],
  inverseMasses: [0, 1, 1],
  constraints: [
    {
      kind: "pin",
      particle: 0,
      target: [0, 0, 0],
    },
  ],
  iterations: 4,
  deltaSeconds: 1 / 60,
  gravity: [0, 0, 0],
  damping: 0.985,
});
const solveOutput = JSON.parse(
  vm.runInContext("wasm_bindgen.solve_xpbd_preview(__solveInput)", context),
);
if (
  solveOutput.schemaVersion !== "preview-fit-mesh-deformation-buffer.v1" ||
  solveOutput.solverKind !== "xpbd-cloth-preview" ||
  solveOutput.vertexCount !== 3
) {
  throw new Error("fit-kernel WASM solve output does not match the XPBD deformation contract.");
}

const report = {
  schemaVersion: "fit-kernel-wasm-artifact.v1",
  generatedAt: new Date().toISOString(),
  gluePath: path.relative(root, gluePath),
  wasmPath: path.relative(root, wasmPath),
  wasmBytes: wasmStat.size,
  abiVersion: metadata.abiVersion,
  solveSchemaVersion: metadata.solveSchemaVersion,
  deformationSchemaVersion: metadata.deformationSchemaVersion,
  smokeSolveVertexCount: solveOutput.vertexCount,
  target: "wasm-bindgen-no-modules",
  browserWorkerPath: "apps/web/public/workers/reference-closet-stage-preview.worker.js",
};

console.log(JSON.stringify(report, null, 2));
