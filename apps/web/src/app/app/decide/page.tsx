'use client';

import { RouteTransitionShell } from '@/features/renewal-app/components/RouteTransitionShell';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

export default function DecidePage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const copy =
    language === 'ko'
      ? {
          eyebrow: 'Decide',
          title: '판단은 단독 screen이 아니라 발견과 옷장 사이에서 이뤄집니다.',
          description:
            '무엇을 살지, 무엇을 다시 만들지, 지금 무엇이 비어 있는지는 발견과 옷장 데이터를 함께 볼 때 가장 선명해집니다.',
          status: 'Decision bridge',
          metrics: {
            axes: '판단 축',
            intake: '입력 면',
            session: '세션',
            next: '권장 이동',
            intakeValue: '발견',
            guest: '게스트',
            member: '멤버',
            nextValue: '발견',
          },
          panels: [
            {
              eyebrow: '후보 좁히기',
              title: '먼저 발견에서 참고 후보를 좁힙니다.',
              body: '발견은 지금 필요한 무드와 레퍼런스를 빠르게 압축하는 입력면입니다.',
            },
            {
              eyebrow: '근거 확인',
              title: '그다음 옷장에서 실제 근거를 확인합니다.',
              body: '이미 가진 아이템과 빈 축을 동시에 보는 순간, 무엇을 유지하고 무엇을 보강할지 결정이 쉬워집니다.',
              tone: 'strong' as const,
            },
          ],
          actionIntro: {
            eyebrow: '바로 이동',
            title: '참고를 먼저 볼지, 현재 옷장을 먼저 확인할지 고르세요.',
            body: '이 경로는 빈 결정을 남기지 않고, 실제 판단 surface 두 곳으로 곧장 연결하는 역할만 합니다.',
          },
          primaryAction: { href: '/app/discover', label: '발견 열기' },
          secondaryAction: { href: '/app/closet', label: '옷장 열기' },
          signInLabel: '로그인 후 판단 이어가기',
        }
      : {
          eyebrow: 'Decide',
          title: 'Decision now happens between Discover and Closet, not in a standalone screen.',
          description:
            'What to buy, what to rebuild, and what is still missing becomes clearest when Discover and Closet are read together.',
          status: 'Decision bridge',
          metrics: {
            axes: 'Decision axes',
            intake: 'Input surface',
            session: 'Session',
            next: 'Recommended move',
            intakeValue: 'Discover',
            guest: 'Guest',
            member: 'Member',
            nextValue: 'Discover',
          },
          panels: [
            {
              eyebrow: 'Narrow options',
              title: 'Start in Discover to compress the reference set.',
              body: 'Discover is the intake surface for mood, signals, and candidate directions.',
            },
            {
              eyebrow: 'Check evidence',
              title: 'Then verify the decision against your actual wardrobe.',
              body: 'Once existing pieces and missing anchors are visible together, the next move becomes much easier to justify.',
              tone: 'strong' as const,
            },
          ],
          actionIntro: {
            eyebrow: 'Move now',
            title: 'Choose whether to start from reference or from the current closet.',
            body: 'This route exists only to hand you directly to the two real decision surfaces.',
          },
          primaryAction: { href: '/app/discover', label: 'Open discover' },
          secondaryAction: { href: '/app/closet', label: 'Open closet' },
          signInLabel: 'Sign in to continue deciding',
        };

  return (
    <RouteTransitionShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      status={copy.status}
      metrics={[
        { label: copy.metrics.axes, value: '2' },
        { label: copy.metrics.intake, value: copy.metrics.intakeValue },
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
