import { assessGarmentPhysicalFit } from "@freestyle/domain-garment";
import type { AvatarPoseId, BodyProfile, QualityTier, RuntimeGarmentAsset } from "@freestyle/shared-types";

export type ReferenceClosetStageLightingPolicy = {
  ambientIntensity: number;
  hemisphere: {
    skyColor: string;
    groundColor: string;
    intensity: number;
  };
  directional: {
    intensity: number;
    color: string;
    shadowMapSize: number;
  };
  leftSpot: {
    intensity: number;
    color: string;
  };
  rightSpot: {
    intensity: number;
    color: string;
  };
  point: {
    intensity: number;
    color: string;
  };
  avatarOnlyAccent: {
    directionalIntensity: number;
    directionalColor: string;
    spotIntensity: number;
    spotColor: string;
  } | null;
};

export type ReferenceClosetStageScenePolicy = {
  avatarOnly: boolean;
  hasContinuousMotion: boolean;
  frameloop: "demand";
  shadows: boolean;
  antialias: boolean;
  dpr: [number, number];
  exposure: number;
  backgroundColor: string;
  fogColor: string;
  backdrop: {
    wallColor: string;
    floorColor: string;
    ringColor: string;
    orbColor: string;
  };
  controlsEnableDamping: boolean;
  controlsDampingFactor: number;
  lighting: ReferenceClosetStageLightingPolicy;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 208, g: 212, b: 219 };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb) {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixRgb(a: Rgb, b: Rgb, ratio: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * ratio,
    g: a.g + (b.g - a.g) * ratio,
    b: a.b + (b.b - a.b) * ratio,
  };
}

function normalizeStageColorOverride(color: string | undefined) {
  if (!color) return null;
  const normalized = color.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : null;
}

function createBackdropPalette(baseColor: string, avatarOnly: boolean) {
  const base = hexToRgb(baseColor);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 18, g: 22, b: 28 };

  return {
    backgroundColor: baseColor,
    fogColor: rgbToHex(mixRgb(base, white, avatarOnly ? 0.04 : 0.06)),
    backdrop: {
      wallColor: rgbToHex(mixRgb(base, white, avatarOnly ? 0.16 : 0.18)),
      floorColor: rgbToHex(mixRgb(base, white, avatarOnly ? 0.26 : 0.24)),
      ringColor: rgbToHex(mixRgb(base, white, avatarOnly ? 0.34 : 0.3)),
      orbColor: rgbToHex(mixRgb(mixRgb(base, white, 0.16), black, avatarOnly ? 0.12 : 0.16)),
    },
  };
}

const avatarOnlyLightingPolicy: ReferenceClosetStageLightingPolicy = {
  ambientIntensity: 0.4,
  hemisphere: {
    skyColor: "#fff8f1",
    groundColor: "#cabfae",
    intensity: 0.62,
  },
  directional: {
    intensity: 1.46,
    color: "#fff9f2",
    shadowMapSize: 2048,
  },
  leftSpot: {
    intensity: 0.56,
    color: "#f3e6d8",
  },
  rightSpot: {
    intensity: 0.62,
    color: "#efe2d6",
  },
  point: {
    intensity: 0.14,
    color: "#f3e6da",
  },
  avatarOnlyAccent: {
    directionalIntensity: 0.46,
    directionalColor: "#fff2e6",
    spotIntensity: 0.26,
    spotColor: "#fff7f0",
  },
};

const dressedLightingPolicy: ReferenceClosetStageLightingPolicy = {
  ambientIntensity: 0.34,
  hemisphere: {
    skyColor: "#edf2fb",
    groundColor: "#bcc5d2",
    intensity: 0.56,
  },
  directional: {
    intensity: 1.42,
    color: "#ffffff",
    shadowMapSize: 2048,
  },
  leftSpot: {
    intensity: 0.5,
    color: "#e0e8f7",
  },
  rightSpot: {
    intensity: 0.58,
    color: "#dbe3f5",
  },
  point: {
    intensity: 0.14,
    color: "#d9e2f0",
  },
  avatarOnlyAccent: null,
};

