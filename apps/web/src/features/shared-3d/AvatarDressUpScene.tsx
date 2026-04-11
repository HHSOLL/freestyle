'use client';

import { Suspense, useLayoutEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { flattenBodyProfile, type BodyProfile } from '@freestyle/contracts/domain-types';
import {
  avatarGenderMap,
  garmentTemplates,
  genderBaseMeasurements,
  type FittingPoseId,
  type StageGarment,
} from '@/features/mannequin/closetSceneConfig';
import { avatarPresets, avatarPresetMap, type AvatarPresetId } from './avatarPresets';

type SceneLayerConfig = {
  assetId: string;
  category: string;
  layerOrder: number;
  shellWidth: number;
  shellDepth: number;
  shellHeight: number;
  shellYOffset: number;
  limbWidth?: number;
  limbLength?: number;
  color: string;
  textureUrl: string;
};

type AvatarDressUpSceneProps = {
  body: BodyProfile;
  layers: SceneLayerConfig[];
  selectedAssetId: string | null;
  avatarId?: AvatarPresetId;
  poseId?: FittingPoseId;
  stageGarments?: StageGarment[];
};

type FitInfo = {
  height: number;
  centerX: number;
  centerZ: number;
  minY: number;
};

type BoneState = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
};

const dressupStageY = -2.62;
const dressupHeightUnits = 4.02;
const referenceRigPath = '/assets/closet/models/rig-base.glb';

const rigAliases = {
  hips: ['hips'],
  spine: ['spine', 'abdomen'],
  torso: ['torso'],
  chest: ['chest'],
  neck: ['neck'],
  head: ['head'],
  leftShoulder: ['leftshoulder', 'shoulderl'],
  rightShoulder: ['rightshoulder', 'shoulderr'],
  leftUpperArm: ['leftupperarm', 'upperarml'],
  rightUpperArm: ['rightupperarm', 'upperarmr'],
  leftLowerArm: ['leftlowerarm', 'leftforearm', 'lowerarml'],
  rightLowerArm: ['rightlowerarm', 'rightforearm', 'lowerarmr'],
  leftHand: ['lefthand', 'wristl', 'palml'],
  rightHand: ['righthand', 'wristr', 'palmr'],
  leftUpperLeg: ['leftupperleg', 'upperlegl'],
  rightUpperLeg: ['rightupperleg', 'upperlegr'],
  leftLowerLeg: ['leftlowerleg', 'lowerlegl'],
  rightLowerLeg: ['rightlowerleg', 'lowerlegr'],
  leftFoot: ['leftfoot', 'footl'],
  rightFoot: ['rightfoot', 'footr'],
} as const;

type RigAlias = keyof typeof rigAliases;
type RigAliasMap = Record<RigAlias, THREE.Bone | null>;
type RigStateMap = Partial<Record<RigAlias, BoneState>>;

avatarPresets.forEach((preset) => useGLTF.preload(preset.modelPath));
garmentTemplates.forEach((template) => useGLTF.preload(template.modelPath));
useGLTF.preload(referenceRigPath);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const toRadians = (degrees: number) => THREE.MathUtils.degToRad(degrees);

function normalizeBoneName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function computeFitInfo(root: THREE.Object3D): FitInfo {
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
}

function buildAliasMap(root: THREE.Object3D): RigAliasMap {
  const bones: Array<[string, THREE.Bone]> = [];
  root.traverse((object) => {
    if ('isBone' in object && object.isBone) {
      bones.push([normalizeBoneName(object.name), object as THREE.Bone]);
    }
  });

  return Object.fromEntries(
    Object.entries(rigAliases).map(([key, patterns]) => {
      const bone = patterns
        .map((pattern) => bones.find(([name]) => name.includes(pattern))?.[1] ?? null)
        .find(Boolean) ?? null;
      return [key, bone];
    })
  ) as RigAliasMap;
}

function captureRigState(aliasMap: RigAliasMap): RigStateMap {
  return Object.fromEntries(
    Object.entries(aliasMap)
      .filter(([, bone]) => Boolean(bone))
      .map(([key, bone]) => [
        key,
        {
          position: bone!.position.clone(),
          rotation: bone!.rotation.clone(),
          scale: bone!.scale.clone(),
        },
      ])
  ) as RigStateMap;
}

