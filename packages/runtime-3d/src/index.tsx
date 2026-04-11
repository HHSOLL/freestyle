"use client";

import { Suspense, useLayoutEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { avatarParamsToRigTargets, bodyProfileToAvatarParams } from "@freestyle/domain-avatar";
import { computeGarmentEaseSummary, computeGarmentRuntimeScale } from "@freestyle/domain-garment";
import type { AvatarPoseId, AvatarRenderVariantId, BodyProfile, QualityTier, StarterGarment } from "@freestyle/shared-types";
import { clamp } from "@freestyle/shared-utils";
import { avatarRenderManifest, referenceRigPath, type AvatarRigAlias } from "./avatar-manifest.js";

export const runtimeAssetBudget = {
  avatarGlbBytes: 1_700_000,
  garmentGlbBytes: 420_000,
  textureBytes: 2_000_000,
} as const;

type RigAliasMap = Record<AvatarRigAlias, THREE.Bone | null>;
type RigState = Partial<Record<AvatarRigAlias, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>>;

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const buildAliasMap = (
  root: THREE.Object3D,
  patterns: (typeof avatarRenderManifest)["female-base"]["aliasPatterns"],
): RigAliasMap => {
  const bones: Array<[string, THREE.Bone]> = [];
  root.traverse((object) => {
    if ("isBone" in object && object.isBone) {
      bones.push([normalizeName(object.name), object as THREE.Bone]);
    }
  });

  const findBone = (searchTerms: string[]) =>
    searchTerms
      .map((term) => bones.find(([name]) => name.includes(term))?.[1] ?? null)
      .find(Boolean) ?? null;

  return {
    root: findBone(patterns.root),
    hips: findBone(patterns.hips),
    spine: findBone(patterns.spine),
    torso: findBone(patterns.torso),
    chest: findBone(patterns.chest),
    neck: findBone(patterns.neck),
    head: findBone(patterns.head),
    leftShoulder: findBone(patterns.leftShoulder),
    rightShoulder: findBone(patterns.rightShoulder),
    leftUpperArm: findBone(patterns.leftUpperArm),
    rightUpperArm: findBone(patterns.rightUpperArm),
    leftLowerArm: findBone(patterns.leftLowerArm),
    rightLowerArm: findBone(patterns.rightLowerArm),
    leftHand: findBone(patterns.leftHand),
    rightHand: findBone(patterns.rightHand),
    leftUpperLeg: findBone(patterns.leftUpperLeg),
    rightUpperLeg: findBone(patterns.rightUpperLeg),
    leftLowerLeg: findBone(patterns.leftLowerLeg),
    rightLowerLeg: findBone(patterns.rightLowerLeg),
    leftFoot: findBone(patterns.leftFoot),
    rightFoot: findBone(patterns.rightFoot),
  };
};

const captureRigState = (aliasMap: RigAliasMap): RigState =>
  Object.fromEntries(
    Object.entries(aliasMap)
      .filter(([, bone]) => Boolean(bone))
      .map(([key, bone]) => [
        key,
        {
          position: bone!.position.clone(),
          rotation: bone!.rotation.clone(),
          scale: bone!.scale.clone(),
        },
      ]),
  ) as RigState;

const restoreRigState = (aliasMap: RigAliasMap, initialState: RigState) => {
  Object.entries(initialState).forEach(([key, state]) => {
    const bone = aliasMap[key as AvatarRigAlias];
    if (!bone || !state) return;
    bone.position.copy(state.position);
    bone.rotation.copy(state.rotation);
    bone.scale.copy(state.scale);
  });
};

const fitInfo = (root: THREE.Object3D) => {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return {
    height: Math.max(size.y, 0.001),
    centerX: center.x,
    centerZ: center.z,
    minY: box.min.y,
  };
};

const nudgeDegrees = (bone: THREE.Bone | null, axis: "x" | "y" | "z", degrees: number) => {
  if (!bone) return;
  bone.rotation[axis] += THREE.MathUtils.degToRad(degrees);
};

const applyPose = (aliasMap: RigAliasMap, initialState: RigState, poseId: AvatarPoseId) => {
  Object.entries(initialState).forEach(([key, state]) => {
    const bone = aliasMap[key as AvatarRigAlias];
    if (!bone || !state) return;
    bone.rotation.copy(state.rotation);
  });

  if (poseId === "relaxed") {
    nudgeDegrees(aliasMap.leftUpperArm, "z", 14);
    nudgeDegrees(aliasMap.rightUpperArm, "z", -16);
    nudgeDegrees(aliasMap.hips, "y", 4);
    nudgeDegrees(aliasMap.head, "y", -3);
  } else if (poseId === "contrapposto") {
    nudgeDegrees(aliasMap.leftUpperArm, "z", 18);
    nudgeDegrees(aliasMap.rightUpperArm, "z", -14);
    nudgeDegrees(aliasMap.hips, "y", 8);
    nudgeDegrees(aliasMap.chest, "y", -6);
  } else if (poseId === "stride") {
    nudgeDegrees(aliasMap.leftUpperArm, "z", 20);
    nudgeDegrees(aliasMap.rightUpperArm, "z", -18);
    nudgeDegrees(aliasMap.leftUpperLeg, "x", 6);
    nudgeDegrees(aliasMap.rightUpperLeg, "x", -6);
  } else if (poseId === "tailored") {
    nudgeDegrees(aliasMap.leftUpperArm, "z", 10);
    nudgeDegrees(aliasMap.rightUpperArm, "z", -10);
    nudgeDegrees(aliasMap.leftLowerArm, "z", 8);
    nudgeDegrees(aliasMap.rightLowerArm, "z", -8);
  }
};

const applyMorphPlan = (aliasMap: RigAliasMap, initialState: RigState, body: BodyProfile, variantId: AvatarRenderVariantId) => {
  restoreRigState(aliasMap, initialState);
  const rigTargets = avatarParamsToRigTargets(bodyProfileToAvatarParams(body, variantId));

  if (aliasMap.root) {
    aliasMap.root.scale.setScalar(rigTargets.statureScale);
  }

  if (aliasMap.chest) {
    aliasMap.chest.scale.set(rigTargets.chestScale, 1, rigTargets.chestScale);
  }
  if (aliasMap.torso) {
    aliasMap.torso.scale.set(rigTargets.waistScale, rigTargets.torsoScale, rigTargets.waistScale);
  }
  if (aliasMap.hips) {
    aliasMap.hips.scale.set(rigTargets.hipScale, 1, rigTargets.hipScale);
  }

  if (aliasMap.leftShoulder && initialState.leftShoulder) {
    aliasMap.leftShoulder.position.x = initialState.leftShoulder.position.x + rigTargets.shoulderOffset;
  }
  if (aliasMap.rightShoulder && initialState.rightShoulder) {
    aliasMap.rightShoulder.position.x = initialState.rightShoulder.position.x - rigTargets.shoulderOffset;
  }

  ["leftUpperArm", "rightUpperArm", "leftLowerArm", "rightLowerArm", "leftHand", "rightHand"].forEach((key) => {
    const bone = aliasMap[key as AvatarRigAlias];
    const state = initialState[key as AvatarRigAlias];
    if (!bone || !state) return;
    bone.position.copy(state.position.clone().multiplyScalar(rigTargets.armLengthScale));
  });

  ["leftUpperLeg", "rightUpperLeg", "leftLowerLeg", "rightLowerLeg", "leftFoot", "rightFoot"].forEach((key) => {
    const bone = aliasMap[key as AvatarRigAlias];
    const state = initialState[key as AvatarRigAlias];
    if (!bone || !state) return;
    bone.position.copy(state.position.clone().multiplyScalar(rigTargets.legLengthScale));
  });

  ["leftUpperLeg", "rightUpperLeg"].forEach((key) => {
    const bone = aliasMap[key as AvatarRigAlias];
    if (!bone) return;
    bone.scale.set(rigTargets.legVolumeScale, 1, rigTargets.legVolumeScale);
  });
};

const configureMeshes = (
  root: THREE.Object3D,
  options: {
    color?: string;
    transparent?: boolean;
    opacity?: number;
    bodyMasks?: string[];
  } = {},
) => {
  root.traverse((object) => {
    if (!("isMesh" in object) || !object.isMesh) return;
    const mesh = object as THREE.Mesh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    if (options.bodyMasks?.includes(mesh.name)) {
      mesh.visible = false;
    }

    const material = Array.isArray(mesh.material)
      ? mesh.material.map((entry) => entry.clone())
      : mesh.material.clone();
    mesh.material = material;
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((entry) => {
      if ("color" in entry && options.color) {
        entry.color = new THREE.Color(options.color);
      }
      if ("transparent" in entry && options.transparent) {
        entry.transparent = true;
      }
      if ("opacity" in entry && typeof options.opacity === "number") {
        entry.opacity = options.opacity;
      }
      if ("roughness" in entry) {
        const roughness = typeof entry.roughness === "number" ? entry.roughness : 0.72;
        entry.roughness = clamp(roughness, 0.58, 1);
      }
      if ("metalness" in entry) {
        entry.metalness = 0.05;
      }
      entry.needsUpdate = true;
    });
  });
};

export const detectQualityTier = (): QualityTier => {
  if (typeof navigator === "undefined") return "balanced";
  const memory = "deviceMemory" in navigator ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4) : 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (memory <= 4 || cores <= 4) return "low";
  if (memory >= 8 && cores >= 8) return "high";
  return "balanced";
};

