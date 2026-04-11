"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createEmptyComposition,
  createLocalCanvasCompositionRepository,
} from "@freestyle/domain-canvas";
import type { BodyProfile, CanvasComposition, ClosetSceneState } from "@freestyle/shared-types";

const repository = createLocalCanvasCompositionRepository();

export function useCanvasCompositions(bodyProfile: BodyProfile, closetState: ClosetSceneState) {
  const [items, setItems] = useState<CanvasComposition[]>(() => repository.load());

  useEffect(() => {
    repository.saveAll(items);
  }, [items]);

  return useMemo(
    () => ({
      items,
      createFromCloset: (title: string, stageColor: string, itemIds: string[]) => {
        const next = createEmptyComposition({
          title,
          stageColor,
          bodyProfile,
          closetState,
          itemIds,
        });
        const saved = repository.upsert(next);
        setItems(saved);
        return next;
      },
      updateComposition: (next: CanvasComposition) => {
        const saved = repository.upsert(next);
        setItems(saved);
      },
      removeComposition: (id: string) => {
        const saved = repository.remove(id);
        setItems(saved);
      },
    }),
    [bodyProfile, closetState, items],
  );
}
