import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

type PreviewWorkerTestMessage = {
  type?: string;
  metrics?: {
    solverKind?: string;
    executionMode?: string;
  };
  deformation?: {
    transferMode?: string;
    buffer?: {
      solverKind?: string;
      vertexCount?: number;
      byteLength?: number;
    };
    buffers?: {
      positions?: ArrayBuffer;
      displacements?: ArrayBuffer;
    };
  };
};

type PreviewWorkerTestContext = {
  globalThis?: PreviewWorkerTestContext;
  performance: {
    now: () => number;
  };
  postMessage: (message: unknown, transfer?: readonly ArrayBuffer[]) => void;
  onmessage?: (event: { data: unknown }) => void;
};

const loadPreviewWorker = () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "apps/web/public/workers/reference-closet-stage-preview.worker.js"),
    "utf8",
  );
  const posted: Array<{ message: PreviewWorkerTestMessage; transfer?: readonly ArrayBuffer[] }> = [];
  const context: PreviewWorkerTestContext = {
    performance: {
      now: () => Date.now(),
    },
    postMessage: (message: unknown, transfer?: readonly ArrayBuffer[]) => {
      posted.push({ message: message as PreviewWorkerTestMessage, transfer });
    },
  };
  context.globalThis = context;
  vm.createContext(context as vm.Context);
  vm.runInContext(source, context, {
    filename: "reference-closet-stage-preview.worker.js",
  });
  return {
    post: (data: unknown) => context.onmessage?.({ data }),
    posted,
  };
};

const previewFrame = {
  schemaVersion: "preview-simulation-frame.v1",
  sessionId: "xpbd-worker-session",
  sequence: 1,
  backend: "cpu-xpbd",
  elapsedTimeSeconds: 1 / 60,
  deltaSeconds: 1 / 60,
  featureSnapshot: {
    hasWorker: true,
    hasOffscreenCanvas: false,
    hasWebGPU: false,
    crossOriginIsolated: false,
  },
  currentAnchorWorld: [0, 1.4, 0],
  state: {
    initialized: true,
    lastAnchorWorld: [0, 1.4, 0],
    rotationRad: [0, 0, 0],
    rotationVelocity: [0, 0, 0],
    positionOffset: [0, 0, 0],
    positionVelocity: [0, 0, 0],
  },
  config: {
    profileId: "garment-loose",
    stiffness: 7.5,
    damping: 3.1,
    influence: 0.9,
    looseness: 1.08,
    scaleCompensation: 1,
    maxYawDeg: 16,
    maxPitchDeg: 12,
    maxRollDeg: 8,
    baseOffsetY: 0.03,
  },
} as const;

test("same-origin preview worker emits cpu-xpbd fit-mesh deformation buffers", () => {
  const worker = loadPreviewWorker();
  worker.post({ type: "INIT_SOLVER", backend: "transferable-array-buffer" });
  worker.post({
    type: "SET_GARMENT_FIT_MESH",
    garmentId: "starter-top-soft-casual",
    fitMesh: {
      schemaVersion: "garment-sim-proxy.v1",
      runtimeStarterId: "starter-top-soft-casual",
    },
    xpbdFitMesh: {
      schemaVersion: "preview-xpbd-fit-mesh.v1",
      positions: [0, 0, 0, 0.24, 0, 0, 0, -0.24, 0],
      inverseMasses: [0, 1, 1],
      iterations: 8,
      gravity: [0, 0, 0],
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
          restLengthMeters: 0.12,
        },
      ],
    },
  });
  worker.post({
    type: "SOLVE_PREVIEW",
    garmentId: "starter-top-soft-casual",
    frame: previewFrame,
  });

  const result = worker.posted.find((entry) => entry.message.type === "PREVIEW_FRAME_RESULT");
  const deformation = worker.posted.find((entry) => entry.message.type === "PREVIEW_DEFORMATION");

  if (!result?.message.metrics) {
    throw new Error("Expected a preview result envelope.");
  }
  if (!deformation?.message.deformation?.buffer || !deformation.message.deformation.buffers) {
    throw new Error("Expected a preview deformation envelope with XPBD buffers.");
  }

  assert.equal(result.message.metrics.solverKind, "xpbd-cloth-preview");
  assert.equal(result.message.metrics.executionMode, "cpu-xpbd-preview");
  assert.equal(deformation.message.deformation.transferMode, "fit-mesh-deformation-buffer");
  assert.equal(deformation.message.deformation.buffer.solverKind, "xpbd-cloth-preview");
  assert.equal(deformation.message.deformation.buffer.vertexCount, 3);
  assert.equal(deformation.message.deformation.buffer.byteLength, 72);
  assert.equal(deformation.transfer?.length, 2);
  assert.equal(deformation.message.deformation.buffers.positions?.byteLength, 36);
  assert.equal(deformation.message.deformation.buffers.displacements?.byteLength, 36);
});
