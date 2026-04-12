"use client";

import Image from "next/image";
import {
  Footprints,
  Layers3,
  PersonStanding,
  Shirt,
  Sparkles,
  Waves,
} from "lucide-react";
import type { Asset, GarmentCategory, StarterGarment } from "@freestyle/shared-types";
import { Eyebrow, SurfacePanel } from "@freestyle/ui";

const categoryLabels: Record<GarmentCategory, { ko: string; en: string }> = {
  tops: { ko: "상의", en: "Tops" },
  bottoms: { ko: "하의", en: "Bottoms" },
  outerwear: { ko: "아우터", en: "Outerwear" },
  shoes: { ko: "슈즈", en: "Shoes" },
  accessories: { ko: "액세서리", en: "Accessories" },
  custom: { ko: "커스텀", en: "Custom" },
};

const categoryOrder: GarmentCategory[] = ["tops", "outerwear", "bottoms", "shoes", "accessories"];

const categoryIcons: Record<GarmentCategory, React.ComponentType<{ className?: string }>> = {
  tops: Shirt,
  bottoms: PersonStanding,
  outerwear: Waves,
  shoes: Footprints,
  accessories: Sparkles,
  custom: Sparkles,
};

const subcategoryLabels: Record<GarmentCategory, string[]> = {
  tops: ["Tanks", "Tees", "Shirts", "Knits", "Blouses", "Bodies"],
  outerwear: ["Bombers", "Blazers", "Coats", "Jackets", "Capes", "Wraps"],
  bottoms: ["Denim", "Skirts", "Wide", "Tailored", "Cargo", "Shorts"],
  shoes: ["Heels", "Sneakers", "Loafers", "Boots", "Slippers", "Sandals"],
  accessories: ["Belts", "Bags", "Scarves", "Jewelry", "Gloves", "Hats"],
  custom: ["Custom"],
};