type AvatarStageCanvasProps = {
  bodyProfile: BodyProfile;
  avatarVariantId: AvatarRenderVariantId;
  poseId: AvatarPoseId;
  equippedGarments: StarterGarment[];
  selectedItemId: string | null;
  qualityTier: QualityTier;
};

const stageY = -2.64;
const stageHeightUnits = 4.05;

function AvatarModel({
  bodyProfile,
  avatarVariantId,
  poseId,
  equippedGarments,
}: {
  bodyProfile: BodyProfile;
  avatarVariantId: AvatarRenderVariantId;
  poseId: AvatarPoseId;
  equippedGarments: StarterGarment[];
}) {
  const manifest = avatarRenderManifest[avatarVariantId];
  const gltf = useGLTF(manifest.modelPath);

  const bodyMaskNames = useMemo(() => {
    const activeZones = new Set(equippedGarments.flatMap((item) => item.runtime.bodyMaskZones));
    const masks: string[] = [];
    if (activeZones.has("torso") || activeZones.has("arms")) {
      masks.push(...manifest.meshZones.torso);
    }
    if (activeZones.has("legs") || activeZones.has("hips")) {
      masks.push(...manifest.meshZones.legs);
    }
    if (activeZones.has("feet")) {
      masks.push(...manifest.meshZones.feet);
    }
    return masks;
  }, [equippedGarments, manifest.meshZones.feet, manifest.meshZones.legs, manifest.meshZones.torso]);

  const scene = useMemo(() => {
    const next = clone(gltf.scene);
    configureMeshes(next, { bodyMasks: bodyMaskNames });
    return next;
  }, [bodyMaskNames, gltf.scene]);

  const bounds = useMemo(() => fitInfo(scene), [scene]);
  const aliasMap = useMemo(() => buildAliasMap(scene, manifest.aliasPatterns), [manifest.aliasPatterns, scene]);
  const initialState = useMemo(() => captureRigState(aliasMap), [aliasMap]);

  useLayoutEffect(() => {
    applyMorphPlan(aliasMap, initialState, bodyProfile, avatarVariantId);
    applyPose(aliasMap, initialState, poseId);
  }, [aliasMap, avatarVariantId, bodyProfile, initialState, poseId]);

  const heightScale = stageHeightUnits / bounds.height;
  return (
    <primitive
      object={scene}
      position={[-bounds.centerX * heightScale, stageY - bounds.minY * heightScale + manifest.stageOffsetY, -bounds.centerZ * heightScale]}
      scale={manifest.stageScale * heightScale}
    />
  );
}

