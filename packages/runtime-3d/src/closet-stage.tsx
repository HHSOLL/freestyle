"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
  GarmentFitAssessment,
  GarmentMeasurementKey,
  QualityTier,
  RuntimeGarmentAsset,
} from "@freestyle/shared-types";
import { avatarRenderManifest, type AvatarRigAlias } from "./avatar-manifest.js";
import { ClosetStageLoadingFallback } from "./closet-stage-fallback.js";
import {
  getFitLoosenessMultiplier,
  resolveReferenceClosetStageScenePolicy,
} from "./reference-closet-stage-policy.js";
import { disposeRuntimeOwnedMaterials, ensureRuntimeOwnedMaterials } from "./runtime-disposal.js";
import { useRuntimeGLTF } from "./runtime-gltf-loader.js";

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;
type RigTargetPlan = AvatarMorphPlan["rigTargets"];

type AliasKey = AvatarRigAlias;
type AliasMap = Partial<Record<AliasKey, THREE.Bone | null>>;
type InitialStateMap = Partial<Record<AliasKey, { position: THREE.Vector3; scale: THREE.Vector3; rotation: THREE.Euler }>>;
type FitVisualCue = {
  scaleMultiplier: number;
  emissiveColor: string;
  emissiveIntensity: number;
};

type AdaptiveGarmentAdjustment = {
  widthScale: number;
  depthScale: number;
  heightScale: number;
  offsetY: number;
};

type GarmentLayerContext = {
  layeredUnderOuterwear: boolean;
  hasTopUnderneath: boolean;
};

type SecondaryMotionState = {
  initialized: boolean;
  lastAnchorWorld: THREE.Vector3;
  rotation: THREE.Euler;
  rotationVelocity: THREE.Vector3;
  position: THREE.Vector3;
  positionVelocity: THREE.Vector3;
};

function normalizeBoneName(name: string) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function createSecondaryMotionState(): SecondaryMotionState {
  return {
    initialized: false,
    lastAnchorWorld: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    rotationVelocity: new THREE.Vector3(),
    position: new THREE.Vector3(),
    positionVelocity: new THREE.Vector3(),
  };
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

function isHairLikeName(name: string) {
  const normalized = normalizeBoneName(name);
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
}

function isAlphaCardName(name: string) {
  const normalized = normalizeBoneName(name);
  return (
    isHairLikeName(name) ||
    normalized.includes("eyebrow") ||
    normalized.includes("eyelash") ||
    normalized.includes("lash")
  );
}

function isBodyLikeName(name: string) {
  return normalizeBoneName(name).includes("body");
}

function isEyeLikeName(name: string) {
  const normalized = normalizeBoneName(name);
  return normalized.includes("eye") || normalized.includes("iris") || normalized.includes("pupil");
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
      const alphaCard = isAlphaCardName(`${object.name}:${material.name}`);
      const bodyLike = isBodyLikeName(`${object.name}:${material.name}`);
      const eyeLike = isEyeLikeName(`${object.name}:${material.name}`);
      const hairLike = isHairLikeName(`${object.name}:${material.name}`);
      material.side = alphaCard ? THREE.DoubleSide : THREE.FrontSide;
      const shadedMaterial = material as THREE.Material & {
        map?: THREE.Texture | null;
        color?: THREE.Color;
        emissive?: THREE.Color;
        emissiveIntensity?: number;
        roughness?: number;
        metalness?: number;
        envMapIntensity?: number;
        alphaTest?: number;
      };
      if (typeof shadedMaterial.roughness === "number") {
        shadedMaterial.roughness = eyeLike
          ? Math.min(0.08, shadedMaterial.roughness)
          : bodyLike
            ? Math.min(1, Math.max(avatarOnly ? 0.34 : 0.4, shadedMaterial.roughness))
            : hairLike
              ? Math.min(1, Math.max(0.26, shadedMaterial.roughness))
            : alphaCard
              ? Math.min(1, Math.max(0.44, shadedMaterial.roughness))
              : Math.min(1, Math.max(0.28, shadedMaterial.roughness));
      }
      if (typeof shadedMaterial.metalness === "number") {
        shadedMaterial.metalness = eyeLike ? Math.min(0.02, shadedMaterial.metalness) : Math.min(0.1, shadedMaterial.metalness);
      }
      if (typeof shadedMaterial.envMapIntensity === "number") {
        shadedMaterial.envMapIntensity = eyeLike ? 1.42 : bodyLike ? (avatarOnly ? 0.88 : 0.64) : hairLike ? 0.84 : alphaCard ? 0.56 : 0.9;
      }
      if (shadedMaterial.color) {
        if (bodyLike) {
          shadedMaterial.color.offsetHSL(0.006, avatarOnly ? 0.03 : 0.014, avatarOnly ? 0.042 : 0.02);
        } else if (hairLike) {
          shadedMaterial.color.offsetHSL(0.004, 0.014, avatarOnly ? -0.012 : -0.004);
        } else if (eyeLike) {
          shadedMaterial.color.offsetHSL(0, 0.01, avatarOnly ? 0.016 : 0.008);
        }
      }
      if (shadedMaterial.emissive) {
        if (bodyLike && avatarOnly) {
          shadedMaterial.emissive = new THREE.Color("#4b2f24");
          shadedMaterial.emissiveIntensity = 0.012;
        } else if (hairLike && avatarOnly) {
          shadedMaterial.emissive = new THREE.Color("#241d1a");
          shadedMaterial.emissiveIntensity = 0.008;
        } else if (eyeLike && avatarOnly) {
          shadedMaterial.emissive = new THREE.Color("#1f2530");
          shadedMaterial.emissiveIntensity = 0.016;
        }
      }
      material.transparent = alphaCard ? false : material.transparent;
      material.depthWrite = true;
      material.depthTest = true;
      if (typeof shadedMaterial.alphaTest === "number") {
        shadedMaterial.alphaTest = alphaCard ? 0.46 : 0;
      }
      material.needsUpdate = true;
    });

    const alphaCard = isAlphaCardName(object.name);
    const eyeLike = isEyeLikeName(object.name);
    const hairLike = isHairLikeName(object.name);
    object.castShadow = qualityTier !== "low" && !alphaCard && !eyeLike && !hairLike;
    object.receiveShadow = !alphaCard;
    object.frustumCulled = !("isSkinnedMesh" in object && object.isSkinnedMesh);
  });
}

