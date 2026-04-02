'use client';

import { FittingCanvas3D } from '@/features/mannequin/FittingCanvas3D';
import type { AvatarPresetId } from '@/features/shared-3d/avatarPresets';
import type { BodyProfile, GarmentLayerConfig } from '../fitting';

type MannequinScene3DProps = {
  body: BodyProfile;
  layers: GarmentLayerConfig[];
  selectedAssetId: string | null;
  avatarId?: AvatarPresetId;
};

export function MannequinScene3D({ body, layers, selectedAssetId, avatarId }: MannequinScene3DProps) {
  return <FittingCanvas3D body={body} layers={layers} selectedAssetId={selectedAssetId} avatarId={avatarId} />;
}
