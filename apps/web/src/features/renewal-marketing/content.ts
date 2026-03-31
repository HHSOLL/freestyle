export type RenewalLanguage = 'ko' | 'en';

type Localized<T> = Record<RenewalLanguage, T>;

export const marketingCopy: Localized<{
  nav: { product: string; examples: string; app: string; cta: string };
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
  };
  support: Array<{ title: string; body: string }>;
  thesis: { eyebrow: string; title: string };
  detail: Array<{ title: string; body: string }>;
  finalCta: { eyebrow: string; title: string; body: string; action: string };
  howItWorks: {
    eyebrow: string;
    title: string;
    body: string;
    action: string;
    steps: Array<{ title: string; body: string }>;
  };
  examples: {
    eyebrow: string;
    title: string;
    body: string;
    items: Array<{ title: string; body: string }>;
  };
  footer: {
    body: string;
    pathsLabel: string;
    legacyLabel: string;
    paths: { app: string; howItWorks: string; examples: string };
    legacy: { studio: string; trends: string; account: string };
  };
}> = {
  ko: {
    nav: { product: '옷장', examples: '캔버스', app: '발견', cta: '옷장 시작하기' },
    hero: {
      eyebrow: '옷장 운영 시스템',
      title: '옷을 덜 사고 더 잘 입게 만드는 옷장 시스템',
      body: '영감 이미지를 내 옷으로 재현하고, 새 상품이 실제로 내 옷장에 도움이 되는지 판단하고, 실제 착용 기록까지 연결합니다.',
      primaryCta: '옷장 열기',
      secondaryCta: '캔버스 보기',
    },
    support: [
      {
        title: '내 옷장으로 영감을 재구성',
        body: '무신사 링크, 스크린샷, 저장한 레퍼런스를 내 옷장 기준으로 다시 풀어 보여줍니다.',
      },
      {
        title: '더 많은 조합을 여는 것만 구매',
        body: '새 상품이 몇 개의 조합을 여는지, 무엇과 겹치는지, 왜 사지 말아야 하는지도 함께 보여줍니다.',
      },
      {
        title: '실제 착용에서 학습',
        body: '저장만 하는 옷장이 아니라 실제 착용 기록이 쌓이며 더 똑똑해지는 시스템으로 설계합니다.',
      },
    ],
    thesis: {
      eyebrow: '리뉴얼 테제',
      title: '바깥은 에디토리얼 브랜드, 안은 차분한 의사결정 엔진.',
    },
    detail: [
      {
        title: '스튜디오 툴에서 판단 시스템으로',
        body: '기존 Studio는 사라지지 않습니다. 이제는 Looks Workspace로 승격되어 영감, 구매 판단, 저널과 한 루프 안에서 작동합니다.',
      },
      {
        title: '강한 브랜드, 차분한 유틸리티',
        body: '랜딩은 패션 브랜드처럼 강하게, 앱 내부는 얇은 크롬과 높은 가독성으로 일하게 만듭니다.',
      },
    ],
    finalCta: {
      eyebrow: '지금 시작하기',
      title: '실제 앱 셸에서 바로 시작하세요',
      body: '리뉴얼은 이미 route scaffold와 shell부터 시작했습니다. 다음 단계는 실제 도메인 이전입니다.',
      action: '옷장으로 들어가기',
    },
    howItWorks: {
      eyebrow: '사용 방법',
      title: '한 번의 AI 트릭이 아니라 반복 가능한 옷장 워크플로우',
      body: '리뉴얼의 핵심은 FreeStyle을 수집, 번역, 판단, 기록의 루프로 바꾸는 것입니다.',
      action: '새 앱 열기',
      steps: [
        {
          title: '수집',
          body: '링크, 스크린샷, 장바구니, 업로드를 통해 영감과 실제 아이템을 한 시스템 안으로 가져옵니다.',
        },
        {
          title: '번역',
          body: '가져온 레퍼런스를 내 옷장 기준으로 다시 풀어 어떤 아이템이 이미 있고 무엇이 부족한지 보여줍니다.',
        },
        {
          title: '판단',
          body: '새 상품이 조합을 얼마나 열어주는지, 무엇과 겹치는지, 지금 사야 하는지 판단합니다.',
        },
        {
          title: '기록',
          body: '실제 착용과 만족도가 쌓이며 다음 추천과 판단이 더 정교해집니다.',
        },
      ],
    },
    examples: {
      eyebrow: '예시',
      title: '리뉴얼이 최적화하는 세 가지 경험',
      body: '이건 기능 카드가 아니라, 새 FreeStyle이 자연스럽게 느껴지게 만들어야 할 제품 행동입니다.',
      items: [
        {
          title: '레퍼런스에서 옷장으로',
          body: '저장한 무신사 룩이 재구성 프롬프트가 되고, 시스템은 내 옷장에 이미 있는 것과 부족한 것을 찾아줍니다.',
        },
        {
          title: '구매 혹은 보류 판단',
          body: '새 재킷은 몇 개의 새 룩을 여는지, 얼마나 겹치는지, 어떤 기존 아이템을 강화하는지로 평가됩니다.',
        },
        {
          title: '착용 기억 루프',
          body: '룩은 저장에서 끝나지 않습니다. 언제 입었고, 어땠고, 다시 입을지까지 기록으로 남습니다.',
        },
      ],
    },
    footer: {
      body: 'FreeStyle은 영감 수집부터 구매 판단, 착용 기억까지 연결하는 옷장 운영 시스템으로 다시 설계되고 있습니다.',
      pathsLabel: '주요 경로',
      legacyLabel: '레거시',
      paths: {
        app: '앱 프리뷰',
        howItWorks: '사용 방법',
        examples: '예시',
      },
      legacy: {
        studio: '스튜디오',
        trends: '트렌드',
        account: '계정',
      },
    },
  },
  en: {
    nav: { product: 'Closet', examples: 'Canvas', app: 'Discover', cta: 'Start your closet' },
    hero: {
      eyebrow: 'Wardrobe Operating System',
      title: 'A wardrobe system that helps you buy less and wear better',
      body: 'Capture inspiration, rebuild it from your closet, decide what actually deserves to be bought, and learn from what you really wear.',
      primaryCta: 'Open closet',
      secondaryCta: 'Open canvas',
    },
    support: [
      {
        title: 'Rebuild inspiration from your closet',
        body: 'Reference looks, saved links, and screenshots get translated into what you can already make with your own wardrobe.',
      },
      {
        title: 'Buy only what unlocks more looks',
        body: 'Every candidate is judged by what it opens up, what it duplicates, and whether it belongs in your closet at all.',
      },
      {
        title: 'Learn from what you actually wear',
        body: 'This is not a static closet. The system improves as your real wear history accumulates.',
      },
    ],
    thesis: {
      eyebrow: 'Renewal Thesis',
      title: 'Editorial brand outside. Calm decision engine inside.',
    },
    detail: [
      {
        title: 'From studio tool to decision system',
        body: 'The old Studio does not disappear. It becomes a Looks Workspace connected to discovery, buying, and memory.',
      },
      {
        title: 'Editorial brand. Calm utility.',
        body: 'The public site should feel like fashion media. The app should feel like a precise operational tool.',
      },
    ],
    finalCta: {
      eyebrow: 'Start Now',
      title: 'Start from the real app shell',
      body: 'The renewal now has a working route scaffold and shell. The next step is migrating real product logic into it.',
      action: 'Enter closet',
    },
    howItWorks: {
      eyebrow: 'How It Works',
      title: 'A wardrobe workflow instead of a one-off AI trick',
      body: 'The renewal starts by turning FreeStyle into a loop: capture, translate, decide, and remember.',
      action: 'Open the new app scaffold',
      steps: [
        {
          title: 'Capture',
          body: 'Bring inspiration and real inventory into one system through links, screenshots, carts, and uploads.',
        },
        {
          title: 'Translate',
          body: 'Rebuild references against your actual closet so you can see what already exists and what is missing.',
        },
        {
          title: 'Decide',
          body: 'Judge every candidate by what it unlocks, what it duplicates, and whether it deserves a place in your wardrobe.',
        },
        {
          title: 'Remember',
          body: 'As wear history accumulates, the system learns from your real behavior instead of static preference only.',
        },
      ],
    },
    examples: {
      eyebrow: 'Examples',
      title: 'Three experiences the renewal is optimized for',
      body: 'These are not feature cards. They are the product behaviors the new FreeStyle should make feel inevitable.',
      items: [
        {
          title: 'Reference to closet',
          body: 'A saved Musinsa look becomes a reconstruction prompt. The system finds what is already available in your closet and what is still missing.',
        },
        {
          title: 'Buy or skip decision',
          body: 'A new jacket is scored by how many new looks it unlocks, how much it duplicates, and which existing pieces it strengthens.',
        },
        {
          title: 'Wear memory loop',
          body: 'An outfit is not just saved. It becomes part of a record: when it was worn, how it felt, and whether it should be repeated.',
        },
      ],
    },
    footer: {
      body: 'FreeStyle is being rebuilt as a wardrobe operating system: from inspiration capture to purchase judgment and wear memory.',
      pathsLabel: 'Paths',
      legacyLabel: 'Legacy',
      paths: {
        app: 'App Preview',
        howItWorks: 'How It Works',
        examples: 'Examples',
      },
      legacy: {
        studio: 'Studio',
        trends: 'Trends',
        account: 'Account',
      },
    },
  },
};
