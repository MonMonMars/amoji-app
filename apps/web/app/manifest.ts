import type { MetadataRoute } from "next";

// r2026-10-04.71 — installable app: "Add to Home Screen" launches Amoji
// fullscreen like a native app (no browser chrome). All URLs are relative to
// the manifest so one build works both on GitHub Pages (/amoji-app basePath)
// and local dev (/).
//
// r2026-10-04.72 — with output: 'export', Next.js refuses to collect any
// metadata route that hasn't declared itself static (the pages build failed
// with: 'dynamic = "force-static"/revalidate not configured on route
// "/manifest.webmanifest" with "output: export"').
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amoji",
    short_name: "Amoji",
    description: "An emotional AI companion who laughs, sulks, and stays with you.",
    start_url: ".",
    scope: ".",
    display: "standalone",
    background_color: "#171717",
    theme_color: "#171717",
    icons: [
      { src: "./icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "./portraits/kizuna.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