export function ClosetCatalogPanel({
  language,
  activeCategory,
  selectedItemId,
  starterAssets,
  remoteAssets,
  onCategoryChange,
  onEquip,
}: {
  language: "ko" | "en";
  activeCategory: GarmentCategory;
  selectedItemId: string | null;
  starterAssets: StarterGarment[];
  remoteAssets: Asset[];
  onCategoryChange: (category: GarmentCategory) => void;
  onEquip: (category: GarmentCategory, itemId: string) => void;
}) {
  const starterItems = starterAssets.filter((item) => item.category === activeCategory);
  const referenceItems = remoteAssets.filter((item) => item.category === activeCategory);

  return (
    <div className="space-y-4">
      <SurfacePanel className="space-y-4 rounded-[30px] border border-black/6 bg-white/38 px-4 py-4 shadow-none backdrop-blur-[18px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Outfit</Eyebrow>
            <h2 className="mt-2 text-[20px] font-semibold text-[#151b24]">{language === "ko" ? "Wardrobe catalog" : "Wardrobe catalog"}</h2>
            <p className="mt-1 max-w-[250px] text-[12px] leading-5 text-black/45">
              {language === "ko"
                ? "착장 가능한 verified garment만 메인 fitting surface에 연결합니다."
                : "Only verified garments stay connected to the main fitting surface."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[
              Shirt,
              Layers3,
              Sparkles,
            ].map((Icon, index) => (
              <div
                key={index}
                className="grid h-9 w-9 place-items-center rounded-full border border-black/6 bg-white/78 text-black/44"
              >
                <Icon className="h-4 w-4" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[52px_92px_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-2 rounded-[26px] bg-white/22 px-1.5 py-2.5">
            {categoryOrder.map((category) => {
              const Icon = categoryIcons[category];
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onCategoryChange(category)}
                  className="grid h-10 w-10 place-items-center rounded-full border transition"
                  style={{
                    borderColor:
                      activeCategory === category ? "rgba(255,255,255,0.55)" : "rgba(19,24,32,0.08)",
                    background:
                      activeCategory === category ? "rgba(148,190,255,0.24)" : "rgba(255,255,255,0.52)",
                    color: activeCategory === category ? "#1d2430" : "rgba(21,27,36,0.58)",
                  }}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          <div className="rounded-[26px] bg-white/22 px-3 py-3">
            <div className="space-y-2">
              {subcategoryLabels[activeCategory].map((label, index) => (
                <div
                  key={label}
                  className="rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    background: index === 0 ? "rgba(255,255,255,0.82)" : "transparent",
                    color: index === 0 ? "#151b24" : "rgba(21,27,36,0.46)",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {starterItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onEquip(item.category, item.id)}
                className="group space-y-2 text-center"
              >
                <div
                  className="mx-auto flex h-[82px] w-[82px] items-center justify-center overflow-hidden rounded-full border p-2 transition"
                  style={{
                    background:
                      selectedItemId === item.id ? "rgba(171,214,255,0.24)" : "rgba(255,255,255,0.48)",
                    borderColor:
                      selectedItemId === item.id ? "rgba(134,188,255,0.88)" : "rgba(19,24,32,0.08)",
                    boxShadow:
                      selectedItemId === item.id
                        ? "0 18px 34px rgba(117, 161, 210, 0.18)"
                        : "0 14px 28px rgba(44,52,61,0.08)",
                  }}
                >
                  <Image
                    src={item.imageSrc}
                    alt={item.name}
                    width={82}
                    height={82}
                    className="h-full w-full rounded-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-[#151b24]">{item.name}</div>
              </button>
            ))}
          </div>
        </div>

        {starterItems.length === 0 ? (
          <div className="rounded-[22px] border border-black/8 bg-white/52 px-4 py-5 text-[13px] text-black/45">
            {language === "ko"
              ? "이 카테고리에는 runtime starter garment가 아직 없습니다."
              : "No runtime starter garment is available in this category yet."}
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-[22px] border border-black/6 bg-white/34 px-4 py-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-black/35">{language === "ko" ? "active" : "active"}</div>
            <div className="mt-1 text-[13px] font-semibold text-[#151b24]">{categoryLabels[activeCategory][language]}</div>
          </div>
          <button
            type="button"
            className="rounded-full border border-black/8 bg-[#c8def8] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#243040]"
          >
            {language === "ko" ? "Complete" : "Complete"}
          </button>
        </div>
      </SurfacePanel>

      <SurfacePanel className="space-y-3 rounded-[30px] border border-black/6 bg-white/38 px-4 py-4 shadow-none backdrop-blur-[18px]">
        <div>
          <Eyebrow>Imported references</Eyebrow>
          <h3 className="mt-2 text-[16px] font-semibold text-[#151b24]">{language === "ko" ? "Stored imports" : "Stored imports"}</h3>
          <p className="mt-1 text-[12px] leading-5 text-black/45">
            {language === "ko"
              ? "이 영역은 lab 밖에서도 조회 가능하지만, rig fitting 계약이 없는 에셋은 메인 착장에는 직접 연결하지 않습니다."
              : "These remain browseable, but assets without a fitting contract stay out of the main dressing runtime."}
          </p>
        </div>
        <div className="space-y-3">
          {referenceItems.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-[20px] border border-black/8 bg-white/46 p-3"
            >
              <div className="overflow-hidden rounded-[14px] bg-white/75">
                <Image
                  src={item.imageSrc}
                  alt={item.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-[#151b24]">{item.name}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/38">
                  {item.brand ?? (language === "ko" ? "Imported" : "Imported")}
                </div>
              </div>
            </div>
          ))}
          {referenceItems.length === 0 ? (
            <div className="rounded-[20px] border border-black/8 bg-white/46 px-4 py-4 text-[13px] text-black/45">
              {language === "ko"
                ? "현재 카테고리에는 가져온 참고 에셋이 없습니다."
                : "No imported reference asset is stored for this category."}
            </div>
          ) : null}
        </div>
      </SurfacePanel>
    </div>
  );
}
