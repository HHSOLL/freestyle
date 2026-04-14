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
  transpilePackages: [
    "@freestyle/contracts",
    "@freestyle/design-tokens",
    "@freestyle/shared",
    "@freestyle/shared-types",
    "@freestyle/shared-utils",
    "@freestyle/ui",
  ],
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
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
};

export default nextConfig;
