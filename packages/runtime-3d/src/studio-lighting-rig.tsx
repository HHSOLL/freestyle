"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { StudioBackdropColors, StudioLightingRigSpec } from "./studio-lighting-rig-policy.js";

const setRendererToneMapping = (renderer: THREE.WebGLRenderer, exposure: number) => {
  const previousToneMapping = renderer.toneMapping;
  const previousExposure = renderer.toneMappingExposure;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  return {
    previousToneMapping,
    previousExposure,
  };
};

const restoreRendererToneMapping = (
  renderer: THREE.WebGLRenderer,
  previous: {
    previousToneMapping: THREE.ToneMapping;
    previousExposure: number;
  },
) => {
  renderer.toneMapping = previous.previousToneMapping;
  renderer.toneMappingExposure = previous.previousExposure;
};

function StageEnvironment({
  environmentIntensity,
  exposure,
  onPrimeRenderer,
}: {
  environmentIntensity: number;
  exposure: number;
  onPrimeRenderer?: ((renderer: THREE.WebGLRenderer) => void) | undefined;
}) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  const environmentTexture = useMemo(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const texture = pmremGenerator.fromScene(new RoomEnvironment(), environmentIntensity).texture;
    pmremGenerator.dispose();
    return texture;
  }, [environmentIntensity, gl]);

  useEffect(() => {
    onPrimeRenderer?.(gl);
  }, [gl, onPrimeRenderer]);

  useEffect(() => {
    const previous = setRendererToneMapping(gl, exposure);

    return () => {
      restoreRendererToneMapping(gl, previous);
    };
  }, [exposure, gl]);

  useEffect(() => {
    gl.compile(scene, camera);
  }, [camera, gl, scene, environmentTexture]);

  useEffect(() => {
    return () => {
      environmentTexture.dispose();
    };
  }, [environmentTexture]);

  return <primitive object={environmentTexture} attach="environment" />;
}

export function StudioBackdrop({
  avatarOnly,
  colors,
}: {
  avatarOnly: boolean;
  colors: StudioBackdropColors;
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

export function StudioLightingRig({
  spec,
  avatarOnly,
  backdrop,
  shadows,
  onPrimeRenderer,
}: {
  spec: StudioLightingRigSpec;
  avatarOnly: boolean;
  backdrop: StudioBackdropColors;
  shadows: boolean;
  onPrimeRenderer?: ((renderer: THREE.WebGLRenderer) => void) | undefined;
}) {
  return (
    <>
      <StageEnvironment
        environmentIntensity={spec.environmentIntensity}
        exposure={spec.exposure}
        onPrimeRenderer={onPrimeRenderer}
      />

      <ambientLight intensity={spec.ambientIntensity} />
      <hemisphereLight args={[spec.hemisphere.skyColor, spec.hemisphere.groundColor, spec.hemisphere.intensity]} />
      <directionalLight
        position={[3.8, 5.9, 4.4]}
        intensity={spec.directional.intensity}
        color={spec.directional.color}
        castShadow={shadows}
        shadow-mapSize-width={spec.directional.shadowMapSize}
        shadow-mapSize-height={spec.directional.shadowMapSize}
        shadow-camera-near={0.5}
        shadow-camera-far={16}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6.4}
        shadow-camera-bottom={-3.8}
      />
      <spotLight position={[-3.4, 5.0, 3.4]} angle={0.48} penumbra={0.94} intensity={spec.leftSpot.intensity} color={spec.leftSpot.color} />
      <spotLight position={[3.3, 4.7, 2.8]} angle={0.44} penumbra={0.94} intensity={spec.rightSpot.intensity} color={spec.rightSpot.color} />
      <pointLight position={[0, 4.8, -2.6]} intensity={spec.point.intensity} distance={14} color={spec.point.color} />
      {spec.avatarOnlyAccent ? (
        <>
          <directionalLight
            position={[-2.6, 2.4, 4.6]}
            intensity={spec.avatarOnlyAccent.directionalIntensity}
            color={spec.avatarOnlyAccent.directionalColor}
          />
          <spotLight
            position={[0, 2.2, 5.8]}
            angle={0.34}
            penumbra={0.92}
            intensity={spec.avatarOnlyAccent.spotIntensity}
            color={spec.avatarOnlyAccent.spotColor}
          />
        </>
      ) : null}
      <StudioBackdrop avatarOnly={avatarOnly} colors={backdrop} />
    </>
  );
}
