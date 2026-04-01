'use client';

import { RouteTransitionShell } from '@/features/renewal-app/components/RouteTransitionShell';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

export default function JournalPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const copy =
    language === 'ko'
      ? {
          eyebrow: 'Journal',
          title: '저널은 별도 문서 화면이 아니라 계정 히스토리와 저장 흐름으로 흡수됩니다.',
          description:
            '최근 저장본, 자산, 계정 상태를 한 곳에서 보는 마이페이지가 현재 journal 역할을 대신합니다.',
          status: 'History bridge',
          metrics: {
            hub: '기록 허브',
            source: '새 기록 생성',
            session: '세션',
            next: '권장 이동',
            hubValue: '마이페이지',
            sourceValue: '캔버스',
            guest: '게스트',
            member: '멤버',
            nextValue: '마이페이지',
          },
          panels: [
            {
              eyebrow: '기록 모으기',
              title: '저장과 계정 히스토리는 마이페이지로 모읍니다.',
              body: '저장본, 연결된 자산, 최근 상태는 계정 허브에서 가장 일관되게 다시 찾을 수 있습니다.',
            },
            {
              eyebrow: '새 기록 만들기',
              title: '새 히스토리는 캔버스와 옷장에서 생성됩니다.',
              body: '기록은 따로 메모하는 대신 실제 조합과 자산 조정 과정에서 생성되도록 구조를 단순화했습니다.',
              tone: 'strong' as const,
            },
          ],
          actionIntro: {
            eyebrow: '바로 이동',
            title: '계정 히스토리를 보거나 새 작업을 시작하세요.',
            body: '마이페이지는 저장 허브이고, 캔버스는 새 기록을 만드는 실행면입니다.',
          },
          primaryAction: { href: '/app/profile', label: '마이페이지 열기' },
          secondaryAction: { href: '/studio', label: '캔버스 열기' },
          signInLabel: '로그인 후 히스토리 보기',
        }
      : {
          eyebrow: 'Journal',
          title: 'Journal is now absorbed into account history and save flows instead of a separate document view.',
          description:
            'My Page now covers the role of journal by keeping recent saves, assets, and account state together.',
          status: 'History bridge',
          metrics: {
            hub: 'History hub',
            source: 'New history source',
            session: 'Session',
            next: 'Recommended move',
            hubValue: 'My Page',
            sourceValue: 'Canvas',
            guest: 'Guest',
            member: 'Member',
            nextValue: 'My Page',
          },
          panels: [
            {
              eyebrow: 'Collect history',
              title: 'Saved work and account history now gather in My Page.',
              body: 'Saved results, attached assets, and recent status are easiest to revisit from the account hub.',
            },
            {
              eyebrow: 'Create new entries',
              title: 'New history is generated in Canvas and Closet.',
              body: 'Instead of writing entries in isolation, the product now treats real work and adjustments as the source of history.',
              tone: 'strong' as const,
            },
          ],
          actionIntro: {
            eyebrow: 'Move now',
            title: 'Open the history hub or start a new piece of work.',
            body: 'My Page is the archive hub. Canvas is the active surface where new history gets created.',
          },
          primaryAction: { href: '/app/profile', label: 'Open My Page' },
          secondaryAction: { href: '/studio', label: 'Open canvas' },
          signInLabel: 'Sign in to view history',
        };

  return (
    <RouteTransitionShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      status={copy.status}
      metrics={[
        { label: copy.metrics.hub, value: copy.metrics.hubValue },
        { label: copy.metrics.source, value: copy.metrics.sourceValue },
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
