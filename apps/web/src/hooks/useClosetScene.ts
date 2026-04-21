"use client";

import { useEffect, useMemo, useState } from "react";
import {
  avatarPoseLibrary,
  createLocalClosetSceneRepository,
  defaultClosetSceneState,
} from "@freestyle/domain-avatar";
import {
  createRuntimeGarmentLookup,
  getCatalogByCategory,
  resolveLayeredEquippedItemIds,
  resolveDefaultClosetLoadout,
  starterGarmentCatalog,
} from "@freestyle/domain-garment";
import type {
  AvatarPoseId,
  AvatarRenderVariantId,
  ClosetSceneState,
  GarmentCategory,
  QualityTier,
  RuntimeGarmentAsset,
} from "@freestyle/shared-types";

const repository = createLocalClosetSceneRepository();

export function useClosetScene(catalog: RuntimeGarmentAsset[] = starterGarmentCatalog) {
  const catalogLookup = useMemo(() => createRuntimeGarmentLookup(catalog), [catalog]);
  const [scene, setScene] = useState<ClosetSceneState>(() => {
    const next = repository.load();
    const initialVariantId = next.avatarVariantId ?? defaultClosetSceneState.avatarVariantId;
    const defaultLoadout = resolveDefaultClosetLoadout(initialVariantId);
    return {
      ...defaultClosetSceneState,
      ...next,
      equippedItemIds: {
        ...defaultLoadout,
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
      catalog,
      visibleCatalog: getCatalogByCategory(scene.activeCategory, catalog),
      equippedGarments: Object.values(scene.equippedItemIds)
        .map((id) => (id ? catalogLookup.get(id) ?? null : null))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      setAvatarVariantId: (avatarVariantId: AvatarRenderVariantId) =>
        setScene((current) => (current.avatarVariantId === avatarVariantId ? current : { ...current, avatarVariantId })),
      setPose: (poseId: AvatarPoseId) => setScene((current) => (current.poseId === poseId ? current : { ...current, poseId })),
      setCategory: (activeCategory: GarmentCategory) =>
        setScene((current) => (current.activeCategory === activeCategory ? current : { ...current, activeCategory })),
      setSelectedItemId: (selectedItemId: string | null) =>
        setScene((current) => (current.selectedItemId === selectedItemId ? current : { ...current, selectedItemId })),
      setQualityTier: (qualityTier: QualityTier) =>
        setScene((current) => (current.qualityTier === qualityTier ? current : { ...current, qualityTier })),
      clearCategory: (category: GarmentCategory) =>
        setScene((current) => {
          if (!current.equippedItemIds[category] && current.activeCategory === category && current.selectedItemId === null) {
            return current;
          }
          const nextEquipped = { ...current.equippedItemIds };
          delete nextEquipped[category];
          return {
            ...current,
            activeCategory: category,
            selectedItemId: null,
            equippedItemIds: nextEquipped,
          };
        }),
      equipItem: (category: GarmentCategory, itemId: string) =>
        setScene((current) => {
          if (
            current.equippedItemIds[category] === itemId &&
            current.activeCategory === category &&
            current.selectedItemId === itemId
          ) {
            return current;
          }
          const nextEquipped = resolveLayeredEquippedItemIds(
            current.equippedItemIds,
            category,
            itemId,
            catalogLookup,
          );
          return {
            ...current,
            activeCategory: category,
            selectedItemId: itemId,
            equippedItemIds: nextEquipped,
          };
        }),
    }),
    [catalog, catalogLookup, scene],
  );
}
