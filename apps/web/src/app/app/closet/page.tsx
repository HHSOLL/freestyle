"use client";

import { useDeferredValue } from "react";
import { BottomModeBar, Eyebrow, ReferenceWorkspace, SurfacePanel } from "@freestyle/ui";
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
  const equippedNames = equippedGarments.map((item) => item.name).join(" · ");

  return (
    <ReferenceWorkspace
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
        <SurfacePanel className="relative h-full min-h-[760px] overflow-hidden rounded-[36px] border border-black/6 bg-white/28 px-4 py-4 shadow-none backdrop-blur-[18px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.72),transparent_28%)]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between px-2 pb-2">
              <div>
                <Eyebrow>Stage</Eyebrow>
                <div className="mt-2 text-[22px] font-semibold text-[#151b24]">
                  {language === "ko" ? "실시간 mannequin fitting" : "Live mannequin fitting"}
                </div>
              </div>
              <div className="rounded-full border border-black/6 bg-white/76 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-black/42">
                {avatarVariantId}
              </div>
            </div>
            <div className="relative flex-1 overflow-hidden rounded-[32px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.38),rgba(255,255,255,0.12))]">
              <div className="pointer-events-none absolute inset-x-[20%] bottom-[9%] h-[12%] rounded-full bg-black/8 blur-3xl" />
              <AvatarStageViewport
                bodyProfile={deferredProfile}
                avatarVariantId={avatarVariantId}
                poseId={scene.poseId}
                equippedGarments={equippedGarments}
                selectedItemId={scene.selectedItemId}
                qualityTier={scene.qualityTier}
              />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <SurfacePanel className="rounded-[26px] border border-black/6 bg-white/42 px-4 py-4 shadow-none">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Eyebrow>{language === "ko" ? "Equipped" : "Equipped"}</Eyebrow>
                    <div className="mt-2 text-[16px] font-semibold text-[#151b24]">
                      {equippedNames || (language === "ko" ? "기본 착장 없음" : "No garments equipped")}
                    </div>
                  </div>
                  <div className="rounded-full border border-black/8 bg-white/72 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/38">
                    {scene.activeCategory}
                  </div>
                </div>
              </SurfacePanel>
              <SurfacePanel className="rounded-[26px] border border-black/6 bg-white/42 px-4 py-4 shadow-none">
                <Eyebrow>{language === "ko" ? "Runtime" : "Runtime"}</Eyebrow>
                <div className="mt-2 text-[12px] leading-6 text-black/48">
                  {language === "ko"
                    ? "Body profile → avatar params → rig targets"
                    : "Body profile → avatar params → rig targets"}
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
      footer={
        <BottomModeBar
          active="outfit"
          className="w-full max-w-[560px] border border-black/6 bg-white/38 shadow-none backdrop-blur-[18px]"
          items={[
            { id: "presets", label: language === "ko" ? "Presets" : "Presets" },
            { id: "body", label: language === "ko" ? "Body" : "Body" },
            { id: "outfit", label: language === "ko" ? "Outfit" : "Outfit" },
            { id: "accessories", label: language === "ko" ? "Accessories" : "Accessories" },
            { id: "craft", label: language === "ko" ? "Craft" : "Craft" },
          ]}
        />
      }
    />
  );
}