function fitCamera(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControlsImpl | null,
  size: { width: number; height: number },
  avatarOnly: boolean,
) {
  const aspect = size.width / Math.max(size.height, 1);
  const distance = avatarOnly
    ? aspect < 1.0
      ? 6.0
      : aspect < 1.3
        ? 5.35
        : 4.75
    : aspect < 1.0
      ? 6.2
      : aspect < 1.3
        ? 5.5
        : 4.9;
  const fov = avatarOnly ? (aspect < 1.0 ? 28 : aspect < 1.3 ? 24 : 22) : aspect < 1.0 ? 30 : aspect < 1.3 ? 26 : 23;
  const targetY = avatarOnly ? 0.98 : 0.9;
  const cameraY = avatarOnly ? 1.18 : 1.12;

  camera.fov = fov;
  camera.position.set(0, cameraY, distance);
  camera.lookAt(0, targetY, 0);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.set(0, targetY, 0);
    controls.minDistance = distance - (avatarOnly ? 0.9 : 1.0);
    controls.maxDistance = distance + (avatarOnly ? 2.1 : 1.8);
    controls.minAzimuthAngle = -Math.PI * (avatarOnly ? 0.22 : 0.18);
    controls.maxAzimuthAngle = Math.PI * (avatarOnly ? 0.22 : 0.18);
    controls.maxPolarAngle = Math.PI / (avatarOnly ? 1.95 : 2.02);
    controls.minPolarAngle = Math.PI / (avatarOnly ? 3.15 : 2.9);
    controls.enablePan = false;
    controls.update();
  }
}

function CameraRig({ controlsRef, avatarOnly }: { controlsRef: RefObject<OrbitControlsImpl | null>; avatarOnly: boolean }) {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    fitCamera(camera as THREE.PerspectiveCamera, controlsRef.current, size, avatarOnly);
  }, [avatarOnly, camera, size, controlsRef]);

  return null;
}

function StudioBackdrop({
  avatarOnly,
  colors,
}: {
  avatarOnly: boolean;
  colors: {
    wallColor: string;
    floorColor: string;
    ringColor: string;
    orbColor: string;
  };
}) {
  return (
    <group>
      <mesh position={[0, 3.3, -3.3]} receiveShadow>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial color={colors.wallColor} roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[7.6, 96]} />
        <meshStandardMaterial color={colors.floorColor} roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
        <ringGeometry args={[1.8, 4.8, 96]} />
        <meshBasicMaterial color={colors.ringColor} transparent opacity={avatarOnly ? 0.22 : 0.18} />
      </mesh>
      <mesh position={[0, 4.5, -5.2]}>
        <sphereGeometry args={[1.45, 32, 32]} />
        <meshBasicMaterial color={colors.orbColor} transparent opacity={avatarOnly ? 0.18 : 0.12} />
      </mesh>
    </group>
  );
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

