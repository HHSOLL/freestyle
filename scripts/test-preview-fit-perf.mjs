import { performance } from "node:perf_hooks";
import {
  fitKernelXpbdPreviewSolveSchemaVersion,
  solveFitKernelXpbdPreview,
} from "@freestyle/fit-kernel";

const width = 12;
const height = 12;
const vertexCount = width * height;
const spacing = 0.08;
const positions = new Float32Array(vertexCount * 3);
const inverseMasses = new Float32Array(vertexCount);
const constraints = [];

const vertexIndex = (x, y) => y * width + x;

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const index = vertexIndex(x, y);
    positions[index * 3] = (x - (width - 1) / 2) * spacing;
    positions[index * 3 + 1] = 1 - y * spacing;
    positions[index * 3 + 2] = 0;
    inverseMasses[index] = y === 0 ? 0 : 1;
    if (y === 0) {
      constraints.push({
        kind: "pin",
        particle: index,
        target: [
          positions[index * 3],
          positions[index * 3 + 1],
          positions[index * 3 + 2],
        ],
      });
    }
    if (x > 0) {
      constraints.push({
        kind: "stretch",
        particleA: vertexIndex(x - 1, y),
        particleB: index,
        restLengthMeters: spacing,
      });
    }
    if (y > 0) {
      constraints.push({
        kind: "stretch",
        particleA: vertexIndex(x, y - 1),
        particleB: index,
        restLengthMeters: spacing,
      });
    }
    if (x > 0 && y > 0) {
      constraints.push({
        kind: "shear",
        particleA: vertexIndex(x - 1, y - 1),
        particleB: index,
        restLengthMeters: Math.hypot(spacing, spacing),
        compliance: 0.00002,
      });
    }
  }
}

constraints.push({
  kind: "sphere-collision",
  particle: vertexIndex(Math.floor(width / 2), Math.floor(height / 2)),
  center: [0, 0.56, 0],
  radiusMeters: 0.12,
  marginMeters: 0.004,
  friction: 0.4,
});

const runSolve = (sequence) =>
  solveFitKernelXpbdPreview({
    schemaVersion: fitKernelXpbdPreviewSolveSchemaVersion,
    sessionId: "preview-perf",
    garmentId: "perf-cloth-fit-mesh",
    sequence,
    positions,
    previousPositions: positions,
    inverseMasses,
    constraints,
    iterations: 16,
    deltaSeconds: 1 / 60,
    gravity: [0, -9.81, 0],
  });

for (let i = 0; i < 10; i += 1) {
  runSolve(i);
}

const samples = [];
let lastResult;
for (let i = 0; i < 80; i += 1) {
  const startedAt = performance.now();
  lastResult = runSolve(i + 10);
  samples.push(performance.now() - startedAt);
}

samples.sort((left, right) => left - right);
const percentile = (value) => samples[Math.min(samples.length - 1, Math.floor(samples.length * value))] ?? 0;
const p95 = percentile(0.95);
const deformationBufferBytes =
  (lastResult?.positions.byteLength ?? 0) + (lastResult?.displacements.byteLength ?? 0);
const result = {
  schemaVersion: "preview-fit-perf-report.v1",
  sampleCount: samples.length,
  vertexCount,
  constraintCount: constraints.length,
  solverKind: lastResult?.solverKind ?? "xpbd-cloth-preview",
  transferMode: lastResult?.transferMode ?? "fit-mesh-deformation-buffer",
  p50Ms: Number(percentile(0.5).toFixed(4)),
  p95Ms: Number(p95.toFixed(4)),
  maxMs: Number((samples.at(-1) ?? 0).toFixed(4)),
  deformationBufferBytes,
  bytesPerVertex: Number((deformationBufferBytes / vertexCount).toFixed(2)),
  hasNaN: lastResult?.hasNaN ?? true,
  maxDisplacementMm: lastResult?.maxDisplacementMm ?? 0,
  pass: p95 < 120 && deformationBufferBytes > 0 && lastResult?.hasNaN === false,
};

console.log(JSON.stringify(result, null, 2));

if (!result.pass) {
  process.exitCode = 1;
}
