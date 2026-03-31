'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { BodyProfile, GarmentLayerConfig } from '../fitting';

type MannequinScene3DProps = {
  body: BodyProfile;
  layers: GarmentLayerConfig[];
  selectedAssetId: string | null;
};

function MannequinBody({ body }: { body: BodyProfile }) {
  const torsoWidth = body.chestCm / 98;
  const torsoDepth = body.waistCm / 122;
  const torsoHeight = body.heightCm / 118;
  const hipWidth = body.hipCm / 100;
  const legLength = body.inseamCm / 49;
  const armWidth = body.shoulderCm / 180;

  return (
    <group>
      <mesh position={[0, 1.92, 0]} castShadow>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color="#d8c6b2" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.84, 0]} castShadow>
        <cylinderGeometry args={[torsoWidth * 0.48, torsoDepth * 0.72, torsoHeight, 24]} />
        <meshStandardMaterial color="#c8b09a" roughness={0.96} />
      </mesh>
      <mesh position={[0, -0.08, 0]} castShadow>
        <cylinderGeometry args={[hipWidth * 0.46, torsoWidth * 0.42, 0.8, 24]} />
        <meshStandardMaterial color="#b99980" roughness={0.96} />
      </mesh>
      <mesh position={[-torsoWidth * 0.62, 0.92, 0]} rotation={[0, 0, 0.08]} castShadow>
        <cylinderGeometry args={[armWidth, armWidth * 0.92, 1.45, 18]} />
        <meshStandardMaterial color="#c8b09a" roughness={0.96} />
      </mesh>
      <mesh position={[torsoWidth * 0.62, 0.92, 0]} rotation={[0, 0, -0.08]} castShadow>
        <cylinderGeometry args={[armWidth, armWidth * 0.92, 1.45, 18]} />
        <meshStandardMaterial color="#c8b09a" roughness={0.96} />
      </mesh>
      <mesh position={[-0.19, -1.42, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.14, legLength, 18]} />
        <meshStandardMaterial color="#b99980" roughness={0.96} />
      </mesh>
      <mesh position={[0.19, -1.42, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.14, legLength, 18]} />
        <meshStandardMaterial color="#b99980" roughness={0.96} />
      </mesh>
      <mesh position={[-0.19, -2.36, 0.18]} castShadow>
        <boxGeometry args={[0.3, 0.12, 0.72]} />
        <meshStandardMaterial color="#a88972" roughness={0.98} />
      </mesh>
      <mesh position={[0.19, -2.36, 0.18]} castShadow>
        <boxGeometry args={[0.3, 0.12, 0.72]} />
        <meshStandardMaterial color="#a88972" roughness={0.98} />
      </mesh>
    </group>
  );
}

function GarmentLayerMesh({
  layer,
  selected,
}: {
  layer: GarmentLayerConfig;
  selected: boolean;
}) {
  const texture = useTexture(layer.textureUrl);
  const preparedTexture = useMemo(() => {
    const next = texture.clone();
    next.colorSpace = THREE.SRGBColorSpace;
    next.flipY = false;
    next.needsUpdate = true;
    return next;
  }, [texture]);
  const color = selected ? new THREE.Color('#f4f0ea') : new THREE.Color(layer.color);
  const shellOpacity = selected ? 0.44 : 0.32;

  const frontOffset = layer.layerOrder * 0.02;

  if (layer.category === 'bottoms') {
    return (
      <group>
        <mesh position={[0, layer.shellYOffset, 0]} castShadow>
          <cylinderGeometry args={[layer.shellWidth * 0.34, layer.shellDepth * 0.28, 0.82, 24]} />
          <meshStandardMaterial color={color} transparent opacity={shellOpacity} roughness={0.86} />
        </mesh>
        {[-0.22, 0.22].map((x) => (
          <mesh key={x} position={[x, -1.4, 0]} castShadow>
            <cylinderGeometry args={[layer.limbWidth ?? 0.32, (layer.limbWidth ?? 0.32) * 0.82, layer.limbLength ?? 1.5, 18]} />
            <meshStandardMaterial color={color} transparent opacity={shellOpacity} roughness={0.86} />
          </mesh>
        ))}
        <mesh position={[0, layer.shellYOffset + 0.05, frontOffset]}>
          <planeGeometry args={[layer.shellWidth, layer.shellHeight]} />
          <meshStandardMaterial map={preparedTexture} transparent alphaTest={0.08} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (layer.category === 'shoes') {
    return (
      <group>
        {[-0.19, 0.19].map((x) => (
          <mesh key={x} position={[x, -2.22, 0.22 + frontOffset]} castShadow>
            <boxGeometry args={[layer.shellWidth * 0.45, layer.shellHeight, layer.shellDepth * 0.36]} />
            <meshStandardMaterial color={color} transparent opacity={0.8} roughness={0.78} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, layer.shellYOffset, 0]} castShadow>
        <cylinderGeometry args={[layer.shellWidth * 0.34, layer.shellDepth * 0.36, layer.shellHeight, 28]} />
        <meshStandardMaterial color={color} transparent opacity={shellOpacity} roughness={0.84} />
      </mesh>
      <mesh position={[0, layer.shellYOffset, frontOffset]}>
        <planeGeometry args={[layer.shellWidth, layer.shellHeight]} />
        <meshStandardMaterial map={preparedTexture} transparent alphaTest={0.08} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, layer.shellYOffset, -frontOffset]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[layer.shellWidth, layer.shellHeight]} />
        <meshStandardMaterial map={preparedTexture} transparent alphaTest={0.08} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((dir) => (
        <mesh key={dir} position={[dir * (layer.shellWidth * 0.42), 0.88, 0]} rotation={[0, 0, dir * 0.06]} castShadow>
          <cylinderGeometry args={[layer.limbWidth ?? 0.28, (layer.limbWidth ?? 0.28) * 0.86, layer.limbLength ?? 1.4, 18]} />
          <meshStandardMaterial color={color} transparent opacity={shellOpacity} roughness={0.84} />
        </mesh>
      ))}
    </group>
  );
}

export function MannequinScene3D({ body, layers, selectedAssetId }: MannequinScene3DProps) {
  const sortedLayers = useMemo(
    () => [...layers].sort((left, right) => left.layerOrder - right.layerOrder),
    [layers]
  );

  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.4, 6], fov: 26 }}
      className="h-full w-full"
      dpr={[1, 1.75]}
    >
      <color attach="background" args={['#f6f1ea']} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[6, 8, 4]} intensity={1.35} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-4, 3, -6]} intensity={0.45} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <shadowMaterial opacity={0.16} />
      </mesh>
      <group position={[0, 0.05, 0]}>
        <MannequinBody body={body} />
        <Suspense fallback={null}>
          {sortedLayers.map((layer) => (
            <GarmentLayerMesh key={layer.assetId} layer={layer} selected={selectedAssetId === layer.assetId} />
          ))}
        </Suspense>
      </group>
      <OrbitControls enablePan={false} minDistance={4.2} maxDistance={8} maxPolarAngle={Math.PI / 1.9} />
    </Canvas>
  );
}
