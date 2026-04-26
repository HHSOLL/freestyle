import {
  fitKernelXpbdDeformationBufferSchemaVersion,
  fitKernelXpbdPreviewSolveSchemaVersion,
  solveFitKernelXpbdPreview,
  type FitKernelXpbdDeformationBuffer,
  type FitKernelXpbdSolveInput,
} from "./xpbd-preview.js";

export const fitKernelWasmXpbdAbiVersion = "fit-kernel-wasm-xpbd.v1";

export const fitKernelWasmXpbdFallbackReasons = [
  "webassembly-unavailable",
  "artifact-missing",
  "artifact-init-failed",
  "artifact-export-missing",
  "artifact-solve-failed",
] as const;

export type FitKernelWasmXpbdFallbackReason =
  (typeof fitKernelWasmXpbdFallbackReasons)[number];

export type FitKernelWasmXpbdRuntimeMetadata = {
  abiVersion: typeof fitKernelWasmXpbdAbiVersion;
  solveSchemaVersion: typeof fitKernelXpbdPreviewSolveSchemaVersion;
  deformationSchemaVersion: typeof fitKernelXpbdDeformationBufferSchemaVersion;
  engineKind: "wasm-preview";
  executionMode: "wasm-preview";
};

export type FitKernelWasmXpbdModuleNamespace = {
  default?: (input?: string | URL) => Promise<unknown>;
  init?: (input?: string | URL) => Promise<unknown>;
  solve_xpbd_preview?: (inputJson: string) => string;
  xpbd_solver_metadata_json?: () => string;
};

export type FitKernelWasmXpbdCapability = {
  available: boolean;
  engineKind: "wasm-preview" | "cpu-xpbd-preview";
  executionMode: "wasm-preview" | "cpu-xpbd-preview";
  artifactSource: "wasm-artifact" | "cpu-fallback";
  fallbackReason?: FitKernelWasmXpbdFallbackReason;
  metadata?: FitKernelWasmXpbdRuntimeMetadata;
};

export type FitKernelWasmXpbdSolveResult = {
  deformation: FitKernelXpbdDeformationBuffer;
  capability: FitKernelWasmXpbdCapability;
};

export type FitKernelWasmXpbdAdapter = {
  getCapability(): Promise<FitKernelWasmXpbdCapability>;
  solve(input: FitKernelXpbdSolveInput): Promise<FitKernelWasmXpbdSolveResult>;
};

export type FitKernelWasmXpbdAdapterOptions = {
  wasmArtifactPath?: string | URL;
  loadModule?: () => Promise<FitKernelWasmXpbdModuleNamespace | null>;
  allowCpuFallback?: boolean;
  webAssembly?: unknown;
  cpuFallbackSolver?: (input: FitKernelXpbdSolveInput) => FitKernelXpbdDeformationBuffer;
};

type FitKernelWasmXpbdLoadedModule = {
  solve: (inputJson: string) => string;
  metadata: FitKernelWasmXpbdRuntimeMetadata;
};

const defaultMetadata = (): FitKernelWasmXpbdRuntimeMetadata => ({
  abiVersion: fitKernelWasmXpbdAbiVersion,
  solveSchemaVersion: fitKernelXpbdPreviewSolveSchemaVersion,
  deformationSchemaVersion: fitKernelXpbdDeformationBufferSchemaVersion,
  engineKind: "wasm-preview",
  executionMode: "wasm-preview",
});

const resolveWebAssemblyHandle = (options: FitKernelWasmXpbdAdapterOptions) =>
  Object.prototype.hasOwnProperty.call(options, "webAssembly")
    ? options.webAssembly
    : globalThis.WebAssembly;

const hasWebAssemblySupport = (value: unknown) =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toFloat32Array = (value: unknown, label: string) => {
  if (value instanceof Float32Array) {
    return new Float32Array(value);
  }
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  const typed = Float32Array.from(value);
  for (const entry of typed) {
    if (!Number.isFinite(entry)) {
      throw new Error(`${label} contains a non-finite value.`);
    }
  }
  return typed;
};

const normalizeMetadata = (value: unknown): FitKernelWasmXpbdRuntimeMetadata => {
  if (!isRecord(value)) {
    return defaultMetadata();
  }

  const candidate = {
    abiVersion: value.abiVersion,
    solveSchemaVersion: value.solveSchemaVersion,
    deformationSchemaVersion: value.deformationSchemaVersion,
    engineKind: value.engineKind,
    executionMode: value.executionMode,
  };

  if (
    candidate.abiVersion !== fitKernelWasmXpbdAbiVersion ||
    candidate.solveSchemaVersion !== fitKernelXpbdPreviewSolveSchemaVersion ||
    candidate.deformationSchemaVersion !== fitKernelXpbdDeformationBufferSchemaVersion ||
    candidate.engineKind !== "wasm-preview" ||
    candidate.executionMode !== "wasm-preview"
  ) {
    throw new Error("WASM XPBD metadata does not match the expected ABI contract.");
  }

  return candidate as FitKernelWasmXpbdRuntimeMetadata;
};

