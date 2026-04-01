'use client';

import { RouteTransitionShell } from '@/features/renewal-app/components/RouteTransitionShell';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

export default function HowItWorksPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const copy =
    language === 'ko'
      ? {
          eyebrow: 'How It Works',
          title: '작동 방식은 별도 설명 페이지보다 실제 surface 안에서 보이도록 정리했습니다.',
          description:
            '옷장, 캔버스, 마이페이지가 한 흐름으로 이어지기 때문에 설명도 실제 작업 면과 같은 구조를 따라갑니다.',
          status: 'Workflow bridge',
          metrics: {
            steps: '기본 흐름',
            anchor: '시작점',
            session: '세션',
            next: '권장 이동',
            anchorValue: '옷장',
            guest: '게스트',
            member: '멤버',
            nextValue: '옷장',
          },
          panels: [
            {
              eyebrow: '1. 옷장',
              title: '먼저 이미 가진 것을 기준면으로 엽니다.',
              body: '옷장은 에셋 레일과 3D 마네킹 스테이지를 함께 열어, 현재 가진 자산을 바로 작업 가능한 상태로 보여줍니다.',
            },
            {
              eyebrow: '2. 캔버스',
              title: '그다음 캔버스에서 조합과 저장을 이어갑니다.',
              body: '캔버스는 가져온 자산을 배치하고, AI 평가나 저장본으로 연결하는 실행 surface입니다.',
              tone: 'strong' as const,
            },
          ],
          actionIntro: {
            eyebrow: '실제 흐름 열기',
            title: '설명보다 빠르게, 바로 실작업 경로로 들어가세요.',
            body: '옷장에서 기준을 잡고 캔버스에서 결과를 만들면 현재 리뉴얼 구조를 가장 정확하게 경험할 수 있습니다.',
          },
          primaryAction: { href: '/app/closet', label: '옷장 열기' },
          secondaryAction: { href: '/studio', label: '캔버스 열기' },
          signInLabel: '로그인 후 이 흐름 이어가기',
        }
      : {
          eyebrow: 'How It Works',
          title: 'The workflow now shows up inside the real surfaces instead of a standalone explainer page.',
          description:
            'Closet, Canvas, and My Page form a single loop, so the explanation now follows the same product structure.',
          status: 'Workflow bridge',
          metrics: {
            steps: 'Core flow',
            anchor: 'Starting point',
            session: 'Session',
            next: 'Recommended move',
            anchorValue: 'Closet',
            guest: 'Guest',
            member: 'Member',
            nextValue: 'Closet',
          },
          panels: [
            {
              eyebrow: '1. Closet',
              title: 'Start from what you already own.',
              body: 'Closet opens the asset rail and 3D mannequin stage together so the wardrobe begins in an actionable state.',
            },
            {
              eyebrow: '2. Canvas',
              title: 'Continue in Canvas for composition and saving.',
              body: 'Canvas is the execution surface where imported assets become arrangements, reviews, and saved results.',
              tone: 'strong' as const,
            },
          ],
          actionIntro: {
            eyebrow: 'Open the real flow',
            title: 'Skip the explainer and enter the working path directly.',
            body: 'Open Closet to establish the base, then move into Canvas to produce the actual result.',
          },
          primaryAction: { href: '/app/closet', label: 'Open closet' },
          secondaryAction: { href: '/studio', label: 'Open canvas' },
          signInLabel: 'Sign in and continue this flow',
        };

  return (
    <RouteTransitionShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      status={copy.status}
      metrics={[
        { label: copy.metrics.steps, value: '2' },
        { label: copy.metrics.anchor, value: copy.metrics.anchorValue },
        { label: copy.metrics.session, value: user ? copy.metrics.member : copy.metrics.guest },
        { label: copy.metrics.next, value: copy.metrics.nextValue },
      ]}
      panels={copy.panels}
      actionIntro={copy.actionIntro}
      primaryAction={copy.primaryAction}
      secondaryAction={copy.secondaryAction}
      signInLabel={copy.signInLabel}
    />
  );
}
