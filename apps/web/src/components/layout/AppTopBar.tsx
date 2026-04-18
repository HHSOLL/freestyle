"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ProductSurfaceId } from "@freestyle/shared-types";
import { wardrobeTokens } from "@freestyle/design-tokens";
import { cn } from "@freestyle/shared-utils";
import { PillButton, SurfacePanel } from "@freestyle/ui";
import type { SocialAuthProvider } from "@/lib/AuthContext";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { localizedNavigation, resolveSurfaceFromPath } from "@/lib/product-routes";

type AppTopBarProps = {
  activeSurface?: ProductSurfaceId | null;
  className?: string;
};

const topBarCopy = {
  ko: {
    login: "로그인",
    logout: "로그아웃",
    account: "내 계정",
    authTitle: "로그인",
    authBody: "옷장, 캔버스, 저장된 룩을 계정에 연결합니다.",
    authUnavailable: "이 환경에서는 Supabase 인증이 아직 설정되지 않았습니다.",
    emailLabel: "이메일 링크",
    emailPlaceholder: "you@example.com",
    emailSubmit: "링크 보내기",
    emailSent: "로그인 링크를 보냈습니다. 메일에서 열어주세요.",
    close: "닫기",
    kakao: "카카오",
    naver: "네이버",
  },
  en: {
    login: "Login",
    logout: "Logout",
    account: "My account",
    authTitle: "Login",
    authBody: "Connect Closet, Canvas, and saved looks to your account.",
    authUnavailable: "Supabase auth is not configured in this environment yet.",
    emailLabel: "Email link",
    emailPlaceholder: "you@example.com",
    emailSubmit: "Send magic link",
    emailSent: "We sent a login link. Open it from your email.",
    close: "Close",
    kakao: "Kakao",
    naver: "Naver",
  },
} as const;

