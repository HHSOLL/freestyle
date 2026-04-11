"use client";

import Image from "next/image";
import { flattenBodyProfile } from "@freestyle/shared-types";
import { Eyebrow, SurfacePanel } from "@freestyle/ui";
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

  return (
    <div className="mx-auto flex min-h-[calc(100svh-88px)] w-full max-w-[1680px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <SurfacePanel className="px-5 py-5">
        <Eyebrow>Profile</Eyebrow>
        <h1 className="mt-2 text-[28px] font-semibold text-[#151b24]">
          {language === "ko" ? "사용자 프로필과 저장 상태" : "User profile and saved state"}
        </h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-6 text-black/52">
          {language === "ko"
            ? "body profile, closet scene, canvas compositions를 각각 분리된 repository adapter로 저장합니다. 추후 API persistence로 교체할 때 UI와 scene runtime을 직접 건드리지 않도록 경계를 고정했습니다."
            : "Body profile, closet scene, and canvas compositions persist through separate repository adapters so API persistence can replace storage without collapsing the UI/runtime boundary."}
        </p>
      </SurfacePanel>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <SurfacePanel className="space-y-4 px-5 py-5">
            <Eyebrow>Saved measurements</Eyebrow>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(flattened).map(([key, value]) => (
                <div key={key} className="rounded-[18px] border border-black/8 bg-white/52 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-black/35">{key}</div>
                  <div className="mt-2 text-[20px] font-semibold text-[#151b24]">{value}cm</div>
                </div>
              ))}
            </div>
          </SurfacePanel>

          <SurfacePanel className="space-y-4 px-5 py-5">
            <Eyebrow>Equipped closet state</Eyebrow>
            <div className="grid gap-3 sm:grid-cols-2">
              {equippedGarments.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-[20px] border border-black/8 bg-white/52 p-3">
                  <Image
                    src={item.imageSrc}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-[16px] object-cover"
                    unoptimized
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-[#151b24]">{item.name}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/38">{item.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </div>

        <div className="space-y-4">
          <SurfacePanel className="space-y-4 px-5 py-5">
            <Eyebrow>Saved looks</Eyebrow>
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

          <SurfacePanel className="space-y-3 px-5 py-5">
            <Eyebrow>Migration checkpoint</Eyebrow>
            <ul className="space-y-2 text-[13px] leading-6 text-black/52">
              <li>Closet / Fitting / Canvas / Discover / Profile now define the main IA.</li>
              <li>Legacy import, AI review, and try-on flows are isolated from the main navigation.</li>
              <li>Avatar controls now pass through `domain-avatar` before they reach the runtime rig.</li>
            </ul>
          </SurfacePanel>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}
