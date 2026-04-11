'use client';

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { defaultBodyProfile as canonicalDefaultBodyProfile, flattenBodyProfile } from '@freestyle/contracts/domain-types';
import { avatarPresetMap, type AvatarPresetId } from '@/features/shared-3d/avatarPresets';
import { guardGarment3dUsage } from '@/features/shared-3d/garment3dRuntimeGuard';
import { MannequinScene3D } from './MannequinScene3D';
import type { BodyProfile, GarmentLayerConfig } from './fitting';

type FittingCanvas3DProps = {
  body: BodyProfile;
  layers: GarmentLayerConfig[];
  selectedAssetId: string | null;
  avatarId?: AvatarPresetId;
};

const stageFloorY = -2.44;
const avatarHeightUnits = 4.62;
const isSkinnedFittingEnabled = process.env.NEXT_PUBLIC_SKINNED_FITTING_ENABLED !== 'false';
const isClothMvpEnabled = process.env.NEXT_PUBLIC_CLOTH_MVP_ENABLED === 'true';
const isClothSpikePassed = process.env.NEXT_PUBLIC_CLOTH_SPIKE_PASSED === 'true';
const isClothIntegrationEnabled = isClothMvpEnabled && isClothSpikePassed;
const bodyReferenceProfile = flattenBodyProfile(canonicalDefaultBodyProfile);

const openSourceGarmentMap: Partial<Record<GarmentLayerConfig['category'], string>> = {
  outerwear: 'opensource-jacket-outer-v1',
  tops: 'opensource-jacket-top-v1',
};

const isClothEligibleCategory = (category: GarmentLayerConfig['category']) =>
  category === 'tops' || category === 'outerwear';

const canUseWebGL = () => {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

class StageErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function usePreparedTexture(textureUrl: string) {
  const texture = useTexture(textureUrl);
  return useMemo(() => {
    const next = texture.clone();
    next.colorSpace = THREE.SRGBColorSpace;
    next.flipY = false;
    next.needsUpdate = true;
    return next;
  }, [texture]);
}

function makeAvatarMaterial(color: string) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.76,
    metalness: 0.06,
  });
}

const clamp01 = (value: number) => Math.max(-1, Math.min(1, value));

const buildShapeParamsFromBody = (body: BodyProfile) => {
  const flatBody = flattenBodyProfile(body);
  return {
    beta_0: clamp01((flatBody.chestCm - bodyReferenceProfile.chestCm) / 22),
    beta_1: clamp01((flatBody.waistCm - bodyReferenceProfile.waistCm) / 22),
    beta_2: clamp01((flatBody.hipCm - bodyReferenceProfile.hipCm) / 22),
    beta_3: clamp01((flatBody.shoulderCm - bodyReferenceProfile.shoulderCm) / 16),
    beta_4: clamp01((flatBody.inseamCm - bodyReferenceProfile.inseamCm) / 16),
    height: clamp01((flatBody.heightCm - bodyReferenceProfile.heightCm) / 22),
    chest: clamp01((flatBody.chestCm - bodyReferenceProfile.chestCm) / 22),
    waist: clamp01((flatBody.waistCm - bodyReferenceProfile.waistCm) / 22),
    hip: clamp01((flatBody.hipCm - bodyReferenceProfile.hipCm) / 22),
    shoulders: clamp01((flatBody.shoulderCm - bodyReferenceProfile.shoulderCm) / 16),
  };
};

