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
  backgroundColor: string;
  fogColor: string;
  controlsEnableDamping: boolean;
  controlsDampingFactor: number;
  lighting: ReferenceClosetStageLightingPolicy;
};

const avatarOnlyLightingPolicy: ReferenceClosetStageLightingPolicy = {
  ambientIntensity: 0.48,
  hemisphere: {
    skyColor: "#fff7ef",
    groundColor: "#c8bcaf",
    intensity: 0.7,
  },
  directional: {
    intensity: 1.28,
    color: "#fff8ef",
    shadowMapSize: 1024,
  },
  leftSpot: {
    intensity: 0.46,
    color: "#f3e6d8",
  },
  rightSpot: {
    intensity: 0.5,
    color: "#efe2d6",
  },
  point: {
    intensity: 0.1,
    color: "#eedfd1",
  },
  avatarOnlyAccent: {
    directionalIntensity: 0.42,
    directionalColor: "#fff2e6",
    spotIntensity: 0.22,
    spotColor: "#fff7f0",
  },
};

const dressedLightingPolicy: ReferenceClosetStageLightingPolicy = {
  ambientIntensity: 0.42,
  hemisphere: {
    skyColor: "#f3f6fb",
    groundColor: "#c7cfdb",
    intensity: 0.62,
  },
  directional: {
    intensity: 1.18,
    color: "#ffffff",
    shadowMapSize: 1024,
  },
  leftSpot: {
    intensity: 0.4,
    color: "#e0e8f7",
  },
  rightSpot: {
    intensity: 0.44,
    color: "#dbe3f5",
  },
  point: {
    intensity: 0.08,
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
}: {
  bodyProfile: BodyProfile;
  equippedGarments: RuntimeGarmentAsset[];
  poseId: AvatarPoseId;
  qualityTier: QualityTier;
}): ReferenceClosetStageScenePolicy {
  const avatarOnly = equippedGarments.length === 0;
  const hasContinuousMotion = equippedGarments.some((item) =>
    hasSignificantContinuousMotion(item, bodyProfile, poseId, qualityTier),
  );
  const lighting = avatarOnly ? avatarOnlyLightingPolicy : dressedLightingPolicy;

  return {
    avatarOnly,
    hasContinuousMotion,
    frameloop: "demand",
    shadows: qualityTier !== "low",
    antialias: qualityTier !== "low",
    dpr: qualityTier === "low" ? [0.85, 1] : qualityTier === "high" ? [1, 1.5] : [0.95, 1.25],
    backgroundColor: avatarOnly ? "#d7cec6" : "#d0d4db",
    fogColor: avatarOnly ? "#d7cec6" : "#d0d4db",
    controlsEnableDamping: qualityTier !== "low" || hasContinuousMotion,
    controlsDampingFactor: qualityTier === "high" ? 0.08 : 0.06,
    lighting: {
      ...lighting,
      directional: {
        ...lighting.directional,
        shadowMapSize: qualityTier === "high" ? 1536 : lighting.directional.shadowMapSize,
      },
    },
  };
}
