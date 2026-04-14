import type { SkeletonProfile } from "@freestyle/shared-types";

export const freestyleSkeletonProfiles: Record<string, SkeletonProfile> = {
  "freestyle-rig-v2": {
    id: "freestyle-rig-v2",
    bindPose: "A-pose",
    upAxis: "Y-up",
    unit: "meter",
    anchors: [
      "neckBase",
      "headCenter",
      "foreheadCenter",
      "leftTemple",
      "rightTemple",
      "leftShoulder",
      "rightShoulder",
      "chestCenter",
      "waistCenter",
      "hipCenter",
      "leftKnee",
      "rightKnee",
      "leftAnkle",
      "rightAnkle",
      "leftFoot",
      "rightFoot",
    ],
    collisionZones: ["torso", "arms", "hips", "legs", "feet"],
    bodyMaskZones: ["torso", "arms", "hips", "legs", "feet"],
    notes:
      "Preferred runtime rig for MakeHuman/MPFB2-authored exports and the current fallback GLB set. Use meter units, Y-up, and A-pose bind state.",
  },
};

export const defaultSkeletonProfileId = "freestyle-rig-v2";
export const defaultSkeletonProfile = freestyleSkeletonProfiles[defaultSkeletonProfileId];