const applyShapeToMorphTargets = (mesh: THREE.Mesh, shapeParams: Record<string, number>) => {
  const dictionary = mesh.morphTargetDictionary;
  const influences = mesh.morphTargetInfluences;
  if (!dictionary || !influences) return;

  for (let index = 0; index < influences.length; index += 1) influences[index] = 0;

  for (const [rawKey, value] of Object.entries(shapeParams)) {
    const direct = dictionary[rawKey];
    if (typeof direct === 'number') {
      influences[direct] = value;
      continue;
    }

    const lowerMatch = Object.entries(dictionary).find(([key]) => key.toLowerCase() === rawKey.toLowerCase())?.[1];
    if (typeof lowerMatch === 'number') {
      influences[lowerMatch] = value;
      continue;
    }

    if (rawKey.startsWith('beta_')) {
      const betaIndex = Number(rawKey.split('_')[1]);
      if (Number.isFinite(betaIndex) && betaIndex >= 0 && betaIndex < influences.length) {
        influences[betaIndex] = value;
      }
    }
  }
};

function CenterStageAvatar({
  avatarId,
  body,
  onSkeletonReady,
  shapeParams,
}: {
  avatarId: AvatarPresetId;
  body: BodyProfile;
  onSkeletonReady: (skeleton: THREE.Skeleton | null) => void;
  shapeParams: Record<string, number>;
}) {
  const preset = avatarPresetMap[avatarId];
  const gltf = useGLTF(preset.modelPath);

  const { model, position, scale, skinnedMeshes, skeleton } = useMemo(() => {
    const flatBody = flattenBodyProfile(body);
    const scene = clone(gltf.scene);
    const nextSkinnedMeshes: THREE.Mesh[] = [];
    let nextSkeleton: THREE.Skeleton | null = null;

    scene.traverse((object) => {
      if ('isMesh' in object && object.isMesh) {
        const mesh = object as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = makeAvatarMaterial(preset.tint);

        if ('isSkinnedMesh' in object && object.isSkinnedMesh) {
          const skinnedMesh = object as THREE.SkinnedMesh;
          nextSkeleton ??= skinnedMesh.skeleton;
        }

        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          nextSkinnedMeshes.push(mesh);
        }
      }
    });

    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const sourceHeight = Math.max(size.y, 0.001);
    const bodyHeightScale = flatBody.heightCm / 172;
    const nextScale = (avatarHeightUnits / sourceHeight) * bodyHeightScale * preset.scaleMultiplier;
    const nextPosition = new THREE.Vector3(
      -center.x * nextScale,
      stageFloorY - box.min.y * nextScale + preset.yOffset,
      -center.z * nextScale + preset.zOffset
    );

    return {
      model: scene,
      position: nextPosition,
      scale: nextScale,
      skinnedMeshes: nextSkinnedMeshes,
      skeleton: nextSkeleton,
    };
  }, [body, gltf.scene, preset]);

  useEffect(() => {
    onSkeletonReady(skeleton);
  }, [onSkeletonReady, skeleton]);

  useEffect(() => {
    skinnedMeshes.forEach((mesh) => applyShapeToMorphTargets(mesh, shapeParams));
  }, [shapeParams, skinnedMeshes]);

  return <primitive object={model} position={position} scale={scale} />;
}

