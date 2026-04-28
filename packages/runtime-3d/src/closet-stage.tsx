"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { bodyProfileToAvatarMorphPlan } from "@freestyle/domain-avatar";
import {
  assessGarmentPhysicalFit,
  computeGarmentCorrectiveTransform,
  getGarmentAdaptiveBodyMaskZones,
  getGarmentEffectiveBodyMaskZones,
  getGarmentPoseRuntimeTuning,
  resolveGarmentRuntimeModelPath,
} from "@freestyle/domain-garment";
import type {
  AvatarMorphPlan,
  AvatarPoseId,
  AvatarRenderVariantId,
  BodyProfile,
  GarmentCollisionZone,
  QualityTier,
  RuntimeGarmentAsset,
} from "@freestyle/shared-types";
import {
  avatarRenderManifest,
  resolveAvatarRuntimeModelPath,
  type AvatarRigAlias,
} from "./avatar-manifest.js";
import { ClosetStageLoadingFallback } from "./closet-stage-fallback.js";
import {
  getFitLoosenessMultiplier,
  resolveReferenceClosetStageScenePolicy,
} from "./reference-closet-stage-policy.js";
import {
  buildReferenceClosetStagePreviewFrameRequest,
  createReferenceClosetStagePreviewFrameState,
  detectReferenceClosetStagePreviewFeatures,
  isReferenceClosetStagePreviewResultEnvelope,
  resolveReferenceClosetStagePreviewBackend,
  resolveReferenceClosetStagePreviewEngineStatus,
  stepReferenceClosetStagePreviewFrame,
  type ReferenceClosetStagePreviewBackendId,
  type ReferenceClosetStagePreviewEngineStatus,
  type ReferenceClosetStagePreviewFeatureSnapshot,
  type ReferenceClosetStagePreviewFrameConfig,
  type ReferenceClosetStagePreviewFrameRequest,
  type ReferenceClosetStagePreviewFrameResult,
  type ReferenceClosetStagePreviewFrameState,
  type ReferenceClosetStagePreviewResultEnvelope,
} from "./reference-closet-stage-preview-simulation.js";
import {
  buildRuntimePreviewWorkerSetupMessages,
} from "./preview-session-bridge.js";
import { applyRuntimePreviewFitMeshDeformation } from "./preview-deformation-transfer.js";
import {
  getAdaptiveCollisionClearanceMultiplier,
  getAdaptiveGarmentAdjustment,
  getFitVisualCue,
  type GarmentLayerContext,
} from "./reference-closet-stage-sim-adapter.js";
import {
  CameraRig,
  ReferenceClosetStageView,
  type ReferenceClosetStageOrbitControls,
} from "./reference-closet-stage-view.js";
import {
  applyPreviewRuntimeSnapshotDataAttributes,
  buildPreviewRuntimeEventEnvelope,
  buildPreviewRuntimeSnapshot,
  createPreviewRuntimeSnapshot,
  hasPreviewRuntimeSnapshotChanged,
  type PreviewRuntimeSnapshot,
} from "./preview-runtime-snapshot.js";
import {
  applyPreviewEngineStatusDataAttributes,
  buildPreviewEngineStatusEventEnvelope,
  createPreviewEngineStatus,
  hasPreviewEngineStatusChanged,
  resolveObservedPreviewEngineFallbackStatus,
  type PreviewEngineStatus,
} from "./preview-engine-status.js";
import {
  applyRuntimeMaterialCalibration,
  isAlphaCardName,
  isEyeLikeName,
  isHairLikeName,
  resolveRuntimeMaterialCalibration,
} from "./material-system.js";
import { disposeRuntimeOwnedMaterials, ensureRuntimeOwnedMaterials } from "./runtime-disposal.js";
import { useRuntimeGLTF } from "./runtime-gltf-loader.js";

type OrbitControlsImpl = ReferenceClosetStageOrbitControls;
type RigTargetPlan = AvatarMorphPlan["rigTargets"];

type AliasKey = AvatarRigAlias;
type AliasMap = Partial<Record<AliasKey, THREE.Bone | null>>;
type InitialStateMap = Partial<Record<AliasKey, { position: THREE.Vector3; scale: THREE.Vector3; rotation: THREE.Euler }>>;

function normalizeBoneName(name: string) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findSkinnedMeshes(root: THREE.Object3D) {
  const found: THREE.SkinnedMesh[] = [];
  root.traverse((object) => {
    if ("isSkinnedMesh" in object && object.isSkinnedMesh) {
      found.push(object as THREE.SkinnedMesh);
    }
  });
  return found;
}

function findBones(root: THREE.Object3D) {
  const bones: THREE.Bone[] = [];
  root.traverse((object) => {
    if ("isBone" in object && object.isBone) {
      bones.push(object as THREE.Bone);
    }
  });
  return bones;
}

function findMorphMeshes(root: THREE.Object3D) {
  const found: Array<THREE.Mesh | THREE.SkinnedMesh> = [];
  root.traverse((object) => {
    if (!isRenderableMesh(object)) return;
    if (!object.morphTargetDictionary || !object.morphTargetInfluences) return;
    found.push(object);
  });
  return found;
}

function isRenderableMesh(object: THREE.Object3D): object is THREE.Mesh | THREE.SkinnedMesh {
  return object instanceof THREE.Mesh;
}

function isAvatarHelperMesh(object: THREE.Object3D) {
  const normalized = normalizeBoneName(object.name);
  return normalized === "icosphere" || normalized === "highpoly";
}

function aliasMapFromRoot(root: THREE.Object3D, patterns: Record<AliasKey, readonly string[]>): AliasMap {
  const allBones = findBones(root);
  const normalized = allBones.map((bone) => [normalizeBoneName(bone.name), bone] as const);

  return Object.fromEntries(
    Object.entries(patterns).map(([key, aliasPatterns]) => {
      const bone =
        aliasPatterns.map((pattern) => normalized.find(([name]) => name.includes(pattern))?.[1]).find(Boolean) ?? null;
      return [key, bone];
    }),
  ) as AliasMap;
}

function captureInitialState(aliasMap: AliasMap): InitialStateMap {
  return Object.fromEntries(
    Object.entries(aliasMap)
      .filter(([, bone]) => bone)
      .map(([key, bone]) => [
        key,
        {
          position: bone!.position.clone(),
          scale: bone!.scale.clone(),
          rotation: bone!.rotation.clone(),
        },
      ]),
  ) as InitialStateMap;
}

function restoreInitialState(aliasMap: AliasMap, initialState: InitialStateMap) {
  Object.entries(initialState || {}).forEach(([key, state]) => {
    const bone = aliasMap[key as AliasKey];
    if (!bone || !state) return;
    bone.position.copy(state.position);
    bone.scale.copy(state.scale);
    bone.rotation.copy(state.rotation);
  });
}

function applyMorphTargets(root: THREE.Object3D, targetWeights: Record<string, number>) {
  const morphMeshes = findMorphMeshes(root);
  morphMeshes.forEach((mesh) => {
    if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
    mesh.morphTargetInfluences.fill(0);
    Object.entries(targetWeights).forEach(([targetName, weight]) => {
      const targetIndex = mesh.morphTargetDictionary?.[targetName];
      if (targetIndex === undefined) return;
      mesh.morphTargetInfluences![targetIndex] = weight;
    });
  });
}

