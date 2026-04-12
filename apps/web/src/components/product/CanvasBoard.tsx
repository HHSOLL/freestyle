"use client";

import Image from "next/image";
import { startTransition, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { CanvasComposition, StarterGarment } from "@freestyle/shared-types";

type CanvasBoardProps = {
  composition: CanvasComposition;
  garments: StarterGarment[];
  onChange: (composition: CanvasComposition) => void;
};

export function CanvasBoard({ composition, garments, onChange }: CanvasBoardProps) {
  const garmentMap = useMemo(() => new Map(garments.map((item) => [item.id, item])), [garments]);
  const [selectedId, setSelectedId] = useState<string | null>(composition.items[0]?.id ?? null);

  return (
    <div
      className="relative h-full min-h-[520px] overflow-hidden rounded-[28px]"
      style={{
        background: `linear-gradient(180deg, rgba(255,255,255,0.52), rgba(255,255,255,0.18)), ${composition.stageColor}`,
        border: "1px solid rgba(19,24,32,0.08)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.7),transparent_34%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[14%] h-[72%] w-[42%] -translate-x-1/2 rounded-[50%] border border-white/45 bg-white/12 blur-[0.4px]" />
      <div className="pointer-events-none absolute inset-x-[12%] bottom-[14%] h-px bg-black/8" />
      <div className="pointer-events-none absolute inset-y-[12%] left-1/2 w-px -translate-x-1/2 bg-black/6" />
      {composition.items.map((item) => {
        const garment = garmentMap.get(item.assetId);
        if (!garment) return null;
        return (
          <motion.div
            key={item.id}
            drag
            dragMomentum={false}
            onDragEnd={(_, info) => {
              startTransition(() => {
                onChange({
                  ...composition,
                  updatedAt: new Date().toISOString(),
                  items: composition.items.map((entry) =>
                    entry.id === item.id
                      ? {
                          ...entry,
                          x: entry.x + info.offset.x,
                          y: entry.y + info.offset.y,
                        }
                      : entry,
                  ),
                });
              });
            }}
            onTap={() => setSelectedId(item.id)}
            style={{
              position: "absolute",
              left: item.x,
              top: item.y,
              width: 138 * item.scale,
              rotate: `${item.rotation}deg`,
              zIndex: item.zIndex,
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            <div
              className="overflow-hidden rounded-[28px] p-3"
              style={{
                background: item.id === selectedId ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.78)",
                border: item.id === selectedId ? "1px solid rgba(157,192,232,0.9)" : "1px solid rgba(19,24,32,0.08)",
                boxShadow:
                  item.id === selectedId
                    ? "0 24px 44px rgba(74, 105, 146, 0.16)"
                    : "0 18px 36px rgba(36,41,48,0.1)",
              }}
            >
              <Image
                src={garment.imageSrc}
                alt={garment.name}
                width={240}
                height={170}
                className="h-[164px] w-full rounded-[20px] object-cover"
                unoptimized
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-[#151b24]">{garment.name}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-black/38">{garment.category}</div>
                </div>
                <div className="rounded-full border border-black/8 bg-white/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-black/40">
                  layer
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
