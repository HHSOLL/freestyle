"use client";

import React from "react";

type AvatarStageViewportFallbackProps = {
  state: "loading" | "error" | "unsupported";
  onRetry?: () => void;
};

const fallbackCopy = {
  loading: {
    title: "Preparing 3D fitting stage",
    description: "Loading the mannequin renderer and current garment view.",
  },
  error: {
    title: "3D stage did not open",
    description: "The stage module failed to load. Retry the viewer without leaving the current fitting flow.",
  },
  unsupported: {
    title: "3D stage is unavailable",
    description: "This browser or device does not expose WebGL, so the live closet stage cannot render here.",
  },
} as const;

export function AvatarStageViewportFallback({ state, onRetry }: AvatarStageViewportFallbackProps) {
  const copy = fallbackCopy[state];

  return (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(110,136,196,0.18),_rgba(9,12,18,0.96)_64%)] px-6 py-8 text-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="max-w-sm space-y-3" aria-live="polite">
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Closet Stage</p>
        <h3 className="text-lg font-semibold text-white">{copy.title}</h3>
        <p className="text-sm leading-6 text-white/72">{copy.description}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-full border border-white/18 bg-white/8 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/14"
          >
            Try loading again
          </button>
        ) : null}
      </div>
    </div>
  );
}