function applyRigTargets(
  aliasMap: AliasMap,
  initialState: InitialStateMap,
  rigTargets: RigTargetPlan,
  avatarVariantId: AvatarRenderVariantId,
  authoringSource: "mpfb2" | "charmorph" | "runtime-fallback",
) {
  if (!initialState) return;
  restoreInitialState(aliasMap, initialState);
  const femaleBias = avatarVariantId === "female-base" ? 1 : 0;
  const headScale = THREE.MathUtils.clamp(0.96 + (rigTargets.statureScale - 1) * 0.22, 0.92, 1.08);

  const chest = aliasMap.chest;
  const spine = aliasMap.spine;
  const torso = aliasMap.torso;
  const hips = aliasMap.hips;
  const head = aliasMap.head;
  const leftShoulder = aliasMap.leftShoulder;
  const rightShoulder = aliasMap.rightShoulder;

  const applyMpfbLiteRigTargets = () => {
    if (leftShoulder && initialState.leftShoulder) {
      leftShoulder.position.x = initialState.leftShoulder.position.x + rigTargets.shoulderOffset * 0.12;
    }
    if (rightShoulder && initialState.rightShoulder) {
      rightShoulder.position.x = initialState.rightShoulder.position.x - rigTargets.shoulderOffset * 0.12;
    }

    const stretchBones = (keys: AliasKey[], factor: number, damp = 1) => {
      keys.forEach((key) => {
        const bone = aliasMap[key];
        const state = initialState[key];
        if (!bone || !state) return;
        bone.position.copy(state.position.clone().multiplyScalar(1 + (factor - 1) * damp));
      });
    };

    stretchBones(["leftUpperArm", "rightUpperArm"], rigTargets.armLengthScale, 0.03);
    stretchBones(["leftLowerArm", "rightLowerArm", "leftHand", "rightHand"], rigTargets.armLengthScale, 0.06);
    stretchBones(["leftUpperLeg", "rightUpperLeg"], rigTargets.legLengthScale, 0.05);
    stretchBones(["leftLowerLeg", "rightLowerLeg", "leftFoot", "rightFoot"], rigTargets.legLengthScale, 0.08);
  };

  if (authoringSource === "mpfb2") {
    applyMpfbLiteRigTargets();
    return;
  }

  if (chest) {
    chest.scale.set(rigTargets.chestScale * (femaleBias ? 0.98 : 1.02), 1, rigTargets.chestScale * 0.96);
  }
  if (spine) {
    spine.scale.set((rigTargets.chestScale + rigTargets.waistScale) * 0.5, rigTargets.torsoScale, rigTargets.waistScale * 0.98);
  }
  if (torso) {
    torso.scale.set(rigTargets.waistScale, rigTargets.torsoScale, rigTargets.waistScale);
  }
  if (hips) {
    hips.scale.set(rigTargets.hipScale * (femaleBias ? 1.04 : 0.98), 1, rigTargets.hipScale * (femaleBias ? 1.06 : 1));
  }
  if (head) {
    head.scale.setScalar(headScale);
  }

  if (leftShoulder && initialState.leftShoulder) {
    leftShoulder.position.x = initialState.leftShoulder.position.x + rigTargets.shoulderOffset;
  }
  if (rightShoulder && initialState.rightShoulder) {
    rightShoulder.position.x = initialState.rightShoulder.position.x - rigTargets.shoulderOffset;
  }

  const stretchBones = (keys: AliasKey[], factor: number, damp = 1) => {
    keys.forEach((key) => {
      const bone = aliasMap[key];
      const state = initialState[key];
      if (!bone || !state) return;
      bone.position.copy(state.position.clone().multiplyScalar(1 + (factor - 1) * damp));
    });
  };

  stretchBones(["leftUpperArm", "rightUpperArm"], rigTargets.armLengthScale, 0.54);
  stretchBones(["leftLowerArm", "rightLowerArm", "leftHand", "rightHand"], rigTargets.armLengthScale, 1);
  stretchBones(["leftUpperLeg", "rightUpperLeg"], rigTargets.legLengthScale, 0.58);
  stretchBones(["leftLowerLeg", "rightLowerLeg", "leftFoot", "rightFoot"], rigTargets.legLengthScale, 1);

  ["leftUpperLeg", "rightUpperLeg", "leftLowerLeg", "rightLowerLeg"].forEach((key) => {
    const bone = aliasMap[key as AliasKey];
    if (!bone) return;
    bone.scale.set(rigTargets.legVolumeScale, 1, rigTargets.legVolumeScale);
  });
}

function applyGarmentRigTargets(
  aliasMap: AliasMap,
  initialState: InitialStateMap,
  rigTargets: RigTargetPlan,
  category: RuntimeGarmentAsset["category"],
) {
  if (!initialState) return;
  restoreInitialState(aliasMap, initialState);

  const leftShoulder = aliasMap.leftShoulder;
  const rightShoulder = aliasMap.rightShoulder;
  if (leftShoulder && initialState.leftShoulder) {
    leftShoulder.position.x = initialState.leftShoulder.position.x + rigTargets.shoulderOffset * 0.08;
  }
  if (rightShoulder && initialState.rightShoulder) {
    rightShoulder.position.x = initialState.rightShoulder.position.x - rigTargets.shoulderOffset * 0.08;
  }

  const stretchBones = (keys: AliasKey[], factor: number, damp = 1) => {
    keys.forEach((key) => {
      const bone = aliasMap[key];
      const state = initialState[key];
      if (!bone || !state) return;
      bone.position.copy(state.position.clone().multiplyScalar(1 + (factor - 1) * damp));
    });
  };

  if (category === "tops" || category === "outerwear") {
    stretchBones(["leftUpperArm", "rightUpperArm"], rigTargets.armLengthScale, 0.04);
    stretchBones(["leftLowerArm", "rightLowerArm", "leftHand", "rightHand"], rigTargets.armLengthScale, 0.07);
    return;
  }

  if (category === "bottoms" || category === "shoes") {
    stretchBones(["leftUpperLeg", "rightUpperLeg"], rigTargets.legLengthScale, 0.05);
    stretchBones(["leftLowerLeg", "rightLowerLeg", "leftFoot", "rightFoot"], rigTargets.legLengthScale, 0.08);
    return;
  }

  if (category === "hair" || category === "accessories") {
    return;
  }
}

function applyPose(
  aliasMap: AliasMap,
  initialState: InitialStateMap,
  poseId: AvatarPoseId,
  authoringSource: "mpfb2" | "charmorph" | "runtime-fallback",
) {
  if (!initialState) return;

  Object.entries(initialState).forEach(([key, state]) => {
    const bone = aliasMap[key as AliasKey];
    if (!bone || !state) return;
    bone.rotation.copy(state.rotation);
  });

  const setZ = (key: AliasKey, degrees: number) => {
    const bone = aliasMap[key];
    if (bone) bone.rotation.z += THREE.MathUtils.degToRad(degrees);
  };
  const setX = (key: AliasKey, degrees: number) => {
    const bone = aliasMap[key];
    if (bone) bone.rotation.x += THREE.MathUtils.degToRad(degrees);
  };
  const setY = (key: AliasKey, degrees: number) => {
    const bone = aliasMap[key];
    if (bone) bone.rotation.y += THREE.MathUtils.degToRad(degrees);
  };

  if (authoringSource === "mpfb2") {
    switch (poseId) {
      case "neutral":
        setZ("leftUpperArm", -36);
        setZ("rightUpperArm", 36);
        setZ("leftLowerArm", -8);
        setZ("rightLowerArm", 8);
        setY("hips", 1.5);
        setY("head", -2);
        break;
      case "relaxed":
        setZ("leftUpperArm", -44);
        setZ("rightUpperArm", 44);
        setY("leftUpperArm", -4);
        setY("rightUpperArm", 4);
        setZ("leftLowerArm", -10);
        setZ("rightLowerArm", 10);
        setY("hips", 2.5);
        setY("head", -3);
        setX("leftUpperLeg", -1.2);
        setX("rightUpperLeg", 0.9);
        break;
      case "contrapposto":
        setZ("leftUpperArm", -40);
        setZ("rightUpperArm", 24);
        setY("leftUpperArm", -6);
        setZ("leftLowerArm", -12);
        setZ("rightLowerArm", 4);
        setY("hips", 6.5);
        setY("chest", -4.5);
        setY("head", -4.5);
        setX("leftUpperLeg", -1.8);
        setX("rightUpperLeg", 1.2);
        break;
      case "stride":
        setX("leftUpperLeg", 4);
        setX("rightUpperLeg", -4);
        setX("leftLowerLeg", -3);
        setX("rightLowerLeg", 3);
        setZ("leftUpperArm", -26);
        setZ("rightUpperArm", 26);
        setZ("leftLowerArm", -6);
        setZ("rightLowerArm", 6);
        break;
      case "tailored":
        setZ("leftUpperArm", -48);
        setZ("rightUpperArm", 48);
        setY("leftUpperArm", -14);
        setY("rightUpperArm", 14);
        setZ("leftLowerArm", -20);
        setZ("rightLowerArm", 20);
        setY("hips", 3);
        break;
      default:
        break;
    }
    return;
  }

  switch (poseId) {
    case "relaxed":
      setZ("leftUpperArm", 18);
      setZ("rightUpperArm", -18);
      setZ("leftLowerArm", 3);
      setZ("rightLowerArm", -3);
      setY("hips", 4);
      setX("leftUpperLeg", -2);
      setX("rightUpperLeg", 1);
      setY("head", -4);
      break;
    case "contrapposto":
      setZ("leftUpperArm", 24);
      setZ("rightUpperArm", -14);
      setZ("leftLowerArm", 6);
      setY("hips", 9);
      setY("chest", -7);
      setX("leftUpperLeg", -4);
      setX("rightUpperLeg", 3);
      setY("head", -6);
      break;
    case "stride":
      setZ("leftUpperArm", 36);
      setZ("rightUpperArm", -22);
      setX("leftUpperLeg", 8);
      setX("rightUpperLeg", -8);
      setX("leftLowerLeg", -6);
      setX("rightLowerLeg", 5);
      break;
    case "tailored":
      setZ("leftUpperArm", 55);
      setZ("rightUpperArm", -55);
      setY("leftUpperArm", -18);
      setY("rightUpperArm", 18);
      setZ("leftLowerArm", 48);
      setZ("rightLowerArm", -48);
      setY("hips", 6);
      setY("head", -2);
      break;
    case "neutral":
    default:
      setZ("leftUpperArm", 58);
      setZ("rightUpperArm", -58);
      setZ("leftLowerArm", 6);
      setZ("rightLowerArm", -6);
      break;
  }
}

