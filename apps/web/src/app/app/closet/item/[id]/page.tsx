'use client';

import { useParams } from 'next/navigation';
import { ClosetItemFittingLab } from '@/features/mannequin/ClosetItemFittingLab';

export default function ClosetItemDetailPage() {
  const params = useParams<{ id: string }>();
  return <ClosetItemFittingLab assetId={params.id ?? ''} />;
}