const normalizeDeformationBuffer = (value: unknown): FitKernelXpbdDeformationBuffer => {
  if (!isRecord(value)) {
    throw new Error("WASM XPBD solve output must be an object.");
  }
  if (value.schemaVersion !== fitKernelXpbdDeformationBufferSchemaVersion) {
    throw new Error(`Unexpected deformation schema version: ${String(value.schemaVersion)}`);
  }
  if (value.solverKind !== "xpbd-cloth-preview") {
    throw new Error(`Unexpected solver kind: ${String(value.solverKind)}`);
  }
  if (value.transferMode !== "fit-mesh-deformation-buffer") {
    throw new Error(`Unexpected transfer mode: ${String(value.transferMode)}`);
  }

  const positions = toFloat32Array(value.positions, "positions");
  const displacements = toFloat32Array(value.displacements, "displacements");
  const vertexCount = value.vertexCount;
  if (typeof vertexCount !== "number" || !Number.isInteger(vertexCount) || vertexCount <= 0) {
    throw new Error("vertexCount must be a positive integer.");
  }
  if (positions.length !== vertexCount * 3) {
    throw new Error("positions length does not match vertexCount.");
  }
  if (displacements.length !== positions.length) {
    throw new Error("displacements length must match positions length.");
  }

  return {
    schemaVersion: fitKernelXpbdDeformationBufferSchemaVersion,
    garmentId: String(value.garmentId ?? ""),
    sessionId: String(value.sessionId ?? ""),
    sequence: Number(value.sequence ?? 0),
    solverKind: "xpbd-cloth-preview",
    transferMode: "fit-mesh-deformation-buffer",
    vertexCount,
    positions,
    displacements,
    maxDisplacementMm: Number(value.maxDisplacementMm ?? 0),
    residualError: Number(value.residualError ?? 0),
    hasNaN: Boolean(value.hasNaN),
    iterations: Number(value.iterations ?? 0),
  };
};

const buildCapability = (
  available: boolean,
  fallbackReason?: FitKernelWasmXpbdFallbackReason,
  metadata?: FitKernelWasmXpbdRuntimeMetadata,
): FitKernelWasmXpbdCapability =>
  available
    ? {
        available: true,
        engineKind: "wasm-preview",
        executionMode: "wasm-preview",
        artifactSource: "wasm-artifact",
        metadata,
      }
    : {
        available: false,
        engineKind: "cpu-xpbd-preview",
        executionMode: "cpu-xpbd-preview",
        artifactSource: "cpu-fallback",
        fallbackReason,
      };

const createFallbackError = (reason: FitKernelWasmXpbdFallbackReason) =>
  new Error(`WASM XPBD unavailable: ${reason}`);

const parseSolveOutput = (outputJson: string) => {
  const parsed = JSON.parse(outputJson) as unknown;
  return normalizeDeformationBuffer(parsed);
};

const parseMetadataOutput = (outputJson: string | undefined) =>
  outputJson ? normalizeMetadata(JSON.parse(outputJson) as unknown) : defaultMetadata();

const serializeSolveInput = (input: FitKernelXpbdSolveInput) =>
  JSON.stringify({
    ...input,
    positions: Array.from(input.positions),
    previousPositions: input.previousPositions
      ? Array.from(input.previousPositions)
      : undefined,
    inverseMasses: Array.from(input.inverseMasses),
  });

export function createFitKernelWasmXpbdAdapter(
  options: FitKernelWasmXpbdAdapterOptions = {},
): FitKernelWasmXpbdAdapter {
  const cpuFallbackSolver = options.cpuFallbackSolver ?? solveFitKernelXpbdPreview;
  const allowCpuFallback = options.allowCpuFallback ?? true;
  const webAssemblyHandle = resolveWebAssemblyHandle(options);
  let loadPromise: Promise<FitKernelWasmXpbdLoadedModule | null> | null = null;

  const ensureLoadedModule = async () => {
    if (!hasWebAssemblySupport(webAssemblyHandle)) {
      return null;
    }
    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = (async () => {
      const namespace = (await options.loadModule?.()) ?? null;
      if (!namespace) {
        return null;
      }

      const initialize =
        typeof namespace.default === "function"
          ? namespace.default
          : typeof namespace.init === "function"
            ? namespace.init
            : undefined;

      if (initialize) {
        await initialize(options.wasmArtifactPath);
      }

      if (typeof namespace.solve_xpbd_preview !== "function") {
        throw createFallbackError("artifact-export-missing");
      }

      const metadata = parseMetadataOutput(namespace.xpbd_solver_metadata_json?.());
      return {
        solve: namespace.solve_xpbd_preview.bind(namespace),
        metadata,
      };
    })();

    return loadPromise;
  };

  const getCapability = async (): Promise<FitKernelWasmXpbdCapability> => {
    if (!hasWebAssemblySupport(webAssemblyHandle)) {
      return buildCapability(false, "webassembly-unavailable");
    }

    try {
      const loaded = await ensureLoadedModule();
      if (!loaded) {
        return buildCapability(false, "artifact-missing");
      }
      return buildCapability(true, undefined, loaded.metadata);
    } catch (error) {
      if (error instanceof Error && error.message.includes("artifact-export-missing")) {
        return buildCapability(false, "artifact-export-missing");
      }
      return buildCapability(false, "artifact-init-failed");
    }
  };

  return {
    getCapability,
    async solve(input) {
      const capability = await getCapability();
      if (capability.available) {
        try {
          const loaded = await ensureLoadedModule();
          if (!loaded) {
            throw createFallbackError("artifact-missing");
          }

          const deformation = parseSolveOutput(loaded.solve(serializeSolveInput(input)));
          return {
            deformation,
            capability,
          };
        } catch (error) {
          if (!allowCpuFallback) {
            throw error;
          }
          return {
            deformation: cpuFallbackSolver(input),
            capability: buildCapability(false, "artifact-solve-failed"),
          };
        }
      }

      if (!allowCpuFallback) {
        throw createFallbackError(capability.fallbackReason ?? "artifact-missing");
      }

      return {
        deformation: cpuFallbackSolver(input),
        capability,
      };
    },
  };
}
