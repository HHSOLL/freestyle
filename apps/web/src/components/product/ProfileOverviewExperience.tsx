"use client";

import { flattenBodyProfile } from "@freestyle/shared-types";
import { Eyebrow, SurfacePanel } from "@freestyle/ui";
import { useAuth } from "@/lib/AuthContext";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useCanvasCompositions } from "@/hooks/useCanvasCompositions";
import { useClosetScene } from "@/hooks/useClosetScene";
import { useWardrobeAssets } from "@/hooks/useWardrobeAssets";
import { useLanguage } from "@/lib/LanguageContext";

export function ProfileOverviewExperience() {
  const { language } = useLanguage();
  const { user, isConfigured } = useAuth();
  const { profile } = useBodyProfile();
  const { closetRuntimeAssets } = useWardrobeAssets();
  const { scene, equippedGarments } = useClosetScene(closetRuntimeAssets);
  const { items } = useCanvasCompositions(profile, scene);
  const measurements = Object.entries(flattenBodyProfile(profile)).slice(0, 8);

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] space-y-5">
        <SurfacePanel className="rounded-[34px] px-6 py-6">
          <Eyebrow>{language === "ko" ? "Profile" : "Profile"}</Eyebrow>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-[34px] font-semibold leading-tight text-[#151b24]">
                {language === "ko" ? "계정과 옷장 상태 요약" : "Account and wardrobe summary"}
              </h1>
              <p className="mt-3 max-w-[64ch] text-[13px] leading-6 text-black/48">
                {language === "ko"
                  ? "프로필 페이지는 과장된 워크스페이스가 아니라, 계정 상태와 저장된 정보만 정리해서 보여주는 형식적 허브로 둡니다."
                  : "Profile stays formal: it summarizes account state and stored wardrobe data instead of pretending to be another workspace."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: language === "ko" ? "Saved looks" : "Saved looks", value: items.length },
                { label: language === "ko" ? "Equipped items" : "Equipped items", value: equippedGarments.length },
                { label: language === "ko" ? "Current pose" : "Current pose", value: scene.poseId },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[24px] border border-black/8 bg-white/60 px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/35">{stat.label}</div>
                  <div className="mt-2 text-[24px] font-semibold text-[#151b24]">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </SurfacePanel>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_1.2fr]">
          <SurfacePanel className="rounded-[32px] px-6 py-6">
            <Eyebrow>{language === "ko" ? "Account" : "Account"}</Eyebrow>
            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-black/8 bg-white/58 px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/35">
                  {language === "ko" ? "Auth status" : "Auth status"}
                </div>
                <div className="mt-2 text-[18px] font-semibold text-[#151b24]">
                  {user?.email ?? (isConfigured ? (language === "ko" ? "게스트 세션" : "Guest session") : "Local only")}
                </div>
              </div>
              <div className="rounded-[24px] border border-black/8 bg-white/58 px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/35">
                  {language === "ko" ? "Body frame" : "Body frame"}
                </div>
                <div className="mt-2 text-[18px] font-semibold text-[#151b24]">{profile.bodyFrame ?? "balanced"}</div>
              </div>
              <div className="rounded-[24px] border border-black/8 bg-white/58 px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/35">
                  {language === "ko" ? "Current stack" : "Current stack"}
                </div>
                <div className="mt-2 text-[14px] font-semibold leading-6 text-[#151b24]">
                  {equippedGarments.length > 0
                    ? equippedGarments.map((item) => item.name).join(" / ")
                    : language === "ko"
                      ? "선택된 의상이 없습니다."
                      : "No garment is currently equipped."}
                </div>
              </div>
            </div>
          </SurfacePanel>

          <SurfacePanel className="rounded-[32px] px-6 py-6">
            <Eyebrow>{language === "ko" ? "Measurements" : "Measurements"}</Eyebrow>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {measurements.map(([key, value]) => (
                <div key={key} className="rounded-[22px] border border-black/8 bg-white/58 px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/35">{key}</div>
                  <div className="mt-2 text-[18px] font-semibold text-[#151b24]">{value}cm</div>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </div>

        <SurfacePanel className="rounded-[32px] px-6 py-6">
          <Eyebrow>{language === "ko" ? "Saved looks" : "Saved looks"}</Eyebrow>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-black/8 bg-white/58 px-4 py-4">
                  <div className="text-[15px] font-semibold text-[#151b24]">{item.title}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/38">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="mt-3 text-[13px] leading-6 text-black/48">
                    {item.items.length} items · {item.closetState.poseId} · {item.closetState.avatarVariantId}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-black/8 bg-white/58 px-4 py-4 text-[13px] text-black/48">
                {language === "ko" ? "아직 저장된 룩이 없습니다." : "No saved looks yet."}
              </div>
            )}
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
}
