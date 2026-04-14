"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

const browserEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "",
};

export const isSupabaseBrowserConfigured = () =>
  Boolean(browserEnv.supabaseUrl && browserEnv.supabaseAnonKey);

export const getSupabaseBrowserClient = () => {
  if (browserClient) return browserClient;

  const url = browserEnv.supabaseUrl || null;
  const anonKey = browserEnv.supabaseAnonKey || null;

  if (!url || !anonKey) {
    throw new Error("Supabase browser environment variables are not configured.");
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
};
