import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { serverConfig } from "./serverConfig";

export type HumanDetectionMode = "none" | "face";

export type HumanSignals = {
  detector: "none" | "blazeface";
  faceCount: number;
  facesOverMinArea: number;
  maxFaceAreaRatio: number;
  elapsedMs: number;
};

type BlazeFacePrediction = {
  topLeft?: unknown;
  bottomRight?: unknown;
};

type BlazeFaceModel = {
  estimateFaces: (input: unknown, returnTensors?: boolean) => Promise<BlazeFacePrediction[]>;
};

type BlazeFaceModule = {
  load: (config?: { modelUrl?: string }) => Promise<BlazeFaceModel>;
};

type TfModule = {
  tensor3d: (values: Uint8Array, shape: [number, number, number], dtype: "int32") => unknown;
  ready?: () => Promise<void>;
  dispose?: (tensor: unknown) => void;
};

const defaultSignals = (): HumanSignals => ({
  detector: "none",
  faceCount: 0,
  facesOverMinArea: 0,
  maxFaceAreaRatio: 0,
  elapsedMs: 0,
});

const toNumberPoint = (value: unknown): [number, number] | null => {
  if (Array.isArray(value) && value.length >= 2) {
    const x = Number(value[0]);
    const y = Number(value[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) return [x, y];
    return null;
  }
  if (ArrayBuffer.isView(value) && "length" in value) {
    const numeric = value as unknown as ArrayLike<number>;
    if (numeric.length < 2) return null;
    const x = Number(numeric[0]);
    const y = Number(numeric[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) return [x, y];
    return null;
  }
  if (value && typeof value === "object") {
    const maybeTensor = value as { dataSync?: () => ArrayLike<number>; arraySync?: () => unknown };
    if (typeof maybeTensor.dataSync === "function") {
      const data = maybeTensor.dataSync();
      if (data.length >= 2) {
        const x = Number(data[0]);
        const y = Number(data[1]);
        if (Number.isFinite(x) && Number.isFinite(y)) return [x, y];
      }
    }
    if (typeof maybeTensor.arraySync === "function") {
      return toNumberPoint(maybeTensor.arraySync());
    }
  }
  return null;
};

let tfModulePromise: Promise<TfModule> | null = null;
let blazeFaceModelPromise: Promise<BlazeFaceModel> | null = null;

const loadTfModule = async (): Promise<TfModule> => {
  if (serverConfig.humanFaceModelSource === "local") {
    try {
      const tfNode = (await import(
        /* webpackIgnore: true */ "@tensorflow/tfjs-node"
      )) as unknown as TfModule;
      if (typeof tfNode.ready === "function") {
        await tfNode.ready();
      }
      return tfNode;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown tfjs-node import error";
      throw new Error(`Failed to load @tensorflow/tfjs-node for local model source: ${message}`);
    }
  }

  const tf = (await import("@tensorflow/tfjs")) as unknown as TfModule;
  if (typeof tf.ready === "function") {
    await tf.ready();
  }
  return tf;
};

const getTfModule = () => {
  tfModulePromise ??= loadTfModule();
  return tfModulePromise;
};

const loadBlazeFaceModel = async (): Promise<BlazeFaceModel> => {
  const mod = (await import("@tensorflow-models/blazeface")) as unknown as BlazeFaceModule;
  if (serverConfig.humanFaceModelSource === "local") {
    const modelPath = path.resolve(serverConfig.humanFaceModelPath);
    try {
      await fs.access(modelPath);
    } catch {
      throw new Error(`Local face model not found: ${modelPath}`);
    }
    return mod.load({ modelUrl: pathToFileURL(modelPath).toString() });
  }

  if (serverConfig.humanFaceModelUrl) {
    return mod.load({ modelUrl: serverConfig.humanFaceModelUrl });
  }
  return mod.load();
};

const getBlazeFaceModel = () => {
  blazeFaceModelPromise ??= loadBlazeFaceModel();
  return blazeFaceModelPromise;
};

export async function detectHumanSignals(
  imageBuffer: Buffer,
  opts: { mode: HumanDetectionMode; maxSide: number; minFaceAreaRatio: number }
): Promise<HumanSignals> {
  if (opts.mode === "none") {
    return defaultSignals();
  }

  const startedAt = Date.now();
  const resized = await sharp(imageBuffer)
    .rotate()
    .resize({
      width: opts.maxSide,
      height: opts.maxSide,
      fit: "inside",
      withoutEnlargement: true,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resized;
  const imageArea = Math.max(1, info.width * info.height);
  const tf = await getTfModule();
  const model = await getBlazeFaceModel();
  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, info.channels], "int32");

  try {
    const faces = await model.estimateFaces(tensor, false);
    let facesOverMinArea = 0;
    let maxFaceAreaRatio = 0;

    for (const face of faces) {
      const topLeft = toNumberPoint(face.topLeft);
      const bottomRight = toNumberPoint(face.bottomRight);
      if (!topLeft || !bottomRight) continue;

      const width = Math.max(0, bottomRight[0] - topLeft[0]);
      const height = Math.max(0, bottomRight[1] - topLeft[1]);
      const ratio = (width * height) / imageArea;
      if (!Number.isFinite(ratio) || ratio <= 0) continue;

      if (ratio >= opts.minFaceAreaRatio) {
        facesOverMinArea += 1;
        if (ratio > maxFaceAreaRatio) {
          maxFaceAreaRatio = ratio;
        }
      }
    }

    return {
      detector: "blazeface",
      faceCount: faces.length,
      facesOverMinArea,
      maxFaceAreaRatio,
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    if (typeof tf.dispose === "function") {
      tf.dispose(tensor);
    } else if (tensor && typeof tensor === "object" && "dispose" in (tensor as object)) {
      const candidate = tensor as { dispose?: () => void };
      candidate.dispose?.();
    }
  }
}