function configureMaterials(root: THREE.Object3D, options: { avatarOnly?: boolean; qualityTier?: QualityTier } = {}) {
  const avatarOnly = options.avatarOnly ?? false;
  const qualityTier = options.qualityTier ?? "balanced";
  root.traverse((object) => {
    if (!isRenderableMesh(object)) return;
    if (isAvatarHelperMesh(object)) {
      object.visible = false;
      return;
    }

    ensureRuntimeOwnedMaterials(object);

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material) return;
      const calibration = resolveRuntimeMaterialCalibration({
        name: `${object.name}:${material.name}`,
        avatarOnly,
        qualityTier,
      });
      applyRuntimeMaterialCalibration(material, calibration);
    });

    const alphaCard = isAlphaCardName(object.name);
    const eyeLike = isEyeLikeName(object.name);
    const hairLike = isHairLikeName(object.name);
    object.castShadow = qualityTier !== "low" && !alphaCard && !eyeLike && !hairLike;
    object.receiveShadow = !alphaCard;
    object.frustumCulled = !("isSkinnedMesh" in object && object.isSkinnedMesh);
  });
}

function computeBodyFitInfo(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let hasBounds = false;

  root.traverse((object) => {
    if (!isRenderableMesh(object) || isAvatarHelperMesh(object)) {
      return;
    }
    const objectBox = new THREE.Box3().setFromObject(object, true);
    if (objectBox.isEmpty()) {
      return;
    }
    if (!hasBounds) {
      box.copy(objectBox);
      hasBounds = true;
      return;
    }
    box.union(objectBox);
  });

  if (!hasBounds) {
    box.expandByObject(root, true);
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return {
    height: Math.max(size.y, 0.0001),
    centerX: center.x,
    centerZ: center.z,
    minY: box.min.y,
  };
}

function getAdaptiveBodyMaskExpansionZones(
  item: RuntimeGarmentAsset,
  bodyProfile: BodyProfile,
) {
  const assessment = assessGarmentPhysicalFit(item, bodyProfile);
  if (!assessment) {
    return new Set<GarmentCollisionZone>();
  }

  const shouldExpand =
    assessment.overallState === "compression" ||
    assessment.overallState === "snug" ||
    assessment.clippingRisk === "medium" ||
    assessment.clippingRisk === "high" ||
    assessment.tensionRisk === "high";

  if (!shouldExpand) {
    return new Set<GarmentCollisionZone>();
  }

  const zones = new Set<GarmentCollisionZone>(getGarmentAdaptiveBodyMaskZones(item, bodyProfile));

  if (
    (assessment.clippingRisk === "high" || assessment.tensionRisk === "high") &&
    (item.category === "tops" || item.category === "outerwear")
  ) {
    zones.add("torso");
    zones.add("arms");
  }

  if (
    (assessment.clippingRisk !== "low" || assessment.overallState === "compression") &&
    (item.category === "bottoms" || item.category === "outerwear")
  ) {
    if (assessment.limitingKeys.includes("hipCm") || assessment.limitingKeys.includes("riseCm")) {
      zones.add("hips");
    }
    if (
      assessment.limitingKeys.includes("inseamCm") ||
      assessment.limitingKeys.includes("hemCm") ||
      assessment.limitingKeys.includes("lengthCm")
    ) {
      zones.add("legs");
    }
  }

  if (
    item.category === "shoes" &&
    (assessment.limitingKeys.includes("inseamCm") ||
      assessment.limitingKeys.includes("hemCm") ||
      assessment.limitingKeys.includes("lengthCm") ||
      assessment.clippingRisk !== "low" ||
      assessment.overallState === "compression")
  ) {
    zones.add("feet");
  }

  return zones;
}

function resolveMotionAnchorBone(aliasMap: AliasMap, category: RuntimeGarmentAsset["category"]) {
  if (category === "hair" || category === "accessories") {
    return aliasMap.head ?? aliasMap.chest ?? aliasMap.spine ?? null;
  }
  if (category === "outerwear") {
    return aliasMap.chest ?? aliasMap.spine ?? aliasMap.hips ?? null;
  }
  if (category === "tops") {
    return aliasMap.chest ?? aliasMap.spine ?? aliasMap.hips ?? null;
  }
  if (category === "bottoms") {
    return aliasMap.hips ?? aliasMap.spine ?? null;
  }
  return aliasMap.chest ?? aliasMap.spine ?? aliasMap.head ?? null;
}

type WeightedAnchorTarget = {
  bone: THREE.Bone;
  weight: number;
};

function resolveRuntimeAnchorTargets(
  aliasMap: AliasMap,
  anchorBindings: RuntimeGarmentAsset["runtime"]["anchorBindings"] | undefined,
  category: RuntimeGarmentAsset["category"],
) {
  const anchorMap: Partial<Record<string, AliasKey[]>> = {
    neckBase: ["head", "chest"],
    headCenter: ["head"],
    foreheadCenter: ["head"],
    leftTemple: ["head"],
    rightTemple: ["head"],
    leftShoulder: ["leftShoulder"],
    rightShoulder: ["rightShoulder"],
    chestCenter: ["chest", "spine"],
    waistCenter: ["torso", "spine"],
    hipCenter: ["hips"],
    leftKnee: ["leftLowerLeg", "leftUpperLeg"],
    rightKnee: ["rightLowerLeg", "rightUpperLeg"],
    leftAnkle: ["leftFoot", "leftLowerLeg"],
    rightAnkle: ["rightFoot", "rightLowerLeg"],
    leftFoot: ["leftFoot"],
    rightFoot: ["rightFoot"],
  };

  const resolved =
    anchorBindings
      ?.map((binding) => {
        const keys = anchorMap[binding.id] ?? [];
        const bone = keys.map((key) => aliasMap[key]).find(Boolean) ?? null;
        return bone ? { bone, weight: binding.weight } : null;
      })
      .filter((entry): entry is WeightedAnchorTarget => Boolean(entry)) ?? [];

  if (resolved.length > 0) {
    const totalWeight = resolved.reduce((sum, entry) => sum + entry.weight, 0) || 1;
    return resolved.map((entry) => ({ bone: entry.bone, weight: entry.weight / totalWeight }));
  }

  const fallback = resolveMotionAnchorBone(aliasMap, category);
  return fallback ? [{ bone: fallback, weight: 1 }] : [];
}

function sampleWeightedAnchorWorld(targets: WeightedAnchorTarget[], out: THREE.Vector3) {
  out.set(0, 0, 0);
  const scratch = new THREE.Vector3();
  for (const target of targets) {
    target.bone.getWorldPosition(scratch);
    out.addScaledVector(scratch, target.weight);
  }
  return out;
}

function vectorToPreviewTuple(vector: THREE.Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

function applyPreviewFrameResult(
  motionTarget: THREE.Group | null,
  result: ReferenceClosetStagePreviewFrameResult,
) {
  if (!motionTarget) {
    return;
  }

  motionTarget.rotation.set(result.rotationRad[0], result.rotationRad[1], result.rotationRad[2]);
  motionTarget.position.set(result.position[0], result.position[1], result.position[2]);
}

function applyPreviewDeformation(
  motionTarget: THREE.Group | null,
  deformation: {
    rotationRad: [number, number, number];
    position: [number, number, number];
    transferMode?: string;
    buffer?: {
      schemaVersion: string;
      solverKind: string;
      vertexCount: number;
      byteLength: number;
    };
    buffers?: {
      positions?: ArrayBuffer;
      displacements?: ArrayBuffer;
    };
  },
) {
  if (!motionTarget) {
    return;
  }

  if (deformation.transferMode === "fit-mesh-deformation-buffer") {
    applyRuntimePreviewFitMeshDeformation(motionTarget, deformation);
  }

  motionTarget.rotation.set(
    deformation.rotationRad[0],
    deformation.rotationRad[1],
    deformation.rotationRad[2],
  );
  motionTarget.position.set(
    deformation.position[0],
    deformation.position[1],
    deformation.position[2],
  );
}

function applySceneFit(
  wrapperRef: React.RefObject<THREE.Group | null>,
  fitInfo: { height: number; centerX: number; centerZ: number; minY: number },
  targetHeightMeters: number,
  options: { extraScale?: number; extraOffsetY?: number } = {},
) {
  if (!wrapperRef.current) return;
  const scale = (targetHeightMeters / fitInfo.height) * (options.extraScale ?? 1);
  wrapperRef.current.scale.setScalar(scale);
  wrapperRef.current.position.set(
    -fitInfo.centerX * scale,
    -fitInfo.minY * scale + (options.extraOffsetY ?? 0),
    -fitInfo.centerZ * scale,
  );
}

function matchesMeshPattern(objectName: string, patterns: string[]) {
  const normalizedName = normalizeBoneName(objectName);
  return patterns.some((pattern) => normalizedName.includes(normalizeBoneName(pattern)));
}

function applyVisibleAvatarVisibility(
  root: THREE.Object3D,
  avatarVariantId: AvatarRenderVariantId,
  coveredZones: Set<GarmentCollisionZone>,
  opacity: number,
  qualityTier: QualityTier,
) {
  const manifest = avatarRenderManifest[avatarVariantId];
  const useSegmentedBody =
    coveredZones.has("torso") ||
    coveredZones.has("arms") ||
    coveredZones.has("hips") ||
    coveredZones.has("legs") ||
    coveredZones.has("feet");

  root.traverse((object) => {
    if (!isRenderableMesh(object)) return;
    if (isAvatarHelperMesh(object)) {
      object.visible = false;
      return;
    }
    if (isHairLikeName(object.name)) {
      object.visible = false;
      return;
    }

    const isFullBodyMesh =
      manifest.bodyMaskStrategy === "named-mesh-zones" &&
      matchesMeshPattern(object.name, manifest.meshZones.fullBody);
    const isSegmentMesh =
      manifest.bodyMaskStrategy === "named-mesh-zones" &&
      (matchesMeshPattern(object.name, manifest.meshZones.torso) ||
        matchesMeshPattern(object.name, manifest.meshZones.arms) ||
        matchesMeshPattern(object.name, manifest.meshZones.hips) ||
        matchesMeshPattern(object.name, manifest.meshZones.legs) ||
        matchesMeshPattern(object.name, manifest.meshZones.feet));
    const isCovered =
      manifest.bodyMaskStrategy === "named-mesh-zones"
        ? (coveredZones.has("torso") && matchesMeshPattern(object.name, manifest.meshZones.torso)) ||
          (coveredZones.has("arms") && matchesMeshPattern(object.name, manifest.meshZones.arms)) ||
          (coveredZones.has("hips") && matchesMeshPattern(object.name, manifest.meshZones.hips)) ||
          (coveredZones.has("legs") && matchesMeshPattern(object.name, manifest.meshZones.legs)) ||
          (coveredZones.has("feet") && matchesMeshPattern(object.name, manifest.meshZones.feet))
        : false;

    let effectiveOpacity = isCovered ? 0 : opacity;
    if (isFullBodyMesh) {
      effectiveOpacity = useSegmentedBody ? 0 : opacity;
    } else if (isSegmentMesh && !useSegmentedBody) {
      effectiveOpacity = 0;
    }

    object.visible = effectiveOpacity > 0.01;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const alphaCard = materials.some((material) => material && isAlphaCardName(`${object.name}:${material.name}`));
    const hairLike = isHairLikeName(object.name);
    const eyeLike = isEyeLikeName(object.name);
    object.castShadow = qualityTier !== "low" && !alphaCard && !hairLike && !eyeLike;
    object.receiveShadow = !alphaCard;
    object.frustumCulled = !("isSkinnedMesh" in object && object.isSkinnedMesh);
    materials.forEach((material) => {
      if (!material) return;
      material.transparent = effectiveOpacity < 0.98;
      material.opacity = effectiveOpacity;
      material.depthWrite = effectiveOpacity > 0.2;
      material.colorWrite = effectiveOpacity > 0.04;
      material.needsUpdate = true;
    });
  });
}

function BoundGarment({
  item,
  bodyProfile,
  morphPlan,
  avatarVariantId,
  poseId,
  selected,
  qualityTier,
  previewBackend,
  previewFeatureSnapshot,
  layerContext,
  avatarAliasMap,
  avatarSceneScale,
  onPreviewRuntimeSnapshot,
  onPreviewEngineStatus,
}: {
  item: RuntimeGarmentAsset;
  bodyProfile: BodyProfile;
  morphPlan: AvatarMorphPlan;
  avatarVariantId: AvatarRenderVariantId;
  poseId: AvatarPoseId;
  selected: boolean;
  qualityTier: QualityTier;
  previewBackend: ReferenceClosetStagePreviewBackendId;
  previewFeatureSnapshot: ReferenceClosetStagePreviewFeatureSnapshot;
  layerContext: GarmentLayerContext;
  avatarAliasMap: AliasMap;
  avatarSceneScale: number;
  onPreviewRuntimeSnapshot?: (snapshot: PreviewRuntimeSnapshot) => void;
  onPreviewEngineStatus?: (status: PreviewEngineStatus) => void;
}) {
  const manifest = avatarRenderManifest[avatarVariantId];
  const modelPath = resolveGarmentRuntimeModelPath(item.runtime, avatarVariantId, qualityTier);
  const gltf = useRuntimeGLTF(modelPath);
  const invalidate = useThree((state) => state.invalidate);
  const fitRef = useRef<THREE.Group>(null);
  const motionRef = useRef<THREE.Group>(null);
  const motionStateRef = useRef<ReferenceClosetStagePreviewFrameState>(createReferenceClosetStagePreviewFrameState());
  const previewWorkerRef = useRef<Worker | null>(null);
  const previewWorkerPendingRef = useRef(false);
  const queuedPreviewRequestRef = useRef<ReferenceClosetStagePreviewFrameRequest | null>(null);
  const previewSessionRef = useRef(0);
  const previewSequenceRef = useRef(0);
  const garmentScene = useMemo(() => clone(gltf.scene) as THREE.Group, [gltf.scene]);
  const garmentSkinned = useMemo(() => findSkinnedMeshes(garmentScene)[0], [garmentScene]);
  const aliasMap = useMemo(
    () => aliasMapFromRoot(garmentScene, manifest.aliasPatterns as unknown as Record<AliasKey, readonly string[]>),
    [garmentScene, manifest.aliasPatterns],
  );
  const initialState = useMemo(() => captureInitialState(aliasMap), [aliasMap]);
  const fitAssessment = useMemo(() => assessGarmentPhysicalFit(item, bodyProfile), [bodyProfile, item]);
  const fitVisualCue = useMemo(
    () => getFitVisualCue(fitAssessment, selected),
    [fitAssessment, selected],
  );
  const correctiveTransform = useMemo(
    () => computeGarmentCorrectiveTransform(item, bodyProfile),
    [bodyProfile, item],
  );
  const adaptiveCollisionMultiplier = useMemo(
    () => getAdaptiveCollisionClearanceMultiplier(item, fitAssessment),
    [fitAssessment, item],
  );
  const poseRuntimeTuning = useMemo(
    () => getGarmentPoseRuntimeTuning(item.runtime, poseId),
    [item.runtime, poseId],
  );
  const adaptiveAdjustment = useMemo(
    () => getAdaptiveGarmentAdjustment(item, fitAssessment, poseId, layerContext),
    [fitAssessment, item, layerContext, poseId],
  );
  const secondaryMotionConfig = useMemo(() => {
    if (qualityTier === "low") return null;
    const binding = item.runtime.secondaryMotion;
    if (!binding) return null;
    const looseness = getFitLoosenessMultiplier(item, bodyProfile);
    const poseMultiplier =
      poseId === "stride" ? 1.22 : poseId === "contrapposto" ? 1.1 : poseId === "tailored" ? 0.94 : 1;
    const profileMultiplier =
      binding.profileId === "hair-long"
        ? 1.12
        : binding.profileId === "garment-loose"
          ? 1.08
          : binding.profileId === "hair-bob"
            ? 0.84
            : binding.profileId === "hair-sway"
              ? 0.62
              : 0.92;
    const scaleCompensation = THREE.MathUtils.clamp(avatarSceneScale, 0.82, 1.24);
    return {
      ...binding,
      stiffness: binding.stiffness * scaleCompensation,
      lateralSwingCm: (binding.lateralSwingCm ?? 0) * scaleCompensation,
      verticalBobCm: (binding.verticalBobCm ?? 0) * scaleCompensation,
      looseness: looseness * poseMultiplier * profileMultiplier,
      scaleCompensation,
      baseOffsetY: 0,
    } satisfies ReferenceClosetStagePreviewFrameConfig;
  }, [avatarSceneScale, bodyProfile, item, poseId, qualityTier]);
  const motionAnchorTargets = useMemo(
    () => resolveRuntimeAnchorTargets(avatarAliasMap, item.runtime.anchorBindings, item.category),
    [avatarAliasMap, item.category, item.runtime.anchorBindings],
  );
  const baseMotionOffsetY = correctiveTransform.offsetY + poseRuntimeTuning.offsetY + adaptiveAdjustment.offsetY;
  const effectivePreviewBackend = secondaryMotionConfig ? previewBackend : "static-fit";
  const usesPreviewWorker =
    effectivePreviewBackend === "worker-reduced" ||
    effectivePreviewBackend === "cpu-xpbd" ||
    effectivePreviewBackend === "wasm-preview";

  const publishPreviewRuntimeSnapshot = useCallback(
    (snapshot: PreviewRuntimeSnapshot) => {
      onPreviewRuntimeSnapshot?.(snapshot);
    },
    [onPreviewRuntimeSnapshot],
  );
  const publishPreviewEngineStatus = useCallback(
    (status: ReferenceClosetStagePreviewEngineStatus) => {
      onPreviewEngineStatus?.(createPreviewEngineStatus(status));
    },
    [onPreviewEngineStatus],
  );

  useEffect(() => {
    return () => {
      disposeRuntimeOwnedMaterials(garmentScene);
    };
  }, [garmentScene]);

  useEffect(() => {
    queuedPreviewRequestRef.current = null;
    previewWorkerPendingRef.current = false;

    if (!usesPreviewWorker || typeof Worker === "undefined") {
      previewWorkerRef.current?.terminate();
      previewWorkerRef.current = null;
      return;
    }

    const worker = new Worker("/workers/reference-closet-stage-preview.worker.js");
    previewWorkerRef.current = worker;

    const previewWorkerSetup = buildRuntimePreviewWorkerSetupMessages({
      avatarVariantId,
      bodyProfile,
      item,
    });
    previewWorkerSetup.messages.forEach((message) => {
      worker.postMessage(message);
    });

    const flushQueuedRequest = () => {
      if (!previewWorkerRef.current || previewWorkerPendingRef.current) {
        return;
      }
      const nextRequest = queuedPreviewRequestRef.current;
      if (!nextRequest) {
        return;
      }
      queuedPreviewRequestRef.current = null;
      previewWorkerPendingRef.current = true;
      previewWorkerRef.current.postMessage({
        type: "SOLVE_PREVIEW",
        garmentId: item.id,
        frame: nextRequest,
      });
    };

    worker.onmessage = (
      event: MessageEvent<
        | ReferenceClosetStagePreviewFrameResult
        | ReferenceClosetStagePreviewResultEnvelope
        | {
            type: "PREVIEW_DEFORMATION";
            deformation: {
              garmentId: string;
              sessionId: string;
              sequence: number;
              settled: boolean;
              transferMode?: string;
              buffer?: {
                schemaVersion: string;
                solverKind: string;
                vertexCount: number;
                byteLength: number;
              };
              buffers?: {
                positions?: ArrayBuffer;
                displacements?: ArrayBuffer;
              };
              rotationRad: [number, number, number];
              position: [number, number, number];
            };
          }
      >,
    ) => {
      const payload = event.data;
      if (payload && typeof payload === "object" && "type" in payload && payload.type === "PREVIEW_DEFORMATION") {
        previewWorkerPendingRef.current = false;
        if (
          !payload.deformation ||
          payload.deformation.garmentId !== item.id ||
          payload.deformation.sessionId !== String(previewSessionRef.current)
        ) {
          flushQueuedRequest();
          return;
        }
        applyPreviewDeformation(motionRef.current, payload.deformation);
        if (!payload.deformation.settled) {
          invalidate();
        }
        flushQueuedRequest();
        return;
      }

      const result = isReferenceClosetStagePreviewResultEnvelope(payload)
        ? payload.result
        : payload;
      if (!result || result.sessionId !== String(previewSessionRef.current)) {
        previewWorkerPendingRef.current = false;
        flushQueuedRequest();
        return;
      }
      const runtimeSnapshot = buildPreviewRuntimeSnapshot({
        payload,
      });
      publishPreviewRuntimeSnapshot(runtimeSnapshot);
      const observedFallbackStatus = resolveObservedPreviewEngineFallbackStatus({
        requested: createPreviewEngineStatus(
          resolveReferenceClosetStagePreviewEngineStatus({
            qualityTier,
            hasContinuousMotion: true,
            featureSnapshot: previewFeatureSnapshot,
            backend: effectivePreviewBackend,
          }),
        ),
        runtime: runtimeSnapshot,
      });
      if (observedFallbackStatus) {
        onPreviewEngineStatus?.(observedFallbackStatus);
      }
      motionStateRef.current = result.state;
    };

    worker.onerror = (error) => {
      console.error("Reduced preview worker failed", error);
      publishPreviewEngineStatus(
        resolveReferenceClosetStagePreviewEngineStatus({
          qualityTier,
          hasContinuousMotion: true,
          featureSnapshot: previewFeatureSnapshot,
          backend: effectivePreviewBackend,
          workerAvailable: false,
          workerBootFailed: true,
        }),
      );
      previewWorkerPendingRef.current = false;
      queuedPreviewRequestRef.current = null;
      worker.terminate();
      if (previewWorkerRef.current === worker) {
        previewWorkerRef.current = null;
      }
    };

    return () => {
      queuedPreviewRequestRef.current = null;
      previewWorkerPendingRef.current = false;
      worker.terminate();
      if (previewWorkerRef.current === worker) {
        previewWorkerRef.current = null;
      }
    };
  }, [
    avatarVariantId,
    bodyProfile,
    effectivePreviewBackend,
    usesPreviewWorker,
    invalidate,
    item,
    onPreviewEngineStatus,
    previewFeatureSnapshot,
    publishPreviewEngineStatus,
    publishPreviewRuntimeSnapshot,
    qualityTier,
  ]);

  useLayoutEffect(() => {
    configureMaterials(garmentScene, { qualityTier });
    const clearanceScale =
      item.category === "shoes"
        ? 1.012
        : item.category === "outerwear"
          ? 1 + item.runtime.surfaceClearanceCm * 0.02
          : 1 + item.runtime.surfaceClearanceCm * 0.016;
    const effectiveClearanceScale =
      (clearanceScale + correctiveTransform.clearanceBiasCm * (item.category === "shoes" ? 0.002 : 0.0035)) *
      adaptiveCollisionMultiplier *
      poseRuntimeTuning.clearanceMultiplier;
    fitRef.current?.scale.set(
      effectiveClearanceScale *
        fitVisualCue.scaleMultiplier *
        correctiveTransform.widthScale *
        poseRuntimeTuning.widthScale *
        adaptiveAdjustment.widthScale,
      effectiveClearanceScale *
        fitVisualCue.scaleMultiplier *
        correctiveTransform.heightScale *
        poseRuntimeTuning.heightScale *
        adaptiveAdjustment.heightScale,
      effectiveClearanceScale *
        fitVisualCue.scaleMultiplier *
        correctiveTransform.depthScale *
        poseRuntimeTuning.depthScale *
        adaptiveAdjustment.depthScale,
    );
    if (motionRef.current) {
      motionRef.current.position.set(0, baseMotionOffsetY, 0);
      motionRef.current.rotation.set(0, 0, 0);
    }
    garmentScene.traverse((object) => {
      if (!isRenderableMesh(object) || isAvatarHelperMesh(object)) return;
      object.renderOrder = item.runtime.renderPriority + 1 + (selected ? 3 : 0);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const alphaCard = materials.some((material) => material && isAlphaCardName(`${object.name}:${material.name}`));
      object.castShadow = qualityTier !== "low" && item.category !== "hair" && item.category !== "accessories" && !alphaCard;
      object.receiveShadow = item.category !== "hair" && !alphaCard;
      object.frustumCulled = !("isSkinnedMesh" in object && object.isSkinnedMesh);
      materials.forEach((material) => {
        if (!material) return;
        const texturedMaterial = material as THREE.Material & {
          color?: THREE.Color;
          map?: THREE.Texture | null;
          emissive?: THREE.Color;
          emissiveIntensity?: number;
        };
        if (texturedMaterial.color && item.metadata?.dominantColor && !texturedMaterial.map) {
          texturedMaterial.color = new THREE.Color(item.metadata.dominantColor);
        }
        if (texturedMaterial.emissive) {
          texturedMaterial.emissive = new THREE.Color(fitVisualCue.emissiveColor);
          texturedMaterial.emissiveIntensity = fitVisualCue.emissiveIntensity;
        }
        const underOuterwearOpacity = layerContext.layeredUnderOuterwear ? 0.86 : 1;
        material.transparent = underOuterwearOpacity < 0.98;
        material.opacity = underOuterwearOpacity;
        material.depthWrite = underOuterwearOpacity > 0.4;
        material.depthTest = true;
        if ("alphaTest" in material) {
          material.alphaTest = alphaCard ? 0.42 : 0;
        }
        material.needsUpdate = true;
      });
    });
    applyMorphTargets(garmentScene, morphPlan.targetWeights);
    applyGarmentRigTargets(aliasMap, initialState, morphPlan.rigTargets, item.category);
    applyPose(aliasMap, initialState, poseId, manifest.authoringSource);
    garmentSkinned?.skeleton?.update();
    previewSessionRef.current += 1;
    previewSequenceRef.current = 0;
    queuedPreviewRequestRef.current = null;
    previewWorkerPendingRef.current = false;
    motionStateRef.current = createReferenceClosetStagePreviewFrameState();
    publishPreviewRuntimeSnapshot(
      createPreviewRuntimeSnapshot({
        sessionId: String(previewSessionRef.current),
        sequence: previewSequenceRef.current,
        backend: effectivePreviewBackend,
      }),
    );
    if (secondaryMotionConfig) {
      invalidate();
    }
  }, [
    aliasMap,
    avatarVariantId,
    garmentScene,
    garmentSkinned,
    initialState,
    item.category,
    item.metadata?.dominantColor,
    item.runtime.surfaceClearanceCm,
    item.runtime.renderPriority,
    adaptiveCollisionMultiplier,
    adaptiveAdjustment.depthScale,
    adaptiveAdjustment.heightScale,
    adaptiveAdjustment.offsetY,
    adaptiveAdjustment.widthScale,
    layerContext.layeredUnderOuterwear,
    fitVisualCue.emissiveColor,
    fitVisualCue.emissiveIntensity,
    fitVisualCue.scaleMultiplier,
    correctiveTransform.clearanceBiasCm,
    correctiveTransform.depthScale,
    correctiveTransform.heightScale,
    correctiveTransform.widthScale,
    baseMotionOffsetY,
    manifest.authoringSource,
    manifest.aliasPatterns,
    morphPlan.rigTargets,
    morphPlan.targetWeights,
    poseId,
    poseRuntimeTuning.clearanceMultiplier,
    poseRuntimeTuning.depthScale,
    poseRuntimeTuning.heightScale,
    poseRuntimeTuning.offsetY,
    poseRuntimeTuning.widthScale,
    qualityTier,
    selected,
    effectivePreviewBackend,
    publishPreviewRuntimeSnapshot,
    secondaryMotionConfig,
    invalidate,
  ]);

  useFrame((frameState, delta) => {
    if (!motionRef.current || !secondaryMotionConfig || motionAnchorTargets.length === 0 || effectivePreviewBackend === "static-fit") {
      return;
    }

    garmentSkinned?.skeleton?.update();
    const time = frameState.clock.getElapsedTime();
    const anchorWorld = sampleWeightedAnchorWorld(motionAnchorTargets, new THREE.Vector3());
    const request = buildReferenceClosetStagePreviewFrameRequest({
      sessionId: String(previewSessionRef.current),
      sequence: (previewSequenceRef.current += 1),
      backend: effectivePreviewBackend,
      elapsedTimeSeconds: time,
      deltaSeconds: delta || 1 / 60,
      featureSnapshot: previewFeatureSnapshot,
      currentAnchorWorld: vectorToPreviewTuple(anchorWorld),
      state: motionStateRef.current,
      config: {
        ...secondaryMotionConfig,
        baseOffsetY: baseMotionOffsetY,
      },
    });

    if (usesPreviewWorker && previewWorkerRef.current) {
      queuedPreviewRequestRef.current = request;
      if (!previewWorkerPendingRef.current) {
        const nextRequest = queuedPreviewRequestRef.current;
        queuedPreviewRequestRef.current = null;
        if (nextRequest) {
          previewWorkerPendingRef.current = true;
          previewWorkerRef.current.postMessage({
            type: "SOLVE_PREVIEW",
            garmentId: item.id,
            frame: nextRequest,
          });
        }
      }
      return;
    }

    const frameStartTime =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    const result = stepReferenceClosetStagePreviewFrame(request);
    const frameEndTime =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    publishPreviewRuntimeSnapshot(
      buildPreviewRuntimeSnapshot({
        payload: result,
        solveDurationMs: frameEndTime - frameStartTime,
      }),
    );
    motionStateRef.current = result.state;
    applyPreviewFrameResult(motionRef.current, result);
    if (result.shouldContinue) {
      invalidate();
    }
  });

  return (
    <group ref={fitRef}>
      <group ref={motionRef}>
        <primitive object={garmentScene} />
      </group>
    </group>
  );
}

function AvatarRig({
  bodyProfile,
  avatarVariantId,
  poseId,
  equippedGarments,
  selectedItemId,
  qualityTier,
  previewBackend,
  previewFeatureSnapshot,
  onPreviewRuntimeSnapshot,
  onPreviewEngineStatus,
}: {
  bodyProfile: BodyProfile;
  avatarVariantId: AvatarRenderVariantId;
  poseId: AvatarPoseId;
  equippedGarments: RuntimeGarmentAsset[];
  selectedItemId: string | null;
  qualityTier: QualityTier;
  previewBackend: ReferenceClosetStagePreviewBackendId;
  previewFeatureSnapshot: ReferenceClosetStagePreviewFeatureSnapshot;
  onPreviewRuntimeSnapshot?: (snapshot: PreviewRuntimeSnapshot) => void;
  onPreviewEngineStatus?: (status: PreviewEngineStatus) => void;
}) {
  const manifest = avatarRenderManifest[avatarVariantId];
  const avatarModelPath = resolveAvatarRuntimeModelPath(avatarVariantId, qualityTier) ?? manifest.modelPath;
  const avatarGltf = useRuntimeGLTF(avatarModelPath);
  const wrapperRef = useRef<THREE.Group>(null);

  const avatarScene = useMemo(() => clone(avatarGltf.scene) as THREE.Group, [avatarGltf.scene]);
  const morphPlan = useMemo(
    () => bodyProfileToAvatarMorphPlan(bodyProfile, avatarVariantId),
    [avatarVariantId, bodyProfile],
  );
  const fitInfo = useMemo(() => {
    const measurementScene = clone(avatarGltf.scene) as THREE.Group;
    const measurementAliasMap = aliasMapFromRoot(
      measurementScene,
      manifest.aliasPatterns as unknown as Record<AliasKey, readonly string[]>,
    );
    const measurementInitialState = captureInitialState(measurementAliasMap);
    applyMorphTargets(measurementScene, morphPlan.targetWeights);
    applyRigTargets(
      measurementAliasMap,
      measurementInitialState,
      morphPlan.rigTargets,
      avatarVariantId,
      manifest.authoringSource,
    );
    return computeBodyFitInfo(measurementScene);
  }, [avatarGltf.scene, avatarVariantId, manifest.aliasPatterns, manifest.authoringSource, morphPlan]);
  const avatarSceneScale = useMemo(
    () => ((bodyProfile.simple.heightCm / 100) / fitInfo.height) * manifest.stageScale,
    [bodyProfile.simple.heightCm, fitInfo.height, manifest.stageScale],
  );
  const avatarSkinned = useMemo(() => findSkinnedMeshes(avatarScene)[0], [avatarScene]);
  const coveredZones = useMemo(() => {
    const zones = new Set<GarmentCollisionZone>();
    equippedGarments.forEach((item) => {
      getGarmentEffectiveBodyMaskZones(item.runtime, poseId).forEach((zone) => zones.add(zone));
      getAdaptiveBodyMaskExpansionZones(item, bodyProfile).forEach((zone) => zones.add(zone));
    });
    return zones;
  }, [bodyProfile, equippedGarments, poseId]);
  const aliasMap = useMemo(
    () => aliasMapFromRoot(avatarScene, manifest.aliasPatterns as unknown as Record<AliasKey, readonly string[]>),
    [avatarScene, manifest.aliasPatterns],
  );
  const initialState = useMemo(() => captureInitialState(aliasMap), [aliasMap]);
  const topGarment = equippedGarments.find((item) => item.category === "tops") ?? null;
  const outerwearGarment = equippedGarments.find((item) => item.category === "outerwear") ?? null;
  const structuralGarments = equippedGarments.filter((item) => item.category !== "accessories" && item.category !== "hair");
  const bodyOpacity = structuralGarments.length === 0 ? 1 : 0.985;
  const avatarOnly = structuralGarments.length === 0;

  useEffect(() => {
    return () => {
      disposeRuntimeOwnedMaterials(avatarScene);
    };
  }, [avatarScene]);

  useLayoutEffect(() => {
    configureMaterials(avatarScene, { avatarOnly, qualityTier });
    applyMorphTargets(avatarScene, morphPlan.targetWeights);
    applyVisibleAvatarVisibility(avatarScene, avatarVariantId, coveredZones, bodyOpacity, qualityTier);
    applyRigTargets(aliasMap, initialState, morphPlan.rigTargets, avatarVariantId, manifest.authoringSource);
    applyPose(aliasMap, initialState, poseId, manifest.authoringSource);
    avatarSkinned?.skeleton?.update();
    applySceneFit(wrapperRef, fitInfo, bodyProfile.simple.heightCm / 100, {
      extraScale: manifest.stageScale,
      extraOffsetY: manifest.stageOffsetY,
    });
  }, [
    aliasMap,
    avatarScene,
    avatarSkinned,
    avatarVariantId,
    avatarOnly,
    bodyOpacity,
    bodyProfile.simple.heightCm,
    coveredZones,
    fitInfo,
    initialState,
    manifest.authoringSource,
    manifest.stageOffsetY,
    manifest.stageScale,
    morphPlan.rigTargets,
    morphPlan.targetWeights,
    poseId,
    qualityTier,
  ]);

  return (
    <group ref={wrapperRef}>
      <primitive object={avatarScene} />
      {equippedGarments
        .slice()
        .sort((a, b) => a.runtime.renderPriority - b.runtime.renderPriority)
        .map((item) => (
          <BoundGarment
            key={`${avatarVariantId}:${item.id}`}
            item={item}
            bodyProfile={bodyProfile}
            morphPlan={morphPlan}
            avatarVariantId={avatarVariantId}
            poseId={poseId}
            selected={selectedItemId === item.id}
            qualityTier={qualityTier}
            previewBackend={previewBackend}
            previewFeatureSnapshot={previewFeatureSnapshot}
            layerContext={{
              layeredUnderOuterwear: item.category === "tops" && Boolean(outerwearGarment),
              hasTopUnderneath: item.category === "outerwear" && Boolean(topGarment),
            }}
            avatarAliasMap={aliasMap}
            avatarSceneScale={avatarSceneScale}
            onPreviewRuntimeSnapshot={onPreviewRuntimeSnapshot}
            onPreviewEngineStatus={onPreviewEngineStatus}
          />
        ))}
    </group>
  );
}

function SceneRig({
  bodyProfile,
  avatarVariantId,
  poseId,
  equippedGarments,
  selectedItemId,
  avatarOnly,
  qualityTier,
  previewBackend,
  previewFeatureSnapshot,
  controlsEnableDamping,
  controlsDampingFactor,
  onPreviewRuntimeSnapshot,
  onPreviewEngineStatus,
}: {
  bodyProfile: BodyProfile;
  avatarVariantId: AvatarRenderVariantId;
  poseId: AvatarPoseId;
  equippedGarments: RuntimeGarmentAsset[];
  selectedItemId: string | null;
  avatarOnly: boolean;
  qualityTier: QualityTier;
  previewBackend: ReferenceClosetStagePreviewBackendId;
  previewFeatureSnapshot: ReferenceClosetStagePreviewFeatureSnapshot;
  controlsEnableDamping: boolean;
  controlsDampingFactor: number;
  onPreviewRuntimeSnapshot?: (snapshot: PreviewRuntimeSnapshot) => void;
  onPreviewEngineStatus?: (status: PreviewEngineStatus) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <>
      <CameraRig controlsRef={controlsRef} avatarOnly={avatarOnly} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping={controlsEnableDamping}
        dampingFactor={controlsDampingFactor}
      />
      <AvatarRig
        bodyProfile={bodyProfile}
        avatarVariantId={avatarVariantId}
        poseId={poseId}
        equippedGarments={equippedGarments}
        selectedItemId={selectedItemId}
        qualityTier={qualityTier}
        previewBackend={previewBackend}
        previewFeatureSnapshot={previewFeatureSnapshot}
        onPreviewRuntimeSnapshot={onPreviewRuntimeSnapshot}
        onPreviewEngineStatus={onPreviewEngineStatus}
      />
    </>
  );
}

export function ReferenceClosetStageCanvas({
  bodyProfile,
  avatarVariantId,
  poseId,
  equippedGarments,
  selectedItemId,
  qualityTier,
  backgroundColor,
}: {
  bodyProfile: BodyProfile;
  avatarVariantId: AvatarRenderVariantId;
  poseId: AvatarPoseId;
  equippedGarments: RuntimeGarmentAsset[];
  selectedItemId: string | null;
  qualityTier: QualityTier;
  backgroundColor?: string;
}) {
  const previewRuntimeRootRef = useRef<HTMLDivElement>(null);
  const lastPreviewRuntimeSnapshotRef = useRef<PreviewRuntimeSnapshot | null>(null);
  const lastPreviewEngineStatusRef = useRef<PreviewEngineStatus | null>(null);
  const scenePolicy = useMemo(
    () =>
      resolveReferenceClosetStageScenePolicy({
        bodyProfile,
        equippedGarments,
        poseId,
        qualityTier,
        backgroundColorOverride: backgroundColor,
      }),
    [backgroundColor, bodyProfile, equippedGarments, poseId, qualityTier],
  );
  const previewFeatureSnapshot = useMemo(() => detectReferenceClosetStagePreviewFeatures(), []);
  const previewBackend = useMemo(
    () =>
      resolveReferenceClosetStagePreviewBackend({
        qualityTier,
        hasContinuousMotion: scenePolicy.hasContinuousMotion,
        featureSnapshot: previewFeatureSnapshot,
        experimentalWebGPU: process.env.NEXT_PUBLIC_EXPERIMENTAL_WEBGPU_PREVIEW === "1",
        experimentalWasmPreview: process.env.NEXT_PUBLIC_EXPERIMENTAL_WASM_XPBD_PREVIEW === "1",
        experimentalXpbdPreview: process.env.NEXT_PUBLIC_EXPERIMENTAL_XPBD_PREVIEW === "1",
      }),
    [previewFeatureSnapshot, qualityTier, scenePolicy.hasContinuousMotion],
  );
  const basePreviewEngineStatus = useMemo(
    () =>
      createPreviewEngineStatus(
        resolveReferenceClosetStagePreviewEngineStatus({
          qualityTier,
          hasContinuousMotion: scenePolicy.hasContinuousMotion,
          featureSnapshot: previewFeatureSnapshot,
          backend: previewBackend,
        }),
      ),
    [previewBackend, previewFeatureSnapshot, qualityTier, scenePolicy.hasContinuousMotion],
  );
  const basePreviewRuntimeSnapshot = useMemo(
    () =>
      createPreviewRuntimeSnapshot({
        sessionId: "compat-preview-bootstrap",
        sequence: 0,
        backend: previewBackend,
      }),
    [previewBackend],
  );

  const handlePreviewRuntimeSnapshot = useCallback((snapshot: PreviewRuntimeSnapshot) => {
    const previousSnapshot = lastPreviewRuntimeSnapshotRef.current;
    if (!hasPreviewRuntimeSnapshotChanged(previousSnapshot, snapshot)) {
      return;
    }
    lastPreviewRuntimeSnapshotRef.current = snapshot;
    applyPreviewRuntimeSnapshotDataAttributes(previewRuntimeRootRef.current, snapshot);
    const shouldDispatchEvent =
      !previousSnapshot ||
      previousSnapshot.sessionId !== snapshot.sessionId ||
      previousSnapshot.executionMode !== snapshot.executionMode ||
      previousSnapshot.backend !== snapshot.backend ||
      previousSnapshot.solverKind !== snapshot.solverKind ||
      previousSnapshot.settled !== snapshot.settled;
    if (shouldDispatchEvent && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("freestyle:viewer-event", {
          detail: buildPreviewRuntimeEventEnvelope(snapshot),
        }),
      );
    }
  }, []);

  const handlePreviewEngineStatus = useCallback((status: PreviewEngineStatus) => {
    const previousStatus = lastPreviewEngineStatusRef.current;
    if (!hasPreviewEngineStatusChanged(previousStatus, status)) {
      return;
    }
    lastPreviewEngineStatusRef.current = status;
    applyPreviewEngineStatusDataAttributes(previewRuntimeRootRef.current, status);
    const shouldDispatchEvent =
      !previousStatus ||
      previousStatus.engineKind !== status.engineKind ||
      previousStatus.executionMode !== status.executionMode ||
      previousStatus.backend !== status.backend ||
      previousStatus.transport !== status.transport ||
      previousStatus.status !== status.status ||
      previousStatus.fallbackReason !== status.fallbackReason;
    if (shouldDispatchEvent && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("freestyle:viewer-event", {
          detail: buildPreviewEngineStatusEventEnvelope(status),
        }),
      );
    }
  }, []);

  useEffect(() => {
    lastPreviewRuntimeSnapshotRef.current = null;
    applyPreviewRuntimeSnapshotDataAttributes(previewRuntimeRootRef.current, null);
  }, [avatarVariantId, bodyProfile, equippedGarments, poseId, qualityTier, selectedItemId]);

  useEffect(() => {
    handlePreviewRuntimeSnapshot(basePreviewRuntimeSnapshot);
  }, [basePreviewRuntimeSnapshot, handlePreviewRuntimeSnapshot]);

  useEffect(() => {
    handlePreviewEngineStatus(basePreviewEngineStatus);
  }, [basePreviewEngineStatus, handlePreviewEngineStatus]);

  return (
    <div
      ref={previewRuntimeRootRef}
      data-preview-runtime-root
      data-preview-runtime-execution-mode=""
      data-preview-runtime-backend=""
      data-preview-runtime-solver-kind=""
      data-preview-runtime-session-id=""
      data-preview-runtime-sequence=""
      data-preview-runtime-solve-duration-ms=""
      data-preview-runtime-settled=""
      data-preview-engine-kind=""
      data-preview-engine-execution-mode=""
      data-preview-engine-backend=""
      data-preview-engine-transport=""
      data-preview-engine-status=""
      data-preview-engine-fallback-reason=""
      data-preview-engine-has-worker=""
      data-preview-engine-has-webgpu=""
      data-preview-engine-cross-origin-isolated=""
      style={{ height: "100%", width: "100%" }}
    >
      <ReferenceClosetStageView scenePolicy={scenePolicy}>
        <Suspense fallback={<ClosetStageLoadingFallback />}>
          <SceneRig
            bodyProfile={bodyProfile}
            avatarVariantId={avatarVariantId}
            poseId={poseId}
            equippedGarments={equippedGarments}
            selectedItemId={selectedItemId}
            avatarOnly={scenePolicy.avatarOnly}
            qualityTier={qualityTier}
            previewBackend={previewBackend}
            previewFeatureSnapshot={previewFeatureSnapshot}
            controlsEnableDamping={scenePolicy.controlsEnableDamping}
            controlsDampingFactor={scenePolicy.controlsDampingFactor}
            onPreviewRuntimeSnapshot={handlePreviewRuntimeSnapshot}
            onPreviewEngineStatus={handlePreviewEngineStatus}
          />
        </Suspense>
      </ReferenceClosetStageView>
    </div>
  );
}
