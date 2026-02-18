import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import {
  assertFilesystemStorageAllowed,
  hasSupabaseAdminCredentials,
  serverConfig,
} from "@/lib/serverConfig";
import type { Json } from "@/lib/supabase.types";

export type OutfitPayload = {
  title: string;
  description?: string | null;
  previewImage: string;
  data: Json;
};

export type OutfitRecord = {
  id: string;
  share_slug: string;
  title: string;
  description?: string | null;
  preview_image: string;
  data: Json;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

const LOCAL_OUTFITS_PATH = serverConfig.outfitsStoragePath || path.join(process.cwd(), "data", "outfits.json");

const assertLocalOutfitStorageAllowed = () => {
  if (hasSupabaseAdminCredentials()) return;
  assertFilesystemStorageAllowed("outfits");
};

const ensureLocalStorageDir = async () => {
  assertLocalOutfitStorageAllowed();
  await fs.mkdir(path.dirname(LOCAL_OUTFITS_PATH), { recursive: true });
};

const readLocalOutfits = async (): Promise<OutfitRecord[]> => {
  await ensureLocalStorageDir();
  try {
    const raw = await fs.readFile(LOCAL_OUTFITS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as OutfitRecord[];
    return [];
  } catch {
    return [];
  }
};

const writeLocalOutfits = async (records: OutfitRecord[]) => {
  await ensureLocalStorageDir();
  await fs.writeFile(LOCAL_OUTFITS_PATH, JSON.stringify(records, null, 2));
};

const createLocalRecord = (payload: OutfitPayload, shareSlug: string): OutfitRecord => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    share_slug: shareSlug,
    title: payload.title,
    description: payload.description ?? null,
    preview_image: payload.previewImage,
    data: payload.data,
    is_public: true,
    created_at: now,
    updated_at: now,
  };
};

export const saveOutfit = async (payload: OutfitPayload, shareSlug: string) => {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data: outfit, error } = await supabase
      .from("outfits")
      .insert({
        share_slug: shareSlug,
        title: payload.title,
        description: payload.description ?? null,
        preview_image: payload.previewImage,
        data: payload.data,
        is_public: true,
      })
      .select("id, share_slug")
      .single();

    if (error || !outfit) {
      throw new Error("Failed to save outfit.");
    }

    return { id: outfit.id, shareSlug: outfit.share_slug, storage: "supabase" as const };
  }

  const records = await readLocalOutfits();
  const record = createLocalRecord(payload, shareSlug);
  records.push(record);
  await writeLocalOutfits(records);
  return { id: record.id, shareSlug: record.share_slug, storage: "local" as const };
};

export const getOutfitBySlug = async (slug: string) => {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("outfits")
      .select("title, description, preview_image, data, created_at")
      .eq("share_slug", slug)
      .eq("is_public", true)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  const records = await readLocalOutfits();
  const found = records.find((record) => record.share_slug === slug && record.is_public);
  if (!found) return null;
  return {
    title: found.title,
    description: found.description,
    preview_image: found.preview_image,
    data: found.data,
    created_at: found.created_at,
  };
};

export const listOutfits = async () => {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("outfits")
      .select("id, share_slug, title, preview_image, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data;
  }

  const records = await readLocalOutfits();
  return records
    .filter((record) => record.is_public)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((record) => ({
      id: record.id,
      share_slug: record.share_slug,
      title: record.title,
      preview_image: record.preview_image,
      created_at: record.created_at,
    }));
};

export const deleteOutfitById = async (id: string) => {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    await supabase.from("outfits").delete().eq("id", id);
    return;
  }

  const records = await readLocalOutfits();
  const nextRecords = records.filter((record) => record.id !== id);
  await writeLocalOutfits(nextRecords);
};
