import type { PrimaryNavigationItem, ProductSurfaceId } from "@freestyle/shared-types";
import { legacyRedirects, primaryNavItems } from "../../route-map.mjs";

export const primaryNavigation: PrimaryNavigationItem[] = primaryNavItems.map((item) => ({
  ...item,
  id: item.id as ProductSurfaceId,
}));

const escapeRegExp = (value: string) => value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");

const pathPatternToRegExp = (pattern: string) =>
  new RegExp(`^${escapeRegExp(pattern).replace(/:([^/]+)/g, "[^/]+")}$`);

const legacyRedirectMatchers = legacyRedirects.map((entry) => ({
  ...entry,
  matcher: pathPatternToRegExp(entry.source),
}));

const resolveSurfaceFromHref = (href: string): ProductSurfaceId | null => {
  const match = primaryNavigation.find((item) => href === item.href || href.startsWith(`${item.href}/`));
  return match?.id ?? null;
};

export const resolveSurfaceFromPath = (pathname: string): ProductSurfaceId | null => {
  if (pathname.startsWith("/app/lab")) {
    return null;
  }

  const legacyRedirect = legacyRedirectMatchers.find((entry) => entry.matcher.test(pathname));
  if (legacyRedirect) {
    return resolveSurfaceFromHref(legacyRedirect.destination);
  }

  const directSurface = resolveSurfaceFromHref(pathname);
  if (directSurface) {
    return directSurface;
  }

  return null;
};

export const localizedNavigation = (language: "ko" | "en") =>
  primaryNavigation.map((item) => ({
    ...item,
    label: item.label[language],
  }));
