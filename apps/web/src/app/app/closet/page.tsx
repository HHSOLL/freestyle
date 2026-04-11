"use client";

import { useDeferredValue } from "react";
import { Eyebrow, SurfacePanel, WorkspaceFrame } from "@freestyle/ui";
import { BodyProfilePanel } from "@/components/product/BodyProfilePanel";
import { ClosetCatalogPanel } from "@/components/product/ClosetCatalogPanel";
import { AvatarStageViewport } from "@/components/product/AvatarStageViewport";
import { ProductMiniToolbar } from "@/components/product/ProductMiniToolbar";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useClosetScene } from "@/hooks/useClosetScene";
import { useWardrobeAssets } from "@/hooks/useWardrobeAssets";
import { useLanguage } from "@/lib/LanguageContext";

export default function ClosetPage() {
  const { language } = useLanguage();
  const { profile, fields, avatarVariantId, setGender, setBodyFrame, updateMeasurement } = useBodyProfile();
  const { scene, poses, equippedGarments, setPose, setCategory, setQualityTier, equipItem } = useClosetScene();
  const { starterAssets, remoteAssets } = useWardrobeAssets();
  const deferredProfile = useDeferredValue(profile);

  return (
    <WorkspaceFrame
      toolbar={
        <ProductMiniToolbar
          language={language}
          poseId={scene.poseId}
          qualityTier={scene.qualityTier}
          poseOptions={poses}
          onPoseChange={setPose}
          onQualityChange={setQualityTier}
        />
      }
      left={
        <BodyProfilePanel
          language={language}
          profile={profile}
          fields={fields}
          onGenderChange={setGender}
          onBodyFrameChange={setBodyFrame}
          onMeasurementChange={updateMeasurement}
        />
      }
      stage={
        <SurfacePanel tone="stage" className="relative h-full min-h-[720px] overflow-hidden px-4 py-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_36%)]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between px-2 pb-3">
              <div>
                <Eyebrow>Stage</Eyebrow>
                <div className="mt-2 text-[22px] font-semibold text-white">
                  {language === "ko" ? "중앙 피팅 스테이지" : "Central fitting stage"}
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/65">
                {avatarVariantId}
              </div>
            </div>
            <div className="relative flex-1 overflow-hidden rounded-[28px] border border-white/8 bg-[#0f1012]">
              <AvatarStageViewport
                bodyProfile={deferredProfile}
                avatarVariantId={avatarVariantId}
                poseId={scene.poseId}
                equippedGarments={equippedGarments}
                selectedItemId={scene.selectedItemId}
                qualityTier={scene.qualityTier}
              />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <SurfacePanel className="px-4 py-4">
                <Eyebrow>Equipped stack</Eyebrow>
                <div className="mt-3 space-y-2">
                  {equippedGarments.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-[18px] bg-white/8 px-3 py-3 text-white/78">
                      <span className="text-[13px] font-medium">{item.name}</span>
                      <span className="text-[11px] uppercase tracking-[0.16em] text-white/42">{item.category}</span>
                    </div>
                  ))}
                </div>
              </SurfacePanel>
              <SurfacePanel className="px-4 py-4">
                <Eyebrow>Runtime policy</Eyebrow>
                <div className="mt-3 space-y-2 text-[13px] leading-6 text-white/66">
                  <p>{language === "ko" ? "체형은 bone-scale 꼼수가 아니라 normalized morph target로 변환됩니다." : "Body edits travel through normalized avatar params before they touch the rig."}</p>
                  <p>{language === "ko" ? "메인 흐름에는 fitting contract가 검증된 starter garment만 연결됩니다." : "Only starter garments with a verified fitting contract are attached to the main runtime."}</p>
                </div>
              </SurfacePanel>
            </div>
          </div>
        </SurfacePanel>
      }
      right={
        <ClosetCatalogPanel
          language={language}
          activeCategory={scene.activeCategory}
          selectedItemId={scene.selectedItemId}
          starterAssets={starterAssets}
          remoteAssets={remoteAssets}
          onCategoryChange={setCategory}
          onEquip={equipItem}
        />
      }
      footer={null}
    />
  );
}
