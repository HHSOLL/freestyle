/* eslint-disable @next/next/no-img-element */
'use client';

import dynamic from 'next/dynamic';
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { Cuboid, RotateCcw, Ruler, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildFittingLayers, defaultBodyProfile, type BodyProfile } from '../fitting';
import type { Asset, GarmentFitProfile, GarmentMeasurements, StudioTranslator } from '../types';

const MannequinScene3D = dynamic(
  () => import('./MannequinScene3D').then((module) => module.MannequinScene3D),
  { ssr: false }
);

type FittingWorkbenchProps = {
  t: StudioTranslator;
  assets: Asset[];
  initialAssetIds: string[];
  onClose: () => void;
  onSaveAssetMetadata: (assetId: string, patch: { measurements: GarmentMeasurements; fitProfile: GarmentFitProfile }) => Promise<void>;
};

const bodyStorageKey = 'freestyle:mannequin-body-profile';

const bodyFields: Array<{ key: keyof BodyProfile; label: string; min: number; max: number }> = [
  { key: 'heightCm', label: 'Height', min: 145, max: 205 },
  { key: 'shoulderCm', label: 'Shoulder', min: 34, max: 60 },
  { key: 'chestCm', label: 'Chest', min: 72, max: 140 },
  { key: 'waistCm', label: 'Waist', min: 54, max: 132 },
  { key: 'hipCm', label: 'Hip', min: 74, max: 150 },
  { key: 'inseamCm', label: 'Inseam', min: 62, max: 98 },
];

const measurementFields: Array<{ key: keyof GarmentMeasurements; label: string }> = [
  { key: 'shoulderCm', label: 'Shoulder' },
  { key: 'chestCm', label: 'Chest' },
  { key: 'waistCm', label: 'Waist' },
  { key: 'hipCm', label: 'Hip' },
  { key: 'sleeveLengthCm', label: 'Sleeve' },
  { key: 'lengthCm', label: 'Length' },
  { key: 'inseamCm', label: 'Inseam' },
  { key: 'hemCm', label: 'Hem' },
];

const fitProfileDefaults: GarmentFitProfile = {
  silhouette: 'regular',
  layer: 'mid',
  structure: 'balanced',
  stretch: 0.2,
  drape: 0.5,
};

const parseSavedBodyProfile = () => {
  try {
    const raw = window.localStorage.getItem(bodyStorageKey);
    if (!raw) return defaultBodyProfile;
    const parsed = JSON.parse(raw) as Partial<BodyProfile>;
    return {
      ...defaultBodyProfile,
      ...parsed,
    };
  } catch {
    return defaultBodyProfile;
  }
};

