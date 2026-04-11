"use client";

import Image from "next/image";
import { bodyProfileToAvatarParams } from "@freestyle/domain-avatar";
import { computeGarmentEaseSummary } from "@freestyle/domain-garment";
import { wardrobeTokens } from "@freestyle/design-tokens";
import { Eyebrow, MeasurementSlider, PillButton, SurfacePanel } from "@freestyle/ui";
import type {
  AvatarGender,
  BodyFrame,
  BodyProfile,
  BodyProfileDetailedKey,
  BodyProfileSimpleKey,
  GarmentCategory,
  StarterGarment,
} from "@freestyle/shared-types";
import { flattenBodyProfile } from "@freestyle/shared-types";

export function PanelHeader({
  eyebrow,
  title,
  description,
  trailing,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.04em] text-[var(--fs-text)]">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-[56ch] text-[13px] leading-6 text-[var(--fs-text-muted)]">{description}</p>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}

export function RailPanel({
  children,
  airy = false,
  className,
}: {
  children: React.ReactNode;
  airy?: boolean;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: airy ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.5)",
        border: `1px solid ${airy ? "rgba(19,24,32,0.08)" : "rgba(19,24,32,0.1)"}`,
        borderRadius: 30,
        boxShadow: "0 18px 40px rgba(50,61,76,0.08)",
        backdropFilter: "blur(18px)",
      }}
    >
      {children}
    </div>
  );
}

export function MetricStrip({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <SurfacePanel key={item.label} className="rounded-[22px] px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fs-text-faint)]">
            {item.label}
          </div>
          <div className="mt-2 text-[18px] font-semibold text-[var(--fs-text)]">{item.value}</div>
        </SurfacePanel>
      ))}
    </div>
  );
}

export function WorkspaceToolbar({
  eyebrow,
  title,
  description,
  metrics,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  metrics: Array<{ label: string; value: string }>;
  actions?: React.ReactNode;
}) {
  return (
    <SurfacePanel className="rounded-[28px] px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-[var(--fs-text)] sm:text-[34px]">
            {title}
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-[var(--fs-text-muted)]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-5">
        <MetricStrip items={metrics} />
      </div>
    </SurfacePanel>
  );
}

export function MeasurementProfilePanel({
  language,
  fields,
  profile,
  onUpdateMeasurement,
  onChangeGender,
  onChangeBodyFrame,
}: {
  language: "ko" | "en";
  fields: Array<{
    key: BodyProfileSimpleKey | BodyProfileDetailedKey;
    label: { ko: string; en: string };
    min: number;
    max: number;
    group: "core" | "detail";
  }>;
  profile: BodyProfile;
  onUpdateMeasurement: (key: BodyProfileSimpleKey | BodyProfileDetailedKey, value: number) => void;
  onChangeGender: (gender: AvatarGender) => void;
  onChangeBodyFrame: (frame: BodyFrame) => void;
}) {
  const flat = flattenBodyProfile(profile);
  const genderOptions: AvatarGender[] = ["female", "male", "neutral"];
  const frameOptions: BodyFrame[] = ["balanced", "athletic", "soft", "curvy"];

  return (
    <RailPanel airy className="fs-scrollbar h-full overflow-auto px-4 py-5 sm:px-5">
      <PanelHeader
        eyebrow={language === "ko" ? "Body profile" : "Body profile"}
        title={language === "ko" ? "실측 기반 아바타 입력" : "Body-driven avatar input"}
        description={
          language === "ko"
            ? "키와 둘레 치수를 정식 파라미터로 저장합니다. 단순 스케일이 아니라 런타임 rig target으로 변환됩니다."
            : "Store stature and circumference data as canonical parameters that map into runtime rig targets."
        }
      />

      <div className="mt-5 space-y-4">
        <div>
          <Eyebrow>{language === "ko" ? "Variant" : "Variant"}</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-2">
            {genderOptions.map((option) => (
              <PillButton
                key={option}
                active={profile.gender === option}
                onClick={() => onChangeGender(option)}
              >
                {option}
              </PillButton>
            ))}
          </div>
        </div>

        <div>
          <Eyebrow>{language === "ko" ? "Frame" : "Frame"}</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-2">
            {frameOptions.map((option) => (
              <PillButton
                key={option}
                active={profile.bodyFrame === option}
                onClick={() => onChangeBodyFrame(option)}
              >
                {option}
              </PillButton>
            ))}
          </div>
        </div>

        <div className="space-y-4 border-t fs-divider pt-4">
          {fields.map((field) => (
            <MeasurementSlider
              key={field.key}
              label={field.label[language]}
              value={flat[field.key] ?? field.min}
              min={field.min}
              max={field.max}
              unit="cm"
              onChange={(value) => onUpdateMeasurement(field.key, value)}
            />
          ))}
        </div>
      </div>
    </RailPanel>
  );
}

