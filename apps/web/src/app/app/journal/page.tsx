'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthGate } from '@/components/auth/AuthGate';
import { GlassPanel, ShellEyebrow } from '@/components/layout/ShellPrimitives';
import { Button } from '@/components/ui/button';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import { InfoStrip } from '@/features/renewal-app/components/InfoStrip';
import { LookCard } from '@/features/renewal-app/components/LookCard';
import { formatWardrobeDate, getClosetCategoryLabel, getWardrobeSourceLabel } from '@/features/renewal-app/data';
import { useWardrobeSnapshot } from '@/features/renewal-app/hooks/useWardrobeSnapshot';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

export default function JournalPage() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const { isLoading: isAuthLoading, user } = useAuth();

  const nextPath = searchParams.get('next');
  const safeNextPath = nextPath && nextPath.startsWith('/') ? nextPath : '/app/journal';
  const copy =
    language === 'ko'
      ? {
          gateTitle: '저장 히스토리를 보려면 로그인하세요.',
          gateDescription: '저장본, 자산 변화, 최근 작업 흐름은 같은 계정에 묶여야 다시 따라가기 쉽습니다.',
        }
      : {
          gateTitle: 'Sign in to view your saved history.',
          gateDescription: 'Saved work, asset changes, and recent activity are easiest to follow when they stay tied to one account.',
        };

  if (isAuthLoading) {
    return <div className="min-h-[calc(100vh-4rem)]" />;
  }

  if (!user) {
    return (
      <AuthGate
        title={copy.gateTitle}
        description={copy.gateDescription}
        nextPath={safeNextPath}
      />
    );
  }

  return <AuthenticatedJournalView language={language} />;
}

