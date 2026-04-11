"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "ko" | "en";

type TranslationMap = Record<string, { ko: string; en: string }>;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, fallback?: string) => string;
};

const LANGUAGE_STORAGE_KEY = "freestyle-language";

const translations: TranslationMap = {
  "nav.closet": { ko: "Closet", en: "Closet" },
  "nav.fitting": { ko: "Fitting", en: "Fitting" },
  "nav.canvas": { ko: "Canvas", en: "Canvas" },
  "nav.discover": { ko: "Discover", en: "Discover" },
  "nav.profile": { ko: "Profile", en: "Profile" },
  "surface.lab": { ko: "Lab", en: "Lab" },
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const resolveStoredLanguage = (): Language | null => {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return value === "ko" || value === "en" ? value : null;
};

export function LanguageProvider({
  children,
  initialLanguage = "en",
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(() => resolveStoredLanguage() ?? initialLanguage);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.cookie = `${LANGUAGE_STORAGE_KEY}=${language}; path=/; max-age=31536000; samesite=lax`;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: (key, fallback) => translations[key]?.[language] ?? fallback ?? key,
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
