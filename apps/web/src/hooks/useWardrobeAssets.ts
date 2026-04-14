"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createLocalPublishedGarmentRepository,
  mergeRuntimeGarmentCatalogs,
  starterGarmentCatalog,
  validatePublishedGarmentAsset,
} from "@freestyle/domain-garment";
import type { Asset, PublishedGarmentAsset, RuntimeGarmentAsset, StarterGarment } from "@freestyle/shared-types";
import { apiFetchJson, isClientApiConfigured } from "@/lib/clientApi";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const publishedRepository = createLocalPublishedGarmentRepository();

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

const toPublishedRuntimeGarment = (value: unknown): PublishedGarmentAsset | null => {
  if (!isRecord(value)) return null;
  const base = toAsset(value);
  const runtime = isRecord(value.runtime) ? (value.runtime as PublishedGarmentAsset["runtime"]) : null;
  const publication = isRecord(value.publication)
    ? (value.publication as PublishedGarmentAsset["publication"])
    : null;
  const palette = Array.isArray(value.palette) ? value.palette.filter((entry): entry is string => typeof entry === "string") : [];

  if (!base || !runtime || palette.length === 0 || !publication) {
    return null;
  }

  const published: PublishedGarmentAsset = {
    ...base,
    source: base.source === "import" ? "import" : "inventory",
    runtime,
    palette,
    publication,
  };

  return validatePublishedGarmentAsset(published).length === 0 ? published : null;
};

export function useWardrobeAssets() {
  const [remoteAssets, setRemoteAssets] = useState<Asset[]>([]);
  const [publishedAssets, setPublishedAssets] = useState<PublishedGarmentAsset[]>(() => publishedRepository.load());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isClientApiConfigured) {
      setRemoteAssets([]);
      setPublishedAssets(publishedRepository.load());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const runtimeCatalog = await apiFetchJson<{ items?: unknown[] }>("/v1/closet/runtime-garments");
      if (runtimeCatalog.response.ok) {
        const items = Array.isArray(runtimeCatalog.data?.items) ? runtimeCatalog.data.items : [];
        const published = items
          .map(toPublishedRuntimeGarment)
          .filter((item): item is PublishedGarmentAsset => Boolean(item));

        if (items.length === 0 || published.length > 0) {
          setPublishedAssets(published);
          publishedRepository.save(published);
        } else {
          setPublishedAssets(publishedRepository.load());
        }
      } else {
        setPublishedAssets(publishedRepository.load());
      }

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
      setPublishedAssets(publishedRepository.load());
    } catch {
      setRemoteAssets([]);
      setPublishedAssets(publishedRepository.load());
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
      publishedAssets,
      closetRuntimeAssets: mergeRuntimeGarmentCatalogs(starterGarmentCatalog, publishedAssets),
      remoteAssets,
      mergedAssets: [...starterGarmentCatalog, ...publishedAssets, ...remoteAssets] as Array<StarterGarment | Asset>,
      runtimeAssets: [...starterGarmentCatalog, ...publishedAssets] as RuntimeGarmentAsset[],
    }),
    [loading, publishedAssets, refresh, remoteAssets],
  );
}
