import type { NextConfig } from "next";

// AMOJI_EXPORT=1 produces a fully static build (apps/web/out) for GitHub Pages.
// AMOJI_BASE_PATH must match the repo name for project pages (e.g. /amoji-app);
// NEXT_PUBLIC_BASE_PATH is the same value, exposed to the browser for asset URLs.
//
// AMOJI_APP=1 produces the bundle that ships inside the App Store / Play Store
// wrapper. It implies the static export and additionally runs the post-build
// gate in scripts/store-bundle.mjs, which drops the internal QA pages and fails
// the build on any adult-content token in out/. The QA pages live in
// apps/web/dev-pages/ (not public/) because `next build` copies public/
// verbatim into out/ and Next has no option to exclude a file from that copy.
const isExport = process.env.AMOJI_EXPORT === "1";
const isApp = process.env.AMOJI_APP === "1";
const isStatic = isExport || isApp;
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
  ...(isStatic ? { output: "export" as const, images: { unoptimized: true } } : {}),
};

export default nextConfig;
