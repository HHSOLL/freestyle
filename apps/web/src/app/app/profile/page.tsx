'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';
import { InfoStrip } from '@/features/renewal-app/components/InfoStrip';
import { LookCard } from '@/features/renewal-app/components/LookCard';
import { getClosetCategoryLabel, getWardrobeSourceLabel } from '@/features/renewal-app/data';
import { useWardrobeSnapshot } from '@/features/renewal-app/hooks/useWardrobeSnapshot';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

export default function AppProfilePage() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const { isLoading: isAuthLoading, user } = useAuth();
  const { looks, assets, loading } = useWardrobeSnapshot();
  const nextPath = searchParams.get('next');
  const safeNextPath = nextPath && nextPath.startsWith('/') ? nextPath : '/app/profile';
  const copy =
    language === 'ko'
      ? {
          gateTitle: '옷장 동기화를 위해 로그인하세요.',
          gateDescription: '옷장 히스토리와 저장된 작업은 같은 계정으로 묶일 때 훨씬 관리하기 쉬워집니다.',
          eyebrow: '마이페이지',
          title: '계정, 저장 자산, 핵심 진입점을 한 곳에서 봅니다.',
          description: '마이페이지는 계정 상태와 최근 저장 자산, 캔버스 작업 흐름으로 빠르게 돌아가는 개인 허브입니다.',
          info: ['로그인 사용자', '저장된 캔버스', '옷장 아이템', '상태'],
          accountFallback: '멤버',
          syncing: '동기화 중',
          ready: '준비됨',
          account: {
            eyebrow: '계정',
            body: '이 계정은 이제 옷장 시스템의 정식 진입점입니다. 저장된 캔버스 결과와 옷장 아이템, 이후 개인 히스토리가 여기로 모입니다.',
          },
          quickActions: {
            eyebrow: '빠른 작업',
            closet: '옷장 열기',
            looks: '캔버스 열기',
            create: '발견 열기',
          },
          recentLooks: {
            eyebrow: '최근 저장본',
            title: '저장한 캔버스 결과를 다시 꺼낼 수 있어야 합니다.',
            empty: '저장된 캔버스 결과가 아직 없습니다. 캔버스에서 작업을 저장하면 여기에 가장 먼저 보입니다.',
          },
          closetSnapshot: {
            eyebrow: '옷장 스냅샷',
            title: '최근 아이템과 카테고리는 같은 정체성에 계속 붙어 있어야 합니다.',
            empty: '이 계정에 연결된 옷장 아이템이 아직 없습니다.',
          },
          open: '열기',
        }
      : {
          gateTitle: 'Sign in to keep your wardrobe synced',
          gateDescription: 'Closet history and saved work become much easier to manage once they follow the same account across devices.',
          eyebrow: 'My Page',
          title: 'Account, saved assets, and your core entry points',
          description: 'My Page is the personal hub for account state, recent saved canvas work, and wardrobe access.',
          info: ['Signed in as', 'Saved canvases', 'Closet items', 'Status'],
          accountFallback: 'Member',
          syncing: 'Syncing',
          ready: 'Ready',
          account: {
            eyebrow: 'Account',
            body: 'This account is now the canonical entry point for the wardrobe system. Saved canvas results, closet pieces, and future personal history converge here.',
          },
          quickActions: {
            eyebrow: 'Quick actions',
            closet: 'Open closet',
            looks: 'Open canvas',
            create: 'Open discover',
          },
          recentLooks: {
            eyebrow: 'Recent saves',
            title: 'Saved canvas results should stay close at hand.',
            empty: 'No saved canvas results yet. Save a canvas from the workspace and it will show up here first.',
          },
          closetSnapshot: {
            eyebrow: 'Closet snapshot',
            title: 'Recent pieces and categories stay attached to the same identity.',
            empty: 'No closet items are attached to this account yet.',
          },
          open: 'Open',
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

  return (
    <AppPageFrame
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
    >
      <InfoStrip
        items={[
          { label: copy.info[0], value: user.email?.split('@')[0] ?? copy.accountFallback },
          { label: copy.info[1], value: String(looks.length) },
          { label: copy.info[2], value: String(assets.length) },
          { label: copy.info[3], value: loading ? copy.syncing : copy.ready },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="border border-black/8 bg-white px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{copy.account.eyebrow}</p>
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.05em] text-black">
            {user.email ?? (language === 'ko' ? 'FreeStyle 멤버' : 'FreeStyle member')}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/58">{copy.account.body}</p>
        </div>

        <div className="flex flex-col gap-3 border border-black/8 bg-[#121212] px-5 py-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{copy.quickActions.eyebrow}</p>
          <Button asChild className="rounded-full bg-white px-5 text-black hover:bg-white/90">
            <Link href="/app/closet">{copy.quickActions.closet}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white">
            <Link href="/studio">{copy.quickActions.looks}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white">
            <Link href="/app/discover">{copy.quickActions.create}</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{copy.recentLooks.eyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl tracking-[-0.05em] text-black">{copy.recentLooks.title}</h2>
          </div>
          {looks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {looks.slice(0, 2).map((look) => (
                <LookCard key={look.id} look={look} />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-black/20 px-5 py-10 text-sm leading-7 text-black/58">
              {copy.recentLooks.empty}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/36">{copy.closetSnapshot.eyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl tracking-[-0.05em] text-black">{copy.closetSnapshot.title}</h2>
          </div>
          <div className="border border-black/8 bg-white">
            {assets.slice(0, 4).map((asset) => (
              <div key={asset.id} className="flex items-center justify-between gap-4 border-b border-black/8 px-5 py-4 last:border-b-0">
                <div>
                  <p className="font-semibold text-black">{asset.name}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-black/38">
                    {getClosetCategoryLabel(asset.category, language)} · {getWardrobeSourceLabel(asset.source, language)}
                  </p>
                </div>
                <Link href={`/app/closet/item/${asset.id}`} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56 transition hover:text-black">
                  {copy.open}
                </Link>
              </div>
            ))}
            {assets.length === 0 ? (
              <div className="px-5 py-10 text-sm leading-7 text-black/58">
                {copy.closetSnapshot.empty}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </AppPageFrame>
  );
}
