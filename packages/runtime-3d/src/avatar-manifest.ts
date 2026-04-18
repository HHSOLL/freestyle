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

export const referenceRigAliasPatterns = {
  root: ["root"],
  hips: ["hips"],
  spine: ["spine"],
  torso: ["spine"],
  chest: ["chest"],
  neck: ["neck"],
  head: ["head"],
  leftShoulder: ["leftshoulder"],
  rightShoulder: ["rightshoulder"],
  leftUpperArm: ["leftupperarm"],
  rightUpperArm: ["rightupperarm"],
  leftLowerArm: ["leftlowerarm"],
  rightLowerArm: ["rightlowerarm"],
  leftHand: ["lefthand"],
  rightHand: ["righthand"],
  leftUpperLeg: ["leftupperleg"],
  rightUpperLeg: ["rightupperleg"],
  leftLowerLeg: ["leftlowerleg"],
  rightLowerLeg: ["rightlowerleg"],
  leftFoot: ["leftfoot"],
  rightFoot: ["rightfoot"],
} satisfies Record<AvatarRigAlias, string[]>;

export type AvatarRenderManifestEntry = {
  id: AvatarRenderVariantId;
  label: string;
  modelPath: string;
  authoringSource: "mpfb2" | "charmorph" | "runtime-fallback";
  bodyMaskStrategy: "named-mesh-zones" | "none";
  stageOffsetY: number;
  stageScale: number;
  meshZones: {
    fullBody: string[];
    torso: string[];
    arms: string[];
    hips: string[];
    legs: string[];
    feet: string[];
  };
  aliasPatterns: Record<AvatarRigAlias, string[]>;
};

export const avatarRenderManifest: Record<AvatarRenderVariantId, AvatarRenderManifestEntry> = {
  "female-base": {
    id: "female-base" as AvatarRenderVariantId,
    label: "Female base",
    modelPath: "/assets/avatars/mpfb-female-base.glb",
    authoringSource: "mpfb2",
    bodyMaskStrategy: "named-mesh-zones",
    stageOffsetY: -0.12,
    stageScale: 0.6,
    meshZones: {
      fullBody: ["fullbody"],
      torso: ["torso"],
      arms: ["arms"],
      hips: ["hips"],
      legs: ["legs"],
      feet: ["feet"],
    },
    aliasPatterns: {
      root: ["root"],
      hips: ["pelvis"],
      spine: ["spine01"],
      torso: ["spine02"],
      chest: ["spine03"],
      neck: ["neck01"],
      head: ["head"],
      leftShoulder: ["claviclel"],
      rightShoulder: ["clavicler"],
      leftUpperArm: ["upperarml"],
      rightUpperArm: ["upperarmr"],
      leftLowerArm: ["lowerarml"],
      rightLowerArm: ["lowerarmr"],
      leftHand: ["handl"],
      rightHand: ["handr"],
      leftUpperLeg: ["thighl"],
      rightUpperLeg: ["thighr"],
      leftLowerLeg: ["calfl"],
      rightLowerLeg: ["calfr"],
      leftFoot: ["footl"],
      rightFoot: ["footr"],
    } satisfies Record<AvatarRigAlias, string[]>,
  },
  "male-base": {
    id: "male-base" as AvatarRenderVariantId,
    label: "Male base",
    modelPath: "/assets/avatars/mpfb-male-base.glb",
    authoringSource: "mpfb2",
    bodyMaskStrategy: "named-mesh-zones",
    stageOffsetY: -0.12,
    stageScale: 0.6,
    meshZones: {
      fullBody: ["fullbody"],
      torso: ["torso"],
      arms: ["arms"],
      hips: ["hips"],
      legs: ["legs"],
      feet: ["feet"],
    },
    aliasPatterns: {
      root: ["root"],
      hips: ["pelvis"],
      spine: ["spine01"],
      torso: ["spine02"],
      chest: ["spine03"],
      neck: ["neck01"],
      head: ["head"],
      leftShoulder: ["claviclel"],
      rightShoulder: ["clavicler"],
      leftUpperArm: ["upperarml"],
      rightUpperArm: ["upperarmr"],
      leftLowerArm: ["lowerarml"],
      rightLowerArm: ["lowerarmr"],
      leftHand: ["handl"],
      rightHand: ["handr"],
      leftUpperLeg: ["thighl"],
      rightUpperLeg: ["thighr"],
      leftLowerLeg: ["calfl"],
      rightLowerLeg: ["calfr"],
      leftFoot: ["footl"],
      rightFoot: ["footr"],
    } satisfies Record<AvatarRigAlias, string[]>,
  },
};
