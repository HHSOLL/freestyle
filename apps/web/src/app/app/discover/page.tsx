"use client";

import Image from "next/image";
import { useDeferredValue } from "react";
import { Eyebrow, SurfacePanel, WorkspaceFrame } from "@freestyle/ui";
import { AvatarStageViewport } from "@/components/product/AvatarStageViewport";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useClosetScene } from "@/hooks/useClosetScene";
import { useWardrobeAssets } from "@/hooks/useWardrobeAssets";
import { discoverLibrary } from "@/lib/discover-data";
import { useLanguage } from "@/lib/LanguageContext";

export default function DiscoverPage() {
  const { language } = useLanguage();
  const { profile, avatarVariantId } = useBodyProfile();
  const { scene, equippedGarments } = useClosetScene();
  const { remoteAssets } = useWardrobeAssets();
  const deferredProfile = useDeferredValue(profile);

  return (
    <WorkspaceFrame
      toolbar={
        <SurfacePanel className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Eyebrow>Discover</Eyebrow>
            <h1 className="mt-2 text-[22px] font-semibold text-[#151b24]">
              {language === "ko" ? "조용한 레퍼런스 보드" : "Quiet reference boards"}
            </h1>
            <p className="mt-1 text-[12px] leading-5 text-black/45">
              {language === "ko"
                ? "상품 링크 주도 피드가 아니라, 실루엣과 레이어 기준의 스타일 보드만 남깁니다."
                : "This surface keeps silhouette and layering boards, not the old shopping-link driven discovery flow."}
            </p>
          </div>
          <div className="rounded-full bg-white/76 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-black/38">
            {discoverLibrary.length} curated boards
          </div>
        </SurfacePanel>
      }
      left={
        <div className="space-y-4">
          <SurfacePanel className="space-y-3 px-4 py-4">
            <Eyebrow>Style cues</Eyebrow>
            <div className="space-y-3 text-[13px] leading-6 text-black/56">
              <p>{language === "ko" ? "중앙 stage의 look을 기준으로 layering reference를 읽습니다." : "Read each reference board against the live stage in the center."}</p>
              <p>{language === "ko" ? "컬러는 낮추고 구조와 길이 대비만 남기는 것이 기본 원칙입니다." : "Keep the palette quiet and compare proportion, structure, and length first."}</p>
            </div>
          </SurfacePanel>
          <SurfacePanel className="space-y-3 px-4 py-4">
            <Eyebrow>Imported wardrobe</Eyebrow>
            {remoteAssets.slice(0, 3).map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 rounded-[18px] border border-black/8 bg-white/46 p-3">
                <Image
                  src={asset.imageSrc}
                  alt={asset.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-[14px] object-cover"
                  unoptimized
                />
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-[#151b24]">{asset.name}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/38">{asset.category}</div>
                </div>
              </div>
            ))}
            {remoteAssets.length === 0 ? (
              <div className="rounded-[18px] border border-black/8 bg-white/46 px-4 py-4 text-[13px] text-black/45">
                {language === "ko" ? "아직 가져온 개인 wardrobe reference가 없습니다." : "No imported personal wardrobe reference is available yet."}
              </div>
            ) : null}
          </SurfacePanel>
        </div>
      }
      stage={
        <SurfacePanel tone="stage" className="h-full min-h-[720px] overflow-hidden px-4 py-4">
          <div className="h-full rounded-[28px] border border-white/8 bg-[#0f1012]">
            <AvatarStageViewport
              bodyProfile={deferredProfile}
              avatarVariantId={avatarVariantId}
              poseId={scene.poseId}
              equippedGarments={equippedGarments}
              selectedItemId={scene.selectedItemId}
              qualityTier={scene.qualityTier}
            />
          </div>
        </SurfacePanel>
      }
      right={
        <div className="space-y-4">
          {discoverLibrary.map((entry) => (
            <SurfacePanel key={entry.id} className="space-y-3 px-4 py-4">
              <Image
                src={entry.image}
                alt={entry.title.en}
                width={480}
                height={176}
                className="h-44 w-full rounded-[22px] object-cover"
                unoptimized
              />
              <div>
                <Eyebrow>{entry.tags.join(" / ")}</Eyebrow>
                <h2 className="mt-2 text-[18px] font-semibold text-[#151b24]">{entry.title[language]}</h2>
                <p className="mt-2 text-[13px] leading-6 text-black/52">{entry.body[language]}</p>
              </div>
            </SurfacePanel>
          ))}
        </div>
      }
      footer={null}
    />
  );
}
