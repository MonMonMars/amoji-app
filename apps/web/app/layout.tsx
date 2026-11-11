import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppleMeta from "../components/AppleMeta";
import DevModeGate from "../components/DevModeGate";
import JsonLd from "../components/JsonLd";
import LegalGate from "../components/LegalGate";
import ServiceWorkerRegistrar from "../components/ServiceWorkerRegistrar";
import UiClickSound from "../components/UiClickSound";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_OG_IMAGE,
  SITE_TITLE,
  SITE_URL,
} from "../lib/site";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Amoji",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Amoji",
  keywords: [...SITE_KEYWORDS],
  authors: [{ name: "MonMonMars", url: "https://github.com/MonMonMars/amoji-app" }],
  creator: "MonMonMars",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Amoji",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_OG_IMAGE,
        width: 512,
        height: 512,
        alt: "Amoji companion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  icons: {
    icon: `${BASE_PATH}/icon.svg`,
    apple: SITE_OG_IMAGE,
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
          r142 — the free lane races hosts, so the OVHcloud endpoint gets the
          same head start; otherwise it would pay the full handshake on the
          very first turn and always lose to Pollinations.
          r143 — OVH is where most of the free capacity now comes from (its
          quota is per model, so it rotates several), which makes this warm
          connection worth even more than before. Note Pollinations' one
          anonymous model is itself "GPT-OSS 20B (OVH)", so these two
          preconnects are not two vendors — they are two quotas on one
          upstream plus Puter, which loads its SDK on demand.
        */}
        <link rel="preconnect" href="https://text.pollinations.ai" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://text.pollinations.ai" />
        <link rel="preconnect" href="https://oai.endpoints.kepler.ai.cloud.ovh.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://oai.endpoints.kepler.ai.cloud.ovh.net" />
        <link rel="preconnect" href="https://speech.platform.bing.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://speech.platform.bing.com" />
        <JsonLd />
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