function GarmentMesh({
  item,
  bodyProfile,
  avatarVariantId,
  poseId,
  selected,
}: {
  item: StarterGarment;
  bodyProfile: BodyProfile;
  avatarVariantId: AvatarRenderVariantId;
  poseId: AvatarPoseId;
  selected: boolean;
}) {
  const gltf = useGLTF(item.runtime.modelPath);
  const referenceRig = useGLTF(referenceRigPath);
  const scene = useMemo(() => {
    const next = clone(gltf.scene);
    configureMeshes(next, {
      color: item.metadata?.dominantColor,
      transparent: true,
      opacity: selected ? 0.98 : 0.92,
    });
    return next;
  }, [gltf.scene, item.metadata?.dominantColor, selected]);

  const referenceBounds = useMemo(() => fitInfo(referenceRig.scene), [referenceRig.scene]);
  const aliasMap = useMemo(() => buildAliasMap(scene, avatarRenderManifest[avatarVariantId].aliasPatterns), [avatarVariantId, scene]);
  const initialState = useMemo(() => captureRigState(aliasMap), [aliasMap]);
  const runtimeScale = computeGarmentRuntimeScale(item, bodyProfileToAvatarParams(bodyProfile, avatarVariantId));

  useLayoutEffect(() => {
    applyMorphPlan(aliasMap, initialState, bodyProfile, avatarVariantId);
    applyPose(aliasMap, initialState, poseId);
  }, [aliasMap, avatarVariantId, bodyProfile, initialState, poseId]);

  const stageScale = stageHeightUnits / referenceBounds.height;
  return (
    <primitive
      object={scene}
      scale={[
        stageScale * runtimeScale.width,
        stageScale * runtimeScale.height,
        stageScale * runtimeScale.depth,
      ]}
      position={[-referenceBounds.centerX * stageScale, stageY - referenceBounds.minY * stageScale, -referenceBounds.centerZ * stageScale]}
      renderOrder={selected ? 5 : item.runtime.renderPriority + 2}
    />
  );
}

