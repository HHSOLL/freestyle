'use client';

import { FittingCanvas3D } from '@/features/mannequin/FittingCanvas3D';
import type { AvatarPresetId } from '@/features/shared-3d/avatarPresets';
import type { BodyProfile, GarmentLayerConfig } from '../fitting';
import type { FittingPoseId } from '@/features/mannequin/closetSceneConfig';

type MannequinScene3DProps = {
  body: BodyProfile;
  layers: GarmentLayerConfig[];
  selectedAssetId: string | null;
  avatarId?: AvatarPresetId;
  poseId?: FittingPoseId;
};

export function MannequinScene3D({ body, layers, selectedAssetId, avatarId, poseId }: MannequinScene3DProps) {
  return <FittingCanvas3D body={body} layers={layers} selectedAssetId={selectedAssetId} avatarId={avatarId} poseId={poseId} />;
}