export function AppTopBar({ activeSurface, className }: AppTopBarProps) {
  const pathname = usePathname();
  const resolvedSurface = activeSurface === undefined ? resolveSurfaceFromPath(pathname) : activeSurface;
  const showPrimaryNavigation = resolvedSurface !== null;
  const { language, setLanguage } = useLanguage();
  const { isConfigured, isLoading, user, socialAuth, requestMagicLink, signInWithProvider, signOut } = useAuth();
  const navigation = localizedNavigation(language);
  const copy = topBarCopy[language];
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAuth = () => {
    setError(null);
    setFeedback(null);
    setIsAuthOpen(true);
  };

  const closeAuth = () => {
    setIsAuthOpen(false);
    setError(null);
    setFeedback(null);
  };

  const handleSocialLogin = async (provider: SocialAuthProvider) => {
    setError(null);
    setFeedback(null);
    setIsSubmitting(true);
    try {
      await signInWithProvider(provider, pathname);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not start sign-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setIsSubmitting(true);
    try {
      await requestMagicLink(email, pathname);
      setFeedback(copy.emailSent);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not send the login link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOut();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not sign out.");
    }
  };

  return (
    <>
      <header
        className={cn("sticky top-0 z-50 border-b border-black/6 bg-[rgba(223,227,232,0.82)] backdrop-blur-[18px]", className)}
      >
        <div className="mx-auto flex max-w-[1720px] items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="min-w-0 no-underline">
            <div className="flex items-center gap-3">
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-semibold tracking-[0.22em]"
                style={{
                  background: "rgba(255,255,255,0.86)",
                  border: `1px solid ${wardrobeTokens.color.dividerStrong}`,
                }}
              >
                FS
              </div>
              <div className="hidden min-w-0 sm:block">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--fs-text-faint)]">FreeStyle</div>
                <div className="truncate text-[13px] font-semibold text-[var(--fs-text)]">Wardrobe workspace</div>
              </div>
            </div>
          </Link>

          {showPrimaryNavigation ? (
            <nav className="mx-auto hidden min-w-0 items-center gap-1 md:flex">
              {navigation.map((item) => {
                const isActive = resolvedSurface === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="rounded-full px-4 py-2 text-[12px] font-semibold no-underline transition"
                    style={{
                      background: isActive ? wardrobeTokens.color.accent : "transparent",
                      color: isActive ? "#ffffff" : wardrobeTokens.color.textMuted,
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div className="mx-auto hidden min-w-0 items-center md:flex" />
          )}

          <div className="ml-auto flex items-center gap-2">
            <SurfacePanel className="hidden items-center gap-1 rounded-full px-1 py-1 sm:flex">
              <PillButton active={language === "ko"} onClick={() => setLanguage("ko")} className="px-3 py-1.5">
                KO
              </PillButton>
              <PillButton active={language === "en"} onClick={() => setLanguage("en")} className="px-3 py-1.5">
                EN
              </PillButton>
            </SurfacePanel>

            {user ? (
              <>
                <Link href="/app/profile" className="hidden no-underline sm:block">
                  <SurfacePanel className="rounded-full px-4 py-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fs-text-muted)]">
                      {copy.account}
                    </div>
                    <div className="max-w-[180px] truncate text-[12px] font-semibold text-[var(--fs-text)]">
                      {user.email ?? copy.account}
                    </div>
                  </SurfacePanel>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-full border border-black/8 bg-white/68 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#151b24]"
                >
                  {copy.logout}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openAuth}
                className="rounded-full border border-black/8 bg-[#c8def8] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#243040]"
              >
                {copy.login}
              </button>
            )}
          </div>
        </div>

        {showPrimaryNavigation ? (
          <div className="border-t border-black/5 px-4 py-2 md:hidden">
            <div className="mx-auto flex max-w-[1720px] items-center gap-2 overflow-x-auto">
              {navigation.map((item) => {
                const isActive = resolvedSurface === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold no-underline"
                    style={{
                      background: isActive ? wardrobeTokens.color.accent : "rgba(255,255,255,0.56)",
                      color: isActive ? "#ffffff" : wardrobeTokens.color.textMuted,
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </header>

      {isAuthOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(13,18,24,0.36)] px-4 backdrop-blur-[10px]">
          <SurfacePanel className="w-full max-w-[420px] rounded-[32px] px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fs-text-faint)]">
                  FreeStyle
                </div>
                <h2 className="mt-2 text-[28px] font-semibold text-[#151b24]">{copy.authTitle}</h2>
                <p className="mt-2 text-[13px] leading-6 text-black/48">{copy.authBody}</p>
              </div>
              <button
                type="button"
                onClick={closeAuth}
                className="rounded-full border border-black/8 bg-white/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/44"
              >
                {copy.close}
              </button>
            </div>

            {!isConfigured ? (
              <div className="mt-5 rounded-[22px] border border-black/8 bg-white/60 px-4 py-4 text-[13px] leading-6 text-black/52">
                {copy.authUnavailable}
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {(["kakao", "naver"] as const).map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      disabled={!socialAuth[provider] || isSubmitting}
                      onClick={() => handleSocialLogin(provider)}
                      className="rounded-[22px] border border-black/8 bg-white/62 px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/34">
                        {provider === "kakao" ? copy.kakao : copy.naver}
                      </div>
                      <div className="mt-2 text-[14px] font-semibold text-[#151b24]">
                        {provider === "kakao" ? copy.kakao : copy.naver}
                      </div>
                    </button>
                  ))}
                </div>

                <form className="mt-4 space-y-3" onSubmit={handleEmailLogin}>
                  <label className="block">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/34">
                      {copy.emailLabel}
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={copy.emailPlaceholder}
                      className="h-12 w-full rounded-[18px] border border-black/8 bg-white/74 px-4 text-[14px] outline-none placeholder:text-black/26"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isSubmitting || !email.trim()}
                    className="w-full rounded-[18px] border border-black/8 bg-[#c8def8] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#243040] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {copy.emailSubmit}
                  </button>
                </form>
              </>
            )}

            {isLoading ? (
              <div className="mt-4 text-[12px] text-black/42">Loading session…</div>
            ) : null}
            {feedback ? <div className="mt-4 text-[12px] text-[#304e77]">{feedback}</div> : null}
            {error ? <div className="mt-4 text-[12px] text-[#8a3f4d]">{error}</div> : null}
          </SurfacePanel>
        </div>
      ) : null}
    </>
  );
}
