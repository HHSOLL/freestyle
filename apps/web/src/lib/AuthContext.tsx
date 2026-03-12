"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { buildApiPath, setApiAccessToken } from "@/lib/clientApi";
import {
  getSocialAuthAvailability,
  getSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "@/lib/supabaseBrowser";

export type SocialAuthProvider = "kakao" | "naver";

type SocialAuthAvailability = Record<SocialAuthProvider, boolean>;

type AuthContextValue = {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  socialAuth: SocialAuthAvailability;
  requestMagicLink: (email: string, nextPath?: string) => Promise<void>;
  signInWithProvider: (provider: SocialAuthProvider, nextPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const normalizeNextPath = (nextPath?: string) => {
  if (!nextPath) return "/studio";
  if (!nextPath.startsWith("/")) return "/studio";
  return nextPath;
};

const buildCallbackUrl = (nextPath?: string) => {
  if (typeof window === "undefined") return undefined;
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", normalizeNextPath(nextPath));
  return url.toString();
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const isConfigured = isSupabaseBrowserConfigured();
  const socialAuth = useMemo(() => getSocialAuthAvailability(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured) {
      setApiAccessToken(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session ?? null);
        setApiAccessToken(data.session?.access_token ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
        setApiAccessToken(null);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setApiAccessToken(nextSession?.access_token ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const requestMagicLink = useCallback(async (email: string, nextPath?: string) => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      throw new Error("Email is required.");
    }

    if (!isConfigured) {
      throw new Error("Supabase auth is not configured.");
    }

    const supabase = getSupabaseBrowserClient();
    const redirectTo = buildCallbackUrl(nextPath);

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, [isConfigured]);

  const signInWithProvider = useCallback(async (provider: SocialAuthProvider, nextPath?: string) => {
    if (!isConfigured) {
      throw new Error("Supabase auth is not configured.");
    }

    const redirectTo = buildCallbackUrl(nextPath);
    if (!redirectTo) {
      throw new Error("Auth redirect origin is unavailable.");
    }

    if (provider === "kakao") {
      if (!socialAuth.kakao) {
        throw new Error("Kakao login is not configured.");
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.url) {
        throw new Error("Kakao login URL is unavailable.");
      }

      window.location.assign(data.url);
      return;
    }

    if (!socialAuth.naver) {
      throw new Error("Naver login is not configured.");
    }

    const startUrl = new URL(buildApiPath("/v1/auth/naver/start"), window.location.origin);
    startUrl.searchParams.set("redirect_to", redirectTo);
    window.location.assign(startUrl.toString());
  }, [isConfigured, socialAuth.kakao, socialAuth.naver]);

  const signOut = useCallback(async () => {
    if (!isConfigured) return;
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    setSession(null);
    setApiAccessToken(null);
  }, [isConfigured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured,
      isLoading,
      session,
      user: session?.user ?? null,
      socialAuth,
      requestMagicLink,
      signInWithProvider,
      signOut,
    }),
    [isConfigured, isLoading, requestMagicLink, session, signInWithProvider, signOut, socialAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
};
