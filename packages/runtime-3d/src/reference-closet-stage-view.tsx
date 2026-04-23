"use client";

import {
  type ComponentRef,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
} from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { resolveReferenceClosetStageScenePolicy } from "./reference-closet-stage-policy.js";
import { primeRuntimeGLTFLoaderSupport } from "./runtime-gltf-loader.js";
import { StudioLightingRig } from "./studio-lighting-rig.js";

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

export function ReferenceClosetStageView({
  scenePolicy,
  children,
}: {
  scenePolicy: ReferenceClosetStageScenePolicy;
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
      <StudioLightingRig
        spec={scenePolicy.lighting}
        avatarOnly={scenePolicy.avatarOnly}
        backdrop={scenePolicy.backdrop}
        shadows={scenePolicy.shadows}
        onPrimeRenderer={primeRuntimeGLTFLoaderSupport}
      />
      {children}
    </Canvas>
  );
}
