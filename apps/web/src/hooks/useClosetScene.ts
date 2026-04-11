"use client";

import { useEffect, useMemo, useState } from "react";
import {
  avatarPoseLibrary,
  createLocalClosetSceneRepository,
  defaultClosetSceneState,
} from "@freestyle/domain-avatar";
import {
  defaultEquippedItems,
  getCatalogByCategory,
  starterGarmentById,
  starterGarmentCatalog,
} from "@freestyle/domain-garment";
import type {
  AvatarPoseId,
  AvatarRenderVariantId,
  ClosetSceneState,
  GarmentCategory,
  QualityTier,
} from "@freestyle/shared-types";

const repository = createLocalClosetSceneRepository();

export function useClosetScene() {
  const [scene, setScene] = useState<ClosetSceneState>(() => {
    const next = repository.load();
    return {
      ...defaultClosetSceneState,
      ...next,
      equippedItemIds: {
        ...defaultEquippedItems,
        ...(next.equippedItemIds ?? {}),
      },
    };
  });

  useEffect(() => {
    repository.save(scene);
  }, [scene]);

  return useMemo(
    () => ({
      scene,
      poses: avatarPoseLibrary,
      catalog: starterGarmentCatalog,
      visibleCatalog: getCatalogByCategory(scene.activeCategory),
      equippedGarments: Object.values(scene.equippedItemIds)
        .map((id) => (id ? starterGarmentById.get(id) ?? null : null))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      setAvatarVariantId: (avatarVariantId: AvatarRenderVariantId) =>
        setScene((current) => ({ ...current, avatarVariantId })),
      setPose: (poseId: AvatarPoseId) => setScene((current) => ({ ...current, poseId })),
      setCategory: (activeCategory: GarmentCategory) => setScene((current) => ({ ...current, activeCategory })),
      setSelectedItemId: (selectedItemId: string | null) => setScene((current) => ({ ...current, selectedItemId })),
      setQualityTier: (qualityTier: QualityTier) => setScene((current) => ({ ...current, qualityTier })),
      equipItem: (category: GarmentCategory, itemId: string) =>
        setScene((current) => ({
          ...current,
          activeCategory: category,
          selectedItemId: itemId,
          equippedItemIds: {
            ...current.equippedItemIds,
            [category]: itemId,
          },
        })),
    }),
    [scene],
  );
}
