'use client';

import { RouteTransitionShell } from '@/features/renewal-app/components/RouteTransitionShell';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

export default function ExamplesPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const copy =
    language === 'ko'
      ? {
          eyebrow: 'Examples',
          title: '예시는 이제 별도 갤러리가 아니라 실제 작업 흐름의 입구입니다.',
          description:
            '리뉴얼 이후 예시는 발견에서 보고, 캔버스에서 조합하고, 저장본은 마이페이지에서 다시 꺼내는 구조로 흡수되었습니다.',
          status: 'Examples handoff',
          metrics: {
            surfaces: '핵심 surface',
            role: '현재 역할',
            session: '세션',
            next: '다음 이동',
            roleValue: '레퍼런스 안내',
            guest: '게스트',
            member: '멤버',
            nextValue: '발견',
          },
          panels: [
            {
              eyebrow: '변경 사항',
              title: '예시만 따로 모아두는 화면은 비웠습니다.',
              body: '샘플을 소비하고 끝나는 대신, 지금은 레퍼런스를 발견으로 연결하고 실제 조합은 캔버스로 넘기는 구조를 유지합니다.',
            },
            {
              eyebrow: '지금 가야 할 곳',
              title: '발견에서 참고하고 캔버스로 옮기면 됩니다.',
              body: '예시를 보는 순간 다음 행동이 바로 이어지도록, 이 경로는 맥락 설명과 빠른 handoff만 담당합니다.',
              tone: 'strong' as const,
            },
          ],
          actionIntro: {
            eyebrow: '빠른 이동',
            title: '레퍼런스를 더 볼지, 조합을 바로 만들지 고르세요.',
            body: '발견은 참고용 입력면이고, 캔버스는 결과를 만드는 작업면입니다.',
          },
          primaryAction: { href: '/app/discover', label: '발견 열기' },
          secondaryAction: { href: '/studio', label: '캔버스 열기' },
          signInLabel: '로그인 후 여기로 돌아오기',
        }
      : {
          eyebrow: 'Examples',
          title: 'Examples now act as an entry point into the real workflow, not a separate gallery.',
          description:
            'In the renewal, references live in Discover, compositions happen in Canvas, and saved results come back through My Page.',
          status: 'Examples handoff',
          metrics: {
            surfaces: 'Core surfaces',
            role: 'Current role',
            session: 'Session',
            next: 'Next move',
            roleValue: 'Reference bridge',
            guest: 'Guest',
            member: 'Member',
            nextValue: 'Discover',
          },
          panels: [
            {
              eyebrow: 'What changed',
              title: 'The examples-only gallery is intentionally gone.',
              body: 'Instead of browsing samples in isolation, this route now points you toward Discover for reference and Canvas for execution.',
            },
            {
              eyebrow: 'Where to go now',
              title: 'Browse in Discover, then move straight into Canvas.',
              body: 'The page exists to preserve orientation and hand off quickly, not to keep you on an empty shell.',
              tone: 'strong' as const,
            },
          ],
          actionIntro: {
            eyebrow: 'Quick handoff',
            title: 'Choose between reference intake and composition work.',
            body: 'Discover is the input surface. Canvas is where you turn that reference into an outfit.',
          },
          primaryAction: { href: '/app/discover', label: 'Open discover' },
          secondaryAction: { href: '/studio', label: 'Open canvas' },
          signInLabel: 'Sign in and return here',
        };

  return (
    <RouteTransitionShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      status={copy.status}
      metrics={[
        { label: copy.metrics.surfaces, value: '5' },
        { label: copy.metrics.role, value: copy.metrics.roleValue },
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
