export type RenewalLanguage = 'ko' | 'en';

type Localized<T> = Record<RenewalLanguage, T>;

export const appNav = {
  ko: [
    { href: '/', label: '홈' },
    { href: '/app/closet', label: '옷장' },
    { href: '/app/canvas', label: '캔버스' },
    { href: '/app/community', label: '커뮤니티' },
    { href: '/app/profile', label: '마이페이지' },
  ],
  en: [
    { href: '/', label: 'Home' },
    { href: '/app/closet', label: 'Closet' },
    { href: '/app/canvas', label: 'Canvas' },
    { href: '/app/community', label: 'Community' },
    { href: '/app/profile', label: 'My Page' },
  ],
} as const;

export const appMeta = {
  '/app': {
    title: { ko: 'Closet', en: 'Closet' },
    description: {
      ko: '기본 진입점은 옷장입니다. 좌측 에셋 레일과 3D 마네킹 스테이지를 바로 엽니다.',
      en: 'Closet is the default entry point: open the asset rail and 3D mannequin stage immediately.',
    },
  },
  '/app/closet': {
    title: { ko: 'Closet', en: 'Closet' },
    description: {
      ko: '옷장 에셋 레일과 커스텀 마네킹 스테이지를 한 화면에서 다루는 기본 워크스페이스입니다.',
      en: 'The default workspace where the wardrobe asset rail and custom mannequin stage stay side by side.',
    },
  },
  '/app/canvas': {
    title: { ko: 'Canvas', en: 'Canvas' },
    description: {
      ko: '에셋을 가져오고 2D 캔버스에서 조합을 빠르게 실험하는 작업 화면입니다.',
      en: 'The working surface for importing assets and experimenting with combinations on the 2D canvas.',
    },
  },
  '/app/community': {
    title: { ko: '커뮤니티', en: 'Community' },
    description: {
      ko: '조용한 스타일 보드를 보고 내 옷장과 캔버스로 번역하는 화면입니다.',
      en: 'A surface for translating quiet styling boards into your real closet and canvas workflow.',
    },
  },
  '/app/profile': {
    title: { ko: '마이페이지', en: 'My Page' },
    description: {
      ko: '계정, 저장 자산, 최근 활동을 묶어보는 개인 허브입니다.',
      en: 'A personal hub for account state, saved assets, and recent activity.',
    },
  },
} as const;

export const appChromeCopy: Localized<{
  brand: string;
  liveData: string;
  openWorkspace: string;
  signIn: string;
  accountFallback: string;
  signOutFailed: string;
  sidebarFooterTitle: string;
  sidebarFooterBody: string;
  lookLabel: string;
  viewShare: string;
  copy: string;
  deleteLook: string;
  deleteAsset: string;
  itemDetail: string;
  open: string;
  authGate: {
    badge: string;
    missingConfig: string;
    kakao: string;
    kakaoLoading: string;
    naver: string;
    naverLoading: string;
    emailDivider: string;
    emailLabel: string;
    emailPlaceholder: string;
    emailSubmit: string;
    emailSubmitting: string;
    emailRequired: string;
    emailSent: string;
    emailSendFailed: string;
    socialStartFailed: string;
    partialSocialHint: string;
  };
  authCallback: {
    badge: string;
    checkingTitle: string;
    checkingBody: string;
    confirmedBody: string;
    failedTitle: string;
  };
}> = {
  ko: {
    brand: '옷장 OS',
    liveData: '실데이터',
    openWorkspace: '캔버스 열기',
    signIn: '로그인',
    accountFallback: '계정',
    signOutFailed: '로그아웃할 수 없습니다.',
    sidebarFooterTitle: 'Wardrobe OS 프리뷰가 라이브입니다.',
    sidebarFooterBody: '한 셸 안에서 가져오고, 입혀보고, 배치하고, 저장합니다.',
    lookLabel: '저장본',
    viewShare: '공유 보기',
    copy: '복사',
    deleteLook: '저장본 삭제',
    deleteAsset: '에셋 삭제',
    itemDetail: '아이템 상세',
    open: '열기',
    authGate: {
      badge: '멤버 전용',
      missingConfig: '`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 설정되지 않았습니다.',
      kakao: '카카오로 계속하기',
      kakaoLoading: '카카오 로그인 연결 중...',
      naver: '네이버로 계속하기',
      naverLoading: '네이버 로그인 연결 중...',
      emailDivider: '이메일 링크',
      emailLabel: '이메일',
      emailPlaceholder: 'you@example.com',
      emailSubmit: '이메일 로그인 링크 받기',
      emailSubmitting: '링크 전송 중...',
      emailRequired: '이메일을 입력해주세요.',
      emailSent: '로그인 링크를 보냈습니다. 메일에서 링크를 열어주세요.',
      emailSendFailed: '로그인 링크를 보낼 수 없습니다.',
      socialStartFailed: '소셜 로그인을 시작할 수 없습니다.',
      partialSocialHint: '일부 소셜 로그인은 아직 배포 환경 설정이 끝나지 않아 비활성화되어 있습니다.',
    },
    authCallback: {
      badge: '인증 콜백',
      checkingTitle: '로그인 확인 중입니다.',
      checkingBody: '브라우저 세션을 정리하고 있습니다. 잠시만 기다려주세요.',
      confirmedBody: '세션을 확인했습니다. 원래 화면으로 이동합니다.',
      failedTitle: '로그인에 실패했습니다.',
    },
  },
  en: {
    brand: 'Wardrobe OS',
    liveData: 'Live Data',
    openWorkspace: 'Open canvas',
    signIn: 'Sign in',
    accountFallback: 'Account',
    signOutFailed: 'Failed to sign out.',
    sidebarFooterTitle: 'Wardrobe OS preview is live.',
    sidebarFooterBody: 'Import, fit, compose, and save from one shell.',
    lookLabel: 'Saved',
    viewShare: 'View share',
    copy: 'Copy',
    deleteLook: 'Delete saved item',
    deleteAsset: 'Delete asset',
    itemDetail: 'Item detail',
    open: 'Open',
    authGate: {
      badge: 'Members Only',
      missingConfig: '`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not configured.',
      kakao: 'Continue with Kakao',
      kakaoLoading: 'Connecting Kakao login...',
      naver: 'Continue with Naver',
      naverLoading: 'Connecting Naver login...',
      emailDivider: 'Email Link',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      emailSubmit: 'Send email login link',
      emailSubmitting: 'Sending link...',
      emailRequired: 'Please enter your email address.',
      emailSent: 'A login link has been sent. Open it from your email.',
      emailSendFailed: 'Could not send the login link.',
      socialStartFailed: 'Could not start social login.',
      partialSocialHint: 'Some social providers are still disabled because deployment configuration is incomplete.',
    },
    authCallback: {
      badge: 'Auth Callback',
      checkingTitle: 'Checking your sign-in...',
      checkingBody: 'We are finalizing the browser session. Please wait a moment.',
      confirmedBody: 'Your session is confirmed. Redirecting back now.',
      failedTitle: 'Sign-in failed.',
    },
  },
};
