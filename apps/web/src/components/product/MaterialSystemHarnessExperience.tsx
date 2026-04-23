"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Eyebrow, SurfacePanel } from "@freestyle/ui";
import {
  createViewerMaterial,
  type ViewerMaterialClass,
  viewerMaterialPresets,
} from "@freestyle/viewer-core";
import { StudioLightingRig, createStudioBackdropPalette, resolveStudioLightingRigSpec } from "@freestyle/runtime-3d";
import type { QualityTier } from "@freestyle/shared-types";

const materialClasses = Object.keys(viewerMaterialPresets) as ViewerMaterialClass[];
const qualityOptions: QualityTier[] = ["low", "balanced", "high"];

function MaterialSample({
  materialClass,
  position,
}: {
  materialClass: ViewerMaterialClass;
  position: [number, number, number];
}) {
  const materials = useMemo(
    () => [createViewerMaterial(materialClass), createViewerMaterial(materialClass)],
    [materialClass],
  );

  useEffect(() => {
    return () => {
      materials.forEach((material) => material.dispose());
    };
  }, [materials]);

  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.34, 48, 48]} />
        <primitive object={materials[0]} attach="material" />
      </mesh>
      <mesh castShadow receiveShadow position={[0, -0.38, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.56, 36]} />
        <primitive object={materials[1]} attach="material" />
      </mesh>
    </group>
  );
}

export function MaterialSystemHarnessExperience() {
  const [qualityTier, setQualityTier] = useState<QualityTier>("balanced");
  const [avatarOnly, setAvatarOnly] = useState(false);
  const lightingSpec = resolveStudioLightingRigSpec({
    avatarOnly,
    qualityTier,
  });
  const palette = createStudioBackdropPalette(avatarOnly ? "#d7cec6" : "#d0d4db", avatarOnly);

  return (
    <div
      className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8"
      data-material-system-root=""
      data-selected-quality={qualityTier}
      data-lighting-mode={avatarOnly ? "avatar-only" : "dressed"}
    >
      <SurfacePanel className="space-y-3 px-5 py-5">
        <Eyebrow>Lab / material system</Eyebrow>
        <h1 className="text-[28px] font-semibold text-[#151b24]">Phase 4 material and lighting harness</h1>
        <p className="max-w-3xl text-[13px] leading-6 text-black/56">
          This harness renders the current material-class preset library under the canonical studio lighting rig.
          It is the current evidence seam for skin, hair, fabrics, footwear surfaces, and ACES exposure readability under the compatibility-stage lighting contract.
        </p>
      </SurfacePanel>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SurfacePanel className="space-y-5 px-5 py-5">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/40">Quality tier</p>
            <div className="flex flex-wrap gap-2">
              {qualityOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setQualityTier(option)}
                  aria-pressed={qualityTier === option}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-[13px] font-medium text-[#151b24]"
                  style={{
                    background: qualityTier === option ? "rgba(19,27,36,0.92)" : "rgba(255,255,255,0.82)",
                    color: qualityTier === option ? "#ffffff" : "#151b24",
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/40">Lighting mode</p>
            <button
              type="button"
              onClick={() => setAvatarOnly((current) => !current)}
              className="rounded-full border border-black/10 px-3 py-1.5 text-[13px] font-medium text-[#151b24]"
            >
              {avatarOnly ? "avatar-only" : "dressed"}
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/40">Material classes</p>
            <div className="grid gap-2">
              {materialClasses.map((materialClass) => (
                <div key={materialClass} className="rounded-[16px] border border-black/8 bg-white/82 px-3 py-2 text-[12px] text-[#151b24]">
                  <div className="font-medium">{materialClass}</div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-black/42">
                    roughness {viewerMaterialPresets[materialClass].roughness.toFixed(2)} / metalness{" "}
                    {viewerMaterialPresets[materialClass].metalness.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel className="min-h-[720px] overflow-hidden p-3">
          <div className="h-[680px] w-full overflow-hidden rounded-[28px]" data-material-stage="">
            <Canvas
              camera={{ position: [0, 1.4, 7.4], fov: 24, near: 0.1, far: 100 }}
              shadows={qualityTier !== "low" ? "soft" : false}
              dpr={qualityTier === "high" ? [1.2, 2] : qualityTier === "balanced" ? [1.05, 1.55] : [0.9, 1.05]}
              gl={{ antialias: qualityTier !== "low", alpha: true, powerPreference: "high-performance" }}
              style={{ height: "100%", width: "100%" }}
            >
              <color attach="background" args={[palette.backgroundColor]} />
              <fog attach="fog" args={[palette.fogColor, 6, 16]} />
              <StudioLightingRig
                spec={lightingSpec}
                avatarOnly={avatarOnly}
                backdrop={palette.backdrop}
                shadows={qualityTier !== "low"}
              />

              {materialClasses.map((materialClass, index) => {
                const column = index % 4;
                const row = Math.floor(index / 4);
                return (
                  <MaterialSample
                    key={materialClass}
                    materialClass={materialClass}
                    position={[-2.7 + column * 1.8, 1.9 - row * 1.8, 0]}
                  />
                );
              })}

              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
                <planeGeometry args={[14, 14]} />
                <shadowMaterial transparent opacity={qualityTier === "low" ? 0.12 : 0.2} />
              </mesh>

              <OrbitControls
                enablePan={false}
                minDistance={5.8}
                maxDistance={9.2}
                minPolarAngle={0.86}
                maxPolarAngle={1.36}
              />
            </Canvas>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
}
