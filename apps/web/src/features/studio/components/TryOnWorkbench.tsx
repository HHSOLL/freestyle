'use client';

import dynamic from 'next/dynamic';
import { startTransition, useMemo, useState, type ChangeEvent } from 'react';
import { Download, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Asset } from '@freestyle/contracts/domain-types';
import type { CanvasItem, StudioTranslator } from '../types';
import type { MannequinMeasurements, ViewerGarmentLayer } from './ThreeDMannequinViewer';

const DynamicThreeDMannequinViewer = dynamic(
  () => import('./ThreeDMannequinViewer').then((mod) => mod.ThreeDMannequinViewer),
  {
    ssr: false,
    loading: () => <div className="h-full min-h-[420px] w-full animate-pulse rounded-[32px] bg-black/5" />,
  }
);

type TryOnWorkbenchProps = {
  t: StudioTranslator;
  language: string;
  canvasItems: CanvasItem[];
  assetById: Map<string, Asset>;
  selectedItemId: string | null;
  modelPhotoPreview: string | null;
  hasModelPhoto: boolean;
  onTryOnModelChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isTryOnLoading: boolean;
  tryOnResultImage: string | null;
  tryOnError: string | null;
  onTryOnGenerate: () => void;
  onTryOnDownload: () => void;
};

type GarmentControl = {
  visible: boolean;
  fit: number;
  length: number;
  puff: number;
};

const defaultMeasurements: MannequinMeasurements = {
  heightCm: 170,
  shouldersCm: 44,
  chestCm: 96,
  waistCm: 78,
  hipsCm: 96,
  inseamCm: 78,
};

const measurementConfig = [
  { key: 'heightCm', min: 145, max: 195, step: 1, labelKo: '키', labelEn: 'Height' },
  { key: 'shouldersCm', min: 34, max: 56, step: 0.5, labelKo: '어깨', labelEn: 'Shoulders' },
  { key: 'chestCm', min: 74, max: 128, step: 1, labelKo: '가슴', labelEn: 'Chest' },
  { key: 'waistCm', min: 56, max: 118, step: 1, labelKo: '허리', labelEn: 'Waist' },
  { key: 'hipsCm', min: 74, max: 136, step: 1, labelKo: '힙', labelEn: 'Hips' },
  { key: 'inseamCm', min: 62, max: 98, step: 1, labelKo: '인심', labelEn: 'Inseam' },
] as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const controlDefaultsFromAsset = (asset: Asset): GarmentControl => {
  const silhouette = asset.metadata?.fitProfile?.silhouette;
  const measurements = asset.metadata?.measurements;
  const automaticFitDelta =
    asset.category === 'bottoms' && typeof measurements?.waistCm === 'number'
      ? clamp((measurements.waistCm - defaultMeasurements.waistCm) / 36, -0.4, 0.4)
      : asset.category === 'outerwear' || asset.category === 'tops'
        ? typeof measurements?.chestCm === 'number'
          ? clamp((measurements.chestCm - defaultMeasurements.chestCm) / 42, -0.4, 0.4)
          : 0
        : 0;
  const automaticLengthDelta =
    asset.category === 'bottoms' && typeof measurements?.inseamCm === 'number'
      ? clamp((measurements.inseamCm - defaultMeasurements.inseamCm) / 24, -0.35, 0.35)
      : typeof measurements?.lengthCm === 'number'
        ? clamp((measurements.lengthCm - 68) / 38, -0.35, 0.35)
        : 0;
  return {
    visible: true,
    fit:
      silhouette === 'tailored'
        ? -0.35
        : silhouette === 'relaxed'
          ? 0.2
          : silhouette === 'oversized'
            ? 0.45
            : automaticFitDelta,
    length: automaticLengthDelta,
    puff: asset.category === 'outerwear' ? 0.25 : 0,
  };
};

const fitLabel = (value: number, copy: ReturnType<typeof buildCopy>) => {
  if (value <= -0.25) return copy.fit.tight;
  if (value <= -0.05) return copy.fit.slim;
  if (value < 0.12) return copy.fit.regular;
  if (value < 0.32) return copy.fit.relaxed;
  return copy.fit.oversized;
};

