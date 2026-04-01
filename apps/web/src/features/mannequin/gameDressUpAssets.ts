export type DressUpSlot = 'head' | 'body' | 'legs' | 'feet';
export type DressUpStyleId = 'Casual' | 'Suit' | 'Witch' | 'Worker';

type LocalizedLabel = {
  ko: string;
  en: string;
};

export type DressUpStyle = {
  id: DressUpStyleId;
  label: LocalizedLabel;
  description: LocalizedLabel;
  accent: string;
  glow: string;
  modelPath: string;
  meshNames: Record<DressUpSlot, string>;
};

export const dressUpSlots: Array<{ id: DressUpSlot; label: LocalizedLabel }> = [
  { id: 'head', label: { ko: '헤드', en: 'Head' } },
  { id: 'body', label: { ko: '토르소', en: 'Torso' } },
  { id: 'legs', label: { ko: '레그', en: 'Legs' } },
  { id: 'feet', label: { ko: '풋', en: 'Feet' } },
];

export const dressUpStyles: DressUpStyle[] = [
  {
    id: 'Casual',
    label: { ko: '캐주얼', en: 'Casual' },
    description: { ko: '데일리 무드의 기본 세트', en: 'A relaxed everyday kit.' },
    accent: '#7f8fbd',
    glow: 'rgba(127, 143, 189, 0.42)',
    modelPath: '/models/quaternius/Casual.fbx',
    meshNames: {
      head: 'Casual_Head',
      body: 'Casual_Body',
      legs: 'Casual_Legs',
      feet: 'Casual_Feet',
    },
  },
  {
    id: 'Suit',
    label: { ko: '수트', en: 'Suit' },
    description: { ko: '깔끔한 포멀 실루엣', en: 'A sharp formal silhouette.' },
    accent: '#c8a56a',
    glow: 'rgba(200, 165, 106, 0.42)',
    modelPath: '/models/quaternius/Suit.fbx',
    meshNames: {
      head: 'Suit_Head',
      body: 'Suit_Body',
      legs: 'Suit_Legs',
      feet: 'Suit_Feet',
    },
  },
  {
    id: 'Witch',
    label: { ko: '위치', en: 'Witch' },
    description: { ko: '드라마틱한 헤드와 코르셋 라인', en: 'Dramatic headwear and a corseted body line.' },
    accent: '#8d7cff',
    glow: 'rgba(141, 124, 255, 0.42)',
    modelPath: '/models/quaternius/Witch.fbx',
    meshNames: {
      head: 'Witch_Head',
      body: 'Witch_Body',
      legs: 'Witch_Legs',
      feet: 'Witch_Feet',
    },
  },
  {
    id: 'Worker',
    label: { ko: '워커', en: 'Worker' },
    description: { ko: '실용적인 작업복 베이스', en: 'A practical workwear base.' },
    accent: '#c86e52',
    glow: 'rgba(200, 110, 82, 0.4)',
    modelPath: '/models/quaternius/Worker.fbx',
    meshNames: {
      head: 'Worker_Head',
      body: 'Worker_Body',
      legs: 'Worker_Legs',
      feet: 'Worker_Feet',
    },
  },
];

export const dressUpStylesById = Object.fromEntries(
  dressUpStyles.map((style) => [style.id, style])
) as Record<DressUpStyleId, DressUpStyle>;

export type EquippedDressUp = Record<DressUpSlot, DressUpStyleId>;

export const defaultDressUpSelection: EquippedDressUp = {
  head: 'Suit',
  body: 'Suit',
  legs: 'Suit',
  feet: 'Suit',
};
