export const viewerDracoDecoderPath = "/draco/gltf/" as const;
export const viewerKtx2TranscoderPath = "/basis/" as const;
export const viewerKtx2WorkerLimit = 2 as const;

export const viewerKtx2TranscoderFiles = ["basis_transcoder.js", "basis_transcoder.wasm"] as const;

export const viewerRuntimeMaterialTextureExtensions = [".ktx2"] as const;
export const viewerPreferredUiTextureExtensions = [".webp", ".avif"] as const;

export const viewerGeometryCompressionPolicy = Object.freeze({
  draco: "download-size-priority",
  meshopt: "decode-latency-priority",
});

export const viewerAssetLoaderPolicy = Object.freeze({
  dracoDecoderPath: viewerDracoDecoderPath,
  ktx2TranscoderPath: viewerKtx2TranscoderPath,
  ktx2WorkerLimit: viewerKtx2WorkerLimit,
  ktx2TranscoderFiles: viewerKtx2TranscoderFiles,
  runtimeMaterialTextureExtensions: viewerRuntimeMaterialTextureExtensions,
  preferredUiTextureExtensions: viewerPreferredUiTextureExtensions,
  geometryCompression: viewerGeometryCompressionPolicy,
});

export type ViewerAssetLoaderPolicy = typeof viewerAssetLoaderPolicy;
