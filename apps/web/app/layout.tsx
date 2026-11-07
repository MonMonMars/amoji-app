import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppleMeta from "../components/AppleMeta";
import DevModeGate from "../components/DevModeGate";
import LegalGate from "../components/LegalGate";
import ServiceWorkerRegistrar from "../components/ServiceWorkerRegistrar";
import UiClickSound from "../components/UiClickSound";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Pages deploy sets NEXT_PUBLIC_BASE_PATH=/amoji-app; bare "/icon.svg" 404s there
// (live HTML emitted href="/icon.svg" → github.io root). Prefix like assetUrl.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: "Amoji",
  description: "An emotional AI companion who laughs, sulks, and stays with you. 識笑、識嬲、識陪住你。",
  icons: {
    icon: `${BASE_PATH}/icon.svg`,
    apple: "https://github.com/MonMonMars/amoji-app/releases/download/free-library-want-2026-10-12/a01-shino.png",
  },
};

// r2026-10-04.71 — installed-app shell: viewportFit cover lets the emotion
// engine paint edge-to-edge (notch + home-indicator areas included), and the
// dark theme colors the browser/standalone chrome.
export const viewport: Viewport = {
  themeColor: "#171717",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          r126 — speed tier: the browser warms DNS+TLS to the free LLM lane
          at page load (preconnect) so the first chat turn skips the ~1s
          handshake stall. Pollinations is warmed because it is the always-
          present fallback lane even when a keyed brain is configured.
          r142 — the free lane now races independent hosts, so the OVHcloud
          racer gets the same head start; otherwise it would pay the full
          handshake on the very first turn and always lose to Pollinations.
        */}
        <link rel="preconnect" href="https://text.pollinations.ai" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://text.pollinations.ai" />
        <link rel="preconnect" href="https://oai.endpoints.kepler.ai.cloud.ovh.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://oai.endpoints.kepler.ai.cloud.ovh.net" />
        <link rel="preconnect" href="https://speech.platform.bing.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://speech.platform.bing.com" />
        <AppleMeta />
        <ServiceWorkerRegistrar />
        <UiClickSound />
        <DevModeGate />
        <LegalGate />
        {children}
      </body>
    </html>
  );
}
