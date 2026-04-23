import { viewerAssetLoaderPolicy } from "@freestyle/shared-types";
import type { WebGLRenderer } from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

export type SharedLoaderRegistryOptions = {
  dracoDecoderPath?: string;
  ktx2TranscoderPath?: string;
  ktx2WorkerLimit?: number;
};

export type SharedLoaderRegistry = {
  createGLTFLoader: () => GLTFLoader;
  dracoLoader: DRACOLoader;
  ktx2Loader: KTX2Loader;
  meshoptDecoder: typeof MeshoptDecoder;
  policy: {
    dracoDecoderPath: string;
    ktx2TranscoderPath: string;
    ktx2WorkerLimit: number;
    runtimeMaterialTextureExtensions: readonly string[];
    preferredUiTextureExtensions: readonly string[];
    geometryCompression: {
      draco: string;
      meshopt: string;
    };
  };
  dispose: () => void;
};

export const resolveSharedLoaderRegistryPolicy = ({
  dracoDecoderPath = viewerAssetLoaderPolicy.dracoDecoderPath,
  ktx2TranscoderPath = viewerAssetLoaderPolicy.ktx2TranscoderPath,
  ktx2WorkerLimit = viewerAssetLoaderPolicy.ktx2WorkerLimit,
}: SharedLoaderRegistryOptions = {}) => ({
  dracoDecoderPath,
  ktx2TranscoderPath,
  ktx2WorkerLimit,
  runtimeMaterialTextureExtensions: viewerAssetLoaderPolicy.runtimeMaterialTextureExtensions,
  preferredUiTextureExtensions: viewerAssetLoaderPolicy.preferredUiTextureExtensions,
  geometryCompression: viewerAssetLoaderPolicy.geometryCompression,
});

export const createSharedLoaderRegistry = (
  renderer: WebGLRenderer,
  options: SharedLoaderRegistryOptions = {},
): SharedLoaderRegistry => {
  const policy = resolveSharedLoaderRegistryPolicy(options);
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(policy.dracoDecoderPath);

  const ktx2Loader = new KTX2Loader();
  ktx2Loader.setTranscoderPath(policy.ktx2TranscoderPath);
  ktx2Loader.setWorkerLimit(policy.ktx2WorkerLimit);
  ktx2Loader.detectSupport(renderer);

  const createGLTFLoader = () => {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.setKTX2Loader(ktx2Loader);
    loader.setMeshoptDecoder(MeshoptDecoder);
    return loader;
  };

  return {
    createGLTFLoader,
    dracoLoader,
    ktx2Loader,
    meshoptDecoder: MeshoptDecoder,
    policy,
    dispose() {
      ktx2Loader.dispose();
    },
  };
};
