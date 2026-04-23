export const fitKernelExecutionModes = ["wasm-preview", "static-fit"] as const;
export const fitKernelBufferTransports = [
  "transferable-array-buffer",
  "shared-array-buffer",
] as const;

export type FitKernelExecutionMode = (typeof fitKernelExecutionModes)[number];
export type FitKernelBufferTransport = (typeof fitKernelBufferTransports)[number];

export const defaultFitKernelExecutionMode: FitKernelExecutionMode = "wasm-preview";
export const defaultFitKernelBufferTransport: FitKernelBufferTransport = "transferable-array-buffer";

export const resolveFitKernelBufferTransport = (options?: {
  crossOriginIsolated?: boolean;
  sharedArrayBufferRequested?: boolean;
}): FitKernelBufferTransport => {
  if (options?.crossOriginIsolated && options.sharedArrayBufferRequested) {
    return "shared-array-buffer";
  }

  return "transferable-array-buffer";
};
