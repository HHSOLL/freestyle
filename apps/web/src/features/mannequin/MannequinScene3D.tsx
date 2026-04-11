'use client';
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { AvatarDressUpScene } from '@/features/shared-3d/AvatarDressUpScene';
import { avatarPresetMap, type AvatarPresetId } from '@/features/shared-3d/avatarPresets';
import type { BodyProfile, GarmentLayerConfig } from './fitting';
import type { FittingPoseId, StageGarment } from './closetSceneConfig';

type MannequinScene3DProps = {
  body: BodyProfile;
  layers: GarmentLayerConfig[];
  stageGarments?: StageGarment[];
  selectedAssetId: string | null;
  avatarId?: AvatarPresetId;
  poseId?: FittingPoseId;
};

const canUseWebGL = () => {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

export function MannequinScene3D({ body, layers, stageGarments, selectedAssetId, avatarId, poseId }: MannequinScene3DProps) {
  const [hasWebGL] = useState(() => canUseWebGL());
  const previewLayer = useMemo(
    () => layers.find((layer) => layer.assetId === selectedAssetId) ?? layers[layers.length - 1] ?? null,
    [layers, selectedAssetId]
  );
  const activeAvatar = avatarPresetMap[avatarId ?? 'muse'];

  if (!hasWebGL) {
    return (
      <div className="relative flex h-full w-full items-end justify-center overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.96),rgba(224,230,238,0.74)_45%,rgba(205,213,223,0.42)_100%)]">
        <div className="pointer-events-none absolute inset-x-[18%] top-[7%] h-[36%] rounded-full bg-white/50 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(158,166,177,0.24)_100%)]" />

        <div className="relative mb-[4%] flex h-[88%] w-full max-w-[460px] items-end justify-center">
          <div className="absolute bottom-[3%] h-8 w-[64%] rounded-full bg-black/10 blur-xl" />
          <div className="absolute bottom-[6%] h-4 w-[48%] rounded-full border border-white/45 bg-white/45" />
          <div className="absolute bottom-[12%] left-1/2 h-[76%] w-[42%] -translate-x-1/2 rounded-t-[44%] rounded-b-[28%] border border-white/55 bg-[linear-gradient(180deg,rgba(232,225,214,0.96),rgba(205,196,184,0.84))] shadow-[0_30px_60px_rgba(69,56,42,0.18)]" />
          <div className="absolute bottom-[74%] left-1/2 h-[15%] w-[22%] -translate-x-1/2 rounded-[999px] border border-white/55 bg-[linear-gradient(180deg,rgba(235,228,216,0.98),rgba(204,194,181,0.9))]" />
          <div className="absolute bottom-[57%] left-[18%] h-[24%] w-[16%] rotate-[12deg] rounded-[999px] border border-white/42 bg-white/36" />
          <div className="absolute bottom-[57%] right-[18%] h-[24%] w-[16%] -rotate-[12deg] rounded-[999px] border border-white/42 bg-white/36" />
          <div className="absolute bottom-[12%] left-[29%] h-[42%] w-[12%] rounded-[999px] border border-white/42 bg-white/32" />
          <div className="absolute bottom-[12%] right-[29%] h-[42%] w-[12%] rounded-[999px] border border-white/42 bg-white/32" />

          {previewLayer ? (
            <div className="absolute bottom-[24%] left-1/2 w-[38%] -translate-x-1/2">
              <img
                src={previewLayer.textureUrl}
                alt={previewLayer.name}
                className="max-h-[54vh] w-full object-contain drop-shadow-[0_18px_28px_rgba(32,36,44,0.18)]"
              />
            </div>
          ) : null}
        </div>

        <div className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/72 px-3 py-1.5 text-[11px] font-medium text-[#48505d] backdrop-blur">
          WebGL unavailable
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-[18px] border border-white/55 bg-white/68 px-4 py-3 text-[11px] text-[#4d5563] backdrop-blur">
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#2d3440]">{previewLayer?.name ?? 'Preview ready'}</p>
            <p className="truncate">{activeAvatar.label.en} compatibility view</p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 font-medium text-[#58606d]">
            {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AvatarDressUpScene
      body={body}
      layers={layers}
      stageGarments={stageGarments}
      selectedAssetId={selectedAssetId}
      avatarId={avatarId}
      poseId={poseId}
    />
  );
}
