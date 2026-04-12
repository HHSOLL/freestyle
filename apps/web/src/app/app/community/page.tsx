"use client";

import Image from "next/image";
import { useDeferredValue, useState } from "react";
import { BottomModeBar, Eyebrow, ReferenceWorkspace, SurfacePanel } from "@freestyle/ui";
import { AvatarStageViewport } from "@/components/product/AvatarStageViewport";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useClosetScene } from "@/hooks/useClosetScene";
import { communityLibrary } from "@/lib/community-data";
import { useLanguage } from "@/lib/LanguageContext";

export default function CommunityPage() {
  const { language } = useLanguage();
  const { profile, avatarVariantId } = useBodyProfile();
  const { scene, equippedGarments } = useClosetScene();
  const deferredProfile = useDeferredValue(profile);
  const [selectedId, setSelectedId] = useState<string>(communityLibrary[0]?.id ?? "");
  const selectedEntry = communityLibrary.find((entry) => entry.id === selectedId) ?? communityLibrary[0];

  return (
    <ReferenceWorkspace
      toolbar={
        <SurfacePanel className="mx-auto flex w-full max-w-[520px] items-center justify-between gap-2 rounded-full border border-black/6 bg-white/34 px-3 py-2.5 shadow-none backdrop-blur-[18px]">
          <div className="rounded-full border border-black/6 bg-white/56 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/38">
            Community feed
          </div>
          <div className="rounded-full border border-black/8 bg-white/72 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/38">
            {communityLibrary.length} looks
          </div>
        </SurfacePanel>
      }
      left={
        <div className="space-y-4">
          <SurfacePanel className="space-y-4 px-4 py-4">
            <Eyebrow>{language === "ko" ? "Community" : "Community"}</Eyebrow>
            <h2 className="text-[20px] font-semibold text-[#151b24]">{language === "ko" ? "Quiet styling boards" : "Quiet styling boards"}</h2>
            <p className="text-[12px] leading-6 text-black/48">
              {language === "ko"
                ? "상품 피드가 아니라 silhouette, proportion, layering 중심의 보드를 모읍니다."
                : "This feed keeps silhouette, proportion, and layering boards instead of product-heavy discovery."}
            </p>
          </SurfacePanel>
          <SurfacePanel className="space-y-3 px-4 py-4">
            <Eyebrow>{language === "ko" ? "Filters" : "Filters"}</Eyebrow>
            {["Grey palette", "Layering", "Uniform", "Tailoring"].map((filter, index) => (
              <div
                key={filter}
                className="rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{
                  background: index === 0 ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.44)",
                  color: index === 0 ? "#151b24" : "rgba(21,27,36,0.48)",
                }}
              >
                {filter}
              </div>
            ))}
          </SurfacePanel>
        </div>
      }
      stage={
        <SurfacePanel className="relative h-full min-h-[760px] overflow-hidden rounded-[36px] border border-black/6 bg-white/28 px-4 py-4 shadow-none backdrop-blur-[18px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.74),transparent_28%)]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between px-2 pb-3">
              <div>
                <Eyebrow>{selectedEntry.author[language]}</Eyebrow>
                <div className="mt-2 text-[24px] font-semibold text-[#151b24]">{selectedEntry.title[language]}</div>
              </div>
              <div className="rounded-full border border-black/6 bg-white/72 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-black/38">
                {selectedEntry.stats.saves} saves
              </div>
            </div>
            <div className="grid flex-1 gap-4 lg:grid-cols-[1.2fr_0.92fr]">
              <div className="overflow-hidden rounded-[32px] border border-black/8 bg-white/36">
                <div className="relative h-full min-h-[560px]">
                  <Image
                    src={selectedEntry.image}
                    alt={selectedEntry.title.en}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 100vw, 40vw"
                    unoptimized
                  />
                </div>
              </div>
              <div className="overflow-hidden rounded-[32px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.4),rgba(255,255,255,0.18))]">
                <AvatarStageViewport
                  bodyProfile={deferredProfile}
                  avatarVariantId={avatarVariantId}
                  poseId={scene.poseId}
                  equippedGarments={equippedGarments}
                  selectedItemId={scene.selectedItemId}
                  qualityTier={scene.qualityTier}
                />
              </div>
            </div>
          </div>
        </SurfacePanel>
      }
      right={
        <div className="space-y-4">
          {communityLibrary.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelectedId(entry.id)}
              className="w-full text-left"
            >
              <SurfacePanel className="space-y-3 rounded-[28px] px-4 py-4">
                <div className="flex items-center gap-3">
                  <Image
                    src={entry.image}
                    alt={entry.title.en}
                    width={74}
                    height={74}
                    className="h-[74px] w-[74px] rounded-[18px] object-cover"
                    unoptimized
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-black/35">{entry.author[language]}</div>
                    <div className="mt-2 truncate text-[16px] font-semibold text-[#151b24]">{entry.title[language]}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/35">
                      {entry.tags.join(" · ")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[12px] text-black/48">
                  <span>{entry.body[language]}</span>
                  <span className="shrink-0">{entry.stats.comments} comments</span>
                </div>
              </SurfacePanel>
            </button>
          ))}
        </div>
      }
      footer={
        <BottomModeBar
          active="feed"
          className="w-full max-w-[560px] border border-black/6 bg-white/38 shadow-none backdrop-blur-[18px]"
          items={[
            { id: "feed", label: language === "ko" ? "Feed" : "Feed" },
            { id: "saved", label: language === "ko" ? "Saved" : "Saved" },
            { id: "boards", label: language === "ko" ? "Boards" : "Boards" },
            { id: "stylists", label: language === "ko" ? "Stylists" : "Stylists" },
            { id: "remix", label: language === "ko" ? "Remix" : "Remix" },
          ]}
        />
      }
    />
  );
}
