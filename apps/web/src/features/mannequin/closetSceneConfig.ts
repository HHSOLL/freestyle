import type { Asset, AssetCategory, AssetSource } from '@freestyle/contracts/domain-types';
import type { AvatarPresetId } from '@/features/shared-3d/avatarPresets';

export const wearableCategories = ['tops', 'outerwear', 'bottoms', 'shoes'] as const;
export type WearableCategory = (typeof wearableCategories)[number];
export type BodyGender = 'female' | 'male';
export type FittingPoseId = 'apose' | 'tpose' | 'relaxed' | 'contrapposto' | 'walk' | 'handsonhips';

export type GarmentTemplate = {
  id: string;
  category: WearableCategory;
  label: { ko: string; en: string };
  modelPath: string;
};

export type StageGarment = {
  assetId: string;
  assetName: string;
  category: WearableCategory;
  modelPath: string;
  color: string;
};

export const posePresets: Array<{ id: FittingPoseId; label: { ko: string; en: string } }> = [
  { id: 'apose', label: { ko: 'A-포즈', en: 'A-pose' } },
  { id: 'tpose', label: { ko: 'T-포즈', en: 'T-pose' } },
  { id: 'relaxed', label: { ko: '릴랙스', en: 'Relaxed' } },
  { id: 'contrapposto', label: { ko: '콘트라포스토', en: 'Contrapposto' } },
  { id: 'walk', label: { ko: '워크', en: 'Walk' } },
  { id: 'handsonhips', label: { ko: '핸즈온힙', en: 'Hands on hips' } },
];

export const genderAvatarMap: Record<BodyGender, AvatarPresetId> = {
  female: 'muse',
  male: 'operator',
};

export const avatarGenderMap: Record<AvatarPresetId, BodyGender> = {
  muse: 'female',
  operator: 'male',
  tailor: 'female',
};

export const genderBaseMeasurements = {
  female: {
    heightCm: 166,
    shoulderCm: 40,
    chestCm: 88,
    waistCm: 70,
    hipCm: 95,
    inseamCm: 79,
  },
  male: {
    heightCm: 178,
    shoulderCm: 46,
    chestCm: 98,
    waistCm: 82,
    hipCm: 98,
    inseamCm: 84,
  },
} as const;

export const garmentTemplates: GarmentTemplate[] = [
  {
    id: 'top-shirt',
    category: 'tops',
    label: { ko: '셔츠 베이스', en: 'Shirt base' },
    modelPath: '/assets/closet/models/top_shirt.glb',
  },
  {
    id: 'top-tee',
    category: 'tops',
    label: { ko: '티 베이스', en: 'Tee base' },
    modelPath: '/assets/closet/models/top_tee.glb',
  },
  {
    id: 'outer-bomber',
    category: 'outerwear',
    label: { ko: '봄버 베이스', en: 'Bomber base' },
    modelPath: '/assets/closet/models/outer_bomber.glb',
  },
  {
    id: 'outer-blazer',
    category: 'outerwear',
    label: { ko: '블레이저 베이스', en: 'Blazer base' },
    modelPath: '/assets/closet/models/outer_blazer.glb',
  },
  {
    id: 'outer-coat',
    category: 'outerwear',
    label: { ko: '코트 베이스', en: 'Coat base' },
    modelPath: '/assets/closet/models/outer_coat.glb',
  },
  {
    id: 'bottom-cargo',
    category: 'bottoms',
    label: { ko: '카고 베이스', en: 'Cargo base' },
    modelPath: '/assets/closet/models/bottom_cargo.glb',
  },
  {
    id: 'bottom-denim',
    category: 'bottoms',
    label: { ko: '데님 베이스', en: 'Denim base' },
    modelPath: '/assets/closet/models/bottom_denim.glb',
  },
  {
    id: 'bottom-shorts',
    category: 'bottoms',
    label: { ko: '쇼츠 베이스', en: 'Shorts base' },
    modelPath: '/assets/closet/models/bottom_shorts.glb',
  },
  {
    id: 'shoes-sneaker',
    category: 'shoes',
    label: { ko: '스니커즈 베이스', en: 'Sneaker base' },
    modelPath: '/assets/closet/models/shoes_sneaker.glb',
  },
  {
    id: 'shoes-boot',
    category: 'shoes',
    label: { ko: '부츠 베이스', en: 'Boot base' },
    modelPath: '/assets/closet/models/shoes_boot.glb',
  },
  {
    id: 'shoes-runner',
    category: 'shoes',
    label: { ko: '러너 베이스', en: 'Runner base' },
    modelPath: '/assets/closet/models/shoes_runner.glb',
  },
];

