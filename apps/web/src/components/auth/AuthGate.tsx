"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/AuthContext";
import { appChromeCopy } from "@/features/renewal-app/content";
import { useLanguage } from "@/lib/LanguageContext";

type AuthGateProps = {
  title: string;
  description: string;
  nextPath?: string;
};

export function AuthGate({ title, description, nextPath }: AuthGateProps) {
  const { isConfigured, isLoading, requestMagicLink, signInWithProvider, socialAuth } = useAuth();
  const { language } = useLanguage();
  const copy = appChromeCopy[language].authGate;
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeProvider, setActiveProvider] = useState<"kakao" | "naver" | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage(copy.emailRequired);
      return;
    }

    try {
      setIsSubmitting(true);
      await requestMagicLink(email, nextPath);
      setMessage(copy.emailSent);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.emailSendFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialSignIn = async (provider: "kakao" | "naver") => {
    setMessage(null);
    setErrorMessage(null);

    try {
      setActiveProvider(provider);
      await signInWithProvider(provider, nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.socialStartFailed);
      setActiveProvider(null);
    }
  };

  const visibleProviders = [
    socialAuth.kakao ? "kakao" : null,
    socialAuth.naver ? "naver" : null,
  ].filter((provider): provider is "kakao" | "naver" => Boolean(provider));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7f7f5] px-6 py-24">
      <div className="mx-auto max-w-xl rounded-[32px] border border-black/10 bg-white px-8 py-10 shadow-[0_30px_80px_-45px_rgba(0,0,0,0.45)]">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-black/35">{copy.badge}</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-black">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-black/55">{description}</p>

        {!isConfigured ? (
          <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            {copy.missingConfig}
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {visibleProviders.length > 0 ? (
              <div className="space-y-3">
                {visibleProviders.includes("kakao") ? (
                  <button
                    type="button"
                    disabled={isLoading || activeProvider !== null}
                    onClick={() => {
                      void handleSocialSignIn("kakao");
                    }}
                    className="inline-flex h-14 w-full items-center justify-center rounded-full border border-[#f7d35f]/60 bg-[#fee500] px-6 text-sm font-extrabold text-[#191600] transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-black/5 disabled:text-black/35"
                  >
                    {activeProvider === "kakao" ? copy.kakaoLoading : copy.kakao}
                  </button>
                ) : null}
                {visibleProviders.includes("naver") ? (
                  <button
                    type="button"
                    disabled={isLoading || activeProvider !== null}
                    onClick={() => {
                      void handleSocialSignIn("naver");
                    }}
                    className="inline-flex h-14 w-full items-center justify-center rounded-full border border-[#00c73c]/20 bg-[#03c75a] px-6 text-sm font-extrabold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-black/5 disabled:text-black/35"
                  >
                    {activeProvider === "naver" ? copy.naverLoading : copy.naver}
                  </button>
                ) : null}
                {visibleProviders.length < 2 ? (
                  <p className="text-xs leading-5 text-black/40">
                    {copy.partialSocialHint}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-black/30">
              <span className="h-px flex-1 bg-black/10" />
              {copy.emailDivider}
              <span className="h-px flex-1 bg-black/10" />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-black/45">
                {copy.emailLabel}
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={copy.emailPlaceholder}
                  className="mt-3 w-full rounded-2xl border border-black/10 bg-[#faf9f7] px-4 py-4 text-base text-black outline-none transition focus:border-black/30"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting || isLoading || activeProvider !== null}
                className="inline-flex h-14 w-full items-center justify-center rounded-full bg-black px-6 text-sm font-bold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/25"
              >
                {isSubmitting ? copy.emailSubmitting : copy.emailSubmit}
              </button>
            </form>

            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
