'use client';
// r2026-10-04.73 — offline support: once Amoji is added to the home screen,
// the service worker serves the app shell (and everything already visited)
// from cache, so it opens without a connection. The LLM/TTS calls still need
// internet — the companion just says so when she's offline.
//
// Registered only in production builds; './sw.js' resolves against the page
// URL so it is basePath-safe both on GitHub Pages (/amoji-app) and dev (/).
//
// r164: when a new sw.js CACHE lands, nudge refresh — stale shell hid fixes.
import { useCallback, useEffect, useState } from 'react';
import { APP_REVISION } from '../lib/revision';

function watchForSwUpdate(reg: ServiceWorkerRegistration, onReady: () => void): void {
  const maybeReady = () => {
    if (reg.waiting && navigator.serviceWorker.controller) onReady();
  };
  maybeReady();
  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        onReady();
      }
    });
  });
}

export default function ServiceWorkerRegistrar() {
  const [updateReady, setUpdateReady] = useState(false);

  const applyUpdate = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    let alive = true;
    let removeVis: (() => void) | undefined;

    const probeLiveRevision = () => {
      void fetch(`./revision.txt?probe=${Date.now()}`, { cache: 'no-store' })
        .then((res) => res.text())
        .then((t) => {
          const live = t.trim();
          if (live && live !== APP_REVISION) setUpdateReady(true);
        })
        .catch(() => {
          /* optional file — never block the app */
        });
    };

    void navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        if (!alive) return;
        watchForSwUpdate(reg, () => {
          if (alive) setUpdateReady(true);
        });
        void reg.update();
        probeLiveRevision();
        const onVis = () => {
          if (document.visibilityState === 'visible') {
            void reg.update();
            probeLiveRevision();
          }
        };
        document.addEventListener('visibilitychange', onVis);
        removeVis = () => document.removeEventListener('visibilitychange', onVis);
      })
      .catch(() => {
        // Offline support is a progressive enhancement — never block the app.
      });

    return () => {
      alive = false;
      removeVis?.();
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto fixed bottom-3 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/20 bg-black/85 px-4 py-2 text-sm text-white shadow-lg backdrop-blur"
    >
      <span>Update ready · {APP_REVISION}</span>
      <button
        type="button"
        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black"
        onClick={applyUpdate}
      >
        Refresh
      </button>
    </div>
  );
}