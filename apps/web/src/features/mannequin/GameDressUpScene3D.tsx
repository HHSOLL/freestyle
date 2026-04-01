'use client';

import { Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Object3D } from 'three';
import type { DressUpSlot, EquippedDressUp } from './gameDressUpAssets';
import { dressUpStylesById } from './gameDressUpAssets';

type GameDressUpScene3DProps = {
  equipped: EquippedDressUp;
};

function SlotMesh({ slot, styleId }: { slot: DressUpSlot; styleId: EquippedDressUp[DressUpSlot] }) {
  const style = dressUpStylesById[styleId];
  const template = useLoader(FBXLoader, style.modelPath);

  const object = useMemo(() => {
    const next = clone(template) as Object3D;
    next.scale.setScalar(0.01);
    next.position.set(0, -0.94, 0);
    next.traverse((child) => {
      if (child.type === 'SkinnedMesh') {
        const visible = child.name === style.meshNames[slot];
        child.visible = visible;
        if (visible) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
        }
      }
    });
    return next;
  }, [slot, style.meshNames, template]);

  return <primitive object={object} />;
}

export function GameDressUpScene3D({ equipped }: GameDressUpScene3DProps) {
  return (
    <Canvas shadows camera={{ position: [0, 92, 220], fov: 24 }} className="h-full w-full" dpr={[1, 1.5]}>
      <color attach="background" args={['#0d0a07']} />
      <ambientLight intensity={1.15} />
      <directionalLight
        position={[90, 140, 120]}
        intensity={1.65}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-70, 40, -70]} intensity={0.58} />
      <spotLight position={[0, 170, 90]} angle={0.28} penumbra={0.5} intensity={1.35} color="#ffdca6" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.75, 0]} receiveShadow>
        <circleGeometry args={[96, 64]} />
        <shadowMaterial opacity={0.28} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.76, 0]}>
        <circleGeometry args={[104, 64]} />
        <meshStandardMaterial color="#17120d" roughness={0.92} />
      </mesh>
      <Suspense fallback={null}>
        <group position={[0, 0, 8]}>
          <SlotMesh slot="head" styleId={equipped.head} />
          <SlotMesh slot="body" styleId={equipped.body} />
          <SlotMesh slot="legs" styleId={equipped.legs} />
          <SlotMesh slot="feet" styleId={equipped.feet} />
        </group>
      </Suspense>
      <OrbitControls enablePan={false} minDistance={150} maxDistance={260} maxPolarAngle={Math.PI / 1.88} />
    </Canvas>
  );
}
