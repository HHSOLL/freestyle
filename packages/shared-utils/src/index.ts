import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;

export const roundTo = (value: number, digits = 2) => {
  const precision = 10 ** digits;
  return Math.round(value * precision) / precision;
};

export const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

type BrowserStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

const getStorage = (): BrowserStorage | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

export const readStoredJson = <T>(key: string, fallback: T): T => {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeStoredJson = <T>(key: string, value: T) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
};

export const removeStoredJson = (key: string) => {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(key);
};

export const rgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return `rgba(0,0,0,${alpha})`;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
