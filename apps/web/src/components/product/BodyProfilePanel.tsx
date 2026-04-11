"use client";

import type {
  BodyFrame,
  BodyProfile,
  BodyProfileDetailedKey,
  BodyProfileSimpleKey,
} from "@freestyle/shared-types";
import { Eyebrow, MeasurementSlider, PillButton, SurfacePanel } from "@freestyle/ui";

const frameLabels: Record<BodyFrame, { ko: string; en: string }> = {
  balanced: { ko: "Balanced", en: "Balanced" },
  athletic: { ko: "Athletic", en: "Athletic" },
  soft: { ko: "Soft", en: "Soft" },
  curvy: { ko: "Curvy", en: "Curvy" },
};

const airyRailClass = "rounded-[30px] border border-black/6 bg-white/34 shadow-none backdrop-blur-[18px]";

export function BodyProfilePanel({
  language,
  profile,
  fields,
  onGenderChange,
  onBodyFrameChange,
  onMeasurementChange,
  groups = ["core", "detail"],
}: {
  language: "ko" | "en";
  profile: BodyProfile;
  fields: Array<{
    key: BodyProfileSimpleKey | BodyProfileDetailedKey;
    label: { ko: string; en: string };
    min: number;
    max: number;
    group: "core" | "detail";
  }>;
  onGenderChange: (gender: BodyProfile["gender"]) => void;
  onBodyFrameChange: (bodyFrame: BodyFrame) => void;
  onMeasurementChange: (key: BodyProfileSimpleKey | BodyProfileDetailedKey, value: number) => void;
  groups?: Array<"core" | "detail">;
}) {
  const gender = profile.gender ?? "female";
  const bodyFrame = profile.bodyFrame ?? "balanced";

  return (
    <div className="space-y-4">
      <SurfacePanel className={`${airyRailClass} space-y-4 px-4 py-4`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Avatar profile</Eyebrow>
            <h2 className="mt-2 text-[20px] font-semibold text-[#151b24]">
              {language === "ko" ? "신체 입력" : "Body profile"}
            </h2>
            <p className="mt-1 text-[12px] leading-5 text-black/45">
              {language === "ko"
                ? "치수를 runtime morph space로 정규화해 마네킹에 적용합니다."
                : "Measurements are normalized into avatar morph space before they reach the mannequin rig."}
            </p>
          </div>
          <div className="rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
            v2
          </div>
        </div>

        <div className="space-y-2">
          <Eyebrow>{language === "ko" ? "Base variant" : "Base variant"}</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {(["female", "male"] as const).map((entry) => (
              <PillButton key={entry} active={gender === entry} onClick={() => onGenderChange(entry)}>
                {entry === "female" ? "Female" : "Male"}
              </PillButton>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Eyebrow>{language === "ko" ? "Body frame" : "Body frame"}</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(frameLabels) as BodyFrame[]).map((entry) => (
              <PillButton key={entry} active={bodyFrame === entry} onClick={() => onBodyFrameChange(entry)}>
                {frameLabels[entry][language]}
              </PillButton>
            ))}
          </div>
        </div>
      </SurfacePanel>

      {groups.map((group) => (
        <SurfacePanel key={group} className={`${airyRailClass} space-y-4 px-4 py-4`}>
          <div className="flex items-center justify-between">
            <Eyebrow>{group === "core" ? "Core measurements" : "Detail measurements"}</Eyebrow>
            <span className="text-[11px] uppercase tracking-[0.16em] text-black/35">
              {fields.filter((field) => field.group === group).length}
            </span>
          </div>
          <div className="space-y-4">
            {fields
              .filter((field) => field.group === group)
              .map((field) => {
                const value =
                  field.key in profile.simple
                    ? profile.simple[field.key as BodyProfileSimpleKey]
                    : profile.detailed?.[field.key as BodyProfileDetailedKey] ?? field.min;

                return (
                  <MeasurementSlider
                    key={field.key}
                    label={field.label[language]}
                    value={value}
                    min={field.min}
                    max={field.max}
                    unit="cm"
                    onChange={(nextValue) => onMeasurementChange(field.key, nextValue)}
                  />
                );
              })}
          </div>
        </SurfacePanel>
      ))}
    </div>
  );
}
