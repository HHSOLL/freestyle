import { avatarManifestSchemaVersion } from "@freestyle/asset-schema/schema-versions";
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

export const avatarSummarySchemaVersion = "avatar-build-summary-v1";
export const avatarSkeletonSidecarSchemaVersion = "avatar-skeleton-sidecar-v1";
export const avatarMorphMapSidecarSchemaVersion = "avatar-morph-map-sidecar-v1";

export type AvatarSourceSystem = "mpfb2" | "charmorph" | "runtime-fallback";

type AvatarSourceProvenance = {
  sourceSystem: AvatarSourceSystem;
  schemaVersion: typeof avatarSummarySchemaVersion;
  presetPath: string;
  summaryPath: string;
  skeletonPath: string;
  measurementsPath: string;
  morphMapPath: string;
  outputModelPath: string;
};

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
  schemaVersion: typeof avatarManifestSchemaVersion;
  modelPath: string;
  authoringSource: AvatarSourceSystem;
  sourceProvenance: AvatarSourceProvenance;
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
    schemaVersion: avatarManifestSchemaVersion,
    label: "Female base",
    modelPath: "/assets/avatars/mpfb-female-base.glb",
    authoringSource: "mpfb2",
    sourceProvenance: {
      sourceSystem: "mpfb2",
      schemaVersion: avatarSummarySchemaVersion,
      presetPath: "authoring/avatar/mpfb/presets/female-base.json",
      summaryPath: "authoring/avatar/exports/raw/mpfb-female-base.summary.json",
      skeletonPath: "authoring/avatar/exports/raw/mpfb-female-base.skeleton.json",
      measurementsPath: "authoring/avatar/exports/raw/mpfb-female-base.measurements.json",
      morphMapPath: "authoring/avatar/exports/raw/mpfb-female-base.morph-map.json",
      outputModelPath: "/assets/avatars/mpfb-female-base.glb",
    },
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
    schemaVersion: avatarManifestSchemaVersion,
    label: "Male base",
    modelPath: "/assets/avatars/mpfb-male-base.glb",
    authoringSource: "mpfb2",
    sourceProvenance: {
      sourceSystem: "mpfb2",
      schemaVersion: avatarSummarySchemaVersion,
      presetPath: "authoring/avatar/mpfb/presets/male-base.json",
      summaryPath: "authoring/avatar/exports/raw/mpfb-male-base.summary.json",
      skeletonPath: "authoring/avatar/exports/raw/mpfb-male-base.skeleton.json",
      measurementsPath: "authoring/avatar/exports/raw/mpfb-male-base.measurements.json",
      morphMapPath: "authoring/avatar/exports/raw/mpfb-male-base.morph-map.json",
      outputModelPath: "/assets/avatars/mpfb-male-base.glb",
    },
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