function restoreRigState(aliasMap: RigAliasMap, initialState: RigStateMap) {
  Object.entries(initialState).forEach(([key, state]) => {
    const bone = aliasMap[key as RigAlias];
    if (!bone || !state) return;
    bone.position.copy(state.position);
    bone.rotation.copy(state.rotation);
    bone.scale.copy(state.scale);
  });
}

function stretchBonePositions(aliasMap: RigAliasMap, initialState: RigStateMap, keys: RigAlias[], factor: number, damp: number) {
  keys.forEach((key) => {
    const bone = aliasMap[key];
    const state = initialState[key];
    if (!bone || !state) return;
    bone.position.copy(state.position.clone().multiplyScalar(1 + (factor - 1) * damp));
  });
}

function applyRigMeasurements(aliasMap: RigAliasMap, initialState: RigStateMap, body: BodyProfile, gender: 'female' | 'male') {
  restoreRigState(aliasMap, initialState);

  const flatBody = flattenBodyProfile(body);
  const base = genderBaseMeasurements[gender];
  const shoulderFactor = clamp(flatBody.shoulderCm / base.shoulderCm, 0.84, 1.22);
  const chestFactor = clamp(flatBody.chestCm / base.chestCm, 0.86, 1.18);
  const waistFactor = clamp(flatBody.waistCm / base.waistCm, 0.84, 1.2);
  const hipFactor = clamp(flatBody.hipCm / base.hipCm, 0.86, 1.2);
  const legFactor = clamp(flatBody.inseamCm / base.inseamCm, 0.86, 1.18);
  const armFactor = clamp((shoulderFactor * 0.55) + (flatBody.heightCm / base.heightCm) * 0.45, 0.9, 1.14);
  const headFactor = clamp(flatBody.heightCm / base.heightCm, 0.95, 1.08);

  const trunkBone = aliasMap.chest ?? aliasMap.torso ?? aliasMap.spine;
  const waistBone = aliasMap.spine ?? aliasMap.hips;

  if (trunkBone) {
    trunkBone.scale.set(shoulderFactor * 0.98, 1, chestFactor * 0.98);
  }

  if (waistBone) {
    waistBone.scale.set((shoulderFactor + waistFactor) * 0.5, 1, waistFactor);
  }

  if (aliasMap.hips) {
    aliasMap.hips.scale.set(hipFactor, 1, (hipFactor + waistFactor) * 0.5);
  }

  if (aliasMap.head) {
    aliasMap.head.scale.setScalar(headFactor);
  }

  if (aliasMap.leftShoulder && initialState.leftShoulder) {
    aliasMap.leftShoulder.position.x = initialState.leftShoulder.position.x * shoulderFactor;
  }
  if (aliasMap.rightShoulder && initialState.rightShoulder) {
    aliasMap.rightShoulder.position.x = initialState.rightShoulder.position.x * shoulderFactor;
  }

  stretchBonePositions(aliasMap, initialState, ['leftUpperArm', 'rightUpperArm'], armFactor, 0.45);
  stretchBonePositions(aliasMap, initialState, ['leftLowerArm', 'rightLowerArm', 'leftHand', 'rightHand'], armFactor, 1);
  stretchBonePositions(aliasMap, initialState, ['leftUpperLeg', 'rightUpperLeg'], legFactor, 0.52);
  stretchBonePositions(aliasMap, initialState, ['leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot'], legFactor, 1);
}

function nudgeRotation(aliasMap: RigAliasMap, key: RigAlias, axis: 'x' | 'y' | 'z', degrees: number) {
  const bone = aliasMap[key];
  if (!bone) return;
  bone.rotation[axis] += toRadians(degrees);
}

