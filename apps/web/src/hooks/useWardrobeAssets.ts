"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createLocalPublishedGarmentRepository,
  mergeRuntimeGarmentCatalogs,
  starterGarmentCatalog,
} from "@freestyle/domain-garment";
import type { GarmentInstantFitReport } from "@freestyle/contracts";
import type { Asset, PublishedGarmentAsset, RuntimeGarmentAsset, StarterGarment } from "@freestyle/shared-types";
import { apiFetchJson, isClientApiConfigured } from "@/lib/clientApi";
import { parseClosetRuntimeGarmentCatalog } from "./publishedRuntimeGarment";

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

export function useWardrobeAssets() {
  const [remoteAssets, setRemoteAssets] = useState<Asset[]>([]);
  const [publishedAssets, setPublishedAssets] = useState<PublishedGarmentAsset[]>(() => publishedRepository.load());
  const [publishedInstantFitReportsById, setPublishedInstantFitReportsById] = useState<Record<string, GarmentInstantFitReport>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isClientApiConfigured) {
      setRemoteAssets([]);
      setPublishedAssets(publishedRepository.load());
      setPublishedInstantFitReportsById({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const runtimeCatalog = await apiFetchJson<unknown>("/v1/closet/runtime-garments");
      if (runtimeCatalog.response.ok) {
        const runtimeCatalogItems = Array.isArray((runtimeCatalog.data as { items?: unknown[] } | null | undefined)?.items)
          ? ((runtimeCatalog.data as { items?: unknown[] }).items ?? [])
          : [];
        const { items: published, instantFitById } = parseClosetRuntimeGarmentCatalog(runtimeCatalog.data);

        if (runtimeCatalogItems.length === 0 || published.length > 0) {
          setPublishedAssets(published);
          setPublishedInstantFitReportsById(instantFitById);
          publishedRepository.save(published);
        } else {
          setPublishedAssets(publishedRepository.load());
          setPublishedInstantFitReportsById({});
        }
      } else {
        setPublishedAssets(publishedRepository.load());
        setPublishedInstantFitReportsById({});
      }

      const { response, data } = await apiFetchJson<{ items?: unknown[]; assets?: unknown[] }>(
        "/v1/closet/items?page=1&page_size=60",
      );
      if (response.ok) {
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.assets) ? data.assets : [];
        setRemoteAssets(items.map(toAsset).filter((item): item is Asset => Boolean(item)));
        return;
      }

      setRemoteAssets([]);
      setPublishedAssets(publishedRepository.load());
      setPublishedInstantFitReportsById({});
    } catch {
      setRemoteAssets([]);
      setPublishedAssets(publishedRepository.load());
      setPublishedInstantFitReportsById({});
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
      publishedInstantFitReportsById,
      closetRuntimeAssets: mergeRuntimeGarmentCatalogs(starterGarmentCatalog, publishedAssets),
      remoteAssets,
      mergedAssets: [...starterGarmentCatalog, ...publishedAssets, ...remoteAssets] as Array<StarterGarment | Asset>,
      runtimeAssets: [...starterGarmentCatalog, ...publishedAssets] as RuntimeGarmentAsset[],
    }),
    [loading, publishedAssets, publishedInstantFitReportsById, refresh, remoteAssets],
  );
}
