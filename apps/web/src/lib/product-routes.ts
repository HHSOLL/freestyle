import type { PrimaryNavigationItem, ProductSurfaceId } from "@freestyle/shared-types";

export const primaryNavigation: PrimaryNavigationItem[] = [
  { id: "closet", href: "/app/closet", label: { ko: "Closet", en: "Closet" } },
  { id: "fitting", href: "/app/fitting", label: { ko: "Fitting", en: "Fitting" } },
  { id: "canvas", href: "/app/canvas", label: { ko: "Canvas", en: "Canvas" } },
  { id: "community", href: "/app/community", label: { ko: "Community", en: "Community" } },
  { id: "profile", href: "/app/profile", label: { ko: "Profile", en: "Profile" } },
];

export const quarantinedLegacyRoutes = [
  { from: "/studio", to: "/app/fitting" },
  { from: "/trends", to: "/app/community" },
  { from: "/examples", to: "/app/community" },
  { from: "/how-it-works", to: "/app/community" },
  { from: "/profile", to: "/app/profile" },
  { from: "/app/looks", to: "/app/canvas" },
  { from: "/app/decide", to: "/app/closet" },
  { from: "/app/journal", to: "/app/profile" },
] as const;

export const resolveSurfaceFromPath = (pathname: string): ProductSurfaceId => {
  if (pathname.startsWith("/app/fitting")) return "fitting";
  if (pathname.startsWith("/app/canvas")) return "canvas";
  if (pathname.startsWith("/app/community") || pathname.startsWith("/app/discover")) return "community";
  if (pathname.startsWith("/app/profile")) return "profile";
  return "closet";
};

export const localizedNavigation = (language: "ko" | "en") =>
  primaryNavigation.map((item) => ({
    ...item,
    label: item.label[language],
  }));
