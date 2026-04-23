"use client";

import {
  type ComponentRef,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
} from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { QualityTier } from "@freestyle/shared-types";
import { resolveReferenceClosetStageScenePolicy } from "./reference-closet-stage-policy.js";
import { primeRuntimeGLTFLoaderSupport } from "./runtime-gltf-loader.js";

export type ReferenceClosetStageOrbitControls = ComponentRef<typeof OrbitControls>;
type ReferenceClosetStageScenePolicy = ReturnType<typeof resolveReferenceClosetStageScenePolicy>;

export function fitCamera(
  camera: THREE.PerspectiveCamera,
  controls: ReferenceClosetStageOrbitControls | null,
  size: { width: number; height: number },
  avatarOnly: boolean,
) {
  const aspect = size.width / Math.max(size.height, 1);
  const distance = avatarOnly
    ? aspect < 1.0
      ? 5.45
      : aspect < 1.3
        ? 4.85
        : 4.35
    : aspect < 1.0
      ? 5.7
      : aspect < 1.3
        ? 4.95
        : 4.45;
  const fov = avatarOnly ? (aspect < 1.0 ? 26 : aspect < 1.3 ? 23 : 21) : aspect < 1.0 ? 28 : aspect < 1.3 ? 24 : 22;
  const targetY = avatarOnly ? 0.92 : 0.84;
  const cameraY = avatarOnly ? 1.12 : 1.02;

  camera.fov = fov;
  camera.position.set(0, cameraY, distance);
  camera.lookAt(0, targetY, 0);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.set(0, targetY, 0);
    controls.minDistance = distance - (avatarOnly ? 0.8 : 0.9);
    controls.maxDistance = distance + (avatarOnly ? 1.9 : 1.6);
    controls.minAzimuthAngle = -Math.PI * (avatarOnly ? 0.22 : 0.18);
    controls.maxAzimuthAngle = Math.PI * (avatarOnly ? 0.22 : 0.18);
    controls.maxPolarAngle = Math.PI / (avatarOnly ? 1.95 : 2.02);
    controls.minPolarAngle = Math.PI / (avatarOnly ? 3.15 : 2.9);
    controls.enablePan = false;
    controls.update();
  }
}

export function CameraRig({
  controlsRef,
  avatarOnly,
}: {
  controlsRef: RefObject<ReferenceClosetStageOrbitControls | null>;
  avatarOnly: boolean;
}) {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    fitCamera(camera as THREE.PerspectiveCamera, controlsRef.current, size, avatarOnly);
  }, [avatarOnly, camera, size, controlsRef]);

  return null;
}

function StageEnvironment({
  avatarOnly,
  qualityTier,
  exposure,
}: {
  avatarOnly: boolean;
  qualityTier: QualityTier;
  exposure: number;
}) {
  const gl = useThree((state) => state.gl);
  primeRuntimeGLTFLoaderSupport(gl);
  const environmentTexture = useMemo(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const texture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      avatarOnly ? 0.05 : qualityTier === "high" ? 0.08 : 0.07,
    ).texture;
    pmremGenerator.dispose();
    return texture;
  }, [avatarOnly, gl, qualityTier]);

  useEffect(() => {
    const previousToneMapping = gl.toneMapping;
    const previousExposure = gl.toneMappingExposure;
    // eslint-disable-next-line react-hooks/immutability
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;

    return () => {
      gl.toneMapping = previousToneMapping;
      gl.toneMappingExposure = previousExposure;
    };
  }, [exposure, gl]);

  useEffect(() => {
    return () => {
      environmentTexture.dispose();
    };
  }, [environmentTexture]);

  return <primitive object={environmentTexture} attach="environment" />;
}

function StudioBackdrop({
  avatarOnly,
  colors,
}: {
  avatarOnly: boolean;
  colors: ReferenceClosetStageScenePolicy["backdrop"];
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

export function ReferenceClosetStageView({
  scenePolicy,
  qualityTier,
  children,
}: {
  scenePolicy: ReferenceClosetStageScenePolicy;
  qualityTier: QualityTier;
  children: ReactNode;
}) {
  return (
    <Canvas
      shadows={scenePolicy.shadows ? "soft" : false}
      camera={{ position: [0, 1.18, 5.45], fov: 22, near: 0.1, far: 100 }}
      frameloop={scenePolicy.frameloop}
      gl={{ antialias: scenePolicy.antialias, alpha: true, powerPreference: "high-performance" }}
      dpr={scenePolicy.dpr}
      style={{ height: "100%", width: "100%" }}
    >
      <color attach="background" args={[scenePolicy.backgroundColor]} />
      <fog attach="fog" args={[scenePolicy.fogColor, 5.4, 13.8]} />
      <StageEnvironment
        avatarOnly={scenePolicy.avatarOnly}
        qualityTier={qualityTier}
        exposure={scenePolicy.exposure}
      />

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
      {children}
    </Canvas>
  );
}
