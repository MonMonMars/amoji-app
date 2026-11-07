'use client';
// Shown when the 3D layer cannot run (WebGL missing / model failed to load).
// This is the message a user sees at the worst possible moment, so it has to be
// in their language — it was hardcoded English on an otherwise translated app.
import { t, type Lang } from '../lib/prefs';

export default function FallbackNotice({
  reason,
  lang,
}: {
  reason: 'webgl' | 'asset';
  lang: Lang;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
      <p role="status" className="rounded-full bg-black/60 px-4 py-1.5 text-xs text-amber-200">
        {t(lang, reason === 'webgl' ? 'fallbackWebgl' : 'fallbackAsset')}
      </p>
    </div>
  );
}
