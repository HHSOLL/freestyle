import React from "react";

export function ClosetStageLoadingFallback() {
  return (
    <group name="closet-stage-loading-fallback">
      <mesh name="closet-stage-loading-head" position={[0, 1.44, 0]}>
        <sphereGeometry args={[0.22, 20, 20]} />
        <meshBasicMaterial color="#f5f7fa" transparent opacity={0.88} />
      </mesh>
      <mesh name="closet-stage-loading-body" position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.34, 0.46, 1.2, 20]} />
        <meshBasicMaterial color="#edf1f7" transparent opacity={0.84} />
      </mesh>
      <mesh name="closet-stage-loading-base" rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <ringGeometry args={[1.16, 1.54, 40]} />
        <meshBasicMaterial color="#6a7db4" transparent opacity={0.22} />
      </mesh>
    </group>
  );
}
