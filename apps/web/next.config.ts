import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_ORIGIN?.trim();
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
  outputFileTracingRoot: workspaceRoot,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },
  async rewrites() {
    if (!backendOrigin) return [];
    const normalized = backendOrigin.replace(/\/$/, "");
    return [
      {
        source: "/v1/:path*",
        destination: `${normalized}/v1/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${normalized}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
