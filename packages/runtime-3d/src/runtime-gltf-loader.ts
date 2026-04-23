"use client";

import { viewerAssetLoaderPolicy } from "@freestyle/shared-types";
import { useGLTF } from "@react-three/drei";
import type { WebGLRenderer } from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

export const runtimeDracoDecoderPath = viewerAssetLoaderPolicy.dracoDecoderPath;
export const runtimeKtx2TranscoderPath = viewerAssetLoaderPolicy.ktx2TranscoderPath;
export const runtimeKtx2WorkerLimit = viewerAssetLoaderPolicy.ktx2WorkerLimit;

type RuntimeGLTFLoader = {
  setDRACOLoader: (dracoLoader: DRACOLoader) => unknown;
  setMeshoptDecoder?: (decoder: typeof MeshoptDecoder) => unknown;
  setKTX2Loader?: (ktx2Loader: KTX2Loader) => unknown;
};

let sharedDracoLoader: DRACOLoader | null = null;
let sharedKtx2Loader: KTX2Loader | null = null;
let runtimeKtx2Renderer: WebGLRenderer | null = null;

const getSharedDracoLoader = () => {
  if (!sharedDracoLoader) {
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath(runtimeDracoDecoderPath);
  }

  return sharedDracoLoader;
};

export const primeRuntimeGLTFLoaderSupport = (renderer: WebGLRenderer) => {
  if (!sharedKtx2Loader) {
    sharedKtx2Loader = new KTX2Loader();
    sharedKtx2Loader.setTranscoderPath(runtimeKtx2TranscoderPath);
    sharedKtx2Loader.setWorkerLimit(runtimeKtx2WorkerLimit);
  }

  if (runtimeKtx2Renderer !== renderer) {
    sharedKtx2Loader.detectSupport(renderer);
    runtimeKtx2Renderer = renderer;
  }

  return sharedKtx2Loader;
};

export const disposeRuntimeGLTFLoaderSupport = () => {
  sharedKtx2Loader?.dispose();
  sharedKtx2Loader = null;
  runtimeKtx2Renderer = null;
};

export const configureRuntimeGLTFLoader = (loader: unknown) => {
  const runtimeLoader = loader as RuntimeGLTFLoader;
  runtimeLoader.setDRACOLoader(getSharedDracoLoader());
  runtimeLoader.setMeshoptDecoder?.(MeshoptDecoder);
  if (sharedKtx2Loader) {
    runtimeLoader.setKTX2Loader?.(sharedKtx2Loader);
  }
};

export const useRuntimeGLTF = (modelPath: string) =>
  useGLTF(modelPath, false, true, configureRuntimeGLTFLoader);

export const preloadRuntimeModelPath = (modelPath: string) => {
  useGLTF.preload(modelPath, false, true, configureRuntimeGLTFLoader);
};