export const garmentTemplateMap = Object.fromEntries(garmentTemplates.map((template) => [template.id, template])) as Record<
  string,
  GarmentTemplate
>;

const categoryFallbackTemplates: Record<WearableCategory, string> = {
  tops: 'top-shirt',
  outerwear: 'outer-bomber',
  bottoms: 'bottom-denim',
  shoes: 'shoes-sneaker',
};

const categoryKeywords: Record<WearableCategory, Array<{ templateId: string; terms: string[] }>> = {
  tops: [
    { templateId: 'top-tee', terms: ['tee', 'tshirt', 't-shirt', 'jersey', '니트', '티', '티셔츠', '스웨트'] },
    { templateId: 'top-shirt', terms: ['shirt', '셔츠', 'blouse', 'blazer shirt'] },
  ],
  outerwear: [
    { templateId: 'outer-coat', terms: ['coat', '코트', 'trench', '파카', '롱'] },
    { templateId: 'outer-bomber', terms: ['bomber', '봄버', 'zip', '후드', 'hood'] },
    { templateId: 'outer-blazer', terms: ['blazer', '블레이저', 'tailored', 'suit jacket', '재킷'] },
  ],
  bottoms: [
    { templateId: 'bottom-shorts', terms: ['short', '쇼츠', 'shorts', 'half', '반바지'] },
    { templateId: 'bottom-cargo', terms: ['cargo', '카고', 'utility', 'work'] },
    { templateId: 'bottom-denim', terms: ['denim', 'jean', 'jeans', '데님', '청바지', 'slack', 'trouser', '팬츠'] },
  ],
  shoes: [
    { templateId: 'shoes-boot', terms: ['boot', '부츠'] },
    { templateId: 'shoes-runner', terms: ['runner', 'running', 'sport', '러너', '운동화'] },
    { templateId: 'shoes-sneaker', terms: ['sneaker', 'sneakers', '스니커', 'loafer', 'shoe', 'shoes'] },
  ],
};

const categoryDefaults: Record<WearableCategory, { color: string; label: string }> = {
  tops: { color: '#e0d0bf', label: 'Layer 01' },
  outerwear: { color: '#766c61', label: 'Layer 02' },
  bottoms: { color: '#4f5764', label: 'Layer 03' },
  shoes: { color: '#2b2f35', label: 'Layer 04' },
};

const demoCatalog: Array<{
  id: string;
  name: string;
  category: WearableCategory;
  color: string;
  brand: string;
  dominantColor: string;
  source: AssetSource;
}> = [
  { id: 'demo-top-shirt', name: 'Studio Stripe Shirt', category: 'tops', color: '#d6cab7', brand: 'FreeStyle Lab', dominantColor: '#d6cab7', source: 'inventory' },
  { id: 'demo-top-tee', name: 'Studio Graphic Tee', category: 'tops', color: '#eadbcf', brand: 'FreeStyle Lab', dominantColor: '#eadbcf', source: 'inventory' },
  { id: 'demo-outer-bomber', name: 'Studio Bomber', category: 'outerwear', color: '#585048', brand: 'FreeStyle Lab', dominantColor: '#585048', source: 'inventory' },
  { id: 'demo-outer-blazer', name: 'Studio Blazer', category: 'outerwear', color: '#7f7568', brand: 'FreeStyle Lab', dominantColor: '#7f7568', source: 'inventory' },
  { id: 'demo-outer-coat', name: 'Studio Long Coat', category: 'outerwear', color: '#8f8b84', brand: 'FreeStyle Lab', dominantColor: '#8f8b84', source: 'inventory' },
  { id: 'demo-bottom-cargo', name: 'Studio Cargo Pants', category: 'bottoms', color: '#5f6753', brand: 'FreeStyle Lab', dominantColor: '#5f6753', source: 'inventory' },
  { id: 'demo-bottom-denim', name: 'Studio Denim', category: 'bottoms', color: '#4f5a6b', brand: 'FreeStyle Lab', dominantColor: '#4f5a6b', source: 'inventory' },
  { id: 'demo-bottom-shorts', name: 'Studio Shorts', category: 'bottoms', color: '#8d806d', brand: 'FreeStyle Lab', dominantColor: '#8d806d', source: 'inventory' },
  { id: 'demo-shoes-sneaker', name: 'Studio Sneakers', category: 'shoes', color: '#f5f3ef', brand: 'FreeStyle Lab', dominantColor: '#f5f3ef', source: 'inventory' },
  { id: 'demo-shoes-boot', name: 'Studio Boots', category: 'shoes', color: '#312927', brand: 'FreeStyle Lab', dominantColor: '#312927', source: 'inventory' },
  { id: 'demo-shoes-runner', name: 'Studio Runner', category: 'shoes', color: '#bfc5d0', brand: 'FreeStyle Lab', dominantColor: '#bfc5d0', source: 'inventory' },
];

