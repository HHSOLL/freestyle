"use client";

import { useMemo, useState } from "react";
import { starterGarmentCatalog } from "@freestyle/domain-garment";
import { defaultBodyProfile, type AvatarPoseId, type AvatarRenderVariantId, type BodyProfile } from "@freestyle/shared-types";
import { Eyebrow, SurfacePanel } from "@freestyle/ui";
import { AvatarStageViewport, type ViewerQualityTier } from "@freestyle/viewer-react";

const harnessGarments = [
  "starter-top-soft-casual",
  "starter-bottom-soft-wool",
  "starter-shoe-soft-day",
  "starter-hair-wave-bob",
] as const;

const garmentLookup = new Map(starterGarmentCatalog.map((item) => [item.id, item] as const));

const poseOptions: AvatarPoseId[] = ["neutral", "relaxed", "contrapposto", "stride", "tailored"];
const qualityOptions: ViewerQualityTier[] = ["low", "balanced", "high"];
const avatarVariants: AvatarRenderVariantId[] = ["female-base", "male-base"];

export function ViewerCoreHarnessExperience() {
  const [avatarVariantId, setAvatarVariantId] = useState<AvatarRenderVariantId>("female-base");
  const [poseId, setPoseId] = useState<AvatarPoseId>("neutral");
  const [qualityTier, setQualityTier] = useState<ViewerQualityTier>("balanced");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(harnessGarments[0]);

  const activeBodyProfile = useMemo<BodyProfile>(() => {
    if (avatarVariantId === "male-base") {
      return {
        ...defaultBodyProfile,
        gender: "male",
        bodyFrame: "athletic",
        simple: {
          ...defaultBodyProfile.simple,
          shoulderCm: 46,
          chestCm: 98,
          waistCm: 82,
          hipCm: 98,
        },
        detailed: {
          ...defaultBodyProfile.detailed,
          thighCm: 57,
          calfCm: 37,
        },
      };
    }

    return {
      ...defaultBodyProfile,
      gender: "female",
      bodyFrame: "balanced",
      simple: {
        ...defaultBodyProfile.simple,
      },
      detailed: defaultBodyProfile.detailed
        ? {
            ...defaultBodyProfile.detailed,
          }
        : undefined,
    };
  }, [avatarVariantId]);

  const equippedGarments = useMemo(() => {
    return harnessGarments
      .map((garmentId) => garmentLookup.get(garmentId))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, []);

  return (
    <div
      className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8"
      data-viewer-platform-root=""
      data-selected-avatar={avatarVariantId}
      data-selected-pose={poseId}
      data-selected-quality={qualityTier}
      data-selected-item-id={selectedItemId ?? ""}
      data-body-profile-gender={activeBodyProfile.gender ?? ""}
      data-viewer-host-mode="viewer-react"
    >
      <SurfacePanel className="space-y-3 px-5 py-5">
        <Eyebrow>Lab / viewer-core harness</Eyebrow>
        <h1 className="text-[28px] font-semibold text-[#151b24]">viewer-core browser harness</h1>
        <p className="max-w-3xl text-[13px] leading-6 text-black/56">
          This route runs the direct <code>@freestyle/viewer-react</code> host instead of the runtime-3d
          compatibility stage. The current render is a proxy avatar + garment scene used to validate controller,
          viewport, camera preset, and pointer-input ownership before product cutover.
        </p>
      </SurfacePanel>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SurfacePanel className="space-y-5 px-5 py-5">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/40">Avatar</p>
            <div className="flex flex-wrap gap-2">
              {avatarVariants.map((variant) => (
                <button
                  key={variant}
                  type="button"
                  onClick={() => setAvatarVariantId(variant)}
                  aria-pressed={avatarVariantId === variant}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-[13px] font-medium text-[#151b24]"
                  style={{
                    background: avatarVariantId === variant ? "rgba(19,27,36,0.92)" : "rgba(255,255,255,0.82)",
                    color: avatarVariantId === variant ? "#ffffff" : "#151b24",
                  }}
                >
                  {variant}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/40">Pose preset</p>
            <div className="flex flex-wrap gap-2">
              {poseOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPoseId(option)}
                  aria-pressed={poseId === option}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-[13px] font-medium text-[#151b24]"
                  style={{
                    background: poseId === option ? "rgba(19,27,36,0.92)" : "rgba(255,255,255,0.82)",
                    color: poseId === option ? "#ffffff" : "#151b24",
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

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
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/40">Selected garment highlight</p>
            <div className="grid gap-2">
              {equippedGarments.map((garment) => (
                <button
                  key={garment.id}
                  type="button"
                  onClick={() => setSelectedItemId(garment.id)}
                  aria-pressed={selectedItemId === garment.id}
                  className="rounded-[18px] border border-black/10 px-3 py-3 text-left text-[13px] text-[#151b24]"
                  style={{
                    background:
                      selectedItemId === garment.id ? "rgba(19,27,36,0.92)" : "rgba(255,255,255,0.82)",
                    color: selectedItemId === garment.id ? "#ffffff" : "#151b24",
                  }}
                >
                  <div className="font-medium">{garment.name}</div>
                  <div className="text-[11px] uppercase tracking-[0.16em] opacity-70">{garment.category}</div>
                </button>
              ))}
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel className="min-h-[680px] overflow-hidden p-3">
          <AvatarStageViewport
            bodyProfile={activeBodyProfile}
            avatarVariantId={avatarVariantId}
            poseId={poseId}
            equippedGarments={equippedGarments}
            selectedItemId={selectedItemId}
            qualityTier={qualityTier}
            viewerHostMode="viewer-react"
          />
        </SurfacePanel>
      </div>
    </div>
  );
}
