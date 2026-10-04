'use client';
// r2026-10-04.73 — offline support: once Amoji is added to the home screen,
// the service worker serves the app shell (and everything already visited)
// from cache, so it opens without a connection. The LLM/TTS calls still need
// internet — the companion just says so when she's offline.
//
// Registered only in production builds; './sw.js' resolves against the page
// URL so it is basePath-safe both on GitHub Pages (/amoji-app) and dev (/).
import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Offline support is a progressive enhancement — never block the app.
    });
  }, []);
  return null;
}