function SkinnedGarmentModel({
  modelUrl,
  avatarSkeleton,
}: {
  modelUrl: string;
  avatarSkeleton: THREE.Skeleton | null;
}) {
  const gltf = useGLTF(modelUrl);

  const garmentModel = useMemo(() => {
    const scene = clone(gltf.scene);

    scene.traverse((object) => {
      if ('isMesh' in object && object.isMesh) {
        const mesh = object as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      if ('isSkinnedMesh' in object && object.isSkinnedMesh && avatarSkeleton) {
        const skinnedMesh = object as THREE.SkinnedMesh;
        const canShare = skinnedMesh.skeleton.bones.length === avatarSkeleton.bones.length;
        if (canShare) {
          skinnedMesh.bind(avatarSkeleton, skinnedMesh.bindMatrix);
        }
      }
    });

    return scene;
  }, [avatarSkeleton, gltf.scene]);

  return <primitive object={garmentModel} />;
}

function StageDecor() {
  const mannequin = useGLTF('/assets/props/reyshapes-mannequin.glb');
  const jacket = useGLTF('/assets/props/polygonalmind-jacket.glb');

  const mannequinClone = useMemo(() => {
    const scene = clone(mannequin.scene);
    scene.traverse((object) => {
      if ('isMesh' in object && object.isMesh) {
        const mesh = object as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = makeAvatarMaterial('#867865');
      }
    });
    return scene;
  }, [mannequin.scene]);

  const jacketClone = useMemo(() => {
    const scene = clone(jacket.scene);
    scene.traverse((object) => {
      if ('isMesh' in object && object.isMesh) {
        const mesh = object as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = makeAvatarMaterial('#b4a791');
      }
    });
    return scene;
  }, [jacket.scene]);

  return (
    <group>
      <primitive object={mannequinClone} scale={1.08} position={[-2.9, -1.82, -1.8]} rotation={[0, 0.46, 0]} />
      <primitive object={jacketClone} scale={1.16} position={[2.7, 0.12, -1.3]} rotation={[0.08, -0.64, 0.04]} />
    </group>
  );
}

function GarmentLayer({
  layer,
  isSelected,
}: {
  layer: GarmentLayerConfig;
  isSelected: boolean;
}) {
  const preparedTexture = usePreparedTexture(layer.textureUrl);
  const color = useMemo(
    () => new THREE.Color(isSelected ? '#f6efe4' : layer.color),
    [isSelected, layer.color]
  );
  const shellOpacity = isSelected ? 0.46 : 0.2;
  const frontOffset = 0.12 + layer.layerOrder * 0.028;

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
          <meshStandardMaterial map={preparedTexture} transparent alphaTest={0.08} side={THREE.DoubleSide} />
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
      <mesh position={[0, layer.shellYOffset, frontOffset]}>
        <planeGeometry args={[layer.shellWidth * 1.06, layer.shellHeight * 1.02]} />
        <meshStandardMaterial map={preparedTexture} transparent alphaTest={0.08} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, layer.shellYOffset, -frontOffset]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[layer.shellWidth * 1.06, layer.shellHeight * 1.02]} />
        <meshStandardMaterial map={preparedTexture} transparent alphaTest={0.08} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((dir) => (
        <mesh
          key={dir}
          position={[dir * (layer.shellWidth * 0.45), 0.88, 0]}
          rotation={[0, 0, dir * 0.06]}
          castShadow
        >
          <cylinderGeometry
            args={[(layer.limbWidth ?? 0.28) * 1.04, (layer.limbWidth ?? 0.28) * 0.88, (layer.limbLength ?? 1.4) * 1.02, 18]}
          />
          <meshStandardMaterial color={color} transparent opacity={shellOpacity} roughness={0.82} />
        </mesh>
      ))}
    </group>
  );
}

function resolveTorsoCollider(body: BodyProfile) {
  const flatBody = flattenBodyProfile(body);
  const chestRadius = THREE.MathUtils.clamp(flatBody.chestCm / 240, 0.33, 0.62);
  const waistRadius = THREE.MathUtils.clamp(flatBody.waistCm / 255, 0.28, 0.55);
  return {
    top: new THREE.Vector3(0, 1.14, 0.01),
    bottom: new THREE.Vector3(0, -0.72, -0.04),
    radius: Math.max(chestRadius, waistRadius),
  };
}

function closestPointOnSegment(
  point: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3
) {
  const segment = new THREE.Vector3().subVectors(b, a);
  const lengthSq = segment.lengthSq();
  if (lengthSq <= 1e-6) return a.clone();
  const pointToStart = new THREE.Vector3().subVectors(point, a);
  const t = THREE.MathUtils.clamp(pointToStart.dot(segment) / lengthSq, 0, 1);
  return new THREE.Vector3().copy(a).add(segment.multiplyScalar(t));
}

