"use client";

import Image from "next/image";
import { startTransition, useMemo, useState } from "react";
import { BottomModeBar, Eyebrow } from "@freestyle/ui";
import { CanvasBoard } from "@/components/product/CanvasBoard";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useCanvasCompositions } from "@/hooks/useCanvasCompositions";
import { useClosetScene } from "@/hooks/useClosetScene";
import { useWardrobeAssets } from "@/hooks/useWardrobeAssets";
import { communityLibrary } from "@/lib/community-data";
import { useLanguage } from "@/lib/LanguageContext";
import styles from "./v18-closet.module.css";

export function V18CanvasExperience() {
  const { language } = useLanguage();
  const { profile } = useBodyProfile();
  const { closetRuntimeAssets } = useWardrobeAssets();
  const { scene, equippedGarments } = useClosetScene(closetRuntimeAssets);
  const { items, createFromCloset, updateComposition, removeComposition } = useCanvasCompositions(profile, scene);
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const equippedIds = useMemo(() => equippedGarments.map((item) => item.id), [equippedGarments]);
  const activeSelectedId = selectedId && items.some((item) => item.id === selectedId) ? selectedId : items[0]?.id ?? null;
  const selectedComposition = items.find((item) => item.id === activeSelectedId) ?? null;

  const createBoard = () => {
    startTransition(() => {
      const next = createFromCloset(language === "ko" ? "새 캔버스 보드" : "New canvas board", "#eceff3", equippedIds);
      setSelectedId(next.id);
    });
  };

  return (
    <div className={styles["app-shell"]}>
      <div className={styles["scene-shell"]}>
        <div className={styles["scene-surface"]}>
          <div
            className="flex h-full items-center justify-center"
            style={{ padding: "104px min(31vw, 430px) 112px min(30vw, 360px)" }}
          >
            <div className="relative h-full min-h-[620px] w-full max-w-[780px] rounded-[38px] border border-white/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06))] p-4 shadow-[0_28px_90px_rgba(50,61,76,0.16)]">
              {selectedComposition ? (
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between px-2 pb-4">
                    <div>
                      <Eyebrow>{language === "ko" ? "Canvas stage" : "Canvas stage"}</Eyebrow>
                      <div className="mt-2 text-[24px] font-semibold text-[var(--text-primary)]">{selectedComposition.title}</div>
                    </div>
                    <div className="rounded-full border border-white/18 bg-white/14 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {selectedComposition.items.length} items
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden rounded-[30px] border border-white/16 bg-white/8">
                    <CanvasBoard
                      composition={selectedComposition}
                      garments={equippedGarments}
                      onChange={(composition) => updateComposition(composition)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-[620px] items-center justify-center rounded-[30px] border border-dashed border-white/24 bg-white/10 px-8 text-center">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Canvas</div>
                    <div className="mt-3 text-[24px] font-semibold text-[var(--text-primary)]">
                      {language === "ko" ? "첫 캔버스 보드를 생성하세요." : "Create the first canvas board."}
                    </div>
                    <button
                      type="button"
                      onClick={createBoard}
                      className="mt-5 rounded-full border border-white/18 bg-[var(--accent-bg)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]"
                    >
                      {language === "ko" ? "현재 룩 가져오기" : "Import current look"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles["top-controls"]}>
          <button type="button" className={styles["top-button"]} onClick={createBoard}>
            {language === "ko" ? "새 보드" : "New board"}
          </button>
          <div className={styles["top-actions"]}>
            {selectedComposition ? (
              <button
                type="button"
                className={styles["top-button"]}
                onClick={() => {
                  removeComposition(selectedComposition.id);
                  setSelectedId(items.find((item) => item.id !== selectedComposition.id)?.id ?? null);
                }}
              >
                {language === "ko" ? "삭제" : "Delete"}
              </button>
            ) : null}
            <button type="button" className={`${styles["top-button"]} ${styles.primary}`} onClick={createBoard}>
              {language === "ko" ? "Closet 가져오기" : "Import closet"}
            </button>
          </div>
        </div>

        <section className={`${styles["overlay-panel"]} ${styles["left-panel"]} ${styles["glass-panel"]}`}>
          <div className={styles["left-title"]}>
            <div className={styles.eyebrow}>CANVAS</div>
            <h1>{language === "ko" ? "보드 편집" : "Board editing"}</h1>
          </div>

          <div className={`${styles["left-section"]} ${styles["subtle-surface"]}`}>
            <div className={styles["section-title-row"]}>
              <strong>{language === "ko" ? "현재 보드" : "Current board"}</strong>
              <span>{selectedComposition ? selectedComposition.items.length : 0} items</span>
            </div>
            <p className="text-[13px] leading-6 text-[var(--text-muted)]">
              {language === "ko"
                ? "Closet에서 완성한 룩을 2D 보드로 옮겨 레이아웃과 카드 구성을 정리합니다."
                : "Move the fitted look out of Closet and arrange it as a 2D board with the same wardrobe shell."}
            </p>
          </div>

          <button type="button" className={styles["hero-button"]} onClick={createBoard}>
            {language === "ko" ? "현재 룩으로 새 보드" : "Create board from current look"}
          </button>

          <div className={styles["left-bottom-spacer"]} />

          <div className={`${styles["status-panel"]} ${styles["subtle-surface"]}`}>
            <span className={styles["mini-label"]}>{language === "ko" ? "활성 스택" : "Active stack"}</span>
            <strong>
              {equippedGarments.length > 0
                ? equippedGarments.map((item) => item.name).join(" / ")
                : language === "ko"
                  ? "착용 아이템 없음"
                  : "No equipped garments"}
            </strong>
            <small>
              {language === "ko"
                ? "마네킹 대신 보드 편집에 집중하되, source look은 Closet 상태를 그대로 사용합니다."
                : "Canvas drops the mannequin stage, but it still uses the current Closet state as the source look."}
            </small>
          </div>
        </section>

        <section className={`${styles["overlay-panel"]} ${styles["right-panel"]} ${styles["glass-panel"]}`}>
          <div className={styles["outfit-topline"]}>{language === "ko" ? "Canvas" : "Canvas"}</div>
          <div className={styles["outfit-title"]}>{language === "ko" ? "Saved boards" : "Saved boards"}</div>

          <div className="space-y-3 overflow-y-auto pr-2">
            {items.map((composition) => (
              <button
                key={composition.id}
                type="button"
                onClick={() => setSelectedId(composition.id)}
                className="w-full rounded-[24px] border border-white/14 bg-white/10 p-3 text-left transition"
                style={{
                  boxShadow: composition.id === activeSelectedId ? "inset 0 0 0 1px var(--accent-border)" : "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-[72px] w-[72px] overflow-hidden rounded-[20px] border border-white/18 bg-white/16">
                    <Image
                      src={equippedGarments[0]?.imageSrc ?? "/wardrobe-reference.jpg"}
                      alt={composition.title}
                      fill
                      className="object-cover"
                      sizes="72px"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{composition.title}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {new Date(composition.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="mt-2 text-[12px] text-[var(--text-secondary)]">
                      {composition.items.length} items · {composition.closetState.poseId}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {items.length === 0 ? (
              <div className={`${styles["status-panel"]} ${styles["subtle-surface"]}`}>
                <span className={styles["mini-label"]}>{language === "ko" ? "Saved boards" : "Saved boards"}</span>
                <strong>{language === "ko" ? "아직 보드가 없습니다." : "No board has been saved yet."}</strong>
                <small>{language === "ko" ? "Closet에서 현재 룩을 가져와 첫 보드를 만드세요." : "Import the current Closet look to start the first board."}</small>
              </div>
            ) : null}

            <div className={`${styles["status-panel"]} ${styles["subtle-surface"]}`}>
              <span className={styles["mini-label"]}>{language === "ko" ? "Community cues" : "Community cues"}</span>
              <strong>{communityLibrary[0].title[language]}</strong>
              <small>{communityLibrary[0].body[language]}</small>
            </div>
          </div>
        </section>

        <div className="absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <BottomModeBar
            active="board"
            className="w-full max-w-[620px] border border-white/16 bg-white/14 shadow-none backdrop-blur-[18px]"
            items={[
              { id: "board", label: language === "ko" ? "Board" : "Board" },
              { id: "cards", label: language === "ko" ? "Cards" : "Cards" },
              { id: "layers", label: language === "ko" ? "Layers" : "Layers" },
              { id: "notes", label: language === "ko" ? "Notes" : "Notes" },
              { id: "export", label: language === "ko" ? "Export" : "Export" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