function applyRigPose(aliasMap: RigAliasMap, initialState: RigStateMap, poseId: FittingPoseId) {
  Object.entries(initialState).forEach(([key, state]) => {
    const bone = aliasMap[key as RigAlias];
    if (!bone || !state) return;
    bone.rotation.copy(state.rotation);
  });

  switch (poseId) {
    case 'tpose':
      nudgeRotation(aliasMap, 'leftUpperArm', 'z', 90);
      nudgeRotation(aliasMap, 'rightUpperArm', 'z', -90);
      break;
    case 'relaxed':
      nudgeRotation(aliasMap, 'leftUpperArm', 'z', 18);
      nudgeRotation(aliasMap, 'rightUpperArm', 'z', -18);
      nudgeRotation(aliasMap, 'leftLowerArm', 'z', 4);
      nudgeRotation(aliasMap, 'rightLowerArm', 'z', -4);
      nudgeRotation(aliasMap, 'hips', 'y', 4);
      nudgeRotation(aliasMap, 'leftUpperLeg', 'x', -2);
      nudgeRotation(aliasMap, 'rightUpperLeg', 'x', 1);
      nudgeRotation(aliasMap, 'head', 'y', -4);
      break;
    case 'contrapposto':
      nudgeRotation(aliasMap, 'leftUpperArm', 'z', 24);
      nudgeRotation(aliasMap, 'rightUpperArm', 'z', -14);
      nudgeRotation(aliasMap, 'leftLowerArm', 'z', 6);
      nudgeRotation(aliasMap, 'hips', 'y', 8);
      nudgeRotation(aliasMap, 'chest', 'y', -6);
      nudgeRotation(aliasMap, 'leftUpperLeg', 'x', -4);
      nudgeRotation(aliasMap, 'rightUpperLeg', 'x', 3);
      nudgeRotation(aliasMap, 'head', 'y', -5);
      break;
    case 'walk':
      nudgeRotation(aliasMap, 'leftUpperArm', 'z', 34);
      nudgeRotation(aliasMap, 'rightUpperArm', 'z', -20);
      nudgeRotation(aliasMap, 'leftUpperLeg', 'x', 8);
      nudgeRotation(aliasMap, 'rightUpperLeg', 'x', -8);
      nudgeRotation(aliasMap, 'leftLowerLeg', 'x', -6);
      nudgeRotation(aliasMap, 'rightLowerLeg', 'x', 5);
      break;
    case 'handsonhips':
      nudgeRotation(aliasMap, 'leftUpperArm', 'z', 56);
      nudgeRotation(aliasMap, 'rightUpperArm', 'z', -56);
      nudgeRotation(aliasMap, 'leftUpperArm', 'y', -16);
      nudgeRotation(aliasMap, 'rightUpperArm', 'y', 16);
      nudgeRotation(aliasMap, 'leftLowerArm', 'z', 48);
      nudgeRotation(aliasMap, 'rightLowerArm', 'z', -48);
      nudgeRotation(aliasMap, 'hips', 'y', 4);
      break;
    case 'apose':
    default:
      break;
  }
}

function resolveSceneScale(body: BodyProfile, fitInfo: FitInfo, scaleMultiplier = 1) {
  const flatBody = flattenBodyProfile(body);
  const widthScale = clamp((flatBody.shoulderCm / 43 + flatBody.chestCm / 92 + flatBody.waistCm / 76) / 3, 0.9, 1.16);
  const depthScale = clamp((flatBody.chestCm / 92 + flatBody.hipCm / 96) / 2, 0.9, 1.14);
  const heightScale = flatBody.heightCm / 172;
  const scalar = (dressupHeightUnits / fitInfo.height) * scaleMultiplier;
  return new THREE.Vector3(scalar * widthScale, scalar * heightScale, scalar * depthScale);
}

function resolveScenePosition(fitInfo: FitInfo, scale: THREE.Vector3, yOffset = 0, zOffset = 0) {
  return new THREE.Vector3(
    -fitInfo.centerX * scale.x,
    dressupStageY - fitInfo.minY * scale.y + yOffset,
    -fitInfo.centerZ * scale.z + zOffset
  );
}

function configureRenderableMeshes(root: THREE.Object3D, mode: 'avatar' | 'garment', color?: string, selected = false) {
  const tint = color ? new THREE.Color(color) : null;
  root.traverse((object) => {
    if (!('isMesh' in object) || !object.isMesh) return;
    const mesh = object as THREE.Mesh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;

    const clonedMaterial = Array.isArray(mesh.material)
      ? mesh.material.map((material) => material.clone())
      : mesh.material.clone();
    mesh.material = clonedMaterial;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      material.side = THREE.FrontSide;
      material.transparent = false;
      if ('roughness' in material) material.roughness = mode === 'avatar' ? 0.9 : 0.78;
      if ('metalness' in material) material.metalness = mode === 'avatar' ? 0.04 : 0.08;
      if (mode === 'garment' && tint && 'color' in material) {
        material.color = tint.clone().lerp(new THREE.Color('#ffffff'), selected ? 0.18 : 0.04);
      }
      if ('emissive' in material) {
        (material as THREE.MeshStandardMaterial).emissive =
          mode === 'garment' && tint ? tint.clone().multiplyScalar(selected ? 0.22 : 0.08) : new THREE.Color('#000000');
      }
      if ('emissiveIntensity' in material) {
        (material as THREE.MeshStandardMaterial).emissiveIntensity = mode === 'garment' ? (selected ? 0.5 : 0.14) : 0;
      }
      if (mode === 'garment') {
        material.polygonOffset = true;
        material.polygonOffsetFactor = -1;
        material.polygonOffsetUnits = -1;
      }
      material.needsUpdate = true;
    });
  });
}

