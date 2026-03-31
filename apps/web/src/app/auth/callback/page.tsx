"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { appChromeCopy } from "@/features/renewal-app/content";
import { useLanguage } from "@/lib/LanguageContext";

const normalizeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/")) return "/app";
  return value;
};

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConfigured, isLoading, user } = useAuth();
  const { language } = useLanguage();
  const copy = appChromeCopy[language].authCallback;

  const nextPath = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams]);
  const errorMessage = searchParams.get("error_description") || searchParams.get("error");

  useEffect(() => {
    if (errorMessage) return;
    if (!isConfigured || isLoading || !user) return;

    const timeout = window.setTimeout(() => {
      router.replace(nextPath);
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [errorMessage, isConfigured, isLoading, nextPath, router, user]);

  return (
    <div className="mx-auto max-w-xl rounded-[32px] border border-black/10 bg-white px-8 py-10 shadow-[0_30px_80px_-45px_rgba(0,0,0,0.45)]">
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-black/35">{copy.badge}</p>
      <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-black">
        {errorMessage ? copy.failedTitle : copy.checkingTitle}
      </h1>
      <p className="mt-4 text-sm leading-6 text-black/55">
        {errorMessage
          ? errorMessage
          : user
            ? copy.confirmedBody
            : copy.checkingBody}
      </p>
    </div>
  );
}

function AuthCallbackFallback() {
  const { language } = useLanguage();
  const copy = appChromeCopy[language].authCallback;

  return (
    <div className="mx-auto max-w-xl rounded-[32px] border border-black/10 bg-white px-8 py-10 shadow-[0_30px_80px_-45px_rgba(0,0,0,0.45)]">
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-black/35">{copy.badge}</p>
      <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-black">{copy.checkingTitle}</h1>
      <p className="mt-4 text-sm leading-6 text-black/55">
        {copy.checkingBody}
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7f7f5] px-6 py-24">
      <Suspense fallback={<AuthCallbackFallback />}>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
