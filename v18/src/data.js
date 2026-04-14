export const GENDER_BASE_MEASUREMENTS_CM = {
  male: {
    height: 178,
    headCircumference: 57,
    shoulderWidth: 46,
    waist: 80,
    legLength: 85,
    armLength: 63,
  },
  female: {
    height: 166,
    headCircumference: 55,
    shoulderWidth: 40,
    waist: 70,
    legLength: 79,
    armLength: 58,
  },
}

const EMPTY_ITEM = (id, category, name) => ({
  id,
  category,
  name,
  subtitle: '착용 안 함',
  modelUrl: '/assets/models/empty.glb',
})

export const TOP_ITEMS = [
  EMPTY_ITEM('top_none', '상의', '상의 제거'),
  { id: 'top_shirt', category: '상의', name: '블루 스트라이프 셔츠', subtitle: '분리형 GLB · 상의', modelUrl: '/assets/models/top_shirt.glb' },
  { id: 'top_tee', category: '상의', name: '그래픽 티셔츠', subtitle: '분리형 GLB · 상의', modelUrl: '/assets/models/top_tee.glb' },
]

export const OUTERWEAR_ITEMS = [
  EMPTY_ITEM('outer_none', '외투', '외투 제거'),
  { id: 'outer_bomber', category: '외투', name: '블랙 봄버 재킷', subtitle: '분리형 GLB · 외투', modelUrl: '/assets/models/outer_bomber.glb' },
  { id: 'outer_blazer', category: '외투', name: '소프트 블레이저', subtitle: '분리형 GLB · 외투', modelUrl: '/assets/models/outer_blazer.glb' },
  { id: 'outer_coat', category: '외투', name: '롱 코트', subtitle: '분리형 GLB · 외투', modelUrl: '/assets/models/outer_coat.glb' },
]

export const BOTTOM_ITEMS = [
  EMPTY_ITEM('bottom_none', '하의', '하의 제거'),
  { id: 'bottom_cargo', category: '하의', name: '올리브 카고 팬츠', subtitle: '분리형 GLB · 하의', modelUrl: '/assets/models/bottom_cargo.glb' },
  { id: 'bottom_denim', category: '하의', name: '데님 와이드 팬츠', subtitle: '분리형 GLB · 하의', modelUrl: '/assets/models/bottom_denim.glb' },
  { id: 'bottom_shorts', category: '하의', name: '카멜 쇼츠', subtitle: '분리형 GLB · 하의', modelUrl: '/assets/models/bottom_shorts.glb' },
]

export const SHOE_ITEMS = [
  EMPTY_ITEM('shoes_none', '신발', '신발 제거'),
  { id: 'shoes_sneaker', category: '신발', name: '모노톤 스니커즈', subtitle: '분리형 GLB · 신발', modelUrl: '/assets/models/shoes_sneaker.glb' },
  { id: 'shoes_boot', category: '신발', name: '미드 부츠', subtitle: '분리형 GLB · 신발', modelUrl: '/assets/models/shoes_boot.glb' },
  { id: 'shoes_runner', category: '신발', name: '러너 슈즈', subtitle: '분리형 GLB · 신발', modelUrl: '/assets/models/shoes_runner.glb' },
]

export const INITIAL_SELECTION = {
  top: TOP_ITEMS[2],
  outerwear: OUTERWEAR_ITEMS[0],
  bottom: BOTTOM_ITEMS[2],
  shoes: SHOE_ITEMS[1],
}

export const POSE_TEMPLATES = [
  { id: 'apose', category: '포즈', name: 'A-포즈', subtitle: '기본 의상 확인용' },
  { id: 'tpose', category: '포즈', name: 'T-포즈', subtitle: '실루엣 점검용' },
  { id: 'relaxed', category: '포즈', name: '릴랙스', subtitle: '정면 캐주얼' },
  { id: 'contrapposto', category: '포즈', name: '콘트라포스토', subtitle: '체중 이동 포즈' },
  { id: 'walk', category: '포즈', name: '워크', subtitle: '보행 시작 포즈' },
  { id: 'handsonhips', category: '포즈', name: '핸즈온힙', subtitle: '핏 강조 포즈' },
]