export function AvatarStageCanvas({
  bodyProfile,
  avatarVariantId,
  poseId,
  equippedGarments,
  selectedItemId,
  qualityTier,
}: AvatarStageCanvasProps) {
  const dpr: [number, number] =
    qualityTier === "low" ? [1, 1.2] : qualityTier === "high" ? [1, 1.8] : [1, 1.5];
  const shadowScale = qualityTier === "low" ? 6 : 8;
  const accentGarment = equippedGarments.find((item) => item.id === selectedItemId) ?? equippedGarments[0];
  const fitBadge = accentGarment
    ? computeGarmentEaseSummary(accentGarment.metadata?.measurements, bodyProfileToAvatarParams(bodyProfile, avatarVariantId))
    : null;

  return (
    <Canvas shadows dpr={dpr} camera={{ position: [0, -0.28, 8.9], fov: 28 }} style={{ height: "100%", width: "100%" }}>
      <color attach="background" args={["#d4d7dd"]} />
      <fog attach="fog" args={["#d4d7dd", 8.2, 16.4]} />
      <ambientLight intensity={qualityTier === "low" ? 1.05 : 0.94} color="#ffffff" />
      <spotLight position={[0, 5.6, 4.5]} angle={0.34} penumbra={0.65} intensity={20} color="#fff7ed" castShadow={qualityTier !== "low"} />
      <spotLight position={[2.8, 2.6, 4.6]} angle={0.34} penumbra={0.68} intensity={6} color="#d7e3f1" />
      <mesh position={[0, 0.35, -3.6]}>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial color="#c8ccd3" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, stageY, 0]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color="#d7dae0" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, stageY + 0.01, 0]} receiveShadow>
        <ringGeometry args={[1.12, 2.55, 48]} />
        <meshStandardMaterial color="#eef1f4" emissive="#eef1f4" emissiveIntensity={0.1} roughness={0.96} />
      </mesh>

      <Suspense fallback={null}>
        <AvatarModel
          bodyProfile={bodyProfile}
          avatarVariantId={avatarVariantId}
          poseId={poseId}
          equippedGarments={equippedGarments}
        />
      </Suspense>

      {equippedGarments.map((item) => (
        <Suspense key={item.id} fallback={null}>
          <GarmentMesh
            item={item}
            bodyProfile={bodyProfile}
            avatarVariantId={avatarVariantId}
            poseId={poseId}
            selected={item.id === selectedItemId}
          />
        </Suspense>
      ))}

      {fitBadge ? (
        <group position={[-2.6, 0.95, 0]}>
          <mesh>
            <planeGeometry args={[1.5, 0.58]} />
            <meshStandardMaterial color="#faf6ef" transparent opacity={0.92} />
          </mesh>
        </group>
      ) : null}

      <ContactShadows position={[0, stageY + 0.02, 0]} opacity={0.24} scale={shadowScale} blur={2.8} far={5.4} />
      <OrbitControls enablePan={false} minDistance={5.8} maxDistance={9.8} maxPolarAngle={Math.PI / 1.85} target={[0, -1.12, 0]} />
    </Canvas>
  );
}

export const preloadRuntimeAssets = () => {
  useGLTF.preload(referenceRigPath);
  const manifestEntries = Object.values(avatarRenderManifest) as Array<
    (typeof avatarRenderManifest)[keyof typeof avatarRenderManifest]
  >;
  manifestEntries.forEach((entry) => useGLTF.preload(entry.modelPath));
};

export { avatarRenderManifest, referenceRigPath } from "./avatar-manifest.js";