function springAxis(current: number, velocity: number, target: number, stiffness: number, damping: number, dt: number) {
  const nextVelocity = (velocity + (target - current) * stiffness * dt) * damping;
  return {
    velocity: nextVelocity,
    value: current + nextVelocity * dt,
  };
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

function collisionZonesFromLimitingKeys(
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

function getAdaptiveCollisionClearanceMultiplier(
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

function getFitVisualCue(
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
    emissiveIntensity: baseIntensity + (assessment.tensionRisk === "high" ? 0.03 : assessment.tensionRisk === "medium" ? 0.01 : 0) + (isSelected ? 0.04 : 0),
  };
}

function getAdaptiveGarmentAdjustment(
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
  layerContext,
  avatarAliasMap,
  avatarSceneScale,
}: {
  item: RuntimeGarmentAsset;
  bodyProfile: BodyProfile;
  morphPlan: AvatarMorphPlan;
  avatarVariantId: AvatarRenderVariantId;
  poseId: AvatarPoseId;
  selected: boolean;
  qualityTier: QualityTier;
  layerContext: GarmentLayerContext;
  avatarAliasMap: AliasMap;
  avatarSceneScale: number;
}) {
  const manifest = avatarRenderManifest[avatarVariantId];
  const modelPath = resolveGarmentRuntimeModelPath(item.runtime, avatarVariantId);
  const gltf = useRuntimeGLTF(modelPath);
  const invalidate = useThree((state) => state.invalidate);
  const fitRef = useRef<THREE.Group>(null);
  const motionRef = useRef<THREE.Group>(null);
  const motionStateRef = useRef<SecondaryMotionState>(createSecondaryMotionState());
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
    };
  }, [avatarSceneScale, bodyProfile, item, poseId, qualityTier]);
  const motionAnchorTargets = useMemo(
    () => resolveRuntimeAnchorTargets(avatarAliasMap, item.runtime.anchorBindings, item.category),
    [avatarAliasMap, item.category, item.runtime.anchorBindings],
  );
  const baseMotionOffsetY = correctiveTransform.offsetY + poseRuntimeTuning.offsetY + adaptiveAdjustment.offsetY;

  useEffect(() => {
    return () => {
      disposeRuntimeOwnedMaterials(garmentScene);
    };
  }, [garmentScene]);

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
    motionStateRef.current = createSecondaryMotionState();
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
    secondaryMotionConfig,
    invalidate,
  ]);

  useFrame((frameState, delta) => {
    if (!motionRef.current || !secondaryMotionConfig || motionAnchorTargets.length === 0) {
      return;
    }

    garmentSkinned?.skeleton?.update();

    const state = motionStateRef.current;
    const dt = Math.min(1 / 24, Math.max(1 / 240, delta || 1 / 60));
    const time = frameState.clock.getElapsedTime();
    const anchorWorld = sampleWeightedAnchorWorld(motionAnchorTargets, new THREE.Vector3());
    if (!state.initialized) {
      state.initialized = true;
      state.lastAnchorWorld.copy(anchorWorld);
    }
    const velocityX = (anchorWorld.x - state.lastAnchorWorld.x) / dt;
    const velocityY = (anchorWorld.y - state.lastAnchorWorld.y) / dt;
    const velocityZ = (anchorWorld.z - state.lastAnchorWorld.z) / dt;
    state.lastAnchorWorld.copy(anchorWorld);

    const idlePhase = time * (secondaryMotionConfig.idleFrequencyHz ?? 0.9) * Math.PI * 2;
    const idleSin = Math.sin(idlePhase);
    const idleCos = Math.cos(idlePhase * 0.83 + 0.6);
    const idleAmplitudeRad = THREE.MathUtils.degToRad(secondaryMotionConfig.idleAmplitudeDeg ?? 0.4);
    const looseness = secondaryMotionConfig.looseness;
    const targetYaw = THREE.MathUtils.clamp(
      -velocityX * 0.028 * secondaryMotionConfig.influence + idleSin * idleAmplitudeRad * looseness,
      -THREE.MathUtils.degToRad(secondaryMotionConfig.maxYawDeg),
      THREE.MathUtils.degToRad(secondaryMotionConfig.maxYawDeg),
    );
    const targetPitch = THREE.MathUtils.clamp(
      velocityZ * 0.022 * secondaryMotionConfig.influence + idleCos * idleAmplitudeRad * 0.72 * looseness,
      -THREE.MathUtils.degToRad(secondaryMotionConfig.maxPitchDeg),
      THREE.MathUtils.degToRad(secondaryMotionConfig.maxPitchDeg),
    );
    const targetRoll = THREE.MathUtils.clamp(
      -velocityX * 0.018 * secondaryMotionConfig.influence + idleSin * idleAmplitudeRad * 0.48 * looseness,
      -THREE.MathUtils.degToRad(secondaryMotionConfig.maxRollDeg),
      THREE.MathUtils.degToRad(secondaryMotionConfig.maxRollDeg),
    );

    const yawAxis = springAxis(
      state.rotation.y,
      state.rotationVelocity.y,
      targetYaw,
      secondaryMotionConfig.stiffness,
      secondaryMotionConfig.damping,
      dt,
    );
    const pitchAxis = springAxis(
      state.rotation.x,
      state.rotationVelocity.x,
      targetPitch,
      secondaryMotionConfig.stiffness,
      secondaryMotionConfig.damping,
      dt,
    );
    const rollAxis = springAxis(
      state.rotation.z,
      state.rotationVelocity.z,
      targetRoll,
      secondaryMotionConfig.stiffness,
      secondaryMotionConfig.damping,
      dt,
    );
    state.rotation.set(pitchAxis.value, yawAxis.value, rollAxis.value);
    state.rotationVelocity.set(pitchAxis.velocity, yawAxis.velocity, rollAxis.velocity);

    const targetPosX = THREE.MathUtils.clamp(
      idleSin *
        ((secondaryMotionConfig.lateralSwingCm ?? 0) / 100) *
        looseness *
        (secondaryMotionConfig.profileId.startsWith("hair") ? 1 : 0.74),
      -0.06 * secondaryMotionConfig.scaleCompensation,
      0.06 * secondaryMotionConfig.scaleCompensation,
    );
    const targetPosY = THREE.MathUtils.clamp(
      Math.abs(idleCos) *
        ((secondaryMotionConfig.verticalBobCm ?? 0) / 100) *
        looseness +
      Math.max(velocityY, 0) * 0.0025,
      0,
      0.08 * secondaryMotionConfig.scaleCompensation,
    );
    const posXAxis = springAxis(
      state.position.x,
      state.positionVelocity.x,
      targetPosX,
      secondaryMotionConfig.stiffness * 0.8,
      secondaryMotionConfig.damping,
      dt,
    );
    const posYAxis = springAxis(
      state.position.y,
      state.positionVelocity.y,
      targetPosY,
      secondaryMotionConfig.stiffness * 0.72,
      secondaryMotionConfig.damping,
      dt,
    );
    state.position.set(posXAxis.value, posYAxis.value, 0);
    state.positionVelocity.set(posXAxis.velocity, posYAxis.velocity, 0);

    motionRef.current.rotation.copy(state.rotation);
    motionRef.current.position.set(state.position.x, baseMotionOffsetY + state.position.y, 0);

    const angularEnergy =
      Math.abs(state.rotationVelocity.x) + Math.abs(state.rotationVelocity.y) + Math.abs(state.rotationVelocity.z);
    const positionalEnergy = Math.abs(state.positionVelocity.x) + Math.abs(state.positionVelocity.y);
    const anchorEnergy = Math.abs(velocityX) + Math.abs(velocityY) + Math.abs(velocityZ);
    const shouldContinue =
      angularEnergy > 0.02 ||
      positionalEnergy > 0.006 ||
      anchorEnergy > 0.02 ||
      Math.abs(targetYaw - state.rotation.y) > 0.002 ||
      Math.abs(targetPitch - state.rotation.x) > 0.002 ||
      Math.abs(targetRoll - state.rotation.z) > 0.002;

    if (shouldContinue) {
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
}: {
  bodyProfile: BodyProfile;
  avatarVariantId: AvatarRenderVariantId;
  poseId: AvatarPoseId;
  equippedGarments: RuntimeGarmentAsset[];
  selectedItemId: string | null;
  qualityTier: QualityTier;
}) {
  const manifest = avatarRenderManifest[avatarVariantId];
  const avatarGltf = useRuntimeGLTF(manifest.modelPath);
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
            layerContext={{
              layeredUnderOuterwear: item.category === "tops" && Boolean(outerwearGarment),
              hasTopUnderneath: item.category === "outerwear" && Boolean(topGarment),
            }}
            avatarAliasMap={aliasMap}
            avatarSceneScale={avatarSceneScale}
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
  controlsEnableDamping,
  controlsDampingFactor,
}: {
  bodyProfile: BodyProfile;
  avatarVariantId: AvatarRenderVariantId;
  poseId: AvatarPoseId;
  equippedGarments: RuntimeGarmentAsset[];
  selectedItemId: string | null;
  avatarOnly: boolean;
  qualityTier: QualityTier;
  controlsEnableDamping: boolean;
  controlsDampingFactor: number;
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

  return (
    <Canvas
      shadows={scenePolicy.shadows}
      camera={{ position: [0, 1.18, 5.45], fov: 22, near: 0.1, far: 100 }}
      frameloop={scenePolicy.frameloop}
      gl={{ antialias: scenePolicy.antialias, alpha: true, powerPreference: "high-performance" }}
      dpr={scenePolicy.dpr}
      style={{ height: "100%", width: "100%" }}
    >
      <color attach="background" args={[scenePolicy.backgroundColor]} />
      <fog attach="fog" args={[scenePolicy.fogColor, 5.4, 13.8]} />

      <ambientLight intensity={scenePolicy.lighting.ambientIntensity} />
      <hemisphereLight
        args={[
          scenePolicy.lighting.hemisphere.skyColor,
          scenePolicy.lighting.hemisphere.groundColor,
          scenePolicy.lighting.hemisphere.intensity,
        ]}
      />
      <directionalLight
        position={[3.8, 5.9, 4.4]}
        intensity={scenePolicy.lighting.directional.intensity}
        color={scenePolicy.lighting.directional.color}
        castShadow={scenePolicy.shadows}
        shadow-mapSize-width={scenePolicy.lighting.directional.shadowMapSize}
        shadow-mapSize-height={scenePolicy.lighting.directional.shadowMapSize}
        shadow-camera-near={0.5}
        shadow-camera-far={16}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6.4}
        shadow-camera-bottom={-3.8}
      />
      <spotLight
        position={[-3.4, 5.0, 3.4]}
        angle={0.48}
        penumbra={0.94}
        intensity={scenePolicy.lighting.leftSpot.intensity}
        color={scenePolicy.lighting.leftSpot.color}
      />
      <spotLight
        position={[3.3, 4.7, 2.8]}
        angle={0.44}
        penumbra={0.94}
        intensity={scenePolicy.lighting.rightSpot.intensity}
        color={scenePolicy.lighting.rightSpot.color}
      />
      <pointLight
        position={[0, 4.8, -2.6]}
        intensity={scenePolicy.lighting.point.intensity}
        distance={14}
        color={scenePolicy.lighting.point.color}
      />
      {scenePolicy.lighting.avatarOnlyAccent ? (
        <>
          <directionalLight
            position={[-2.6, 2.4, 4.6]}
            intensity={scenePolicy.lighting.avatarOnlyAccent.directionalIntensity}
            color={scenePolicy.lighting.avatarOnlyAccent.directionalColor}
          />
          <spotLight
            position={[0, 2.2, 5.8]}
            angle={0.34}
            penumbra={0.92}
            intensity={scenePolicy.lighting.avatarOnlyAccent.spotIntensity}
            color={scenePolicy.lighting.avatarOnlyAccent.spotColor}
          />
        </>
      ) : null}

      <StudioBackdrop avatarOnly={scenePolicy.avatarOnly} colors={scenePolicy.backdrop} />
      <Suspense fallback={<ClosetStageLoadingFallback />}>
        <SceneRig
          bodyProfile={bodyProfile}
          avatarVariantId={avatarVariantId}
          poseId={poseId}
          equippedGarments={equippedGarments}
          selectedItemId={selectedItemId}
          avatarOnly={scenePolicy.avatarOnly}
          qualityTier={qualityTier}
          controlsEnableDamping={scenePolicy.controlsEnableDamping}
          controlsDampingFactor={scenePolicy.controlsDampingFactor}
        />
      </Suspense>
    </Canvas>
  );
}
