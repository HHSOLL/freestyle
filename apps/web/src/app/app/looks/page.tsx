'use client';

import { RouteTransitionShell } from '@/features/renewal-app/components/RouteTransitionShell';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

export default function LooksPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const copy =
    language === 'ko'
      ? {
          eyebrow: 'Looks',
          title: 'Looks는 별도 목록보다 현재 조합과 저장본 사이를 잇는 정보형 경로로 남습니다.',
          description: '새 look은 캔버스에서 만들고, 저장된 결과는 마이페이지에서 다시 꺼내는 구조가 기본값입니다.',
          status: 'Saved look bridge',
          metrics: {
            creation: '생성 면',
            archive: '저장 허브',
            session: '세션',
            next: '권장 이동',
            creationValue: '캔버스',
            archiveValue: '마이페이지',
            guest: '게스트',
            member: '멤버',
            nextValue: '캔버스',
          },
          panels: [
            {
              eyebrow: '생성',
              title: '새 look은 캔버스에서 바로 만듭니다.',
              body: '에셋을 배치하고 저장 가능한 결과를 만드는 흐름은 현재 캔버스에 통합되어 있습니다.',
            },
            {
              eyebrow: '재방문',
              title: '저장된 결과는 마이페이지에서 다시 엽니다.',
              body: '저장본, 공유 링크, 최근 작업 상태는 계정 허브에 남기고 이 경로는 handoff만 담당합니다.',
              tone: 'strong' as const,
            },
          ],
          actionIntro: {
            eyebrow: '다음 이동',
            title: '새 조합을 만들거나 저장본 허브로 이동하세요.',
            body: '캔버스는 생성 면이고, 마이페이지는 저장 결과와 계정 상태를 묶는 허브입니다.',
          },
          primaryAction: { href: '/studio', label: '캔버스 열기' },
          secondaryAction: { href: '/app/profile', label: '마이페이지 열기' },
          signInLabel: '로그인 후 저장본 보기',
        }
      : {
          eyebrow: 'Looks',
          title: 'Looks now remains as an informational bridge between current composition and saved results.',
          description: 'New looks are created in Canvas, and saved outcomes are revisited through My Page.',
          status: 'Saved look bridge',
          metrics: {
            creation: 'Creation surface',
            archive: 'Archive hub',
            session: 'Session',
            next: 'Recommended move',
            creationValue: 'Canvas',
            archiveValue: 'My Page',
            guest: 'Guest',
            member: 'Member',
            nextValue: 'Canvas',
          },
          panels: [
            {
              eyebrow: 'Creation',
              title: 'Build new looks directly in Canvas.',
              body: 'The flow for arranging assets and turning them into saved results now lives in the Canvas workspace.',
            },
            {
              eyebrow: 'Return',
              title: 'Reopen saved results from My Page.',
              body: 'Saved outcomes, share links, and recent work now sit in the account hub, while this route only preserves orientation.',
              tone: 'strong' as const,
            },
          ],
          actionIntro: {
            eyebrow: 'Next move',
            title: 'Either build a new look or open the saved-work hub.',
            body: 'Canvas is for creation. My Page keeps saved results and account context together.',
          },
          primaryAction: { href: '/studio', label: 'Open canvas' },
          secondaryAction: { href: '/app/profile', label: 'Open My Page' },
          signInLabel: 'Sign in to view saved looks',
        };

  return (
    <RouteTransitionShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      status={copy.status}
      metrics={[
        { label: copy.metrics.creation, value: copy.metrics.creationValue },
        { label: copy.metrics.archive, value: copy.metrics.archiveValue },
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
