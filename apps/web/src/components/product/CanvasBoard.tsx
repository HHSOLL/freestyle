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
        background: composition.stageColor,
        border: "1px solid rgba(19,24,32,0.08)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.5),transparent_44%)]" />
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
              width: 150 * item.scale,
              rotate: `${item.rotation}deg`,
              zIndex: item.zIndex,
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            <div
              className="overflow-hidden rounded-[22px] p-3"
              style={{
                background: item.id === selectedId ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.78)",
                border: item.id === selectedId ? "1px solid rgba(210,180,140,0.92)" : "1px solid rgba(19,24,32,0.08)",
                boxShadow: "0 22px 40px rgba(36,41,48,0.14)",
              }}
            >
              <Image
                src={garment.imageSrc}
                alt={garment.name}
                width={240}
                height={170}
                className="h-[170px] w-full object-cover"
                unoptimized
              />
              <div className="mt-3">
                <div className="truncate text-[14px] font-semibold text-[#151b24]">{garment.name}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/38">{garment.category}</div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
