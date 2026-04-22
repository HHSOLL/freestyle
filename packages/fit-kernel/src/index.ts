export type FitKernelExecutionMode = "wasm-preview" | "static-fit";
export type FitKernelBufferTransport = "transferable-array-buffer" | "shared-array-buffer";

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