const buildCopy = (language: string) =>
  language === 'ko'
    ? {
        tabs: {
          mannequin: '3D 마네킹',
          photo: 'AI 포토 피팅',
        },
        title: '실시간 3D dressing lab',
        desc: '캔버스에 올린 에셋을 그대로 마네킹에 입히고, 체형 수치를 조절하며 실루엣을 즉시 확인합니다.',
        empty: '먼저 캔버스에 옷을 올려 주세요. 현재 캔버스의 옷 조합이 3D 마네킹으로 바로 들어옵니다.',
        measurements: '마네킹 치수',
        garments: '활성 의류',
        fit: {
          tight: '타이트',
          slim: '슬림',
          regular: '레귤러',
          relaxed: '릴랙스',
          oversized: '오버사이즈',
        },
        fitSlider: '핏 여유',
        lengthSlider: '기장',
        puffSlider: '볼륨',
        viewerHint: '드래그로 회전, 휠로 확대',
        photoTitle: '포토 try-on',
        photoDesc: '전신 사진을 넣으면 현재 선택한 주력 아이템으로 AI 결과 이미지를 생성합니다.',
        uploadLabel: '모델 사진',
        resultLabel: '결과',
        resultEmpty: '아직 결과가 없습니다.',
        generate: '포토 try-on 생성',
        download: '결과 다운로드',
      }
    : {
        tabs: {
          mannequin: '3D mannequin',
          photo: 'AI photo try-on',
        },
        title: 'Real-time 3D dressing lab',
        desc: 'Dress the mannequin with the exact assets already placed on the canvas and tune body measurements to inspect silhouette changes immediately.',
        empty: 'Place at least one garment on the canvas first. The current canvas selection is what feeds the 3D mannequin.',
        measurements: 'Mannequin measurements',
        garments: 'Active garments',
        fit: {
          tight: 'Tight',
          slim: 'Slim',
          regular: 'Regular',
          relaxed: 'Relaxed',
          oversized: 'Oversized',
        },
        fitSlider: 'Fit ease',
        lengthSlider: 'Length',
        puffSlider: 'Volume',
        viewerHint: 'Drag to orbit, scroll to zoom',
        photoTitle: 'Photo try-on',
        photoDesc: 'Upload a model image to generate an AI try-on result with the current primary garment.',
        uploadLabel: 'Model photo',
        resultLabel: 'Result',
        resultEmpty: 'No result yet.',
        generate: 'Generate photo try-on',
        download: 'Download result',
      };

