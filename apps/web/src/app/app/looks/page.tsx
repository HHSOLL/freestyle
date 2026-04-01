'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthGate } from '@/components/auth/AuthGate';
import { GlassPanel, ShellEyebrow } from '@/components/layout/ShellPrimitives';
import { Button } from '@/components/ui/button';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import { InfoStrip } from '@/features/renewal-app/components/InfoStrip';
import { LookCard } from '@/features/renewal-app/components/LookCard';
import { summarizeCloset } from '@/features/renewal-app/hooks/useWardrobeSnapshot';
import { useWardrobeSnapshot } from '@/features/renewal-app/hooks/useWardrobeSnapshot';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

export default function LooksPage() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const { isLoading: isAuthLoading, user } = useAuth();

  const nextPath = searchParams.get('next');
  const safeNextPath = nextPath && nextPath.startsWith('/') ? nextPath : '/app/looks';
  const copy =
    language === 'ko'
      ? {
          gateTitle: '저장한 룩을 보려면 로그인하세요.',
          gateDescription: '저장본과 공유 링크는 같은 계정에 묶여야 다시 꺼내기 쉽습니다.',
          eyebrow: 'Looks',
          title: '저장한 조합을 다시 보고, 바로 다음 조합으로 이어갑니다.',
          description:
            'Looks는 더 이상 안내용 브리지 화면이 아니라 저장된 캔버스 결과를 다시 열고 정리하는 실제 허브입니다.',
          info: {
            looks: '저장본',
            latest: '가장 최근',
            coverage: '옷장 커버리지',
            status: '상태',
            none: '없음',
            ready: '준비됨',
            syncing: '동기화 중',
            issue: '점검 필요',
          },
          overview: {
            eyebrow: '저장 허브',
            title: '캔버스에서 만든 결과를 여기서 다시 정리합니다.',
            body: '공유 링크를 다시 열고, 최근 저장 흐름을 확인하고, 바로 다음 룩을 만들도록 연결하는 역할을 맡습니다.',
          },
          actions: {
            primary: '새 룩 만들기',
            secondary: '마이페이지 열기',
            retry: '다시 불러오기',
          },
          sections: {
            saved: '저장된 룩',
            savedTitle: '최근 저장본을 바로 다시 열 수 있어야 합니다.',
            savedEmpty: '아직 저장된 룩이 없습니다. 캔버스에서 조합을 저장하면 여기에 가장 먼저 나타납니다.',
            rail: '실행 레일',
            railTitle: '지금 바로 이어갈 다음 동작',
            railBody: '저장된 결과를 정리한 뒤 새 조합으로 자연스럽게 이어지는 흐름을 유지합니다.',
            missing: '비어 있는 축',
            missingNone: '핵심 카테고리가 모두 한 번씩은 채워져 있습니다.',
            history: '최근 저장',
            historyNone: '최근 저장 이력이 아직 없습니다.',
          },
          feedback: {
            copied: '공유 링크를 복사했습니다.',
            copyFailed: '공유 링크를 복사할 수 없습니다.',
            deleteFailed: '저장본을 삭제할 수 없습니다.',
          },
        }
      : {
          gateTitle: 'Sign in to view your saved looks.',
          gateDescription: 'Saved looks and share links are easiest to manage when they stay tied to one account.',
          eyebrow: 'Looks',
          title: 'Reopen saved compositions and move directly into the next one.',
          description:
            'Looks is now a real hub for saved canvas results instead of an informational bridge. Review, reopen, and continue from actual saved work.',
          info: {
            looks: 'Saved looks',
            latest: 'Latest save',
            coverage: 'Closet coverage',
            status: 'Status',
            none: 'None',
            ready: 'Ready',
            syncing: 'Syncing',
            issue: 'Needs review',
          },
          overview: {
            eyebrow: 'Saved hub',
            title: 'Canvas results come back here for reuse and cleanup.',
            body: 'This surface is responsible for reopening share links, keeping recent saves visible, and handing you straight back into the next composition.',
          },
          actions: {
            primary: 'Create a new look',
            secondary: 'Open My Page',
            retry: 'Reload looks',
          },
          sections: {
            saved: 'Saved looks',
            savedTitle: 'Recent saves should be ready to reopen without searching.',
            savedEmpty: 'No saved looks yet. Save a composition from Canvas and it will appear here first.',
            rail: 'Action rail',
            railTitle: 'The next move should stay obvious.',
            railBody: 'After reviewing saved work, this route should hand you directly into the next composition step.',
            missing: 'Missing axes',
            missingNone: 'Every core category has at least one item connected already.',
            history: 'Latest saved state',
            historyNone: 'There is no saved history yet.',
          },
          feedback: {
            copied: 'Share link copied.',
            copyFailed: 'Could not copy the share link.',
            deleteFailed: 'Could not delete the saved look.',
          },
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

  return <AuthenticatedLooksView language={language} />;
}

