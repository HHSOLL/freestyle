/* eslint-disable @next/next/no-img-element */
"use client";

import React, { type CSSProperties, type ReactNode } from "react";
import type { PrimaryNavigationItem } from "@freestyle/shared-types";
import { wardrobeTokens } from "@freestyle/design-tokens";
import { cn } from "@freestyle/shared-utils";

const panelStyle = (tone: "default" | "strong" | "stage" = "default"): CSSProperties => ({
  background:
    tone === "stage"
      ? "linear-gradient(180deg, rgba(17,17,17,0.94), rgba(12,12,13,1))"
      : tone === "strong"
        ? "rgba(255,255,255,0.72)"
        : "rgba(255,255,255,0.56)",
  border: `1px solid ${tone === "stage" ? "rgba(255,255,255,0.08)" : "rgba(20,26,35,0.1)"}`,
  borderRadius: wardrobeTokens.radius.panel,
  boxShadow: tone === "stage" ? "inset 0 1px 0 rgba(255,255,255,0.04)" : wardrobeTokens.shadow.panel,
  backdropFilter: tone === "stage" ? "none" : "blur(22px) saturate(1.04)",
});

export function SurfacePanel({
  children,
  className,
  tone = "default",
  style,
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "strong" | "stage";
  style?: CSSProperties;
}) {
  return (
    <div className={cn("fs-surface-panel", className)} style={{ ...panelStyle(tone), ...style }}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn("text-[11px] font-semibold uppercase tracking-[0.22em]", className)}
      style={{ color: wardrobeTokens.color.textFaint }}
    >
      {children}
    </p>
  );
}

export function PillButton({
  children,
  active = false,
  className,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={cn("inline-flex items-center justify-center rounded-full px-4 py-2 text-[12px] font-semibold", className)}
      onClick={onClick}
      style={{
        background: active ? wardrobeTokens.color.accent : "rgba(255,255,255,0.72)",
        color: active ? "#ffffff" : wardrobeTokens.color.text,
        border: `1px solid ${active ? "rgba(255,255,255,0.12)" : wardrobeTokens.color.dividerStrong}`,
        boxShadow: wardrobeTokens.shadow.control,
      }}
    >
      {children}
    </button>
  );
}

export function MeasurementSlider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: wardrobeTokens.color.textMuted }}>
          {label}
        </span>
        <span className="text-[12px] font-semibold" style={{ color: wardrobeTokens.color.text }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="w-full accent-[#1d2430]"
      />
    </label>
  );
}

export function BottomModeBar({
  active,
  items,
  className,
}: {
  active: string;
  items: Array<{
    id: string;
    label: string;
    href?: string;
    onClick?: () => void;
  }>;
  className?: string;
}) {
  return (
    <SurfacePanel
      className={cn("flex items-center justify-between gap-2 px-2 py-2", className)}
      style={{ borderRadius: 999, overflowX: "auto" }}
    >
      {items.map((item) => {
        const style = {
          background: item.id === active ? wardrobeTokens.color.accent : "transparent",
          color: item.id === active ? "#ffffff" : wardrobeTokens.color.textMuted,
        };

        if (item.href) {
          return (
            <a
              key={item.id}
              href={item.href}
              className="inline-flex min-w-[92px] items-center justify-center rounded-full px-4 py-2 text-[12px] font-semibold no-underline transition"
              style={style}
            >
              {item.label}
            </a>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className="inline-flex min-w-[92px] items-center justify-center rounded-full px-4 py-2 text-[12px] font-semibold transition"
            style={style}
          >
            {item.label}
          </button>
        );
      })}
    </SurfacePanel>
  );
}

export function DenseCatalogCard({
  title,
  subtitle,
  thumbnail,
  active = false,
  footer,
  onClick,
}: {
  title: string;
  subtitle: string;
  thumbnail: string;
  active?: boolean;
  footer?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-[22px] p-3 text-left transition"
      style={{
        background: active ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.46)",
        border: `1px solid ${active ? "rgba(210,180,140,0.82)" : "rgba(19,24,32,0.08)"}`,
      }}
    >
      <div className="overflow-hidden rounded-[16px]" style={{ background: "rgba(255,255,255,0.8)" }}>
        <img src={thumbnail} alt={title} className="h-16 w-16 object-cover" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold" style={{ color: wardrobeTokens.color.text }}>
          {title}
        </div>
        <div className="mt-1 truncate text-[11px] uppercase tracking-[0.16em]" style={{ color: wardrobeTokens.color.textFaint }}>
          {subtitle}
        </div>
        {footer ? <div className="mt-2 text-[12px]" style={{ color: wardrobeTokens.color.textMuted }}>{footer}</div> : null}
      </div>
    </button>
  );
}

export function ProductTopbar({
  brand,
  items,
  activeHref,
  rightSlot,
}: {
  brand: ReactNode;
  items: PrimaryNavigationItem[];
  activeHref: string;
  rightSlot?: ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between gap-4 px-5 py-4 sm:px-8"
      style={{
        background: "rgba(217, 221, 226, 0.84)",
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${wardrobeTokens.color.divider}`,
      }}
    >
      <div className="flex items-center gap-5">{brand}</div>
      <nav className="hidden items-center gap-2 md:flex">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="rounded-full px-4 py-2 text-[13px] font-semibold no-underline transition"
            style={{
              background: activeHref === item.href ? wardrobeTokens.color.accent : "transparent",
              color: activeHref === item.href ? "#ffffff" : wardrobeTokens.color.textMuted,
            }}
          >
            {item.label.en}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-3">{rightSlot}</div>
    </header>
  );
}

export function WorkspaceFrame({
  toolbar,
  left,
  stage,
  right,
  footer,
}: {
  toolbar?: ReactNode;
  left: ReactNode;
  stage: ReactNode;
  right: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-88px)] w-full max-w-[1680px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
      {toolbar}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
        <div className="min-h-0">{left}</div>
        <div className="min-h-0">{stage}</div>
        <div className="min-h-0">{right}</div>
      </div>
      <div>{footer}</div>
    </div>
  );
}

export function ReferenceWorkspace({
  toolbar,
  left,
  stage,
  right,
  footer,
  className,
  layoutClassName,
}: {
  toolbar?: ReactNode;
  left: ReactNode;
  stage: ReactNode;
  right: ReactNode;
  footer?: ReactNode;
  className?: string;
  layoutClassName?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-[calc(100svh-148px)] w-full max-w-[1720px] flex-col gap-4 px-4 pb-6 sm:px-6 lg:px-8",
        className,
      )}
    >
      {toolbar ? <div className="flex justify-center">{toolbar}</div> : null}
      <div
        className={cn(
          "grid min-h-0 flex-1 gap-4 lg:grid-cols-[296px_minmax(0,1fr)_372px] xl:grid-cols-[308px_minmax(0,1fr)_396px]",
          layoutClassName,
        )}
      >
        <div className="min-h-0">{left}</div>
        <div className="min-h-0">{stage}</div>
        <div className="min-h-0">{right}</div>
      </div>
      {footer ? <div className="flex justify-center pb-1">{footer}</div> : null}
    </div>
  );
}
