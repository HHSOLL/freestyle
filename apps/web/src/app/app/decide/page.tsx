'use client';

import Link from 'next/link';
import { GlassPanel, ShellEyebrow } from '@/components/layout/ShellPrimitives';
import { Button } from '@/components/ui/button';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import { InfoStrip } from '@/features/renewal-app/components/InfoStrip';
import { getClosetCategoryLabel } from '@/features/renewal-app/data';
import { summarizeCloset, useWardrobeSnapshot } from '@/features/renewal-app/hooks/useWardrobeSnapshot';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

export default function DecidePage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { looks, assets, loading, error } = useWardrobeSnapshot();
  const closetSummary = summarizeCloset(assets);
  const missingLabels = closetSummary.missing.map((category) => getClosetCategoryLabel(category, language));
  const mostCommonLabel = closetSummary.mostCommon
    ? getClosetCategoryLabel(closetSummary.mostCommon, language)
    : language === 'ko'
      ? '없음'
      : 'None';
  const decisionState = error
    ? language === 'ko'
      ? '점검 필요'
      : 'Needs review'
    : loading
      ? language === 'ko'
        ? '동기화 중'
        : 'Syncing'
      : language === 'ko'
        ? '준비됨'
        : 'Ready';
  const copy =
    language === 'ko'
      ? {
          eyebrow: 'Decide',
          title: '지금 가진 것과 비어 있는 축을 기준으로 다음 결정을 고정합니다.',
          description:
            'Decide는 더 이상 handoff 경로가 아니라, 옷장 데이터와 저장 흐름을 함께 읽고 다음 액션을 고정하는 실행 허브입니다.',
          metrics: {
            axes: '판단 축',
            gaps: '비어 있는 축',
            anchor: '현재 앵커',
            session: '세션',
            state: '상태',
            guest: '게스트',
            member: '멤버',
          },
          frame: {
            eyebrow: 'Decision frame',
            title: '결정은 발견과 옷장의 교차점에서 잠급니다.',
            body: '레퍼런스로 후보를 좁히고, 옷장에서 근거를 확인한 뒤, 캔버스에서 실제 조합으로 검증하는 3단계 루프를 유지합니다.',
          },
          queues: {
            missing: '비어 있는 축 보강',
            missingBody: '비어 있는 카테고리를 먼저 채우면 다음 조합의 실패율이 가장 크게 줄어듭니다.',
            verify: '근거 재검증',
            verifyBody: '저장본과 현재 옷장을 같이 보면서 유지/삭제를 빠르게 결정합니다.',
            execute: '즉시 실행',
            executeBody: '판단을 끝냈다면 캔버스에서 새 룩을 바로 생성해 결과로 고정합니다.',
          },
          actions: {
            discover: '발견 열기',
            closet: '옷장 열기',
            studio: '캔버스 열기',
          },
          labels: {
            none: '없음',
          },
        }
      : {
          eyebrow: 'Decide',
          title: 'Lock the next move from what you own and what is still missing.',
          description:
            'Decide is now an execution hub that reads wardrobe evidence and saved outcomes together before committing to the next action.',
          metrics: {
            axes: 'Decision axes',
            gaps: 'Missing axes',
            anchor: 'Current anchor',
            session: 'Session',
            state: 'State',
            guest: 'Guest',
            member: 'Member',
          },
          frame: {
            eyebrow: 'Decision frame',
            title: 'Decisions should close at the intersection of Discover and Closet.',
            body: 'Compress options in Discover, verify against real wardrobe evidence, then validate by building in Canvas.',
          },
          queues: {
            missing: 'Close missing axes',
            missingBody: 'Filling missing categories first reduces downstream composition failures fastest.',
            verify: 'Re-validate evidence',
            verifyBody: 'Read saved outcomes and current wardrobe together to decide what to keep or replace.',
            execute: 'Execute now',
            executeBody: 'Once a decision is clear, move directly to Canvas and lock it as an actual look.',
          },
          actions: {
            discover: 'Open discover',
            closet: 'Open closet',
            studio: 'Open canvas',
          },
          labels: {
            none: 'None',
          },
        };

  return (
    <AppPageFrame
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      badge={
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-[#171717] px-5 text-white hover:bg-black">
            <Link href="/app/discover">{copy.actions.discover}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-black/12 bg-white/70 px-5 text-black hover:bg-white">
            <Link href="/app/closet">{copy.actions.closet}</Link>
          </Button>
        </div>
      }
    >
      <InfoStrip
        items={[
          { label: copy.metrics.axes, value: '3' },
          { label: copy.metrics.gaps, value: String(closetSummary.missing.length) },
          { label: copy.metrics.anchor, value: mostCommonLabel || copy.labels.none },
          { label: copy.metrics.session, value: user ? copy.metrics.member : copy.metrics.guest },
        ]}
      />

      <InfoStrip
        items={[
          { label: language === 'ko' ? '저장본' : 'Saved looks', value: String(looks.length) },
          { label: language === 'ko' ? '옷장 아이템' : 'Closet items', value: String(assets.length) },
          { label: language === 'ko' ? '중복 위험 축' : 'Duplicate-risk axes', value: String(closetSummary.duplicateRisk.length) },
          { label: copy.metrics.state, value: decisionState },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
        <GlassPanel as="section" tone="strong" className="space-y-3 p-5 sm:p-6">
          <ShellEyebrow>{copy.frame.eyebrow}</ShellEyebrow>
          <h2 className="font-serif text-3xl tracking-[-0.05em] text-black sm:text-[2.35rem]">{copy.frame.title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-black/60">{copy.frame.body}</p>
          {error ? (
            <div className="rounded-[1.4rem] border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </GlassPanel>

        <GlassPanel as="section" className="space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <ShellEyebrow>{copy.queues.missing}</ShellEyebrow>
            <p className="text-sm leading-7 text-black/60">{copy.queues.missingBody}</p>
            <p className="text-sm leading-7 text-black/62">
              {missingLabels.length > 0 ? missingLabels.join(', ') : copy.labels.none}
            </p>
          </div>
          <Button asChild className="w-full rounded-full bg-[#171717] px-5 text-white hover:bg-black">
            <Link href="/app/discover">{copy.actions.discover}</Link>
          </Button>
        </GlassPanel>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GlassPanel as="article" className="space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <ShellEyebrow>{copy.queues.verify}</ShellEyebrow>
            <h3 className="font-serif text-[2rem] tracking-[-0.04em] text-black">{language === 'ko' ? '근거' : 'Evidence'}</h3>
            <p className="text-sm leading-7 text-black/60">{copy.queues.verifyBody}</p>
          </div>
          <Button asChild variant="outline" className="w-full rounded-full border-black/12 bg-white/70 px-5 text-black hover:bg-white">
            <Link href="/app/closet">{copy.actions.closet}</Link>
          </Button>
        </GlassPanel>

        <GlassPanel as="article" className="space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <ShellEyebrow>{copy.queues.execute}</ShellEyebrow>
            <h3 className="font-serif text-[2rem] tracking-[-0.04em] text-black">{language === 'ko' ? '실행' : 'Execution'}</h3>
            <p className="text-sm leading-7 text-black/60">{copy.queues.executeBody}</p>
          </div>
          <Button asChild className="w-full rounded-full bg-[#171717] px-5 text-white hover:bg-black">
            <Link href="/studio">{copy.actions.studio}</Link>
          </Button>
        </GlassPanel>

        <GlassPanel as="article" className="space-y-3 p-5 sm:p-6">
          <ShellEyebrow>{language === 'ko' ? '핵심 시그널' : 'Decision signals'}</ShellEyebrow>
          <ul className="space-y-2 text-sm leading-7 text-black/62">
            <li>
              {language === 'ko' ? '비어 있는 축:' : 'Missing axes:'} {missingLabels.length > 0 ? missingLabels.join(', ') : copy.labels.none}
            </li>
            <li>
              {language === 'ko' ? '현재 앵커:' : 'Current anchor:'} {mostCommonLabel || copy.labels.none}
            </li>
            <li>
              {language === 'ko' ? '중복 위험 축:' : 'Duplicate-risk axes:'}{' '}
              {closetSummary.duplicateRisk.length > 0
                ? closetSummary.duplicateRisk.map((category) => getClosetCategoryLabel(category, language)).join(', ')
                : copy.labels.none}
            </li>
            <li>
              {language === 'ko' ? '상태:' : 'State:'} {decisionState}
            </li>
          </ul>
        </GlassPanel>
      </section>

      {loading ? (
        <GlassPanel as="section" className="p-5 text-sm text-black/56">
          {language === 'ko' ? '의사결정 데이터 동기화 중...' : 'Syncing decision data...'}
        </GlassPanel>
      ) : null}
    </AppPageFrame>
  );
}
