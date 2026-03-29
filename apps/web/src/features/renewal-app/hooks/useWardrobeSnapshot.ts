'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetchJson, getApiErrorMessage } from '@/lib/clientApi';
import { summarizeCloset, toWardrobeAsset, toWardrobeLook, type WardrobeAsset, type WardrobeLook } from '@/features/renewal-app/data';

type WardrobeSnapshot = {
  looks: WardrobeLook[];
  assets: WardrobeAsset[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteLook: (id: string) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
};

export function useWardrobeSnapshot(): WardrobeSnapshot {
  const [looks, setLooks] = useState<WardrobeLook[]>([]);
  const [assets, setAssets] = useState<WardrobeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [{ response: looksRes, data: looksData }, { response: assetsRes, data: assetsData }] = await Promise.all([
        apiFetchJson<{ outfits?: unknown[] }>('/v1/outfits'),
        apiFetchJson<{ items?: unknown[]; assets?: unknown[] }>('/v1/assets?page=1&page_size=200'),
      ]);

      if (looksRes.ok && Array.isArray(looksData?.outfits)) {
        setLooks(looksData.outfits.map(toWardrobeLook).filter((item): item is WardrobeLook => Boolean(item)));
      } else {
        setLooks([]);
      }

      const rawAssets = Array.isArray(assetsData?.items) ? assetsData.items : Array.isArray(assetsData?.assets) ? assetsData.assets : [];
      if (assetsRes.ok && Array.isArray(rawAssets)) {
        setAssets(rawAssets.map(toWardrobeAsset).filter((item): item is WardrobeAsset => Boolean(item)));
      } else {
        setAssets([]);
      }
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Failed to load wardrobe data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const deleteLook = useCallback(async (id: string) => {
    const { response, data } = await apiFetchJson<Record<string, unknown>>(`/v1/outfits/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(getApiErrorMessage(data, 'Failed to delete look.'));
    }
    setLooks((current) => current.filter((item) => item.id !== id));
  }, []);

  const deleteAsset = useCallback(async (id: string) => {
    const { response, data } = await apiFetchJson<Record<string, unknown>>(`/v1/assets/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(getApiErrorMessage(data, 'Failed to delete asset.'));
    }
    setAssets((current) => current.filter((item) => item.id !== id));
  }, []);

  return useMemo(
    () => ({
      looks,
      assets,
      loading,
      error,
      refresh,
      deleteLook,
      deleteAsset,
    }),
    [looks, assets, loading, error, refresh, deleteLook, deleteAsset]
  );
}

export { summarizeCloset };