export function getFitLoosenessMultiplier(item: RuntimeGarmentAsset, bodyProfile: BodyProfile) {
  const assessment = assessGarmentPhysicalFit(item, bodyProfile);
  const fitStateMultiplier = assessment
    ? {
        compression: 0.58,
        snug: 0.78,
        regular: 1,
        relaxed: 1.18,
        oversized: 1.34,
      }[assessment.overallState]
    : 1;
  const drape = item.metadata?.fitProfile?.drape ?? 0.08;
  return fitStateMultiplier * (0.74 + drape * 0.92);
}

export function hasSignificantContinuousMotion(
  item: RuntimeGarmentAsset,
  bodyProfile: BodyProfile,
  poseId: AvatarPoseId,
  qualityTier: QualityTier,
) {
  if (qualityTier === "low") {
    return false;
  }

  const binding = item.runtime.secondaryMotion;
  if (!binding) {
    return false;
  }

  const looseness = getFitLoosenessMultiplier(item, bodyProfile);
  const poseMultiplier =
    poseId === "stride" ? 1.22 : poseId === "contrapposto" ? 1.1 : poseId === "tailored" ? 0.94 : 1;
  const motionScale = looseness * poseMultiplier;
  const idleEnergy = (binding.idleAmplitudeDeg ?? 0.4) * motionScale;
  const travelEnergy = Math.max(binding.lateralSwingCm ?? 0, binding.verticalBobCm ?? 0) * motionScale;

  if (binding.profileId === "hair-long" || binding.profileId === "garment-loose") {
    return true;
  }

  if (item.category === "hair") {
    return idleEnergy >= 0.85 || travelEnergy >= 0.7;
  }

  return idleEnergy >= 0.75 || travelEnergy >= 0.55;
}

export function resolveReferenceClosetStageScenePolicy({
  bodyProfile,
  equippedGarments,
  poseId,
  qualityTier,
  backgroundColorOverride,
}: {
  bodyProfile: BodyProfile;
  equippedGarments: RuntimeGarmentAsset[];
  poseId: AvatarPoseId;
  qualityTier: QualityTier;
  backgroundColorOverride?: string;
}): ReferenceClosetStageScenePolicy {
  const avatarOnly = equippedGarments.length === 0;
  const hasContinuousMotion = equippedGarments.some((item) =>
    hasSignificantContinuousMotion(item, bodyProfile, poseId, qualityTier),
  );
  const lighting = avatarOnly ? avatarOnlyLightingPolicy : dressedLightingPolicy;
  const defaultBackgroundColor = avatarOnly ? "#d7cec6" : "#d0d4db";
  const scenePalette = createBackdropPalette(
    normalizeStageColorOverride(backgroundColorOverride) ?? defaultBackgroundColor,
    avatarOnly,
  );

  return {
    avatarOnly,
    hasContinuousMotion,
    frameloop: "demand",
    shadows: qualityTier !== "low",
    antialias: qualityTier !== "low",
    dpr: qualityTier === "low" ? [0.9, 1.05] : qualityTier === "high" ? [1.2, 2] : [1.05, 1.55],
    exposure: avatarOnly ? (qualityTier === "high" ? 1.16 : 1.1) : qualityTier === "high" ? 1.12 : 1.06,
    backgroundColor: scenePalette.backgroundColor,
    fogColor: scenePalette.fogColor,
    backdrop: scenePalette.backdrop,
    controlsEnableDamping: qualityTier !== "low" || hasContinuousMotion,
    controlsDampingFactor: qualityTier === "high" ? 0.08 : 0.06,
    lighting: {
      ...lighting,
      directional: {
        ...lighting.directional,
        shadowMapSize: qualityTier === "high" ? 2048 : lighting.directional.shadowMapSize,
      },
    },
  };
}