function AvatarModel({ avatarId, body, poseId }: { avatarId: AvatarPresetId; body: BodyProfile; poseId: FittingPoseId }) {
  const preset = avatarPresetMap[avatarId];
  const avatarGender = avatarGenderMap[avatarId] ?? 'female';
  const gltf = useGLTF(preset.modelPath);

  const scene = useMemo(() => {
    const next = clone(gltf.scene);
    configureRenderableMeshes(next, 'avatar');
    return next;
  }, [gltf.scene]);

  const fitInfo = useMemo(() => computeFitInfo(scene), [scene]);
  const aliasMap = useMemo(() => buildAliasMap(scene), [scene]);
  const initialState = useMemo(() => captureRigState(aliasMap), [aliasMap]);
  const scale = useMemo(() => resolveSceneScale(body, fitInfo, preset.scaleMultiplier), [body, fitInfo, preset.scaleMultiplier]);
  const position = useMemo(() => resolveScenePosition(fitInfo, scale, preset.yOffset, preset.zOffset), [fitInfo, preset.yOffset, preset.zOffset, scale]);

  useLayoutEffect(() => {
    applyRigMeasurements(aliasMap, initialState, body, avatarGender);
    applyRigPose(aliasMap, initialState, poseId);
  }, [aliasMap, avatarGender, body, initialState, poseId]);

  return <primitive object={scene} scale={scale} position={position} />;
}

function RiggedGarmentModel({
  garment,
  body,
  poseId,
  selected,
  avatarGender,
}: {
  garment: StageGarment;
  body: BodyProfile;
  poseId: FittingPoseId;
  selected: boolean;
  avatarGender: 'female' | 'male';
}) {
  const garmentGltf = useGLTF(garment.modelPath);
  const referenceRig = useGLTF(referenceRigPath);

  const scene = useMemo(() => {
    const next = clone(garmentGltf.scene);
    configureRenderableMeshes(next, 'garment', garment.color, selected);
    return next;
  }, [garment.color, garmentGltf.scene, selected]);

  const aliasMap = useMemo(() => buildAliasMap(scene), [scene]);
  const initialState = useMemo(() => captureRigState(aliasMap), [aliasMap]);
  const referenceFit = useMemo(() => computeFitInfo(referenceRig.scene), [referenceRig.scene]);
  const scale = useMemo(() => resolveSceneScale(body, referenceFit), [body, referenceFit]);
  const position = useMemo(() => resolveScenePosition(referenceFit, scale), [referenceFit, scale]);

  useLayoutEffect(() => {
    applyRigMeasurements(aliasMap, initialState, body, avatarGender);
    applyRigPose(aliasMap, initialState, poseId);
  }, [aliasMap, avatarGender, body, initialState, poseId]);

  return <primitive object={scene} scale={scale} position={position} renderOrder={selected ? 4 : 3} />;
}