export const MEASUREMENT_PRESETS = {
  male: [
    {
      key: 'male_standard',
      label: '남성 기본',
      measurements: { height: 178, headCircumference: 57, shoulderWidth: 46, waist: 80, legLength: 85, armLength: 63 },
    },
    {
      key: 'male_slim',
      label: '남성 슬림',
      measurements: { height: 181, headCircumference: 56, shoulderWidth: 43.5, waist: 73, legLength: 88, armLength: 64 },
    },
    {
      key: 'male_broad',
      label: '남성 와이드',
      measurements: { height: 180, headCircumference: 58, shoulderWidth: 51, waist: 88, legLength: 85, armLength: 64 },
    },
  ],
  female: [
    {
      key: 'female_standard',
      label: '여성 기본',
      measurements: { height: 166, headCircumference: 55, shoulderWidth: 40, waist: 70, legLength: 79, armLength: 58 },
    },
    {
      key: 'female_slim',
      label: '여성 슬림',
      measurements: { height: 168, headCircumference: 54, shoulderWidth: 38.5, waist: 66, legLength: 81, armLength: 59 },
    },
    {
      key: 'female_tall',
      label: '여성 장신',
      measurements: { height: 173, headCircumference: 56, shoulderWidth: 41.5, waist: 72, legLength: 84, armLength: 60 },
    },
  ],
}

export const MANNEQUIN_PRESETS = [
  {
    id: 'female_standard',
    category: '마네킹',
    name: '여성 기본',
    subtitle: '로컬 피팅 바디',
    gender: 'female',
    measurements: MEASUREMENT_PRESETS.female[0].measurements,
  },
  {
    id: 'female_slim',
    category: '마네킹',
    name: '여성 슬림',
    subtitle: '로컬 피팅 바디',
    gender: 'female',
    measurements: MEASUREMENT_PRESETS.female[1].measurements,
  },
  {
    id: 'female_tall',
    category: '마네킹',
    name: '여성 장신',
    subtitle: '로컬 피팅 바디',
    gender: 'female',
    measurements: MEASUREMENT_PRESETS.female[2].measurements,
  },
  {
    id: 'male_standard',
    category: '마네킹',
    name: '남성 기본',
    subtitle: '로컬 피팅 바디',
    gender: 'male',
    measurements: MEASUREMENT_PRESETS.male[0].measurements,
  },
  {
    id: 'male_slim',
    category: '마네킹',
    name: '남성 슬림',
    subtitle: '로컬 피팅 바디',
    gender: 'male',
    measurements: MEASUREMENT_PRESETS.male[1].measurements,
  },
  {
    id: 'male_broad',
    category: '마네킹',
    name: '남성 와이드',
    subtitle: '로컬 피팅 바디',
    gender: 'male',
    measurements: MEASUREMENT_PRESETS.male[2].measurements,
  },
]

export const FIELD_DEFS = [
  { key: 'height', label: '키', unit: 'cm', unitInch: 'in', min: 140, max: 220, step: 0.5 },
  { key: 'headCircumference', label: '머리둘레', unit: 'cm', unitInch: 'in', min: 48, max: 68, step: 0.1 },
  { key: 'shoulderWidth', label: '어깨너비', unit: 'cm', unitInch: 'in', min: 34, max: 64, step: 0.1 },
  { key: 'waist', label: '허리둘레', unit: 'cm', unitInch: 'in', min: 54, max: 130, step: 0.1 },
  { key: 'legLength', label: '다리길이', unit: 'cm', unitInch: 'in', min: 65, max: 110, step: 0.1 },
  { key: 'armLength', label: '팔길이', unit: 'cm', unitInch: 'in', min: 48, max: 84, step: 0.1 },
]
