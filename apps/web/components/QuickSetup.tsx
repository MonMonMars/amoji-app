'use client';
/**
 * Fallback one-tap setup when a deep link hits /select before the gate passed.
 * Same contract as the title START — one button, app does the rest.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { t, usePrefs } from '../lib/prefs';
import { oneClickBootstrap } from '../lib/one-click-setup';
import EarlyAudioUnlock from './EarlyAudioUnlock';
import { APP_REVISION } from '../lib/revision';

export default function QuickSetup({
  onDone,
}: {
  lang?: import('../lib/prefs').Lang;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [prefs, , prefsReady] = usePrefs();
  const lang = prefs.lang;
  const [busy, setBusy] = useState(false);
  const [voiceHint, setVoiceHint] = useState(false);

  const start = useCallback(async () => {
    if (busy || !prefsReady) return;
    setBusy(true);
    try {
      const { voiceOk } = await oneClickBootstrap({ lang });
      if (!voiceOk) setVoiceHint(true);
      onDone?.();
      router.replace('/select');
    } finally {
      setBusy(false);
    }
  }, [busy, lang, onDone, prefsReady, router]);

  return (
    <main
      data-testid="entry-gate"
      aria-labelledby="amoji-setup-title"
      className="fx-page relative flex min-h-dvh flex-col items-center justify-center bg-neutral-950 px-6 text-white"
    >
      <EarlyAudioUnlock />

      <button
        type="button"
        data-testid="setup-back"
        aria-label={t(lang, 'back')}
        onClick={() => router.push('/')}
        className="ui-btn absolute left-4 top-4 z-20 rounded-full border border-white/15 bg-black/35 px-3.5 py-2 text-sm text-white/85 backdrop-blur-md safe-t"
      >
        ← {t(lang, 'back')}
      </button>

      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <h1 id="amoji-setup-title" className="text-2xl font-bold tracking-tight">
          {t(lang, 'setupOneTitle')}
        </h1>
        <p className="text-sm leading-relaxed text-white/60">{t(lang, 'setupOneLead')}</p>

        {voiceHint && (
          <div
            data-testid="setup-voice-hint"
            role="status"
            className="w-full rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3 text-left text-sm text-amber-100"
          >
            <p className="font-medium">{t(lang, 'setupSoundFailTitle')}</p>
            <p className="mt-1 text-xs text-white/70">{t(lang, 'gateAudioIosHint')}</p>
            <p className="mt-2 text-xs text-white/55">{t(lang, 'setupSoundFailLead')}</p>
          </div>
        )}

        <button
          type="button"
          data-testid="setup-start"
          disabled={!prefsReady || busy}
          aria-label={t(lang, 'splashStart')}
          onClick={() => void start()}
          className="ui-btn splash-start-pulse mt-2 h-14 min-w-[14rem] rounded-full border border-rose-100/35 bg-gradient-to-b from-rose-100 to-rose-200/90 px-10 text-lg font-semibold tracking-[0.12em] text-[#2a1218] shadow-[0_18px_50px_-18px_rgba(255,200,210,0.85)] disabled:opacity-50"
        >
          {busy ? t(lang, 'gateAudioPlaying') : t(lang, 'splashStart')}
        </button>

        <p className="text-xs leading-relaxed text-white/40">
          {t(lang, 'setupOneDisclaimer')}{' '}
          <Link href="/privacy" className="text-pink-200/80 underline underline-offset-2">/privacy</Link>
          {' · '}
          <Link href="/terms" className="text-pink-200/80 underline underline-offset-2">/terms</Link>
          {' · '}
          <Link href="/safety" className="text-pink-200/80 underline underline-offset-2">/safety</Link>
        </p>
      </div>

      <p className="absolute bottom-8 text-xs text-white/25">{APP_REVISION}</p>
    </main>
  );
}
