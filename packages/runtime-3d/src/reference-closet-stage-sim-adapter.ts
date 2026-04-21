"use client";

import type {
  AvatarPoseId,
  GarmentCollisionZone,
  GarmentFitAssessment,
  GarmentMeasurementKey,
  RuntimeGarmentAsset,
} from "@freestyle/shared-types";

export type FitVisualCue = {
  scaleMultiplier: number;
  emissiveColor: string;
  emissiveIntensity: number;
};

export type AdaptiveGarmentAdjustment = {
  widthScale: number;
  depthScale: number;
  heightScale: number;
  offsetY: number;
};

export type GarmentLayerContext = {
  layeredUnderOuterwear: boolean;
  hasTopUnderneath: boolean;
};

export function collisionZonesFromLimitingKeys(
  category: RuntimeGarmentAsset["category"],
  keys: readonly GarmentMeasurementKey[],
) {
  const zones = new Set<GarmentCollisionZone>();

  keys.forEach((key) => {
    switch (key) {
      case "chestCm":
      case "waistCm":
        zones.add("torso");
        if (category === "tops" || category === "outerwear") {
          zones.add("hips");
        }
        break;
      case "shoulderCm":
      case "sleeveLengthCm":
        zones.add("arms");
        if (category === "tops" || category === "outerwear") {
          zones.add("torso");
        }
        break;
      case "hipCm":
      case "riseCm":
        zones.add("hips");
        if (category === "outerwear") {
          zones.add("torso");
        }
        break;
      case "inseamCm":
        zones.add(category === "shoes" ? "feet" : "legs");
        break;
      case "hemCm":
        zones.add(category === "shoes" ? "feet" : "legs");
        if (category === "bottoms") {
          zones.add("hips");
        }
        break;
      case "lengthCm":
        if (category === "shoes") {
          zones.add("feet");
        } else if (category === "bottoms") {
          zones.add("legs");
        } else {
          zones.add("torso");
        }
        break;
      default:
        break;
    }
  });

  return zones;
}

export function getAdaptiveCollisionClearanceMultiplier(
  item: RuntimeGarmentAsset,
  assessment: GarmentFitAssessment | null,
) {
  if (!assessment) {
    return 1;
  }

  let next = 1;
  if (assessment.clippingRisk === "medium") next += 0.012;
  if (assessment.clippingRisk === "high") next += 0.028;
  if (assessment.tensionRisk === "medium") next += 0.008;
  if (assessment.tensionRisk === "high") next += 0.018;

  const adaptiveZoneCount = collisionZonesFromLimitingKeys(item.category, assessment.limitingKeys).size;
  next += adaptiveZoneCount * 0.0025;

  if (assessment.limitingKeys.includes("shoulderCm") || assessment.limitingKeys.includes("sleeveLengthCm")) {
    next += item.category === "tops" || item.category === "outerwear" ? 0.006 : 0;
  }
  if (assessment.limitingKeys.includes("hipCm") || assessment.limitingKeys.includes("riseCm")) {
    next += item.category === "bottoms" || item.category === "outerwear" ? 0.006 : 0;
  }
  if (assessment.limitingKeys.includes("inseamCm") || assessment.limitingKeys.includes("hemCm")) {
    next += item.category === "bottoms" ? 0.005 : item.category === "shoes" ? 0.004 : 0;
  }

  if (item.category === "outerwear") {
    next += assessment.overallState === "compression" ? 0.024 : assessment.overallState === "snug" ? 0.014 : 0;
  }

  if (item.category === "bottoms") {
    next += assessment.overallState === "compression" ? 0.018 : 0;
  }

  if (item.category === "shoes") {
    next += assessment.overallState === "compression" ? 0.012 : 0;
  }

  return next;
}

function fitToneColor(overallState: "compression" | "snug" | "regular" | "relaxed" | "oversized") {
  return {
    compression: "#ef7d72",
    snug: "#f0bf72",
    regular: "#ffffff",
    relaxed: "#94bbeb",
    oversized: "#b2a4ef",
  }[overallState];
}