function AuthenticatedJournalView({ language }: { language: 'ko' | 'en' }) {
  const { looks, assets, loading, error, refresh } = useWardrobeSnapshot();
  const latestLook = [...looks].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
  const latestAssets = [...assets].slice(0, 4);
  const copy =
    language === 'ko'
      ? {
          eyebrow: 'Journal',
          title: '저장과 자산 변화가 한 줄의 히스토리로 이어져야 합니다.',
          description:
            'Journal은 더 이상 설명용 브리지 화면이 아니라, 최근 저장본과 연결 자산을 함께 읽고 다음 작업으로 이어지는 실제 history hub입니다.',
          info: {
            looks: '저장본',
            assets: '연결 자산',
            lastSaved: '최근 저장',
            state: '상태',
            none: '없음',
            ready: '준비됨',
            syncing: '동기화 중',
            issue: '점검 필요',
          },
          overview: {
            eyebrow: 'History hub',
            title: '최근 저장 흐름과 자산 변화를 한 화면에서 다시 읽습니다.',
            body: '캔버스에서 만든 결과, 옷장에서 연결된 자산, 계정 단위 히스토리를 한 줄로 보고 다음 액션을 바로 결정하도록 구성합니다.',
          },
          actions: {
            primary: '캔버스 열기',
            secondary: '마이페이지 열기',
            tertiary: '옷장 열기',
            retry: '히스토리 새로고침',
          },
          sections: {
            history: '최근 저장 히스토리',
            historyTitle: '최근 결과를 바로 다시 열 수 있어야 합니다.',
            historyEmpty: '아직 저장된 히스토리가 없습니다. 캔버스에서 결과를 저장하면 여기에 가장 먼저 쌓입니다.',
            assets: '최근 연결 자산',
            assetsTitle: '히스토리는 자산 변화와 같이 읽혀야 합니다.',
            assetsEmpty: '아직 연결된 자산이 없습니다.',
            rail: '다음 액션',
            railTitle: '히스토리를 본 다음 바로 다음 작업으로 이어갑니다.',
            railBody: '기록은 멈춰 있는 문서가 아니라, 저장본 정리와 다음 조합 실행을 연결하는 중간 허브여야 합니다.',
          },
        }
      : {
          eyebrow: 'Journal',
          title: 'Saved outcomes and asset changes should read like one continuous history.',
          description:
            'Journal is now a real history hub where saved looks and attached assets stay visible together before you move into the next action.',
          info: {
            looks: 'Saved looks',
            assets: 'Linked assets',
            lastSaved: 'Latest save',
            state: 'State',
            none: 'None',
            ready: 'Ready',
            syncing: 'Syncing',
            issue: 'Needs review',
          },
          overview: {
            eyebrow: 'History hub',
            title: 'Read recent saved work and asset changes on one surface.',
            body: 'Canvas outcomes, closet-linked assets, and account history stay together so the next action can be chosen without context switching.',
          },
          actions: {
            primary: 'Open canvas',
            secondary: 'Open My Page',
            tertiary: 'Open closet',
            retry: 'Reload history',
          },
          sections: {
            history: 'Recent history',
            historyTitle: 'Recent saved outcomes should be ready to reopen.',
            historyEmpty: 'No saved history yet. Save a canvas result and it will appear here first.',
            assets: 'Recent linked assets',
            assetsTitle: 'History should stay attached to asset changes.',
            assetsEmpty: 'No linked assets yet.',
            rail: 'Next action',
            railTitle: 'Move directly from history into the next task.',
            railBody: 'History should not be a static document. It should connect saved work to the next composition step.',
          },
        };

  const statusValue = error ? copy.info.issue : loading ? copy.info.syncing : copy.info.ready;
  const latestSavedValue = latestLook ? formatWardrobeDate(latestLook.createdAt, language) : copy.info.none;

  return (
    <AppPageFrame
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      badge={
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-[#171717] px-5 text-white hover:bg-black">
            <Link href="/studio">{copy.actions.primary}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-black/12 bg-white/70 px-5 text-black hover:bg-white">
            <Link href="/app/profile">{copy.actions.secondary}</Link>
          </Button>
        </div>
      }
    >
      <InfoStrip
        items={[
          { label: copy.info.looks, value: String(looks.length) },
          { label: copy.info.assets, value: String(assets.length) },
          { label: copy.info.lastSaved, value: latestSavedValue },
          { label: copy.info.state, value: statusValue },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <GlassPanel as="section" tone="strong" className="space-y-3 p-5 sm:p-6">
          <ShellEyebrow>{copy.overview.eyebrow}</ShellEyebrow>
          <h2 className="font-serif text-3xl tracking-[-0.05em] text-black sm:text-[2.35rem]">{copy.overview.title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-black/60">{copy.overview.body}</p>
          {error ? (
            <div className="rounded-[1.4rem] border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </GlassPanel>

        <GlassPanel as="section" className="space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <ShellEyebrow>{copy.sections.rail}</ShellEyebrow>
            <h2 className="font-serif text-3xl tracking-[-0.05em] text-black">{copy.sections.railTitle}</h2>
            <p className="text-sm leading-7 text-black/58">{copy.sections.railBody}</p>
          </div>
          <div className="space-y-3">
            <Button asChild className="w-full rounded-full bg-[#171717] px-5 text-white hover:bg-black">
              <Link href="/studio">{copy.actions.primary}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-full border-black/12 bg-white/70 px-5 text-black hover:bg-white">
              <Link href="/app/closet">{copy.actions.tertiary}</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full border-black/12 bg-white/70 px-5 text-black hover:bg-white"
              onClick={() => {
                void refresh();
              }}
              disabled={loading}
            >
              {copy.actions.retry}
            </Button>
          </div>
        </GlassPanel>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{copy.sections.history}</p>
          <h2 className="font-serif text-3xl tracking-[-0.05em] text-black">{copy.sections.historyTitle}</h2>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <GlassPanel key={`journal-loading-${index}`} className="overflow-hidden p-0">
                <div className="aspect-[3/4] animate-pulse bg-black/6" />
                <div className="space-y-3 p-4">
                  <div className="h-3 w-16 animate-pulse rounded-full bg-black/8" />
                  <div className="h-7 w-2/3 animate-pulse rounded-full bg-black/10" />
                  <div className="h-3 w-24 animate-pulse rounded-full bg-black/8" />
                </div>
              </GlassPanel>
            ))}
          </div>
        ) : looks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {looks.slice(0, 3).map((look) => (
              <LookCard key={look.id} look={look} />
            ))}
          </div>
        ) : (
          <GlassPanel as="section" className="space-y-4 p-6 sm:p-8">
            <p className="max-w-2xl text-sm leading-7 text-black/60">{copy.sections.historyEmpty}</p>
            <Button asChild className="rounded-full bg-[#171717] px-5 text-white hover:bg-black">
              <Link href="/studio">{copy.actions.primary}</Link>
            </Button>
          </GlassPanel>
        )}
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{copy.sections.assets}</p>
          <h2 className="font-serif text-3xl tracking-[-0.05em] text-black">{copy.sections.assetsTitle}</h2>
        </div>

        {latestAssets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {latestAssets.map((asset) => (
              <GlassPanel key={asset.id} as="article" className="space-y-3 p-5">
                <div>
                  <p className="font-semibold text-black">{asset.name}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/40">
                    {getClosetCategoryLabel(asset.category, language)} · {getWardrobeSourceLabel(asset.source, language)}
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full rounded-full border-black/12 bg-white/70 px-4 text-black hover:bg-white">
                  <Link href={`/app/closet/item/${asset.id}`}>{copy.actions.tertiary}</Link>
                </Button>
              </GlassPanel>
            ))}
          </div>
        ) : (
          <GlassPanel as="section" className="space-y-4 p-6 sm:p-8">
            <p className="max-w-2xl text-sm leading-7 text-black/60">{copy.sections.assetsEmpty}</p>
            <Button asChild variant="outline" className="rounded-full border-black/12 bg-white/70 px-5 text-black hover:bg-white">
              <Link href="/app/closet">{copy.actions.tertiary}</Link>
            </Button>
          </GlassPanel>
        )}
      </section>
    </AppPageFrame>
  );
}
