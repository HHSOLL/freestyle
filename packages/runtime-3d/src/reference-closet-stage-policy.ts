import { assessGarmentPhysicalFit } from "@freestyle/domain-garment";
import type { AvatarPoseId, BodyProfile, QualityTier, RuntimeGarmentAsset } from "@freestyle/shared-types";
import {
  createStudioBackdropPalette,
  resolveStudioLightingRigSpec,
  type StudioLightingRigSpec,
} from "./studio-lighting-rig-policy.js";

export type ReferenceClosetStageLightingPolicy = StudioLightingRigSpec;

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

function normalizeStageColorOverride(color: string | undefined) {
  if (!color) return null;
  const normalized = color.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : null;
}

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
  const defaultBackgroundColor = avatarOnly ? "#d7cec6" : "#d0d4db";
  const scenePalette = createStudioBackdropPalette(
    normalizeStageColorOverride(backgroundColorOverride) ?? defaultBackgroundColor,
    avatarOnly,
  );
  const lighting = resolveStudioLightingRigSpec({
    avatarOnly,
    qualityTier,
  });

  return {
    avatarOnly,
    hasContinuousMotion,
    frameloop: "demand",
    shadows: qualityTier !== "low",
    antialias: qualityTier !== "low",
    dpr: qualityTier === "low" ? [0.9, 1.05] : qualityTier === "high" ? [1.2, 2] : [1.05, 1.55],
    exposure: lighting.exposure,
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