function GarmentLayerMesh({ layer, selected }: { layer: SceneLayerConfig; selected: boolean }) {
  const color = selected ? new THREE.Color('#f4f0ea') : new THREE.Color(layer.color);
  const shellOpacity = selected ? 0.42 : 0.22;
  const frontOffset = 0.12 + layer.layerOrder * 0.026;

  if (layer.category === 'bottoms') {
    return (
      <group>
        <mesh position={[0, layer.shellYOffset, 0]} castShadow>
          <cylinderGeometry args={[layer.shellWidth * 0.38, layer.shellDepth * 0.31, 0.9, 24]} />
          <meshStandardMaterial color={color} transparent opacity={shellOpacity} roughness={0.84} />
        </mesh>
        {[-0.22, 0.22].map((x) => (
          <mesh key={x} position={[x, -1.4, 0]} castShadow>
            <cylinderGeometry
              args={[(layer.limbWidth ?? 0.32) * 1.04, (layer.limbWidth ?? 0.32) * 0.86, layer.limbLength ?? 1.5, 18]}
            />
            <meshStandardMaterial color={color} transparent opacity={shellOpacity} roughness={0.84} />
          </mesh>
        ))}
        <mesh position={[0, layer.shellYOffset + 0.05, frontOffset]}>
          <planeGeometry args={[layer.shellWidth * 1.08, layer.shellHeight * 1.02]} />
          <meshStandardMaterial color={color} transparent opacity={0.28} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (layer.category === 'shoes') {
    return (
      <group>
        {[-0.19, 0.19].map((x) => (
          <mesh key={x} position={[x, -2.2, 0.24 + frontOffset * 0.2]} castShadow>
            <boxGeometry args={[layer.shellWidth * 0.5, layer.shellHeight * 1.04, layer.shellDepth * 0.42]} />
            <meshStandardMaterial color={color} transparent opacity={0.84} roughness={0.74} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, layer.shellYOffset, 0]} castShadow>
        <cylinderGeometry args={[layer.shellWidth * 0.38, layer.shellDepth * 0.39, layer.shellHeight * 1.02, 28]} />
        <meshStandardMaterial color={color} transparent opacity={shellOpacity} roughness={0.82} />
      </mesh>
      {[-1, 1].map((dir) => (
        <mesh key={dir} position={[dir * (layer.shellWidth * 0.45), 0.88, 0]} rotation={[0, 0, dir * 0.06]} castShadow>
          <cylinderGeometry
            args={[(layer.limbWidth ?? 0.28) * 1.04, (layer.limbWidth ?? 0.28) * 0.88, (layer.limbLength ?? 1.4) * 1.02, 18]}
          />
          <meshStandardMaterial color={color} transparent opacity={shellOpacity} roughness={0.82} />
        </mesh>
      ))}
    </group>
  );
}

export function AvatarDressUpScene({
  body,
  layers,
  selectedAssetId,
  avatarId = 'muse',
  poseId = 'apose',
  stageGarments = [],
}: AvatarDressUpSceneProps) {
  const preset = avatarPresetMap[avatarId];
  const avatarGender = avatarGenderMap[avatarId] ?? 'female';
  const sortedLayers = useMemo(() => [...layers].sort((left, right) => left.layerOrder - right.layerOrder), [layers]);

  return (
    <Canvas shadows camera={{ position: [0, -0.25, 8.6], fov: 28.2 }} className="h-full w-full" dpr={[1, 1.75]}>
      <color attach="background" args={['#221d1a']} />
      <fog attach="fog" args={['#221d1a', 7.6, 13.4]} />
      <ambientLight intensity={0.72} color="#f5e7d0" />
      <spotLight position={[0, 5.8, 4]} angle={0.34} penumbra={0.65} intensity={44} color="#f7d2a5" castShadow />
      <spotLight position={[2.4, 2.2, 4.5]} angle={0.36} penumbra={0.75} intensity={18} color="#6fb2ff" />
      <pointLight position={[-3, 1.2, -2]} intensity={7} color="#b88653" />

      <mesh position={[0, 0.25, -3.6]}>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color="#2b2420" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, dressupStageY, 0]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color="#241e1a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, dressupStageY + 0.02, 0]} receiveShadow>
        <ringGeometry args={[1.05, 2.4, 48]} />
        <meshStandardMaterial
          color={preset.accent}
          emissive={preset.accent}
          emissiveIntensity={0.12}
          roughness={0.9}
          transparent
          opacity={0.92}
        />
      </mesh>

      <Suspense fallback={null}>
        <AvatarModel avatarId={avatarId} body={body} poseId={poseId} />
      </Suspense>

      {stageGarments.length > 0
        ? stageGarments.map((garment) => (
            <Suspense key={garment.assetId} fallback={null}>
              <RiggedGarmentModel
                garment={garment}
                body={body}
                poseId={poseId}
                selected={selectedAssetId === garment.assetId}
                avatarGender={avatarGender}
              />
            </Suspense>
          ))
        : sortedLayers.map((layer) => (
            <GarmentLayerMesh key={layer.assetId} layer={layer} selected={selectedAssetId === layer.assetId} />
          ))}

      <ContactShadows position={[0, dressupStageY + 0.01, 0]} opacity={0.42} scale={8} blur={2.8} far={5.6} />
      <OrbitControls
        enablePan={false}
        minDistance={5.6}
        maxDistance={9.8}
        maxPolarAngle={Math.PI / 1.9}
        target={[0, -1.1, 0]}
      />
    </Canvas>
  );
}