function ClothPreviewLayer({
  body,
  layer,
  isSelected,
  onSolverFailure,
}: {
  body: BodyProfile;
  layer: GarmentLayerConfig;
  isSelected: boolean;
  onSolverFailure: () => void;
}) {
  const preparedTexture = usePreparedTexture(layer.textureUrl);
  const flatBody = useMemo(() => flattenBodyProfile(body), [body]);
  const color = useMemo(
    () => new THREE.Color(isSelected ? '#f6efe4' : layer.color),
    [isSelected, layer.color]
  );
  const frontOffset = 0.12 + layer.layerOrder * 0.028;
  const opacity = isSelected ? 0.58 : 0.34;

  const geometry = useMemo(() => {
    const width = layer.shellWidth * 1.1;
    const height = layer.shellHeight * 1.08;
    const gridX = 20;
    const gridY = 28;
    const mesh = new THREE.PlaneGeometry(width, height, gridX, gridY);
    return mesh;
  }, [layer.shellHeight, layer.shellWidth]);

  const restPositions = useMemo(() => {
    const attr = geometry.getAttribute('position');
    return new Float32Array((attr.array as Float32Array).slice());
  }, [geometry]);

  const velocitiesRef = useRef(new Float32Array(restPositions.length));
  const point = useMemo(() => new THREE.Vector3(), []);
  const closest = useMemo(() => new THREE.Vector3(), []);
  const needsResetRef = useRef(true);
  const lowFpsFrames = useRef(0);
  const failureRaisedRef = useRef(false);

  useEffect(() => {
    velocitiesRef.current = new Float32Array(restPositions.length);
  }, [restPositions.length]);

  useEffect(() => {
    needsResetRef.current = true;
  }, [
    flatBody.heightCm,
    flatBody.chestCm,
    flatBody.waistCm,
    flatBody.hipCm,
    flatBody.shoulderCm,
    layer.assetId,
    layer.shellHeight,
    layer.shellWidth,
  ]);

  useFrame((_, delta) => {
    const dt = THREE.MathUtils.clamp(delta, 1 / 240, 1 / 20);
    const attr = geometry.getAttribute('position');
    const positions = attr.array as Float32Array;
    const velocities = velocitiesRef.current;
    const pointCount = positions.length / 3;
    const stride = 3;
    const topRowCount = 21;

    if (!Number.isFinite(delta) || delta > 0.25) {
      if (!failureRaisedRef.current) {
        failureRaisedRef.current = true;
        onSolverFailure();
      }
      return;
    }

    if (dt > 1 / 28) {
      lowFpsFrames.current += 1;
    } else if (lowFpsFrames.current > 0) {
      lowFpsFrames.current -= 1;
    }
    if (lowFpsFrames.current > 12 && !failureRaisedRef.current) {
      failureRaisedRef.current = true;
      onSolverFailure();
      return;
    }

    if (needsResetRef.current) {
      positions.set(restPositions);
      velocities.fill(0);
      needsResetRef.current = false;
    }

    const collider = resolveTorsoCollider(body);
    const gravity = -4.2;
    const spring = 13.0;
    const damping = 0.92;

    for (let index = 0; index < pointCount; index += 1) {
      const i3 = index * stride;
      const anchored = index < topRowCount;

      if (anchored) {
        positions[i3] = restPositions[i3];
        positions[i3 + 1] = restPositions[i3 + 1];
        positions[i3 + 2] = restPositions[i3 + 2];
        velocities[i3] = 0;
        velocities[i3 + 1] = 0;
        velocities[i3 + 2] = 0;
        continue;
      }

      const dx = restPositions[i3] - positions[i3];
      const dy = restPositions[i3 + 1] - positions[i3 + 1];
      const dz = restPositions[i3 + 2] - positions[i3 + 2];

      velocities[i3] = (velocities[i3] + dx * spring * dt) * damping;
      velocities[i3 + 1] = (velocities[i3 + 1] + (dy * spring + gravity) * dt) * damping;
      velocities[i3 + 2] = (velocities[i3 + 2] + dz * spring * dt) * damping;

      positions[i3] += velocities[i3] * dt;
      positions[i3 + 1] += velocities[i3 + 1] * dt;
      positions[i3 + 2] += velocities[i3 + 2] * dt;

      point.set(positions[i3], positions[i3 + 1] + layer.shellYOffset, positions[i3 + 2] + frontOffset);
      closest.copy(closestPointOnSegment(point, collider.top, collider.bottom));
      const normal = point.sub(closest);
      const distance = normal.length();

      if (distance < collider.radius) {
        const safeDistance = Math.max(distance, 1e-4);
        normal.multiplyScalar(1 / safeDistance);
        const push = collider.radius - safeDistance;
        positions[i3] += normal.x * push;
        positions[i3 + 1] += normal.y * push;
        positions[i3 + 2] += normal.z * push;

        const velocityDot = velocities[i3] * normal.x + velocities[i3 + 1] * normal.y + velocities[i3 + 2] * normal.z;
        if (velocityDot < 0) {
          velocities[i3] -= normal.x * velocityDot * 0.75;
          velocities[i3 + 1] -= normal.y * velocityDot * 0.75;
          velocities[i3 + 2] -= normal.z * velocityDot * 0.75;
        }
      }
    }

    attr.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh position={[0, layer.shellYOffset, frontOffset]} geometry={geometry}>
      <meshStandardMaterial
        map={preparedTexture}
        color={color}
        transparent
        opacity={opacity}
        roughness={0.82}
        metalness={0.04}
        side={THREE.DoubleSide}
        alphaTest={0.08}
      />
    </mesh>
  );
}

function FittingStageScene({
  body,
  layers,
  selectedAssetId,
  avatarId,
  onSolverFailure,
}: Required<FittingCanvas3DProps> & { onSolverFailure: () => void }) {
  const preset = avatarPresetMap[avatarId];
  const [avatarSkeleton, setAvatarSkeleton] = useState<THREE.Skeleton | null>(null);
  const shapeParams = useMemo(() => buildShapeParamsFromBody(body), [body]);
  const sortedLayers = useMemo(
    () => [...layers].sort((left, right) => left.layerOrder - right.layerOrder),
    [layers]
  );
  const selectedLayer = useMemo(
    () => sortedLayers.find((layer) => layer.assetId === selectedAssetId) ?? sortedLayers[sortedLayers.length - 1] ?? null,
    [selectedAssetId, sortedLayers]
  );
  const clothLayer =
    selectedLayer && isClothIntegrationEnabled && isClothEligibleCategory(selectedLayer.category)
      ? selectedLayer
      : null;
  const selectedLayerModelId =
    selectedLayer && !clothLayer ? openSourceGarmentMap[selectedLayer.category] ?? null : null;
  const selectedLayerModelGuard = useMemo(() => {
    if (!selectedLayer || !selectedLayerModelId) return null;
    return guardGarment3dUsage(selectedLayerModelId, {
      expectedCategory: selectedLayer.category,
      requiredSkeletonProfileId: 'freestyle-humanoid-v1',
      requiredColliderProfileId: selectedLayer.category === 'tops' || selectedLayer.category === 'outerwear'
        ? 'torso-fitted-v1'
        : undefined,
    });
  }, [selectedLayer, selectedLayerModelId]);
  const selectedLayerModelUrl = selectedLayerModelGuard?.ok ? selectedLayerModelGuard.asset.modelPath : null;

  useEffect(() => {
    if (!selectedLayerModelGuard || selectedLayerModelGuard.ok) return;
    console.warn(selectedLayerModelGuard.reason);
  }, [selectedLayerModelGuard]);
  const hiddenLayerIds = useMemo(() => {
    const ids = new Set<string>();
    if (clothLayer) ids.add(clothLayer.assetId);
    if (selectedLayerModelUrl && selectedLayer) ids.add(selectedLayer.assetId);
    return ids;
  }, [clothLayer, selectedLayer, selectedLayerModelUrl]);

  return (
    <>
      <ambientLight intensity={0.9} color="#fff4e4" />
      <hemisphereLight intensity={0.44} color="#f6efe3" groundColor="#695a48" />
      <spotLight position={[0, 6.2, 4.3]} angle={0.34} penumbra={0.7} intensity={42} color="#f9dcb4" castShadow />
      <spotLight position={[2.6, 2.4, 4.8]} angle={0.38} penumbra={0.76} intensity={14} color="#83bfff" />
      <pointLight position={[-2.8, 1.4, -2.2]} intensity={5.5} color="#b9926d" />

      <mesh position={[0, 0.2, -3.6]}>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color="#f4ede2" roughness={1} transparent opacity={0.18} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, stageFloorY, 0]} receiveShadow>
        <circleGeometry args={[3.65, 72]} />
        <meshStandardMaterial color="#c2b4a2" roughness={0.98} transparent opacity={0.28} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, stageFloorY + 0.02, 0]} receiveShadow>
        <ringGeometry args={[1.18, 2.62, 64]} />
        <meshStandardMaterial
          color={preset.accent}
          emissive={preset.accent}
          emissiveIntensity={0.18}
          roughness={0.9}
          transparent
          opacity={0.72}
        />
      </mesh>

      <Suspense fallback={null}>
        <StageDecor />
        <CenterStageAvatar avatarId={avatarId} body={body} onSkeletonReady={setAvatarSkeleton} shapeParams={shapeParams} />

        {selectedLayerModelUrl ? (
          <SkinnedGarmentModel modelUrl={selectedLayerModelUrl} avatarSkeleton={avatarSkeleton} />
        ) : null}

        {clothLayer ? (
          <ClothPreviewLayer
            body={body}
            layer={clothLayer}
            isSelected={selectedAssetId === clothLayer.assetId}
            onSolverFailure={onSolverFailure}
          />
        ) : null}

        {sortedLayers
          .filter((layer) => !hiddenLayerIds.has(layer.assetId))
          .map((layer) => (
          <GarmentLayer key={layer.assetId} layer={layer} isSelected={selectedAssetId === layer.assetId} />
          ))}
      </Suspense>

      <ContactShadows position={[0, stageFloorY + 0.01, 0]} opacity={0.34} scale={8} blur={2.8} far={5.8} />
      <OrbitControls
        enablePan={false}
        minDistance={4.2}
        maxDistance={8.2}
        maxPolarAngle={Math.PI / 1.9}
        target={[0, -0.18, 0]}
      />
    </>
  );
}

