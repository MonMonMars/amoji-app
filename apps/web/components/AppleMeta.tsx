'use client';
// r2026-10-04.71 — iOS Safari ignores the web manifest; these meta tags are
// what make "Add to Home Screen" launch Amoji fullscreen like a native app.
// App Router has no first-class slot for them, so a tiny effect injector:
// installation always happens after hydration, so client-side is fine.
import { useEffect } from 'react';

const TAGS: Array<[string, string]> = [
  ['apple-mobile-web-app-capable', 'yes'],
  ['apple-mobile-web-app-status-bar-style', 'default'],
  ['apple-mobile-web-app-title', 'Amoji'],
];

export default function AppleMeta() {
  useEffect(() => {
    for (const [name, content] of TAGS) {
      if (document.querySelector(`meta[name="${name}"]`)) continue;
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
    }
  }, []);
  return null;
}
