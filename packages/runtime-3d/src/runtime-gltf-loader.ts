"use client";

import { useGLTF } from "@react-three/drei";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export const runtimeDracoDecoderPath = "/draco/gltf/";

type RuntimeGLTFLoader = {
  setDRACOLoader: (dracoLoader: DRACOLoader) => unknown;
  setMeshoptDecoder?: (decoder: typeof MeshoptDecoder) => unknown;
};

export const configureRuntimeGLTFLoader = (loader: unknown) => {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(runtimeDracoDecoderPath);

  const runtimeLoader = loader as RuntimeGLTFLoader;
  runtimeLoader.setDRACOLoader(dracoLoader);
  runtimeLoader.setMeshoptDecoder?.(MeshoptDecoder);
};

export const useRuntimeGLTF = (modelPath: string) =>
  useGLTF(modelPath, false, true, configureRuntimeGLTFLoader);

export const preloadRuntimeModelPath = (modelPath: string) => {
  useGLTF.preload(modelPath, false, true, configureRuntimeGLTFLoader);
};
