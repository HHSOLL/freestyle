'use client';

import { ClosetItemFittingLab } from '@/features/mannequin/ClosetItemFittingLab';
import { GameDressUpWorkbench } from '@/features/mannequin/GameDressUpWorkbench';

export default function ClosetPage() {
  return (
    <div className="space-y-6">
      <ClosetItemFittingLab compact />
      <GameDressUpWorkbench />
    </div>
  );
}
