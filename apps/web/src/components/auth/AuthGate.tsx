"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/AuthContext";

type AuthGateProps = {
  title: string;
  description: string;
};

export function AuthGate({ title, description }: AuthGateProps) {
  const { isConfigured, isLoading, requestMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("이메일을 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      await requestMagicLink(email);
      setMessage("로그인 링크를 보냈습니다. 메일에서 링크를 열어주세요.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "로그인 링크를 보낼 수 없습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7f7f5] px-6 py-24">
      <div className="mx-auto max-w-xl rounded-[32px] border border-black/10 bg-white px-8 py-10 shadow-[0_30px_80px_-45px_rgba(0,0,0,0.45)]">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-black/35">Members Only</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-black">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-black/55">{description}</p>

        {!isConfigured ? (
          <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 가 설정되지 않았습니다.
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-black/45">
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-3 w-full rounded-2xl border border-black/10 bg-[#faf9f7] px-4 py-4 text-base text-black outline-none transition focus:border-black/30"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="inline-flex h-14 w-full items-center justify-center rounded-full bg-black px-6 text-sm font-bold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/25"
            >
              {isSubmitting ? "링크 전송 중..." : "이메일 로그인 링크 받기"}
            </button>

            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
          </form>
        )}
      </div>
    </div>
  );
}
