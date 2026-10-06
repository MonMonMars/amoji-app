import type { NextConfig } from "next";

// AMOJI_EXPORT=1 produces a fully static build (apps/web/out) for GitHub Pages.
// AMOJI_BASE_PATH must match the repo name for project pages (e.g. /amoji-app);
// NEXT_PUBLIC_BASE_PATH is the same value, exposed to the browser for asset URLs.
const isExport = process.env.AMOJI_EXPORT === "1";
const basePath = process.env.AMOJI_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  transpilePackages: ["@amoji/emotion-core", "@amoji/vrm-renderer"],
  basePath,
  // SDK sources import siblings with .js extensions (required for published Node ESM);
  // webpack must map those back to .ts when bundling from source.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
  ...(isExport ? { output: "export" as const, images: { unoptimized: true } } : {}),
};

export default nextConfig;
