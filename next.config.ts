import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const resolveApiProxyOrigin = (value: string | undefined) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("BACKEND_ORIGIN must be a valid absolute URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("BACKEND_ORIGIN must use http or https.");
  }

  const pathname = trimTrailingSlash(parsed.pathname);
  const withoutApiSuffix = pathname.endsWith("/api") ? pathname.slice(0, -4) : pathname;
  const withoutV1Suffix = withoutApiSuffix.endsWith("/v1")
    ? withoutApiSuffix.slice(0, -3)
    : withoutApiSuffix;
  return `${parsed.origin}${withoutV1Suffix}`;
};

const apiProxyOrigin = resolveApiProxyOrigin(process.env.BACKEND_ORIGIN);

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
  async rewrites() {
    if (!apiProxyOrigin) {
      return [];
    }

    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${apiProxyOrigin}/v1/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
