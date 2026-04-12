"use client";

import type {
  BodyFrame,
  BodyProfile,
  BodyProfileDetailedKey,
  BodyProfileSimpleKey,
} from "@freestyle/shared-types";
import { Eyebrow, MeasurementSlider, SurfacePanel } from "@freestyle/ui";

const frameLabels: Record<BodyFrame, { ko: string; en: string }> = {
  balanced: { ko: "Balanced", en: "Balanced" },
  athletic: { ko: "Athletic", en: "Athletic" },
  soft: { ko: "Soft", en: "Soft" },
  curvy: { ko: "Curvy", en: "Curvy" },
};

const airyRailClass = "rounded-[32px] border border-black/6 bg-white/34 shadow-none backdrop-blur-[18px]";

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <Eyebrow>Profile</Eyebrow>
            <h2 className="mt-2 text-[20px] font-semibold text-[#151b24]">{language === "ko" ? "Avatar fit" : "Avatar fit"}</h2>
            <p className="mt-1 max-w-[210px] text-[12px] leading-5 text-black/44">
              {language === "ko"
                ? "입력한 치수는 mannequin morph space로 정규화됩니다."
                : "Measurements normalize into mannequin morph space before the rig updates."}
            </p>
          </div>
          <div className="rounded-full border border-black/6 bg-white/72 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/38">
            runtime
          </div>
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Eyebrow>{language === "ko" ? "Base variant" : "Base variant"}</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {(["female", "male"] as const).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => onGenderChange(entry)}
                  className="inline-flex min-w-[86px] items-center justify-center rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition"
                  style={{
                    background: gender === entry ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.46)",
                    borderColor: gender === entry ? "rgba(19,24,32,0.16)" : "rgba(19,24,32,0.08)",
                    color: gender === entry ? "#151b24" : "rgba(21,27,36,0.48)",
                  }}
                >
                  {entry === "female" ? "Female" : "Male"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Eyebrow>{language === "ko" ? "Body frame" : "Body frame"}</Eyebrow>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(frameLabels) as BodyFrame[]).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => onBodyFrameChange(entry)}
                  className="rounded-[18px] border px-3 py-3 text-left transition"
                  style={{
                    background: bodyFrame === entry ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.42)",
                    borderColor: bodyFrame === entry ? "rgba(19,24,32,0.16)" : "rgba(19,24,32,0.08)",
                  }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/38">{entry}</div>
                  <div className="mt-1 text-[13px] font-semibold text-[#151b24]">{frameLabels[entry][language]}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-black/6 bg-white/38 px-4 py-3">
            <Eyebrow>{language === "ko" ? "Mapping" : "Mapping"}</Eyebrow>
            <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] uppercase tracking-[0.14em] text-black/38">
              <div>
                <div className="text-black/32">{language === "ko" ? "driver" : "driver"}</div>
                <div className="mt-1 font-semibold text-[#151b24]">{language === "ko" ? "실측 치수" : "body profile"}</div>
              </div>
              <div>
                <div className="text-black/32">{language === "ko" ? "runtime" : "runtime"}</div>
                <div className="mt-1 font-semibold text-[#151b24]">{language === "ko" ? "avatar params" : "avatar params"}</div>
              </div>
            </div>
          </div>
        </div>
      </SurfacePanel>

      {groups.map((group) => (
        <SurfacePanel key={group} className={`${airyRailClass} space-y-4 px-4 py-4`}>
          <div className="flex items-center justify-between">
            <Eyebrow>{group === "core" ? "Measurements" : "Detailed fit"}</Eyebrow>
            <span className="text-[10px] uppercase tracking-[0.18em] text-black/35">
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
