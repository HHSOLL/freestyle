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
  dispose: () => void;
};

export const createSharedLoaderRegistry = (
  renderer: WebGLRenderer,
  {
    dracoDecoderPath = "/draco/gltf/",
    ktx2TranscoderPath = "/basis/",
    ktx2WorkerLimit = 2,
  }: SharedLoaderRegistryOptions = {},
): SharedLoaderRegistry => {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(dracoDecoderPath);

  const ktx2Loader = new KTX2Loader();
  ktx2Loader.setTranscoderPath(ktx2TranscoderPath);
  ktx2Loader.setWorkerLimit(ktx2WorkerLimit);
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
    dispose() {
      ktx2Loader.dispose();
    },
  };
};