function AuthenticatedLooksView({ language }: { language: 'ko' | 'en' }) {
  const { looks, assets, loading, error, refresh, deleteLook } = useWardrobeSnapshot();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const closetSummary = summarizeCloset(assets);
  const latestLook = [...looks].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
  const copy =
    language === 'ko'
      ? {
          eyebrow: 'Looks',
          title: '저장한 조합을 다시 보고, 바로 다음 조합으로 이어갑니다.',
          description:
            'Looks는 더 이상 안내용 브리지 화면이 아니라 저장된 캔버스 결과를 다시 열고 정리하는 실제 허브입니다.',
          info: {
            looks: '저장본',
            latest: '가장 최근',
            coverage: '옷장 커버리지',
            status: '상태',
            none: '없음',
            ready: '준비됨',
            syncing: '동기화 중',
            issue: '점검 필요',
          },
          overview: {
            eyebrow: '저장 허브',
            title: '캔버스에서 만든 결과를 여기서 다시 정리합니다.',
            body: '공유 링크를 다시 열고, 최근 저장 흐름을 확인하고, 바로 다음 룩을 만들도록 연결하는 역할을 맡습니다.',
          },
          actions: {
            primary: '새 룩 만들기',
            secondary: '마이페이지 열기',
            retry: '다시 불러오기',
          },
          sections: {
            saved: '저장된 룩',
            savedTitle: '최근 저장본을 바로 다시 열 수 있어야 합니다.',
            savedEmpty: '아직 저장된 룩이 없습니다. 캔버스에서 조합을 저장하면 여기에 가장 먼저 나타납니다.',
            rail: '실행 레일',
            railTitle: '지금 바로 이어갈 다음 동작',
            railBody: '저장된 결과를 정리한 뒤 새 조합으로 자연스럽게 이어지는 흐름을 유지합니다.',
            missing: '비어 있는 축',
            missingNone: '핵심 카테고리가 모두 한 번씩은 채워져 있습니다.',
            history: '최근 저장',
            historyNone: '최근 저장 이력이 아직 없습니다.',
          },
          feedback: {
            copied: '공유 링크를 복사했습니다.',
            copyFailed: '공유 링크를 복사할 수 없습니다.',
            deleteFailed: '저장본을 삭제할 수 없습니다.',
          },
        }
      : {
          eyebrow: 'Looks',
          title: 'Reopen saved compositions and move directly into the next one.',
          description:
            'Looks is now a real hub for saved canvas results instead of an informational bridge. Review, reopen, and continue from actual saved work.',
          info: {
            looks: 'Saved looks',
            latest: 'Latest save',
            coverage: 'Closet coverage',
            status: 'Status',
            none: 'None',
            ready: 'Ready',
            syncing: 'Syncing',
            issue: 'Needs review',
          },
          overview: {
            eyebrow: 'Saved hub',
            title: 'Canvas results come back here for reuse and cleanup.',
            body: 'This surface is responsible for reopening share links, keeping recent saves visible, and handing you straight back into the next composition.',
          },
          actions: {
            primary: 'Create a new look',
            secondary: 'Open My Page',
            retry: 'Reload looks',
          },
          sections: {
            saved: 'Saved looks',
            savedTitle: 'Recent saves should be ready to reopen without searching.',
            savedEmpty: 'No saved looks yet. Save a composition from Canvas and it will appear here first.',
            rail: 'Action rail',
            railTitle: 'The next move should stay obvious.',
            railBody: 'After reviewing saved work, this route should hand you directly into the next composition step.',
            missing: 'Missing axes',
            missingNone: 'Every core category has at least one item connected already.',
            history: 'Latest saved state',
            historyNone: 'There is no saved history yet.',
          },
          feedback: {
            copied: 'Share link copied.',
            copyFailed: 'Could not copy the share link.',
            deleteFailed: 'Could not delete the saved look.',
          },
        };

  const latestSavedValue = latestLook
    ? new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(latestLook.createdAt))
    : copy.info.none;

  const coverageValue = `${Math.max(0, 5 - closetSummary.missing.length)}/5`;
  const statusValue = error ? copy.info.issue : loading ? copy.info.syncing : copy.info.ready;

  const handleCopyShare = async (slug: string) => {
    setActionMessage(null);
    setActionError(null);

    try {
      const shareUrl = `${window.location.origin}/share/${slug}`;
      await navigator.clipboard.writeText(shareUrl);
      setActionMessage(copy.feedback.copied);
    } catch {
      setActionError(copy.feedback.copyFailed);
    }
  };

  const handleDeleteLook = async (id: string) => {
    setActionMessage(null);
    setActionError(null);
    setDeletingId(id);

    try {
      await deleteLook(id);
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : copy.feedback.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppPageFrame
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      badge={
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-[#161616] px-5 text-white hover:bg-black">
            <Link href="/studio">{copy.actions.primary}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-black/12 bg-white/68 px-5 text-black hover:bg-white">
            <Link href="/app/profile">{copy.actions.secondary}</Link>
          </Button>
        </div>
      }
    >
      <InfoStrip
        items={[
          { label: copy.info.looks, value: String(looks.length) },
          { label: copy.info.latest, value: latestSavedValue },
          { label: copy.info.coverage, value: coverageValue },
          { label: copy.info.status, value: statusValue },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <GlassPanel as="section" tone="strong" className="space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <ShellEyebrow>{copy.overview.eyebrow}</ShellEyebrow>
            <h2 className="font-serif text-3xl tracking-[-0.05em] text-black sm:text-[2.35rem]">
              {copy.overview.title}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-black/60">{copy.overview.body}</p>
          </div>
          {actionMessage ? <p className="text-sm text-emerald-700">{actionMessage}</p> : null}
          {actionError || error ? (
            <div className="rounded-[1.6rem] border border-red-500/20 bg-red-50 px-4 py-4 text-sm text-red-700">
              {actionError ?? error}
            </div>
          ) : null}
        </GlassPanel>

        <GlassPanel as="section" className="space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <ShellEyebrow>{copy.sections.rail}</ShellEyebrow>
            <h2 className="font-serif text-3xl tracking-[-0.05em] text-black">{copy.sections.railTitle}</h2>
            <p className="text-sm leading-7 text-black/58">{copy.sections.railBody}</p>
          </div>
          <div className="space-y-3">
            <Button asChild className="w-full rounded-full bg-[#111111] px-5 text-white hover:bg-black">
              <Link href="/studio">{copy.actions.primary}</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full border-black/12 bg-white/72 px-5 text-black hover:bg-white"
              onClick={() => {
                void refresh();
              }}
              disabled={loading}
            >
              {copy.actions.retry}
            </Button>
          </div>
          <div className="space-y-3 border-t border-black/8 pt-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-black/34">{copy.sections.history}</p>
              <p className="mt-2 text-sm leading-6 text-black/62">
                {latestLook ? latestLook.title : copy.sections.historyNone}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-black/34">{copy.sections.missing}</p>
              <p className="mt-2 text-sm leading-6 text-black/62">
                {closetSummary.missing.length > 0 ? closetSummary.missing.join(', ') : copy.sections.missingNone}
              </p>
            </div>
          </div>
        </GlassPanel>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{copy.sections.saved}</p>
          <h2 className="font-serif text-3xl tracking-[-0.05em] text-black">{copy.sections.savedTitle}</h2>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <GlassPanel key={`looks-loading-${index}`} className="overflow-hidden p-0">
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
            {looks.map((look) => (
              <div
                key={look.id}
                className={deletingId === look.id ? 'pointer-events-none opacity-60 transition' : undefined}
              >
                <LookCard
                  look={look}
                  onCopyShare={handleCopyShare}
                  onDelete={handleDeleteLook}
                />
              </div>
            ))}
          </div>
        ) : (
          <GlassPanel as="section" className="space-y-4 p-6 sm:p-8">
            <p className="max-w-2xl text-sm leading-7 text-black/60">{copy.sections.savedEmpty}</p>
            <Button asChild className="rounded-full bg-[#161616] px-5 text-white hover:bg-black">
              <Link href="/studio">{copy.actions.primary}</Link>
            </Button>
          </GlassPanel>
        )}
      </section>
    </AppPageFrame>
  );
}