export function TryOnWorkbench({
  t,
  language,
  canvasItems,
  assetById,
  selectedItemId,
  modelPhotoPreview,
  hasModelPhoto,
  onTryOnModelChange,
  isTryOnLoading,
  tryOnResultImage,
  tryOnError,
  onTryOnGenerate,
  onTryOnDownload,
}: TryOnWorkbenchProps) {
  const copy = buildCopy(language);
  const [activeTab, setActiveTab] = useState<'mannequin' | 'photo'>('mannequin');
  const [measurements, setMeasurements] = useState<MannequinMeasurements>(defaultMeasurements);
  const [controls, setControls] = useState<Record<string, GarmentControl>>({});

  const garments = useMemo(() => {
    return [...canvasItems]
      .sort((a, b) => {
        if (a.id === selectedItemId) return -1;
        if (b.id === selectedItemId) return 1;
        return b.zIndex - a.zIndex;
      })
      .map((item) => {
        const asset = assetById.get(item.assetId);
        if (!asset) return null;
        return {
          id: item.id,
          item,
          asset,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [assetById, canvasItems, selectedItemId]);

  const mergedControls = useMemo(() => {
    const next: Record<string, GarmentControl> = {};
    for (const garment of garments) {
      next[garment.id] = controls[garment.id] ?? controlDefaultsFromAsset(garment.asset);
    }
    return next;
  }, [controls, garments]);

  const selectedLayerId = garments[0]?.id ?? null;

  const viewerLayers = useMemo<ViewerGarmentLayer[]>(() => {
    return garments.map((garment) => {
      const control = mergedControls[garment.id] ?? controlDefaultsFromAsset(garment.asset);
      return {
        id: garment.id,
        label: garment.asset.name,
        imageSrc: garment.asset.imageSrc,
        category: garment.asset.category,
        visible: control.visible,
        fit: control.fit,
        length: control.length,
        puff: control.puff,
        accentColor: garment.asset.metadata?.dominantColor,
        garmentProfile: garment.asset.garmentProfile,
        measurements: garment.asset.metadata?.measurements,
      };
    });
  }, [garments, mergedControls]);

  const updateMeasurement = (key: keyof MannequinMeasurements, nextValue: number) => {
    startTransition(() => {
      setMeasurements((current) => ({
        ...current,
        [key]: nextValue,
      }));
    });
  };

  const updateControl = (id: string, patch: Partial<GarmentControl>) => {
    startTransition(() => {
      setControls((current) => ({
        ...current,
        [id]: {
          ...(current[id] ?? { visible: true, fit: 0, length: 0, puff: 0 }),
          ...patch,
        },
      }));
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeTab === 'mannequin' ? 'default' : 'ghost'}
          className="rounded-full"
          onClick={() => setActiveTab('mannequin')}
        >
          {copy.tabs.mannequin}
        </Button>
        <Button
          variant={activeTab === 'photo' ? 'default' : 'ghost'}
          className="rounded-full"
          onClick={() => setActiveTab('photo')}
        >
          {copy.tabs.photo}
        </Button>
      </div>

      {activeTab === 'mannequin' ? (
        garments.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="overflow-hidden rounded-[36px] border border-black/10 bg-[#f6f1ea]">
              <div className="flex items-start justify-between gap-4 border-b border-black/8 px-5 py-4">
                <div>
                  <h3 className="font-serif text-2xl">{copy.title}</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-black/55">{copy.desc}</p>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/35">{copy.viewerHint}</p>
              </div>
              <div className="h-[460px]">
                <DynamicThreeDMannequinViewer
                  measurements={measurements}
                  layers={viewerLayers}
                  selectedLayerId={selectedLayerId}
                />
              </div>
            </div>

            <div className="space-y-4">
              <section className="rounded-[28px] border border-black/8 bg-black/[0.03] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/40">{copy.measurements}</p>
                <div className="mt-4 space-y-4">
                  {measurementConfig.map((config) => (
                    <label key={config.key} className="block space-y-2">
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>{language === 'ko' ? config.labelKo : config.labelEn}</span>
                        <span className="text-black/45">{measurements[config.key]} cm</span>
                      </div>
                      <input
                        type="range"
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        value={measurements[config.key]}
                        onChange={(event) => updateMeasurement(config.key, Number(event.target.value))}
                        className="w-full accent-black"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-black/8 bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/40">{copy.garments}</p>
                <div className="mt-4 space-y-4">
                  {garments.map((garment) => {
                    const control = mergedControls[garment.id] ?? controlDefaultsFromAsset(garment.asset);
                    return (
                      <div key={garment.id} className="rounded-[24px] border border-black/6 bg-black/[0.02] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{garment.asset.name}</p>
                            <p className="text-xs text-black/45">{garment.asset.category}</p>
                          </div>
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-black/55">
                            <input
                              type="checkbox"
                              checked={control.visible}
                              onChange={(event) => updateControl(garment.id, { visible: event.target.checked })}
                              className="accent-black"
                            />
                            on
                          </label>
                        </div>

                        <div className="mt-3 grid gap-3">
                          <label className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span>{copy.fitSlider}</span>
                              <span className="text-black/45">{fitLabel(control.fit, copy)}</span>
                            </div>
                            <input
                              type="range"
                              min={-0.5}
                              max={0.5}
                              step={0.05}
                              value={control.fit}
                              onChange={(event) => updateControl(garment.id, { fit: Number(event.target.value) })}
                              className="w-full accent-black"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span>{copy.lengthSlider}</span>
                              <span className="text-black/45">{Math.round((control.length + 1) * 50)}%</span>
                            </div>
                            <input
                              type="range"
                              min={-0.5}
                              max={0.5}
                              step={0.05}
                              value={control.length}
                              onChange={(event) => updateControl(garment.id, { length: Number(event.target.value) })}
                              className="w-full accent-black"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span>{copy.puffSlider}</span>
                              <span className="text-black/45">{Math.round(clamp(control.puff, 0, 1) * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={control.puff}
                              onChange={(event) => updateControl(garment.id, { puff: Number(event.target.value) })}
                              className="w-full accent-black"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="rounded-[32px] border border-dashed border-black/16 px-6 py-10 text-sm leading-7 text-black/55">
            {copy.empty}
          </div>
        )
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-[32px] border border-black/8 bg-black/[0.03] p-6">
            <div className="mb-4">
              <h3 className="font-serif text-2xl">{copy.photoTitle}</h3>
              <p className="mt-1 text-sm leading-6 text-black/55">{copy.photoDesc}</p>
            </div>

            <label className="block">
              <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-black/40">
                {copy.uploadLabel}
              </span>
              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-black/18 bg-white">
                {modelPhotoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={modelPhotoPreview} alt={t('studio.model.alt')} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-black/25">
                    <Upload className="h-10 w-10" />
                    <span className="text-xs font-bold uppercase tracking-[0.18em]">
                      {t('studio.modal.upload')}
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onTryOnModelChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </div>
            </label>

            <Button
              className="mt-5 w-full rounded-full bg-black text-white hover:bg-black/90"
              onClick={onTryOnGenerate}
              disabled={!hasModelPhoto || isTryOnLoading}
            >
              {isTryOnLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('studio.tryon.loading')}
                </>
              ) : (
                copy.generate
              )}
            </Button>

            {tryOnError ? <p className="mt-3 text-sm text-red-600">{tryOnError}</p> : null}
          </section>

          <section className="rounded-[32px] border border-black/8 bg-white p-6">
            <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-black/40">
              {copy.resultLabel}
            </span>
            <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[28px] bg-black/[0.03]">
              {tryOnResultImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tryOnResultImage} alt={t('studio.tryon.preview_alt')} className="h-full w-full object-contain" />
              ) : (
                <p className="px-6 text-center text-sm text-black/45">{copy.resultEmpty}</p>
              )}
            </div>

            <Button
              variant="outline"
              className="mt-5 w-full rounded-full border-black/12"
              onClick={onTryOnDownload}
              disabled={!tryOnResultImage}
            >
              <Download className="mr-2 h-4 w-4" />
              {copy.download}
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
