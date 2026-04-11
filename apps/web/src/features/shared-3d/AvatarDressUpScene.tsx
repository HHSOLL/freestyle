'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { flattenBodyProfile, type BodyProfile } from '@freestyle/contracts/domain-types';
import { avatarPresetMap, type AvatarPresetId } from './avatarPresets';

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
};

const dressupStageY = -2.44;
const dressupHeightUnits = 4.62;

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
    roughness: 0.78,
    metalness: 0.08,
  });
}

function AvatarModel({ avatarId, body }: { avatarId: AvatarPresetId; body: BodyProfile }) {
  const preset = avatarPresetMap[avatarId];
  const gltf = useGLTF(preset.modelPath);

  const { model, scale, position } = useMemo(() => {
    const flatBody = flattenBodyProfile(body);
    const scene = clone(gltf.scene);
    scene.traverse((object) => {
      if ('isMesh' in object && object.isMesh) {
        const mesh = object as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = makeAvatarMaterial(preset.tint);
      }
    });

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const sourceHeight = Math.max(size.y, 0.001);
    const bodyHeightScale = flatBody.heightCm / 172;
    const nextScale = (dressupHeightUnits / sourceHeight) * bodyHeightScale * preset.scaleMultiplier;
    const nextPosition = new THREE.Vector3(
      -center.x * nextScale,
      dressupStageY - box.min.y * nextScale + preset.yOffset,
      -center.z * nextScale + preset.zOffset
    );

    return {
      model: scene,
      scale: nextScale,
      position: nextPosition,
    };
  }, [body, gltf.scene, preset]);

  return <primitive object={model} scale={scale} position={position} />;
}

function StageProps() {
  const mannequin = useGLTF('/assets/props/reyshapes-mannequin.glb');
  const jacket = useGLTF('/assets/props/polygonalmind-jacket.glb');

  const mannequinClone = useMemo(() => {
    const scene = clone(mannequin.scene);
    scene.traverse((object) => {
      if ('isMesh' in object && object.isMesh) {
        const mesh = object as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = makeAvatarMaterial('#7d705f');
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
        mesh.material = makeAvatarMaterial('#b1a48d');
      }
    });
    return scene;
  }, [jacket.scene]);

  return (
    <group>
      <primitive object={mannequinClone} scale={1.18} position={[-2.5, -1.65, -1.6]} rotation={[0, 0.4, 0]} />
      <primitive object={jacketClone} scale={1.24} position={[2.2, 0.2, -1.2]} rotation={[0.06, -0.55, 0.04]} />
    </group>
  );
}

function GarmentLayerMesh({ layer, selected }: { layer: SceneLayerConfig; selected: boolean }) {
  const preparedTexture = usePreparedTexture(layer.textureUrl);
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

export function AvatarDressUpScene({
  body,
  layers,
  selectedAssetId,
  avatarId = 'muse',
}: AvatarDressUpSceneProps) {
  const preset = avatarPresetMap[avatarId];
  const sortedLayers = useMemo(
    () => [...layers].sort((left, right) => left.layerOrder - right.layerOrder),
    [layers]
  );

  return (
    <Canvas shadows camera={{ position: [0, 0.4, 6.2], fov: 24 }} className="h-full w-full" dpr={[1, 1.75]}>
      <color attach="background" args={['#110f0d']} />
      <fog attach="fog" args={['#110f0d', 7, 12.5]} />
      <ambientLight intensity={0.72} color="#f5e7d0" />
      <spotLight position={[0, 5.8, 4]} angle={0.34} penumbra={0.65} intensity={44} color="#f7d2a5" castShadow />
      <spotLight position={[2.4, 2.2, 4.5]} angle={0.36} penumbra={0.75} intensity={18} color="#6fb2ff" />
      <pointLight position={[-3, 1.2, -2]} intensity={7} color="#b88653" />

      <mesh position={[0, 0.25, -3.6]}>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color="#171311" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, dressupStageY, 0]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color="#1d1814" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, dressupStageY + 0.02, 0]} receiveShadow>
        <ringGeometry args={[1.05, 2.4, 48]} />
        <meshStandardMaterial color={preset.accent} emissive={preset.accent} emissiveIntensity={0.12} roughness={0.9} transparent opacity={0.92} />
      </mesh>

      <Suspense fallback={null}>
        <StageProps />
        <AvatarModel avatarId={avatarId} body={body} />
        {sortedLayers.map((layer) => (
          <GarmentLayerMesh key={layer.assetId} layer={layer} selected={selectedAssetId === layer.assetId} />
        ))}
      </Suspense>

      <ContactShadows position={[0, dressupStageY + 0.01, 0]} opacity={0.42} scale={8} blur={2.8} far={5.6} />
      <OrbitControls enablePan={false} minDistance={4.4} maxDistance={8.2} maxPolarAngle={Math.PI / 1.9} target={[0, -0.15, 0]} />
    </Canvas>
  );
}

useGLTF.preload('/assets/avatars/quaternius-man.glb');
useGLTF.preload('/assets/avatars/quaternius-animated-woman.glb');
useGLTF.preload('/assets/props/reyshapes-mannequin.glb');
useGLTF.preload('/assets/props/polygonalmind-jacket.glb');
