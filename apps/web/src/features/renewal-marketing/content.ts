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
  detail: Array<{ title: string; body: string }>;
  finalCta: { title: string; body: string; action: string };
}> = {
  ko: {
    nav: { product: 'How It Works', examples: 'Examples', app: 'App', cta: 'Start your closet' },
    hero: {
      eyebrow: 'Wardrobe Operating System',
      title: '옷을 덜 사고 더 잘 입게 만드는 옷장 시스템',
      body: '영감 이미지를 내 옷으로 재현하고, 새 상품이 실제로 내 옷장에 도움이 되는지 판단하고, 실제 착용 기록까지 연결합니다.',
      primaryCta: 'Open App Preview',
      secondaryCta: 'See how it works',
    },
    support: [
      {
        title: 'Rebuild inspiration from your closet',
        body: '무신사 링크, 스크린샷, 저장한 레퍼런스를 내 옷장 기준으로 다시 풀어 보여줍니다.',
      },
      {
        title: 'Buy only what unlocks more looks',
        body: '새 상품이 몇 개의 조합을 여는지, 무엇과 겹치는지, 왜 사지 말아야 하는지도 함께 보여줍니다.',
      },
      {
        title: 'Learn from what you actually wear',
        body: '저장만 하는 옷장이 아니라 실제 착용 기록이 쌓이며 더 똑똑해지는 시스템으로 설계합니다.',
      },
    ],
    detail: [
      {
        title: 'From studio tool to decision system',
        body: '기존 Studio는 사라지지 않습니다. 이제는 Looks Workspace로 승격되어 영감, 구매 판단, 저널과 한 루프 안에서 작동합니다.',
      },
      {
        title: 'Editorial brand. Calm utility.',
        body: '랜딩은 패션 브랜드처럼 강하게, 앱 내부는 얇은 크롬과 높은 가독성으로 일하게 만듭니다.',
      },
    ],
    finalCta: {
      title: 'Start the renewal from the actual app shell',
      body: '리뉴얼은 이미 route scaffold와 shell부터 시작했습니다. 다음 단계는 실제 도메인 이전입니다.',
      action: 'Enter /app',
    },
  },
  en: {
    nav: { product: 'How It Works', examples: 'Examples', app: 'App', cta: 'Start your closet' },
    hero: {
      eyebrow: 'Wardrobe Operating System',
      title: 'A wardrobe system that helps you buy less and wear better',
      body: 'Capture inspiration, rebuild it from your closet, decide what actually deserves to be bought, and learn from what you really wear.',
      primaryCta: 'Open App Preview',
      secondaryCta: 'See how it works',
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
      title: 'Start from the real app shell',
      body: 'The renewal now has a working route scaffold and shell. The next step is migrating real product logic into it.',
      action: 'Enter /app',
    },
  },
};
