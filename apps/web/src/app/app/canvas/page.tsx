"use client";

import Image from "next/image";
import { startTransition, useMemo, useState } from "react";
import { BottomModeBar, Eyebrow, ReferenceWorkspace, SurfacePanel } from "@freestyle/ui";
import { CanvasBoard } from "@/components/product/CanvasBoard";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useCanvasCompositions } from "@/hooks/useCanvasCompositions";
import { useClosetScene } from "@/hooks/useClosetScene";
import { communityLibrary } from "@/lib/community-data";
import { useLanguage } from "@/lib/LanguageContext";

export default function CanvasPage() {
  const { language } = useLanguage();
  const { profile } = useBodyProfile();
  const { scene, equippedGarments } = useClosetScene();
  const { items, createFromCloset, updateComposition, removeComposition } = useCanvasCompositions(profile, scene);
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const equippedIds = useMemo(() => equippedGarments.map((item) => item.id), [equippedGarments]);
  const selectedComposition = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  const createLookBoard = () => {
    startTransition(() => {
      const next = createFromCloset(
        language === "ko" ? "새 캔버스 룩" : "New canvas look",
        "#eceff3",
        equippedIds,
      );
      setSelectedId(next.id);
    });
  };

  return (
    <ReferenceWorkspace
      toolbar={
        <SurfacePanel className="mx-auto flex w-full max-w-[520px] items-center justify-between gap-2 rounded-full border border-black/6 bg-white/34 px-3 py-2.5 shadow-none backdrop-blur-[18px]">
          <div className="rounded-full border border-black/6 bg-white/56 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/38">
            Canvas stage
          </div>
          <button
            type="button"
            onClick={createLookBoard}
            className="rounded-full border border-black/8 bg-[#c8def8] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#243040]"
          >
            {language === "ko" ? "Create look" : "Create look"}
          </button>
        </SurfacePanel>
      }
      left={
        <div className="space-y-4">
          <SurfacePanel className="space-y-4 px-4 py-4">
            <Eyebrow>{language === "ko" ? "Current stack" : "Current stack"}</Eyebrow>
            <h2 className="text-[18px] font-semibold text-[#151b24]">{language === "ko" ? "Canvas source look" : "Canvas source look"}</h2>
            <div className="space-y-3">
              {equippedGarments.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-[20px] border border-black/8 bg-white/52 p-3">
                  <Image
                    src={item.imageSrc}
                    alt={item.name}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-[14px] object-cover"
                    unoptimized
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-[#151b24]">{item.name}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/38">{item.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </SurfacePanel>
          <SurfacePanel className="space-y-3 px-4 py-4">
            <Eyebrow>{language === "ko" ? "Board notes" : "Board notes"}</Eyebrow>
            <p className="text-[12px] leading-5 text-black/45">
              {language === "ko"
                ? "현재 착장 스냅샷을 2D arrangement로 옮기고, 같은 contract로 저장/복원합니다."
                : "The canvas turns the active fitting stack into a 2D arrangement that persists through the same repository contract."}
            </p>
          </SurfacePanel>
        </div>
      }
      stage={
        <SurfacePanel className="h-full min-h-[760px] rounded-[36px] border border-black/6 bg-white/28 px-4 py-4 shadow-none backdrop-blur-[18px]">
          {selectedComposition ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-2 pb-3">
                <div>
                  <Eyebrow>{language === "ko" ? "Canvas" : "Canvas"}</Eyebrow>
                  <div className="mt-2 text-[22px] font-semibold text-[#151b24]">
                    {language === "ko" ? "Styling composition stage" : "Styling composition stage"}
                  </div>
                </div>
                <div className="rounded-full border border-black/6 bg-white/74 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-black/38">
                  {selectedComposition.items.length} items
                </div>
              </div>
              <div className="flex-1 overflow-hidden rounded-[32px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.38),rgba(255,255,255,0.16))]">
                <CanvasBoard
                  composition={selectedComposition}
                  garments={equippedGarments}
                  onChange={(composition) => updateComposition(composition)}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[640px] items-center justify-center rounded-[28px] border border-dashed border-black/12 bg-white/42 px-8 text-center text-[14px] text-black/45">
              {language === "ko"
                ? "아직 캔버스 구성이 없습니다. 현재 룩을 기반으로 첫 보드를 생성하세요."
                : "No canvas composition exists yet. Create the first board from the current look."}
            </div>
          )}
        </SurfacePanel>
      }
      right={
        <SurfacePanel className="space-y-4 px-4 py-4">
          <Eyebrow>{language === "ko" ? "Saved looks" : "Saved looks"}</Eyebrow>
          <h2 className="text-[18px] font-semibold text-[#151b24]">{language === "ko" ? "Saved canvases" : "Saved canvases"}</h2>
          <div className="space-y-3">
            {items.map((composition) => (
              <div
                key={composition.id}
                className="w-full rounded-[22px] border p-4 transition"
                style={{
                  background: composition.id === selectedId ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.5)",
                  borderColor: composition.id === selectedId ? "rgba(157,192,232,0.9)" : "rgba(19,24,32,0.08)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(composition.id)}
                    className="min-w-0 text-left"
                  >
                    <div className="text-[14px] font-semibold text-[#151b24]">{composition.title}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/38">
                      {new Date(composition.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeComposition(composition.id);
                      if (selectedId === composition.id) {
                        setSelectedId(items.find((item) => item.id !== composition.id)?.id ?? null);
                      }
                    }}
                    className="rounded-full border border-black/8 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-black/45"
                  >
                    {language === "ko" ? "삭제" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 ? (
              <div className="rounded-[20px] border border-black/8 bg-white/46 px-4 py-4 text-[13px] text-black/45">
                {language === "ko" ? "저장된 캔버스가 없습니다." : "No canvas has been saved yet."}
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-[24px] border border-black/6 bg-white/34 px-3 py-3">
            <Eyebrow>{language === "ko" ? "Community cues" : "Community cues"}</Eyebrow>
            {communityLibrary.slice(0, 2).map((entry) => (
              <div key={entry.id} className="grid grid-cols-[60px_minmax(0,1fr)] gap-3 rounded-[18px] border border-black/6 bg-white/54 p-2.5">
                <Image
                  src={entry.image}
                  alt={entry.title.en}
                  width={60}
                  height={60}
                  className="h-[60px] w-[60px] rounded-[14px] object-cover"
                  unoptimized
                />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-[#151b24]">{entry.title[language]}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-black/35">{entry.author[language]}</div>
                </div>
              </div>
            ))}
          </div>
        </SurfacePanel>
      }
      footer={
        <BottomModeBar
          active="stage"
          className="w-full max-w-[560px] border border-black/6 bg-white/38 shadow-none backdrop-blur-[18px]"
          items={[
            { id: "stage", label: language === "ko" ? "Stage" : "Stage" },
            { id: "cards", label: language === "ko" ? "Cards" : "Cards" },
            { id: "layers", label: language === "ko" ? "Layers" : "Layers" },
            { id: "notes", label: language === "ko" ? "Notes" : "Notes" },
            { id: "export", label: language === "ko" ? "Export" : "Export" },
          ]}
        />
      }
    />
  );
}