export function getFitVisualCue(
  assessment: GarmentFitAssessment | null,
  isSelected: boolean,
): FitVisualCue {
  if (!assessment) {
    return {
      scaleMultiplier: isSelected ? 1.008 : 1,
      emissiveColor: "#ffffff",
      emissiveIntensity: isSelected ? 0.02 : 0,
    };
  }

  const fitScale =
    assessment.overallState === "compression"
      ? 0.996
      : assessment.overallState === "snug"
        ? 1
        : assessment.overallState === "regular"
          ? 1.004
          : assessment.overallState === "relaxed"
            ? 1.012
            : 1.02;
  const clippingBoost =
    assessment.clippingRisk === "high" ? 0.012 : assessment.clippingRisk === "medium" ? 0.006 : 0;
  const selectedBoost = isSelected ? 0.008 : 0;
  const baseIntensity =
    assessment.overallState === "regular"
      ? 0.01
      : assessment.overallState === "compression"
        ? 0.08
        : assessment.overallState === "snug"
          ? 0.045
          : assessment.overallState === "relaxed"
            ? 0.035
            : 0.04;

  return {
    scaleMultiplier: fitScale + clippingBoost + selectedBoost,
    emissiveColor: fitToneColor(assessment.overallState),
    emissiveIntensity:
      baseIntensity +
      (assessment.tensionRisk === "high" ? 0.03 : assessment.tensionRisk === "medium" ? 0.01 : 0) +
      (isSelected ? 0.04 : 0),
  };
}

export function getAdaptiveGarmentAdjustment(
  item: RuntimeGarmentAsset,
  assessment: GarmentFitAssessment | null,
  poseId: AvatarPoseId,
  layerContext: GarmentLayerContext,
): AdaptiveGarmentAdjustment {
  if (!assessment) {
    return { widthScale: 1, depthScale: 1, heightScale: 1, offsetY: 0 };
  }

  const has = (key: GarmentMeasurementKey) => assessment.limitingKeys.includes(key);
  const highClip = assessment.clippingRisk === "high";
  const mediumClip = assessment.clippingRisk === "medium";
  const highTension = assessment.tensionRisk === "high";
  const compressionLike = assessment.overallState === "compression" || assessment.overallState === "snug";
  const next: AdaptiveGarmentAdjustment = { widthScale: 1, depthScale: 1, heightScale: 1, offsetY: 0 };

  if (item.category === "outerwear") {
    if (has("shoulderCm") || has("chestCm") || has("waistCm")) {
      next.widthScale += compressionLike ? 0.012 : mediumClip || highTension ? 0.007 : 0.004;
      next.depthScale += highClip || has("chestCm") ? 0.014 : 0.008;
    }
    if (layerContext.hasTopUnderneath) {
      next.widthScale += 0.018;
      next.depthScale += 0.02;
      next.heightScale += 0.006;
      next.offsetY += 0.004;
    }
    if (poseId === "stride") {
      next.heightScale += 0.008;
      next.offsetY += 0.004;
    } else if (poseId === "tailored") {
      next.widthScale += 0.006;
      next.depthScale += 0.006;
      next.offsetY += 0.002;
    }
  }

  if (item.category === "tops" && item.runtime.renderPriority >= 2) {
    if (has("shoulderCm") || has("chestCm")) {
      next.widthScale += compressionLike ? 0.008 : 0.004;
      next.depthScale += highClip ? 0.01 : 0.005;
    }
    if (layerContext.layeredUnderOuterwear) {
      next.widthScale -= 0.012;
      next.depthScale -= 0.014;
      next.heightScale -= 0.008;
      next.offsetY -= 0.004;
    }
    if (poseId === "stride") {
      next.heightScale += 0.004;
    }
  }

  if (item.category === "bottoms") {
    if (has("hipCm") || has("riseCm")) {
      next.widthScale += compressionLike ? 0.01 : 0.005;
      next.depthScale += highClip || has("hipCm") ? 0.012 : 0.006;
    }
    if (has("inseamCm") || has("hemCm")) {
      next.heightScale += compressionLike ? 0.006 : 0.003;
      next.offsetY += 0.003;
    }
    if (poseId === "stride") {
      next.depthScale += 0.006;
      next.heightScale += 0.004;
      next.offsetY += 0.002;
    }
  }

  if (item.category === "shoes" && (has("lengthCm") || has("hemCm"))) {
    next.widthScale += compressionLike ? 0.004 : 0.002;
    next.depthScale += highClip ? 0.006 : 0.003;
  }

  if (item.category === "accessories" || item.category === "hair") {
    if (has("headCircumferenceCm")) {
      next.widthScale += compressionLike ? 0.003 : 0.001;
      next.depthScale += highClip || highTension ? 0.004 : 0.0015;
      next.heightScale += highClip ? 0.002 : 0.001;
    }
    if (has("frameWidthCm")) {
      next.widthScale += compressionLike ? 0.002 : 0.001;
      next.depthScale += highClip || highTension ? 0.003 : 0.001;
    }
  }

  return next;
}
