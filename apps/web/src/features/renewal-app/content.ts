export type RenewalLanguage = 'ko' | 'en';

export const appNav = {
  ko: [
    { href: '/app', label: 'Home' },
    { href: '/app/closet', label: 'Closet' },
    { href: '/app/looks', label: 'Looks' },
    { href: '/app/discover', label: 'Discover' },
    { href: '/app/decide', label: 'Decide' },
    { href: '/app/journal', label: 'Journal' },
    { href: '/app/profile', label: 'Profile' },
  ],
  en: [
    { href: '/app', label: 'Home' },
    { href: '/app/closet', label: 'Closet' },
    { href: '/app/looks', label: 'Looks' },
    { href: '/app/discover', label: 'Discover' },
    { href: '/app/decide', label: 'Decide' },
    { href: '/app/journal', label: 'Journal' },
    { href: '/app/profile', label: 'Profile' },
  ],
} as const;

export const appMeta = {
  '/app': {
    title: { ko: 'Wardrobe Home', en: 'Wardrobe Home' },
    description: {
      ko: '오늘의 상태, 최근 영감, 구매 판단, 착용 기록을 한 화면에서 요약합니다.',
      en: 'A command surface for your closet health, recent inspiration, purchase decisions, and wear memory.',
    },
  },
  '/app/closet': {
    title: { ko: 'Closet', en: 'Closet' },
    description: {
      ko: '내 옷장의 구조와 중복, 부족한 축을 파악하는 운영 화면입니다.',
      en: 'An operating view for your wardrobe structure, duplicates, and missing anchors.',
    },
  },
  '/app/looks': {
    title: { ko: 'Looks', en: 'Looks' },
    description: {
      ko: '저장된 룩과 작업 중인 룩을 관리하는 작업 공간입니다.',
      en: 'A workspace for saved looks, drafts, and the next evolution of Studio.',
    },
  },
  '/app/discover': {
    title: { ko: 'Discover', en: 'Discover' },
    description: {
      ko: '영감 이미지를 소비하는 곳이 아니라 내 옷장으로 번역하는 곳입니다.',
      en: 'A place to translate inspiration into your real closet, not just consume it.',
    },
  },
  '/app/decide': {
    title: { ko: 'Decide', en: 'Decide' },
    description: {
      ko: '구매 후보가 실제로 내 옷장에 도움이 되는지 판단하는 공간입니다.',
      en: 'A surface for deciding whether a candidate item truly improves your wardrobe.',
    },
  },
  '/app/journal': {
    title: { ko: 'Journal', en: 'Journal' },
    description: {
      ko: '실제 착용과 만족도를 기록해 추천 품질을 높입니다.',
      en: 'Capture what you actually wore so the system can get smarter over time.',
    },
  },
  '/app/profile': {
    title: { ko: 'Profile', en: 'Profile' },
    description: {
      ko: '내 계정, 히스토리, 공유 상태를 관리합니다.',
      en: 'Manage account context, saved history, and sharing status.',
    },
  },
} as const;
