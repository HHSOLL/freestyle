"use client";

import type { ComponentType } from "react";
import {
  Circle,
  CircleGauge,
  Footprints,
  PersonStanding,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { AvatarPoseId, QualityTier } from "@freestyle/shared-types";
import { SurfacePanel } from "@freestyle/ui";

const poseIcons: Record<AvatarPoseId, ComponentType<{ className?: string }>> = {
  neutral: PersonStanding,
  relaxed: Sparkles,
  contrapposto: RotateCcw,
  stride: Footprints,
  tailored: Circle,
};

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
    <SurfacePanel className="mx-auto flex w-full max-w-[520px] items-center justify-center gap-2 rounded-full border border-black/6 bg-white/34 px-3 py-2.5 shadow-none backdrop-blur-[18px]">
      <div className="hidden items-center gap-2 rounded-full border border-black/6 bg-white/46 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/38 md:flex">
        <CircleGauge className="h-3.5 w-3.5" />
        {language === "ko" ? "Stage" : "Stage"}
      </div>
      <div className="flex items-center gap-1.5">
        {poseOptions.map((pose) => (
          <button
            key={pose.id}
            type="button"
            aria-label={pose.label[language]}
            title={pose.label[language]}
            onClick={() => onPoseChange(pose.id)}
            className="grid h-10 w-10 place-items-center rounded-full border transition"
            style={{
              background: poseId === pose.id ? "rgba(153,190,235,0.22)" : "rgba(255,255,255,0.5)",
              borderColor: poseId === pose.id ? "rgba(121,168,219,0.84)" : "rgba(19,24,32,0.08)",
              color: poseId === pose.id ? "#151b24" : "rgba(21,27,36,0.5)",
            }}
          >
            {(() => {
              const Icon = poseIcons[pose.id];
              return <Icon className="h-4 w-4" />;
            })()}
          </button>
        ))}
      </div>
      <span className="mx-1 hidden h-5 w-px bg-black/8 sm:block" />
      <div className="flex items-center gap-1.5">
        {(["low", "balanced", "high"] as const).map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => onQualityChange(tier)}
            className="rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition"
            style={{
              background: qualityTier === tier ? "rgba(255,255,255,0.84)" : "rgba(255,255,255,0.42)",
              borderColor: qualityTier === tier ? "rgba(19,24,32,0.18)" : "rgba(19,24,32,0.08)",
              color: qualityTier === tier ? "#151b24" : "rgba(21,27,36,0.46)",
            }}
          >
            {tier}
          </button>
        ))}
      </div>
    </SurfacePanel>
  );
}