export function FittingCanvas3D({
  body,
  layers,
  selectedAssetId,
  avatarId = 'muse',
}: FittingCanvas3DProps) {
  const [useLegacyFallback, setUseLegacyFallback] = useState(
    () => !canUseWebGL() || (!isSkinnedFittingEnabled && !isClothIntegrationEnabled)
  );

  const legacyScene = (
    <MannequinScene3D body={body} layers={layers} selectedAssetId={selectedAssetId} avatarId={avatarId} />
  );

  if (useLegacyFallback) {
    return legacyScene;
  }

  return (
    <div className="h-full w-full" aria-label="3D fitting stage">
      <StageErrorBoundary onError={() => setUseLegacyFallback(true)}>
        <Canvas
          shadows
          fallback={legacyScene}
          camera={{ position: [0, 0.42, 6], fov: 24 }}
          className="h-full w-full"
          dpr={[1, 1.75]}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        >
          <FittingStageScene
            body={body}
            layers={layers}
            selectedAssetId={selectedAssetId}
            avatarId={avatarId}
            onSolverFailure={() => setUseLegacyFallback(true)}
          />
        </Canvas>
      </StageErrorBoundary>
    </div>
  );
}

useGLTF.preload('/assets/avatars/quaternius-man.glb');
useGLTF.preload('/assets/avatars/quaternius-animated-woman.glb');
useGLTF.preload('/assets/props/reyshapes-mannequin.glb');
useGLTF.preload('/assets/props/polygonalmind-jacket.glb');
