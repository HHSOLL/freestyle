"use client";

import Image from "next/image";
import { flattenBodyProfile } from "@freestyle/shared-types";
import { BottomModeBar, Eyebrow, ReferenceWorkspace, SurfacePanel } from "@freestyle/ui";
import { AvatarStageViewport } from "@/components/product/AvatarStageViewport";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useCanvasCompositions } from "@/hooks/useCanvasCompositions";
import { useClosetScene } from "@/hooks/useClosetScene";
import { useLanguage } from "@/lib/LanguageContext";

export default function ProfilePage() {
  const { language } = useLanguage();
  const { profile } = useBodyProfile();
  const { scene, equippedGarments } = useClosetScene();
  const { items } = useCanvasCompositions(profile, scene);
  const flattened = flattenBodyProfile(profile);
  const spotlightMeasurements = Object.entries(flattened).slice(0, 6);

  return (
    <ReferenceWorkspace
      toolbar={
        <SurfacePanel className="mx-auto flex w-full max-w-[520px] items-center justify-between gap-2 rounded-full border border-black/6 bg-white/34 px-3 py-2.5 shadow-none backdrop-blur-[18px]">
          <div className="rounded-full border border-black/6 bg-white/56 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/38">
            Profile summary
          </div>
          <div className="rounded-full border border-black/8 bg-white/72 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/38">
            {items.length} looks
          </div>
        </SurfacePanel>
      }
      left={
        <div className="space-y-4">
          <SurfacePanel className="space-y-4 px-4 py-4">
            <Eyebrow>{language === "ko" ? "My profile" : "My profile"}</Eyebrow>
            <h2 className="text-[20px] font-semibold text-[#151b24]">{language === "ko" ? "Wardrobe identity" : "Wardrobe identity"}</h2>
            <p className="text-[12px] leading-6 text-black/48">
              {language === "ko"
                ? "Body profile, closet state, saved looks, persistence 상태를 한 화면에서 확인합니다."
                : "Body profile, closet state, saved looks, and persistence status stay visible in one place."}
            </p>
          </SurfacePanel>

          <SurfacePanel className="space-y-3 px-4 py-4">
            <Eyebrow>{language === "ko" ? "Body profile" : "Body profile"}</Eyebrow>
            <div className="grid gap-3 sm:grid-cols-2">
              {spotlightMeasurements.map(([key, value]) => (
                <div key={key} className="rounded-[18px] border border-black/8 bg-white/52 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/35">{key}</div>
                  <div className="mt-2 text-[18px] font-semibold text-[#151b24]">{value}cm</div>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </div>
      }
      stage={
        <SurfacePanel className="relative h-full min-h-[760px] overflow-hidden rounded-[36px] border border-black/6 bg-white/28 px-4 py-4 shadow-none backdrop-blur-[18px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.74),transparent_28%)]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between px-2 pb-3">
              <div>
                <Eyebrow>{language === "ko" ? "Avatar" : "Avatar"}</Eyebrow>
                <div className="mt-2 text-[24px] font-semibold text-[#151b24]">{language === "ko" ? "Current wardrobe state" : "Current wardrobe state"}</div>
              </div>
              <div className="rounded-full border border-black/6 bg-white/72 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-black/38">
                {scene.poseId}
              </div>
            </div>
            <div className="flex-1 overflow-hidden rounded-[32px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.4),rgba(255,255,255,0.16))]">
              <AvatarStageViewport
                bodyProfile={profile}
                avatarVariantId={scene.avatarVariantId}
                poseId={scene.poseId}
                equippedGarments={equippedGarments}
                selectedItemId={scene.selectedItemId}
                qualityTier={scene.qualityTier}
              />
            </div>
          </div>
        </SurfacePanel>
      }
      right={
        <div className="space-y-4">
          <SurfacePanel className="space-y-4 px-4 py-4">
            <Eyebrow>{language === "ko" ? "Saved looks" : "Saved looks"}</Eyebrow>
            {items.map((item) => (
              <div key={item.id} className="rounded-[22px] border border-black/8 bg-white/52 p-4">
                <div className="text-[15px] font-semibold text-[#151b24]">{item.title}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/38">
                  {new Date(item.updatedAt).toLocaleString()}
                </div>
                <div className="mt-3 text-[13px] leading-6 text-black/48">
                  {item.items.length} items · {item.closetState.poseId} pose · {item.closetState.avatarVariantId}
                </div>
              </div>
            ))}
            {items.length === 0 ? (
              <div className="rounded-[20px] border border-black/8 bg-white/46 px-4 py-4 text-[13px] text-black/45">
                {language === "ko" ? "저장된 룩이 없습니다." : "No saved look exists yet."}
              </div>
            ) : null}
          </SurfacePanel>

          <SurfacePanel className="space-y-4 px-4 py-4">
            <Eyebrow>{language === "ko" ? "Current stack" : "Current stack"}</Eyebrow>
            {equippedGarments.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-[20px] border border-black/8 bg-white/52 p-3">
                <Image
                  src={item.imageSrc}
                  alt={item.name}
                  width={60}
                  height={60}
                  className="h-[60px] w-[60px] rounded-[16px] object-cover"
                  unoptimized
                />
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-[#151b24]">{item.name}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-black/38">{item.category}</div>
                </div>
              </div>
            ))}
          </SurfacePanel>

          <SurfacePanel className="space-y-3 px-4 py-4">
            <Eyebrow>{language === "ko" ? "Persistence" : "Persistence"}</Eyebrow>
            <div className="text-[13px] leading-6 text-black/52">
              {language === "ko"
                ? "Body profile, closet scene, canvas compositions는 각각 분리된 repository adapter로 저장됩니다."
                : "Body profile, closet scene, and canvas compositions persist through separate repository adapters."}
            </div>
          </SurfacePanel>
        </div>
      }
      footer={
        <BottomModeBar
          active="measurements"
          className="w-full max-w-[560px] border border-black/6 bg-white/38 shadow-none backdrop-blur-[18px]"
          items={[
            { id: "measurements", label: language === "ko" ? "Measurements" : "Measurements" },
            { id: "closet", label: language === "ko" ? "Closet" : "Closet" },
            { id: "looks", label: language === "ko" ? "Looks" : "Looks" },
            { id: "preferences", label: language === "ko" ? "Preferences" : "Preferences" },
            { id: "sync", label: language === "ko" ? "Sync" : "Sync" },
          ]}
        />
      }
    />
  );
}
