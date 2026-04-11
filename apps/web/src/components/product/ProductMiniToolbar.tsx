"use client";

import type { AvatarPoseId, QualityTier } from "@freestyle/shared-types";
import { Eyebrow, PillButton, SurfacePanel } from "@freestyle/ui";

export function ProductMiniToolbar({
  language,
  poseId,
  qualityTier,
  poseOptions,
  onPoseChange,
  onQualityChange,
}: {
  language: "ko" | "en";
  poseId: AvatarPoseId;
  qualityTier: QualityTier;
  poseOptions: Array<{ id: AvatarPoseId; label: { ko: string; en: string } }>;
  onPoseChange: (poseId: AvatarPoseId) => void;
  onQualityChange: (qualityTier: QualityTier) => void;
}) {
  return (
    <SurfacePanel className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-3 rounded-[999px] border border-black/6 bg-white/44 px-3 py-3 shadow-none backdrop-blur-[18px]">
      <div className="text-center">
        <Eyebrow>Stage controls</Eyebrow>
        <p className="mt-1 text-[11px] leading-5 text-black/42">
          {language === "ko"
            ? "중앙 툴바에서 pose와 quality만 빠르게 조절합니다."
            : "Keep pose and quality in a centered micro-toolbar."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {poseOptions.map((pose) => (
          <PillButton key={pose.id} active={poseId === pose.id} onClick={() => onPoseChange(pose.id)}>
            {pose.label[language]}
          </PillButton>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-black/8 sm:block" />
        {(["low", "balanced", "high"] as const).map((tier) => (
          <PillButton key={tier} active={qualityTier === tier} onClick={() => onQualityChange(tier)}>
            {tier}
          </PillButton>
        ))}
      </div>
    </SurfacePanel>
  );
}