export function StagePanel({
  title,
  subtitle,
  toolbar,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <SurfacePanel tone="stage" className="relative h-full min-h-[620px] overflow-hidden rounded-[32px] px-4 py-4 sm:px-5 sm:py-5">
      <div className="fs-stage-halo fs-stage-grid absolute inset-0 opacity-80" />
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/44">Stage</div>
            <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-white">{title}</h2>
            <p className="mt-2 max-w-[44ch] text-[13px] leading-6 text-white/56">{subtitle}</p>
          </div>
          {toolbar}
        </div>
        <div className="mt-4 flex-1 overflow-hidden rounded-[28px] border border-white/8 bg-white/2">
          {children}
        </div>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </SurfacePanel>
  );
}

export function CategoryTabs({
  activeCategory,
  categories,
  onSelect,
}: {
  activeCategory: GarmentCategory;
  categories: GarmentCategory[];
  onSelect: (category: GarmentCategory) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <PillButton key={category} active={category === activeCategory} onClick={() => onSelect(category)}>
          {category}
        </PillButton>
      ))}
    </div>
  );
}

export function GarmentCatalogPanel({
  language,
  title,
  description,
  bodyProfile,
  activeCategory,
  selectedItemId,
  categories,
  garments,
  onSelectCategory,
  onSelectGarment,
}: {
  language: "ko" | "en";
  title: string;
  description: string;
  bodyProfile: BodyProfile;
  activeCategory: GarmentCategory;
  selectedItemId: string | null;
  categories: GarmentCategory[];
  garments: StarterGarment[];
  onSelectCategory: (category: GarmentCategory) => void;
  onSelectGarment: (garment: StarterGarment) => void;
}) {
  const avatarParams = bodyProfileToAvatarParams(bodyProfile);

  return (
    <RailPanel className="fs-scrollbar h-full overflow-auto px-4 py-5 sm:px-5">
      <PanelHeader eyebrow={language === "ko" ? "Catalog" : "Catalog"} title={title} description={description} />
      <div className="mt-4">
        <CategoryTabs activeCategory={activeCategory} categories={categories} onSelect={onSelectCategory} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {garments.map((garment) => {
          const ease = computeGarmentEaseSummary(garment.metadata?.measurements, avatarParams);
          return (
            <button
              key={garment.id}
              type="button"
              onClick={() => onSelectGarment(garment)}
              className="rounded-[28px] p-3 text-center transition"
              style={{
                background: selectedItemId === garment.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.52)",
                border: `1px solid ${selectedItemId === garment.id ? "rgba(210,180,140,0.88)" : "rgba(19,24,32,0.08)"}`,
              }}
            >
              <div
                className="mx-auto h-[88px] w-[88px] overflow-hidden rounded-full border"
                style={{
                  borderColor: selectedItemId === garment.id ? "rgba(210,180,140,0.82)" : "rgba(19,24,32,0.08)",
                  background: "rgba(255,255,255,0.7)",
                }}
              >
                <Image
                  src={garment.imageSrc}
                  alt={garment.name}
                  width={88}
                  height={88}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div className="mt-3 text-[12px] font-semibold text-[var(--fs-text)]">{garment.name}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--fs-text-faint)]">{garment.category}</div>
              <div className="mt-2 text-[11px] leading-5 text-[var(--fs-text-muted)]">
                {language === "ko" ? "가슴" : "Bust"} {ease.bustEaseCm >= 0 ? "+" : ""}
                {ease.bustEaseCm}
              </div>
            </button>
          );
        })}
      </div>
    </RailPanel>
  );
}

export function EmptyPanel({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <SurfacePanel className="rounded-[28px] px-5 py-8">
      <h3 className="text-[20px] font-semibold tracking-[-0.04em] text-[var(--fs-text)]">{title}</h3>
      <p className="mt-3 text-[13px] leading-6 text-[var(--fs-text-muted)]">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </SurfacePanel>
  );
}

export function NoteList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <SurfacePanel className="rounded-[28px] px-5 py-5">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-[20px] border px-4 py-3 text-[13px] leading-6"
            style={{
              borderColor: wardrobeTokens.color.divider,
              background: "rgba(255,255,255,0.42)",
              color: wardrobeTokens.color.textMuted,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </SurfacePanel>
  );
}