export function FittingWorkbench({
  t,
  assets,
  initialAssetIds,
  onClose,
  onSaveAssetMetadata,
}: FittingWorkbenchProps) {
  const [activeAssetIds, setActiveAssetIds] = useState<string[]>(
    () => (initialAssetIds.length > 0 ? initialAssetIds : assets.slice(0, 1).map((asset) => asset.id))
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(
    () => initialAssetIds[0] ?? assets[0]?.id ?? null
  );
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>(() => parseSavedBodyProfile());
  const [assetDrafts, setAssetDrafts] = useState<
    Record<string, { measurements: GarmentMeasurements; fitProfile: GarmentFitProfile }>
  >({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const deferredBodyProfile = useDeferredValue(bodyProfile);

  useEffect(() => {
    try {
      window.localStorage.setItem(bodyStorageKey, JSON.stringify(bodyProfile));
    } catch {
      // Ignore storage failures.
    }
  }, [bodyProfile]);

  const activeAssets = useMemo(() => {
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    return activeAssetIds.map((assetId) => byId.get(assetId)).filter((asset): asset is Asset => Boolean(asset));
  }, [activeAssetIds, assets]);

  const resolvedSelectedAssetId = activeAssets.some((asset) => asset.id === selectedAssetId)
    ? selectedAssetId
    : activeAssets[0]?.id ?? null;
  const selectedAsset = useMemo(
    () => activeAssets.find((asset) => asset.id === resolvedSelectedAssetId) ?? null,
    [activeAssets, resolvedSelectedAssetId]
  );

  const selectedDraft = selectedAsset
    ? assetDrafts[selectedAsset.id] ?? {
        measurements: selectedAsset.metadata?.measurements ?? {},
        fitProfile: {
          ...fitProfileDefaults,
          ...(selectedAsset.metadata?.fitProfile ?? {}),
        },
      }
    : null;

  const layers = useMemo(() => buildFittingLayers(activeAssets, deferredBodyProfile), [activeAssets, deferredBodyProfile]);

  return (
    <div className="fixed inset-0 z-[210] bg-black/70 backdrop-blur-sm">
      <div className="h-full w-full px-4 py-4 lg:px-8 lg:py-6">
        <div className="grid h-full grid-cols-1 gap-4 overflow-hidden rounded-[28px] bg-[#f7f1e8] shadow-2xl lg:grid-cols-[320px_minmax(0,1fr)_360px]">
          <aside className="flex h-full flex-col border-b border-black/8 bg-[#f2e7d8] p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-black/40">3D fitting core</p>
                <h2 className="mt-2 text-2xl font-semibold text-black">{t('studio.tryon_btn') || '3D Fitting'}</h2>
                <p className="mt-2 text-sm leading-6 text-black/58">
                  Canvas items and wardrobe assets share one mannequin. Adjust the body first, then tune garment measurements if the imported data is incomplete.
                </p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full bg-white/70 p-2 text-black/60 transition hover:text-black">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4 overflow-y-auto pr-1">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/42">On mannequin</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-full border-black/10 bg-white/70 px-3 text-[11px]"
                    onClick={() => {
                      const nextIds = initialAssetIds.length > 0 ? initialAssetIds : assets.slice(0, 1).map((asset) => asset.id);
                      setActiveAssetIds(nextIds);
                      setSelectedAssetId(nextIds[0] ?? null);
                    }}
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Reset set
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeAssets.map((asset) => {
                    const selected = selectedAssetId === asset.id;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => setSelectedAssetId(asset.id)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                          selected ? 'bg-black text-white' : 'bg-white/80 text-black/64 hover:text-black'
                        }`}
                      >
                        {asset.name}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-black/42">Wardrobe assets</p>
                <div className="grid gap-2">
                  {assets.map((asset) => {
                    const active = activeAssetIds.includes(asset.id);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          setActiveAssetIds((prev) =>
                            prev.includes(asset.id) ? prev.filter((id) => id !== asset.id) : [...prev, asset.id]
                          );
                          setSelectedAssetId(asset.id);
                        }}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                          active ? 'border-black bg-white text-black' : 'border-black/8 bg-white/55 text-black/60'
                        }`}
                      >
                        <div className="h-12 w-12 overflow-hidden rounded-2xl bg-[#ece0cf]">
                          <img src={asset.imageSrc} alt={asset.name} className="h-full w-full object-contain p-1.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{asset.name}</p>
                          <p className="truncate text-[11px] uppercase tracking-[0.18em] text-black/42">{asset.category}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-black/48" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/42">Mannequin body</p>
                </div>
                <div className="space-y-3">
                  {bodyFields.map((field) => (
                    <label key={field.key} className="block">
                      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-black/60">
                        <span>{field.label}</span>
                        <span>{bodyProfile[field.key]} cm</span>
                      </div>
                      <input
                        type="range"
                        min={field.min}
                        max={field.max}
                        value={bodyProfile[field.key]}
                        onChange={(event) =>
                          setBodyProfile((prev) => ({
                            ...prev,
                            [field.key]: Number(event.target.value),
                          }))
                        }
                        className="w-full accent-black"
                      />
                    </label>
                  ))}
                </div>
              </section>
            </div>
          </aside>

          <section className="relative flex min-h-[360px] flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(244,235,223,0.72)_45%,_rgba(239,228,214,0.92))]">
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-5">
              <div className="rounded-full bg-white/72 px-3 py-2 text-[11px] font-semibold text-black/62 shadow-sm backdrop-blur-sm">
                Rotate to inspect drape, sleeve length, and hem volume.
              </div>
              <div className="rounded-full bg-black px-3 py-2 text-[11px] font-semibold text-white shadow-sm">
                {layers.length} layer{layers.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="flex-1">
              <MannequinScene3D body={deferredBodyProfile} layers={layers} selectedAssetId={selectedAssetId} />
            </div>
          </section>

          <aside className="flex h-full flex-col border-t border-black/8 bg-[#efe3d3] p-5 lg:border-l lg:border-t-0">
            {selectedAsset ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-3xl bg-white/70 shadow-sm">
                    <img src={selectedAsset.imageSrc} alt={selectedAsset.name} className="h-full w-full object-contain p-2" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/36">Selected garment</p>
                    <h3 className="mt-2 truncate text-xl font-semibold text-black">{selectedAsset.name}</h3>
                    <p className="mt-1 text-sm text-black/52">{selectedAsset.category}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-5 overflow-y-auto pr-1">
                  <section className="rounded-[24px] bg-white/72 p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <Cuboid className="h-4 w-4 text-black/48" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/42">Fit summaries</p>
                    </div>
                    <div className="grid gap-2">
                      {layers
                        .find((layer) => layer.assetId === selectedAsset.id)
                        ?.fitSummary.map((summary) => (
                          <div key={summary.label} className="rounded-2xl bg-[#f7f1e8] px-3 py-2">
                            <p className="text-sm font-semibold text-black">{summary.label}</p>
                            <p className="text-[11px] text-black/48">{summary.easeCm} cm ease</p>
                          </div>
                        ))}
                    </div>
                  </section>

                  <section className="rounded-[24px] bg-white/72 p-4 shadow-sm">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-black/42">Garment measurements</p>
                    <div className="grid grid-cols-2 gap-3">
                      {measurementFields.map((field) => (
                        <label key={field.key} className="block">
                          <span className="mb-1 block text-[11px] font-semibold text-black/56">{field.label}</span>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={selectedDraft?.measurements[field.key] ?? ''}
                            onChange={(event) => {
                              const nextValue = event.target.value.trim();
                              if (!selectedAsset) return;
                              setAssetDrafts((prev) => ({
                                ...prev,
                                [selectedAsset.id]: {
                                  measurements: {
                                    ...(prev[selectedAsset.id]?.measurements ?? selectedAsset.metadata?.measurements ?? {}),
                                    [field.key]: nextValue.length === 0 ? undefined : Number(nextValue),
                                  },
                                  fitProfile: {
                                    ...fitProfileDefaults,
                                    ...(selectedAsset.metadata?.fitProfile ?? {}),
                                    ...(prev[selectedAsset.id]?.fitProfile ?? {}),
                                  },
                                },
                              }));
                            }}
                            className="h-11 w-full rounded-2xl border border-black/10 bg-[#f7f1e8] px-3 text-sm text-black outline-none transition focus:border-black/30"
                            placeholder="cm"
                          />
                        </label>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[24px] bg-white/72 p-4 shadow-sm">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-black/42">Fit profile</p>
                    <div className="grid gap-3">
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold text-black/56">Silhouette</span>
                        <select
                          value={selectedDraft?.fitProfile.silhouette ?? 'regular'}
                          onChange={(event) =>
                            selectedAsset
                              ? setAssetDrafts((prev) => ({
                                  ...prev,
                                  [selectedAsset.id]: {
                                    measurements: prev[selectedAsset.id]?.measurements ?? selectedAsset.metadata?.measurements ?? {},
                                    fitProfile: {
                                      ...fitProfileDefaults,
                                      ...(selectedAsset.metadata?.fitProfile ?? {}),
                                      ...(prev[selectedAsset.id]?.fitProfile ?? {}),
                                      silhouette: event.target.value as NonNullable<GarmentFitProfile['silhouette']>,
                                    },
                                  },
                                }))
                              : undefined
                          }
                          className="h-11 w-full rounded-2xl border border-black/10 bg-[#f7f1e8] px-3 text-sm text-black outline-none transition focus:border-black/30"
                        >
                          <option value="tailored">Tailored</option>
                          <option value="regular">Regular</option>
                          <option value="relaxed">Relaxed</option>
                          <option value="oversized">Oversized</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold text-black/56">Layer</span>
                        <select
                          value={selectedDraft?.fitProfile.layer ?? 'mid'}
                          onChange={(event) =>
                            selectedAsset
                              ? setAssetDrafts((prev) => ({
                                  ...prev,
                                  [selectedAsset.id]: {
                                    measurements: prev[selectedAsset.id]?.measurements ?? selectedAsset.metadata?.measurements ?? {},
                                    fitProfile: {
                                      ...fitProfileDefaults,
                                      ...(selectedAsset.metadata?.fitProfile ?? {}),
                                      ...(prev[selectedAsset.id]?.fitProfile ?? {}),
                                      layer: event.target.value as NonNullable<GarmentFitProfile['layer']>,
                                    },
                                  },
                                }))
                              : undefined
                          }
                          className="h-11 w-full rounded-2xl border border-black/10 bg-[#f7f1e8] px-3 text-sm text-black outline-none transition focus:border-black/30"
                        >
                          <option value="base">Base</option>
                          <option value="mid">Mid</option>
                          <option value="outer">Outer</option>
                        </select>
                      </label>
                    </div>
                  </section>
                </div>

                <Button
                  type="button"
                  className="mt-5 h-12 rounded-2xl bg-black text-white hover:bg-black/90"
                  disabled={isSaving}
                  onClick={() => {
                    if (!selectedAsset) return;
                    setSaveError(null);
                    startSaving(async () => {
                      try {
                        if (!selectedDraft) return;
                        await onSaveAssetMetadata(selectedAsset.id, {
                          measurements: selectedDraft.measurements,
                          fitProfile: selectedDraft.fitProfile,
                        });
                      } catch (error) {
                        setSaveError(error instanceof Error ? error.message : 'Failed to save fitting metadata.');
                      }
                    });
                  }}
                >
                  {isSaving ? 'Saving fit…' : 'Save fitting metadata'}
                </Button>
                {saveError ? <p className="mt-2 text-sm text-[#8b2f2f]">{saveError}</p> : null}
              </>
            ) : (
              <div className="m-auto max-w-xs text-center text-sm leading-7 text-black/56">
                Select at least one wardrobe asset to dress the mannequin.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
