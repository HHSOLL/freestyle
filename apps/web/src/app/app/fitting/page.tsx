"use client";

import { useDeferredValue } from "react";
import { bodyProfileToAvatarParams } from "@freestyle/domain-avatar";
import { computeGarmentEaseSummary } from "@freestyle/domain-garment";
import { Eyebrow, PillButton, SurfacePanel, WorkspaceFrame } from "@freestyle/ui";
import { AvatarStageViewport } from "@/components/product/AvatarStageViewport";
import { BodyProfilePanel } from "@/components/product/BodyProfilePanel";
import { ProductMiniToolbar } from "@/components/product/ProductMiniToolbar";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useClosetScene } from "@/hooks/useClosetScene";
import { useLanguage } from "@/lib/LanguageContext";

export default function FittingPage() {
  const { language } = useLanguage();
  const { profile, fields, avatarVariantId, setGender, setBodyFrame, updateMeasurement } = useBodyProfile();
  const { scene, poses, equippedGarments, setPose, setQualityTier } = useClosetScene();
  const deferredProfile = useDeferredValue(profile);
  const selectedGarment = equippedGarments.find((item) => item.id === scene.selectedItemId) ?? equippedGarments[0] ?? null;
  const avatarParams = bodyProfileToAvatarParams(profile, avatarVariantId);
  const ease = selectedGarment ? computeGarmentEaseSummary(selectedGarment.metadata?.measurements, avatarParams) : null;

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
        <div className="space-y-4">
          <BodyProfilePanel
            language={language}
            profile={profile}
            fields={fields}
            onGenderChange={setGender}
            onBodyFrameChange={setBodyFrame}
            onMeasurementChange={updateMeasurement}
            groups={["core"]}
          />
          <SurfacePanel className="space-y-4 px-4 py-4">
            <div>
              <Eyebrow>Fit telemetry</Eyebrow>
              <h2 className="mt-2 text-[18px] font-semibold text-[#151b24]">
                {language === "ko" ? "선택 의상 적합도" : "Selected garment fit"}
              </h2>
            </div>
            {selectedGarment ? (
              <div className="space-y-3">
                <div className="rounded-[20px] border border-black/8 bg-white/58 p-4">
                  <div className="text-[15px] font-semibold text-[#151b24]">{selectedGarment.name}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-black/38">
                    {selectedGarment.metadata?.fitProfile?.layer ?? "base"} · {selectedGarment.metadata?.fitProfile?.silhouette ?? "regular"}
                  </div>
                </div>
                {ease ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Bust ease", value: ease.bustEaseCm },
                      { label: "Waist ease", value: ease.waistEaseCm },
                      { label: "Hip ease", value: ease.hipEaseCm },
                    ].map((entry) => (
                      <div key={entry.label} className="rounded-[18px] border border-black/8 bg-white/52 px-4 py-4">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-black/35">{entry.label}</div>
                        <div className="mt-2 text-[24px] font-semibold text-[#151b24]">{entry.value}cm</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[20px] border border-black/8 bg-white/52 px-4 py-4 text-[13px] text-black/45">
                {language === "ko" ? "먼저 Closet에서 의상을 하나 선택하세요." : "Select a garment in Closet first."}
              </div>
            )}
          </SurfacePanel>
        </div>
      }
      stage={
        <SurfacePanel tone="stage" className="relative h-full min-h-[720px] overflow-hidden px-4 py-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_40%)]" />
          <div className="relative h-full rounded-[28px] border border-white/8 bg-[#0f1012]">
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
          <SurfacePanel className="space-y-4 px-4 py-4">
            <div>
              <Eyebrow>Rig mapping</Eyebrow>
              <h2 className="mt-2 text-[18px] font-semibold text-[#151b24]">
                {language === "ko" ? "정규화된 avatar params" : "Normalized avatar params"}
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Stature", avatarParams.stature],
                ["Shoulder", avatarParams.shoulderWidth],
                ["Chest", avatarParams.chestVolume],
                ["Waist", avatarParams.waistVolume],
                ["Hip", avatarParams.hipVolume],
                ["Inseam", avatarParams.inseam],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[18px] border border-black/8 bg-white/52 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-black/35">{label}</div>
                  <div className="mt-2 text-[18px] font-semibold text-[#151b24]">{Number(value).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </SurfacePanel>
          <SurfacePanel className="space-y-3 px-4 py-4">
            <Eyebrow>Quality tiers</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {(["low", "balanced", "high"] as const).map((tier) => (
                <PillButton key={tier} active={scene.qualityTier === tier} onClick={() => setQualityTier(tier)}>
                  {tier}
                </PillButton>
              ))}
            </div>
            <p className="text-[12px] leading-5 text-black/45">
              {language === "ko"
                ? "모바일/저사양에서는 low tier로 낮추면 DPR과 shadow budget을 줄입니다."
                : "Dropping to the low tier reduces DPR and shadow cost for mobile and lower-end devices."}
            </p>
          </SurfacePanel>
        </div>
      }
      footer={null}
    />
  );
}
