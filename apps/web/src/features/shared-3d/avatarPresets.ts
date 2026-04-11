export type AvatarPresetId = 'muse' | 'operator' | 'tailor';

export type AvatarPreset = {
  id: AvatarPresetId;
  label: { ko: string; en: string };
  description: { ko: string; en: string };
  modelPath: string;
  author: string;
  sourceUrl: string;
  license: 'CC0';
  tint: string;
  accent: string;
  scaleMultiplier: number;
  yOffset: number;
  zOffset: number;
  stageVariant: 'human' | 'mannequin';
};

export const avatarStorageKey = 'freestyle:avatar-preset';

export const avatarPresets: AvatarPreset[] = [
  {
    id: 'muse',
    label: { ko: 'Muse', en: 'Muse' },
    description: { ko: '여성형 avatar', en: 'Feminine avatar' },
    modelPath: '/assets/avatars/quaternius-animated-woman.glb',
    author: 'Quaternius',
    sourceUrl: 'https://poly.pizza/m/9kF7eTDbhO',
    license: 'CC0',
    tint: '#d7d0c7',
    accent: '#cdb28f',
    scaleMultiplier: 0.98,
    yOffset: 0,
    zOffset: 0,
    stageVariant: 'human',
  },
  {
    id: 'operator',
    label: { ko: 'Operator', en: 'Operator' },
    description: { ko: '남성형 avatar', en: 'Masculine avatar' },
    modelPath: '/assets/avatars/quaternius-man.glb',
    author: 'Quaternius',
    sourceUrl: 'https://poly.pizza/m/HMnuH5geEG',
    license: 'CC0',
    tint: '#d0cbc4',
    accent: '#9b876c',
    scaleMultiplier: 0.94,
    yOffset: 0,
    zOffset: 0,
    stageVariant: 'human',
  },
  {
    id: 'tailor',
    label: { ko: 'Tailor', en: 'Tailor' },
    description: { ko: '스튜디오 마네킹', en: 'Studio mannequin' },
    modelPath: '/assets/props/reyshapes-mannequin.glb',
    author: 'reyshapes',
    sourceUrl: 'https://poly.pizza/m/tYwjQJvcFX',
    license: 'CC0',
    tint: '#d8cec1',
    accent: '#c8b59e',
    scaleMultiplier: 1.06,
    yOffset: 0.04,
    zOffset: 0,
    stageVariant: 'mannequin',
  },
];

export const defaultAvatarPresetId: AvatarPresetId = 'muse';

export const avatarPresetMap = Object.fromEntries(avatarPresets.map((preset) => [preset.id, preset])) as Record<
  AvatarPresetId,
  AvatarPreset
>;

export const parseAvatarPresetId = (value: string | null | undefined): AvatarPresetId => {
  if (value && value in avatarPresetMap) {
    return value as AvatarPresetId;
  }
  return defaultAvatarPresetId;
};
