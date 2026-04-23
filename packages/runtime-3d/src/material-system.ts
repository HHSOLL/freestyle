import * as THREE from "three";
import type { QualityTier } from "@freestyle/shared-types";

export type RuntimeMaterialClass =
  | "skin"
  | "hair"
  | "eye"
  | "cotton"
  | "denim"
  | "leather"
  | "rubber"
  | "knit"
  | "synthetic";

export type RuntimeMaterialCalibration = {
  materialClass: RuntimeMaterialClass;
  side: THREE.Side;
  roughnessFloor: number;
  metalnessCeiling: number;
  envMapIntensity: number;
  alphaTest: number;
  transparent: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  colorOffset?: {
    hue: number;
    saturation: number;
    lightness: number;
  };
  emissive?: {
    color: string;
    intensity: number;
  };
};

const normalizeMaterialName = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

export const isHairLikeName = (name: string) => {
  const normalized = normalizeMaterialName(name);
  return (
    normalized.includes("hair") ||
    normalized.includes("long01") ||
    normalized.includes("short01") ||
    normalized.includes("short02") ||
    normalized.includes("short03") ||
    normalized.includes("short04") ||
    normalized.includes("bob01") ||
    normalized.includes("bob02") ||
    normalized.includes("braid01") ||
    normalized.includes("ponytail01") ||
    normalized.includes("afro01")
  );
};

export const isAlphaCardName = (name: string) => {
  const normalized = normalizeMaterialName(name);
  return (
    isHairLikeName(name) ||
    normalized.includes("eyebrow") ||
    normalized.includes("eyelash") ||
    normalized.includes("lash")
  );
};

export const isBodyLikeName = (name: string) => normalizeMaterialName(name).includes("body");

export const isEyeLikeName = (name: string) => {
  const normalized = normalizeMaterialName(name);
  return normalized.includes("eye") || normalized.includes("iris") || normalized.includes("pupil");
};

export const inferRuntimeMaterialClass = (name: string): RuntimeMaterialClass => {
  const normalized = normalizeMaterialName(name);

  if (isBodyLikeName(name)) return "skin";
  if (isEyeLikeName(name)) return "eye";
  if (isHairLikeName(name)) return "hair";
  if (normalized.includes("denim")) return "denim";
  if (normalized.includes("leather")) return "leather";
  if (normalized.includes("rubber") || normalized.includes("sole")) return "rubber";
  if (normalized.includes("knit")) return "knit";
  return isAlphaCardName(name) ? "synthetic" : "cotton";
};

