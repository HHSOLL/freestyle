"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { starterGarmentCatalog } from "@freestyle/domain-garment";
import type { Asset, StarterGarment } from "@freestyle/shared-types";
import { apiFetchJson } from "@/lib/clientApi";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toAsset = (value: unknown): Asset | null => {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.name !== "string" || typeof value.image_url !== "string") return null;
  const metadata = isRecord(value.metadata) ? value.metadata : undefined;
  const sourceUrl = typeof value.source_url === "string" ? value.source_url : undefined;
  return {
    id: value.id,
    name: value.name,
    imageSrc:
      typeof value.cutout_image_url === "string"
        ? value.cutout_image_url
        : typeof value.thumbnail_medium_url === "string"
          ? value.thumbnail_medium_url
          : value.image_url,
    category: (typeof value.category === "string" ? value.category : "custom") as Asset["category"],
    brand: typeof value.brand === "string" ? value.brand : undefined,
    source: "inventory",
    sourceUrl,
    metadata: metadata as Asset["metadata"],
  };
};

export function useWardrobeAssets() {
  const [remoteAssets, setRemoteAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const candidates = [
        "/v1/closet/items?page=1&page_size=60",
        "/v1/profile/closet/items?page=1&page_size=60",
        "/v1/assets?page=1&page_size=60",
      ];

      for (const endpoint of candidates) {
        const { response, data } = await apiFetchJson<{ items?: unknown[]; assets?: unknown[] }>(endpoint);
        if (!response.ok) {
          continue;
        }
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.assets) ? data.assets : [];
        setRemoteAssets(items.map(toAsset).filter((item): item is Asset => Boolean(item)));
        return;
      }

      setRemoteAssets([]);
    } catch {
      setRemoteAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return useMemo(
    () => ({
      loading,
      refresh,
      starterAssets: starterGarmentCatalog,
      remoteAssets,
      mergedAssets: [...starterGarmentCatalog, ...remoteAssets] as Array<StarterGarment | Asset>,
    }),
    [loading, refresh, remoteAssets],
  );
}
