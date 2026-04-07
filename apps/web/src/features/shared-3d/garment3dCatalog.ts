import type {
  Garment3dCatalogEntry,
  Garment3dColliderProfileDefinition,
  Garment3dSkeletonProfileDefinition,
} from './garment3dContract';

export const garment3dSkeletonProfiles = {
  'freestyle-humanoid-v1': {
    id: 'freestyle-humanoid-v1',
    label: 'FreeStyle humanoid v1',
    requiredBones: [
      'Hips',
      'Spine',
      'Spine1',
      'Spine2',
      'Neck',
      'Head',
      'LeftShoulder',
      'LeftArm',
      'LeftForeArm',
      'LeftHand',
      'RightShoulder',
      'RightArm',
      'RightForeArm',
      'RightHand',
      'LeftUpLeg',
      'LeftLeg',
      'LeftFoot',
      'RightUpLeg',
      'RightLeg',
      'RightFoot',
    ],
  },
} satisfies Record<string, Garment3dSkeletonProfileDefinition>;

export const garment3dColliderProfiles = {
  'torso-fitted-v1': {
    id: 'torso-fitted-v1',
    label: 'Torso fitted collider v1',
    supportedCategories: ['tops', 'outerwear'],
  },
  'lower-body-v1': {
    id: 'lower-body-v1',
    label: 'Lower body collider v1',
    supportedCategories: ['bottoms'],
  },
  'footwear-v1': {
    id: 'footwear-v1',
    label: 'Footwear collider v1',
    supportedCategories: ['shoes'],
  },
  'accessory-v1': {
    id: 'accessory-v1',
    label: 'Accessory collider v1',
    supportedCategories: ['accessories', 'custom'],
  },
} satisfies Record<string, Garment3dColliderProfileDefinition>;

export const garment3dCatalog: readonly Garment3dCatalogEntry[] = [
  {
    id: 'opensource-jacket-top-v1',
    label: 'Open Source Jacket (Top Layer)',
    modelPath: '/assets/props/polygonalmind-jacket.glb',
    metadata: {
      category: 'tops',
      sizeTag: 'M',
      boundsCm: {
        width: 58,
        height: 74,
        depth: 18,
      },
      skeletonProfile: {
        id: 'freestyle-humanoid-v1',
        requiredBones: [...garment3dSkeletonProfiles['freestyle-humanoid-v1'].requiredBones],
      },
      colliderProfile: 'torso-fitted-v1',
      unitScale: 1,
    },
    notes: 'Fallback open-source sample asset used for tops in skinned preview.',
  },
  {
    id: 'opensource-jacket-outer-v1',
    label: 'Open Source Jacket (Outer Layer)',
    modelPath: '/assets/props/polygonalmind-jacket.glb',
    metadata: {
      category: 'outerwear',
      sizeTag: 'M',
      boundsCm: {
        width: 62,
        height: 82,
        depth: 20,
      },
      skeletonProfile: {
        id: 'freestyle-humanoid-v1',
        requiredBones: [...garment3dSkeletonProfiles['freestyle-humanoid-v1'].requiredBones],
      },
      colliderProfile: 'torso-fitted-v1',
      unitScale: 1,
    },
    notes: 'Fallback open-source sample asset used for outerwear in skinned preview.',
  },
];

export const garment3dCatalogById = new Map(garment3dCatalog.map((entry) => [entry.id, entry] as const));

export const getGarment3dCatalogEntry = (id: string) => garment3dCatalogById.get(id) ?? null;