const svgLabel = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const makeThumbnailDataUri = (label: string, color: string) => {
  const encoded = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#faf7f2"/>
          <stop offset="100%" stop-color="${color}"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="22" fill="url(#bg)"/>
      <rect x="18" y="18" width="84" height="84" rx="18" fill="rgba(255,255,255,0.65)"/>
      <circle cx="60" cy="44" r="15" fill="rgba(22,26,34,0.12)"/>
      <path d="M38 95c2-20 12-30 22-30s20 10 22 30" fill="rgba(22,26,34,0.12)"/>
      <text x="60" y="108" text-anchor="middle" font-size="11" fill="#1e2430" font-family="Arial, sans-serif">${svgLabel(label)}</text>
    </svg>
  `);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
};

export const demoClosetAssets: Asset[] = demoCatalog.map((entry) => ({
  id: entry.id,
  name: entry.name,
  imageSrc: makeThumbnailDataUri(categoryDefaults[entry.category].label, entry.color),
  category: entry.category,
  brand: entry.brand,
  source: entry.source,
  removedBackground: true,
  metadata: {
    sourceTitle: entry.name,
    sourceBrand: entry.brand,
    cutout: { removedBackground: true },
    dominantColor: entry.dominantColor,
  },
}));

export const defaultDemoEquippedBySlot: Record<WearableCategory, string> = {
  tops: 'demo-top-shirt',
  outerwear: 'demo-outer-bomber',
  bottoms: 'demo-bottom-denim',
  shoes: 'demo-shoes-sneaker',
};

export const defaultDemoClosetAssetId = defaultDemoEquippedBySlot.outerwear;
export const demoClosetActiveAssetIds = Object.values(defaultDemoEquippedBySlot);

export const isWearableCategory = (category: AssetCategory): category is WearableCategory =>
  wearableCategories.includes(category as WearableCategory);

const sanitizeColor = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;
  const match = value.trim().match(/^#([0-9a-f]{6})$/i);
  return match ? `#${match[1]}` : fallback;
};

export const resolveAssetColor = (asset: Asset) =>
  sanitizeColor(asset.metadata?.dominantColor, categoryDefaults[asset.category as WearableCategory]?.color ?? '#d8d0c8');

export const resolveGarmentTemplate = (asset: Asset): GarmentTemplate => {
  const category = isWearableCategory(asset.category) ? asset.category : 'tops';
  const haystack = [asset.name, asset.brand, asset.metadata?.sourceTitle]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matchedTemplate = categoryKeywords[category]
    .find((entry) => entry.terms.some((term) => haystack.includes(term)))
    ?.templateId;

  const fitProfile = asset.metadata?.fitProfile;
  if (!matchedTemplate && category === 'outerwear') {
    if ((asset.metadata?.measurements?.lengthCm ?? 0) > 90) return garmentTemplateMap['outer-coat'];
    if (fitProfile?.structure === 'structured') return garmentTemplateMap['outer-blazer'];
  }
  if (!matchedTemplate && category === 'bottoms') {
    if ((asset.metadata?.measurements?.inseamCm ?? 0) < 52) return garmentTemplateMap['bottom-shorts'];
    if (fitProfile?.silhouette === 'relaxed' || fitProfile?.silhouette === 'oversized') return garmentTemplateMap['bottom-cargo'];
  }
  if (!matchedTemplate && category === 'tops' && fitProfile?.silhouette === 'oversized') {
    return garmentTemplateMap['top-tee'];
  }

  return garmentTemplateMap[matchedTemplate ?? categoryFallbackTemplates[category]];
};

export const buildStageGarments = (equippedAssets: Partial<Record<WearableCategory, Asset | null>>): StageGarment[] =>
  wearableCategories
    .map((category) => equippedAssets[category] ?? null)
    .filter((asset): asset is Asset => Boolean(asset))
    .filter((asset): asset is Asset & { category: WearableCategory } => isWearableCategory(asset.category))
    .map((asset) => ({
      assetId: asset.id,
      assetName: asset.name,
      category: asset.category,
      modelPath: resolveGarmentTemplate(asset).modelPath,
      color: resolveAssetColor(asset),
    }));
