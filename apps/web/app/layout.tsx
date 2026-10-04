import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppleMeta from "../components/AppleMeta";
import ServiceWorkerRegistrar from "../components/ServiceWorkerRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Amoji",
  description: "An emotional AI companion who laughs, sulks, and stays with you. 識笑、識嬲、識陪住你。",
  icons: {
    icon: "/icon.svg",
    apple: "/portraits/kizuna.png",
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
        <AppleMeta />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
