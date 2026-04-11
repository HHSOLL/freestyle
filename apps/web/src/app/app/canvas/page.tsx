"use client";

import Image from "next/image";
import { startTransition, useMemo, useState } from "react";
import { wardrobeTokens } from "@freestyle/design-tokens";
import { Eyebrow, PillButton, SurfacePanel, WorkspaceFrame } from "@freestyle/ui";
import { CanvasBoard } from "@/components/product/CanvasBoard";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useCanvasCompositions } from "@/hooks/useCanvasCompositions";
import { useClosetScene } from "@/hooks/useClosetScene";
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
    <WorkspaceFrame
      toolbar={
        <SurfacePanel className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Eyebrow>Canvas styling</Eyebrow>
            <h1 className="mt-2 text-[22px] font-semibold text-[#151b24]">
              {language === "ko" ? "룩 조합 캔버스" : "Look composition canvas"}
            </h1>
            <p className="mt-1 text-[12px] leading-5 text-black/45">
              {language === "ko"
                ? "현재 착장 스냅샷을 2D styling board로 전환해 배치합니다."
                : "Translate the active fitting stack into a 2D styling board and arrange it."}
            </p>
          </div>
          <PillButton active={false} onClick={createLookBoard}>
            {language === "ko" ? "현재 룩으로 보드 만들기" : "Create board from current look"}
          </PillButton>
        </SurfacePanel>
      }
      left={
        <div className="space-y-4">
          <SurfacePanel className="space-y-4 px-4 py-4">
            <div>
              <Eyebrow>Current stack</Eyebrow>
              <h2 className="mt-2 text-[18px] font-semibold text-[#151b24]">
                {language === "ko" ? "캔버스로 보낼 의상" : "Garments sent to canvas"}
              </h2>
            </div>
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
            <Eyebrow>Persistence</Eyebrow>
            <p className="text-[12px] leading-5 text-black/45">
              {language === "ko"
                ? "현재는 local repository adapter에 저장되며, 동일 contract로 API repository를 붙일 수 있게 분리했습니다."
                : "Canvas state currently persists through a local repository adapter and can later swap to an API repository behind the same contract."}
            </p>
          </SurfacePanel>
        </div>
      }
      stage={
        <SurfacePanel className="h-full min-h-[720px] px-4 py-4">
          {selectedComposition ? (
            <CanvasBoard
              composition={selectedComposition}
              garments={equippedGarments}
              onChange={(composition) => updateComposition(composition)}
            />
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
          <div>
            <Eyebrow>Saved looks</Eyebrow>
            <h2 className="mt-2 text-[18px] font-semibold text-[#151b24]">
              {language === "ko" ? "저장된 캔버스" : "Saved canvases"}
            </h2>
          </div>
          <div className="space-y-3">
            {items.map((composition) => (
              <button
                key={composition.id}
                type="button"
                onClick={() => setSelectedId(composition.id)}
                className="w-full rounded-[22px] border p-4 text-left transition"
                style={{
                  background: composition.id === selectedId ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.5)",
                  borderColor: composition.id === selectedId ? wardrobeTokens.color.accentWarm : "rgba(19,24,32,0.08)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold text-[#151b24]">{composition.title}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/38">
                      {new Date(composition.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
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
              </button>
            ))}
            {items.length === 0 ? (
              <div className="rounded-[20px] border border-black/8 bg-white/46 px-4 py-4 text-[13px] text-black/45">
                {language === "ko" ? "저장된 캔버스가 없습니다." : "No canvas has been saved yet."}
              </div>
            ) : null}
          </div>
        </SurfacePanel>
      }
      footer={null}
    />
  );
}
