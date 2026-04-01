'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { GameDressUpScene3D } from './GameDressUpScene3D';
import {
  defaultDressUpSelection,
  dressUpSlots,
  dressUpStyles,
  dressUpStylesById,
  type DressUpSlot,
  type EquippedDressUp,
} from './gameDressUpAssets';

export function GameDressUpWorkbench() {
  const { language } = useLanguage();
  const [activeSlot, setActiveSlot] = useState<DressUpSlot>('head');
  const [equipped, setEquipped] = useState<EquippedDressUp>(defaultDressUpSelection);

  const copy =
    language === 'ko'
      ? {
          eyebrow: 'Character Studio',
          title: '게임 캐릭터처럼 슬롯별로 갈아입히는 공개 wardrobe preview',
          body: 'Quaternius의 공개 CC0 modular women pack을 붙여 Head / Torso / Legs / Feet 슬롯을 실제 3D mesh 기준으로 교체합니다. 기존 상품용 parametric preview와 별도로, 자연스러운 캐릭터 커스터마이즈 감각을 먼저 구현한 레이어입니다.',
          category: '카테고리',
          options: '공개 outfit 옵션',
          equipped: '장착 중',
          stage: 'Live character stage',
          source: 'Source asset',
          sourceBody: 'Quaternius Ultimate Modular Women Pack, CC0.',
          sourceLink: '원본 pack 열기',
        }
      : {
          eyebrow: 'Character Studio',
          title: 'A public wardrobe preview that swaps slot by slot like a game character screen',
          body: 'This layer uses Quaternius’ public CC0 modular women pack to swap Head / Torso / Legs / Feet as real 3D meshes. It sits next to the parametric garment preview so the product can feel closer to a game-style customization screen.',
          category: 'Category',
          options: 'Public outfit options',
          equipped: 'Equipped',
          stage: 'Live character stage',
          source: 'Source asset',
          sourceBody: 'Quaternius Ultimate Modular Women Pack, CC0.',
          sourceLink: 'Open source pack',
        };

  const activeLabel = dressUpSlots.find((slot) => slot.id === activeSlot)?.label[language] ?? '';
  const equippedRows = useMemo(
    () =>
      dressUpSlots.map((slot) => ({
        slot: slot.label[language],
        style: dressUpStylesById[equipped[slot.id]].label[language],
        accent: dressUpStylesById[equipped[slot.id]].accent,
      })),
    [equipped, language]
  );

  return (
    <section className="overflow-hidden border border-white/10 bg-[linear-gradient(135deg,#090806_0%,#13100d_38%,#060505_100%)] text-white shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
      <div className="grid gap-0 xl:grid-cols-[220px_360px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-black/18 p-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d7b36b]">{copy.eyebrow}</p>
          <h2 className="mt-4 font-serif text-3xl tracking-[-0.05em] text-white">{copy.title}</h2>
          <p className="mt-4 text-sm leading-7 text-white/70">{copy.body}</p>

          <div className="mt-6 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{copy.category}</p>
            {dressUpSlots.map((slot) => {
              const active = slot.id === activeSlot;
              const currentStyle = dressUpStylesById[equipped[slot.id]];
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setActiveSlot(slot.id)}
                  className={`flex w-full items-center justify-between border px-4 py-3 text-left transition ${
                    active
                      ? 'border-[#d7b36b] bg-[#18120d] text-white'
                      : 'border-white/8 bg-black/20 text-white/64 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{slot.label[language]}</span>
                  <span className="text-[11px] text-white/45">{currentStyle.label[language]}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-white/10 pt-4 text-sm text-white/64">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{copy.source}</p>
            <p className="mt-2 leading-6">{copy.sourceBody}</p>
            <a
              href="https://quaternius.com/packs/ultimatemodularwomen.html"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-xs font-semibold uppercase tracking-[0.18em] text-[#f2d7a3] underline underline-offset-4"
            >
              {copy.sourceLink}
            </a>
          </div>
        </aside>

        <section className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{copy.options}</p>
          <h3 className="mt-2 font-serif text-2xl tracking-[-0.05em] text-white">{activeLabel}</h3>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {dressUpStyles.map((style) => {
              const selected = equipped[activeSlot] === style.id;
              return (
                <button
                  key={`${activeSlot}-${style.id}`}
                  type="button"
                  onClick={() =>
                    setEquipped((prev) => ({
                      ...prev,
                      [activeSlot]: style.id,
                    }))
                  }
                  className={`relative overflow-hidden border p-4 text-left transition ${
                    selected
                      ? 'border-[#d7b36b] bg-white/[0.06] text-white'
                      : 'border-white/8 bg-black/20 text-white/64 hover:border-white/20 hover:text-white'
                  }`}
                  style={{ boxShadow: selected ? `0 0 0 1px ${style.accent} inset, 0 16px 40px ${style.glow}` : undefined }}
                >
                  <div
                    className="mb-4 h-20 w-full rounded-[20px]"
                    style={{ background: `linear-gradient(135deg, ${style.accent}, rgba(255,255,255,0.06))` }}
                  />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{style.id}</p>
                  <h4 className="mt-2 text-lg font-semibold text-white">{style.label[language]}</h4>
                  <p className="mt-2 text-sm leading-6 text-white/64">{style.description[language]}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="relative min-h-[760px] overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(132,93,43,0.18),_rgba(8,7,6,0.96)_62%)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
            <div className="rounded-full border border-white/10 bg-black/35 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {copy.stage}
            </div>
            <div className="rounded-full border border-[#d7b36b]/35 bg-[#18120d]/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f2d7a3]">
              {activeLabel}
            </div>
          </div>

          <div className="absolute left-6 top-1/2 z-10 hidden -translate-y-1/2 gap-3 lg:flex lg:flex-col">
            {equippedRows.map((row) => (
              <div key={row.slot} className="w-24 border border-white/10 bg-black/35 px-3 py-3 text-center backdrop-blur-sm">
                <div className="mx-auto h-10 w-10 rounded-[14px]" style={{ background: row.accent }} />
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">{row.slot}</p>
                <p className="mt-1 text-xs text-white/76">{row.style}</p>
              </div>
            ))}
          </div>

          <div className="h-[760px]">
            <GameDressUpScene3D equipped={equipped} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/8 bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.86))] px-5 py-4 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {equippedRows.map((row) => (
                <div key={row.slot} className="flex items-center gap-3 border border-white/10 bg-black/25 px-3 py-2">
                  <div className="h-8 w-8 rounded-[12px]" style={{ background: row.accent }} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">{row.slot}</p>
                    <p className="text-xs text-white/78">{row.style}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
