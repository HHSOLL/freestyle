'use client';

import { useMemo } from 'react';
import type { Asset, BodyProfile } from '@freestyle/contracts/domain-types';
import type { AvatarPresetId } from '@/features/shared-3d/avatarPresets';
import { MannequinScene3D } from './MannequinScene3D';
import {
  buildFittingLayers,
  type GarmentLayerConfig,
} from './fitting';
import type {
  FittingPoseId,
  WearableCategory,
} from './closetSceneConfig';
import { buildStageGarments } from './closetSceneConfig';

type FittingCanvas3DBaseProps = {
  body: BodyProfile;
  selectedAssetId: string | null;
  avatarId?: AvatarPresetId;
  poseId?: FittingPoseId;
};

type FittingCanvas3DProps =
  | (FittingCanvas3DBaseProps & {
      equippedAssets: Partial<Record<WearableCategory, Asset | null>>;
      layers?: never;
    })
  | (FittingCanvas3DBaseProps & {
      equippedAssets?: undefined;
      layers: GarmentLayerConfig[];
    });

export function FittingCanvas3D(props: FittingCanvas3DProps) {
  const { body, selectedAssetId, avatarId = 'muse', poseId = 'apose' } = props;

  const layers = useMemo(() => {
    if ('layers' in props) {
      return props.layers ?? [];
    }

    const slotAssets = Object.values(props.equippedAssets).filter(
      (asset): asset is Asset => Boolean(asset)
    );
    return buildFittingLayers(slotAssets, body);
  }, [body, props]);

  const stageGarments = useMemo(() => {
    if ('layers' in props) return [];
    return buildStageGarments(props.equippedAssets);
  }, [props]);

  return (
    <MannequinScene3D
      body={body}
      layers={layers}
      stageGarments={stageGarments}
      selectedAssetId={selectedAssetId}
      avatarId={avatarId}
      poseId={poseId}
    />
  );
}