export const resolveRuntimeMaterialCalibration = ({
  name,
  avatarOnly,
  qualityTier,
}: {
  name: string;
  avatarOnly: boolean;
  qualityTier: QualityTier;
}): RuntimeMaterialCalibration => {
  const materialClass = inferRuntimeMaterialClass(name);
  const alphaCard = isAlphaCardName(name);
  const lowQuality = qualityTier === "low";

  switch (materialClass) {
    case "eye":
      return {
        materialClass,
        side: THREE.FrontSide,
        roughnessFloor: 0.02,
        metalnessCeiling: 0.02,
        envMapIntensity: avatarOnly ? 1.68 : 1.4,
        alphaTest: 0,
        transparent: false,
        castShadow: false,
        receiveShadow: true,
        colorOffset: { hue: 0, saturation: 0.012, lightness: avatarOnly ? 0.022 : 0.012 },
        emissive: avatarOnly ? { color: "#1f2530", intensity: 0.016 } : undefined,
      };
    case "skin":
      return {
        materialClass,
        side: THREE.FrontSide,
        roughnessFloor: avatarOnly ? 0.26 : 0.3,
        metalnessCeiling: 0.08,
        envMapIntensity: avatarOnly ? 1.12 : 0.92,
        alphaTest: 0,
        transparent: false,
        castShadow: !lowQuality,
        receiveShadow: true,
        colorOffset: { hue: 0.008, saturation: avatarOnly ? 0.038 : 0.02, lightness: avatarOnly ? 0.05 : 0.026 },
        emissive: avatarOnly ? { color: "#4b2f24", intensity: 0.012 } : undefined,
      };
    case "hair":
      return {
        materialClass,
        side: alphaCard ? THREE.DoubleSide : THREE.FrontSide,
        roughnessFloor: 0.18,
        metalnessCeiling: 0.08,
        envMapIntensity: 1.08,
        alphaTest: alphaCard ? 0.46 : 0,
        transparent: false,
        castShadow: false,
        receiveShadow: !alphaCard,
        colorOffset: { hue: 0.006, saturation: 0.02, lightness: avatarOnly ? -0.008 : 0 },
        emissive: avatarOnly ? { color: "#241d1a", intensity: 0.008 } : undefined,
      };
    case "denim":
      return {
        materialClass,
        side: THREE.FrontSide,
        roughnessFloor: 0.56,
        metalnessCeiling: 0.08,
        envMapIntensity: 1.04,
        alphaTest: 0,
        transparent: false,
        castShadow: !lowQuality,
        receiveShadow: true,
      };
    case "leather":
      return {
        materialClass,
        side: THREE.FrontSide,
        roughnessFloor: 0.24,
        metalnessCeiling: 0.1,
        envMapIntensity: 1.16,
        alphaTest: 0,
        transparent: false,
        castShadow: !lowQuality,
        receiveShadow: true,
      };
    case "rubber":
      return {
        materialClass,
        side: THREE.FrontSide,
        roughnessFloor: 0.68,
        metalnessCeiling: 0.04,
        envMapIntensity: 0.76,
        alphaTest: 0,
        transparent: false,
        castShadow: !lowQuality,
        receiveShadow: true,
      };
    case "knit":
      return {
        materialClass,
        side: THREE.FrontSide,
        roughnessFloor: 0.62,
        metalnessCeiling: 0.06,
        envMapIntensity: 0.94,
        alphaTest: 0,
        transparent: false,
        castShadow: !lowQuality,
        receiveShadow: true,
      };
    case "synthetic":
      return {
        materialClass,
        side: alphaCard ? THREE.DoubleSide : THREE.FrontSide,
        roughnessFloor: alphaCard ? 0.42 : 0.38,
        metalnessCeiling: 0.06,
        envMapIntensity: alphaCard ? 0.62 : 0.9,
        alphaTest: alphaCard ? 0.46 : 0,
        transparent: false,
        castShadow: false,
        receiveShadow: !alphaCard,
      };
    case "cotton":
    default:
      return {
        materialClass,
        side: THREE.FrontSide,
        roughnessFloor: 0.34,
        metalnessCeiling: 0.08,
        envMapIntensity: 1.04,
        alphaTest: 0,
        transparent: false,
        castShadow: !lowQuality,
        receiveShadow: true,
      };
  }
};

export const applyRuntimeMaterialCalibration = (
  material: THREE.Material,
  calibration: RuntimeMaterialCalibration,
) => {
  const shadedMaterial = material as THREE.Material & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
    roughness?: number;
    metalness?: number;
    envMapIntensity?: number;
    alphaTest?: number;
  };

  material.side = calibration.side;
  material.transparent = calibration.transparent;
  material.depthWrite = true;
  material.depthTest = true;

  if (typeof shadedMaterial.roughness === "number") {
    shadedMaterial.roughness = Math.min(1, Math.max(calibration.roughnessFloor, shadedMaterial.roughness));
  }
  if (typeof shadedMaterial.metalness === "number") {
    shadedMaterial.metalness = Math.min(calibration.metalnessCeiling, shadedMaterial.metalness);
  }
  if (typeof shadedMaterial.envMapIntensity === "number") {
    shadedMaterial.envMapIntensity = calibration.envMapIntensity;
  }
  if (shadedMaterial.color && calibration.colorOffset) {
    shadedMaterial.color.offsetHSL(
      calibration.colorOffset.hue,
      calibration.colorOffset.saturation,
      calibration.colorOffset.lightness,
    );
  }
  if (shadedMaterial.emissive && calibration.emissive) {
    shadedMaterial.emissive = new THREE.Color(calibration.emissive.color);
    shadedMaterial.emissiveIntensity = calibration.emissive.intensity;
  }
  if (typeof shadedMaterial.alphaTest === "number") {
    shadedMaterial.alphaTest = calibration.alphaTest;
  }

  material.needsUpdate = true;
};
