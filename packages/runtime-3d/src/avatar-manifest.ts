import type { AvatarRenderVariantId } from "@freestyle/shared-types";

export type AvatarRigAlias =
  | "root"
  | "hips"
  | "spine"
  | "torso"
  | "chest"
  | "neck"
  | "head"
  | "leftShoulder"
  | "rightShoulder"
  | "leftUpperArm"
  | "rightUpperArm"
  | "leftLowerArm"
  | "rightLowerArm"
  | "leftHand"
  | "rightHand"
  | "leftUpperLeg"
  | "rightUpperLeg"
  | "leftLowerLeg"
  | "rightLowerLeg"
  | "leftFoot"
  | "rightFoot";

export const avatarRenderManifest = {
  "female-base": {
    id: "female-base" as AvatarRenderVariantId,
    label: "Female base",
    modelPath: "/assets/avatars/quaternius-animated-woman.glb",
    authoringSource: "runtime-fallback",
    stageOffsetY: 0.02,
    stageScale: 1,
    meshZones: {
      torso: ["Casual_Body_1", "Casual_Body_2"],
      legs: ["Casual_Legs"],
      feet: ["Casual_Feet_1", "Casual_Feet_2"],
    },
    aliasPatterns: {
      root: ["root", "body"],
      hips: ["hips"],
      spine: ["abdomen", "spine"],
      torso: ["torso"],
      chest: ["chest"],
      neck: ["neck"],
      head: ["head"],
      leftShoulder: ["shoulderl"],
      rightShoulder: ["shoulderr"],
      leftUpperArm: ["upperarml"],
      rightUpperArm: ["upperarmr"],
      leftLowerArm: ["lowerarml"],
      rightLowerArm: ["lowerarmr"],
      leftHand: ["wristl"],
      rightHand: ["wristr"],
      leftUpperLeg: ["upperlegl"],
      rightUpperLeg: ["upperlegr"],
      leftLowerLeg: ["lowerlegl"],
      rightLowerLeg: ["lowerlegr"],
      leftFoot: ["footl"],
      rightFoot: ["footr"],
    } satisfies Record<AvatarRigAlias, string[]>,
  },
  "male-base": {
    id: "male-base" as AvatarRenderVariantId,
    label: "Male base",
    modelPath: "/assets/avatars/quaternius-man.glb",
    authoringSource: "runtime-fallback",
    stageOffsetY: 0.04,
    stageScale: 1.03,
    meshZones: {
      torso: ["BaseHuman_1", "BaseHuman_2", "BaseHuman_3"],
      legs: ["BaseHuman_4", "BaseHuman_5"],
      feet: ["BaseHuman_6"],
    },
    aliasPatterns: {
      root: ["bone", "body"],
      hips: ["hips"],
      spine: ["abdomen"],
      torso: ["torso"],
      chest: ["torso"],
      neck: ["neck"],
      head: ["head"],
      leftShoulder: ["shoulderl"],
      rightShoulder: ["shoulderr"],
      leftUpperArm: ["upperarml"],
      rightUpperArm: ["upperarmr"],
      leftLowerArm: ["lowerarml"],
      rightLowerArm: ["lowerarmr"],
      leftHand: ["palml"],
      rightHand: ["palmr"],
      leftUpperLeg: ["upperlegl"],
      rightUpperLeg: ["upperlegr"],
      leftLowerLeg: ["lowerlegl"],
      rightLowerLeg: ["lowerlegr"],
      leftFoot: ["footl"],
      rightFoot: ["footr"],
    } satisfies Record<AvatarRigAlias, string[]>,
  },
} satisfies Record<
  AvatarRenderVariantId,
  {
    id: AvatarRenderVariantId;
    label: string;
    modelPath: string;
    authoringSource: "mpfb2" | "charmorph" | "runtime-fallback";
    stageOffsetY: number;
    stageScale: number;
    meshZones: {
      torso: string[];
      legs: string[];
      feet: string[];
    };
    aliasPatterns: Record<AvatarRigAlias, string[]>;
  }
>;

export const referenceRigPath = "/assets/closet/models/rig-base.glb";
