'use client';
/**
 * Fallback one-tap setup when a deep link hits /select before the gate passed.
 * Same contract as the title START — scroll disclosures, one button, app does the rest.
 */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { t, usePrefs } from '../lib/prefs';
import { oneClickBootstrap } from '../lib/one-click-setup';
import { useScrollReachedEnd } from '../lib/scroll-unlock';
import EarlyAudioUnlock from './EarlyAudioUnlock';
import { SetupOneScrollBody } from './setup-one-shared';
import { APP_REVISION } from '../lib/revision';
import { absorbNavReturnFromReferrer, navigateNavBack } from '../lib/nav-return';
import { type SelectReturnFrom } from '../lib/select-return';

export default function QuickSetup({
  onDone,
  showBack = true,
  initialSectionId,
  backTestId = 'setup-back',
  selectReturnFrom: _selectReturnFrom = 'setup',
}: {
  lang?: import('../lib/prefs').Lang;
  onDone?: () => void;
  /** /setup and /gate show back; EntryGate fallback does not. */
  showBack?: boolean;
  /** Scroll in-page anchor (legacy /privacy, /terms, /safety URLs). */
  initialSectionId?: string;
  /** E.g. terms-back on /terms legacy URL. */
  backTestId?: string;
  /** Kept for call-site compatibility; rules now continue to /gate/audio. */
  selectReturnFrom?: SelectReturnFrom;
}) {
  void _selectReturnFrom;
  const router = useRouter();
  const [prefs, , prefsReady] = usePrefs();
  const lang = prefs.lang;
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readToEnd = useScrollReachedEnd(scrollRef, prefsReady);

  useEffect(() => {
    absorbNavReturnFromReferrer();
  }, []);

  useEffect(() => {
    if (!prefsReady || !scrollRef.current) return;
    const sectionId =
      initialSectionId ??
      (typeof window !== 'undefined' && window.location.hash ? window.location.hash.slice(1) : '');
    if (!sectionId) return;
    const target = scrollRef.current.querySelector(`#${CSS.escape(sectionId)}`);
    if (target instanceof HTMLElement) target.scrollIntoView({ block: 'start' });
  }, [initialSectionId, prefsReady]);

  const start = useCallback(async () => {
    if (busy || !prefsReady || !readToEnd) return;
    setBusy(true);
    try {
      // Rules only — speaker/mic soft-gate is the next step (never blocks entry).
      await oneClickBootstrap({ lang });
      // Standalone /setup → title after audio. In-place EntryGate → return to
      // the protected route (select/change/chat) after the soft audio step.
      const audioNext = onDone
        ? (typeof window !== 'undefined' ? window.location.pathname || '/select' : '/select')
        : '/';
      router.replace(`/gate/audio?next=${encodeURIComponent(audioNext)}`);
    } finally {
      setBusy(false);
    }
  }, [busy, lang, onDone, prefsReady, readToEnd, router]);

  const startDisabled = !prefsReady || busy || !readToEnd;

  return (
    <main
      data-testid="entry-gate"
      aria-labelledby="amoji-setup-title"
      className="fx-page relative flex min-h-dvh flex-col bg-neutral-950 px-5 text-white safe-px"
    >
      <EarlyAudioUnlock />

      {showBack && (
        <button
          type="button"
          data-testid={backTestId}
          aria-label={t(lang, 'back')}
          onClick={() => navigateNavBack(router)}
          className="ui-btn absolute left-4 top-4 z-20 rounded-full border border-white/15 bg-black/35 px-3.5 py-2 text-sm text-white/85 backdrop-blur-md safe-t"
        >
          ← {t(lang, 'back')}
        </button>
      )}

      <div className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col gap-3 py-14 safe-b safe-t">
        <h1 id="amoji-setup-title" className="text-center text-2xl font-bold tracking-tight">
          {t(lang, 'setupOneTitle')}
        </h1>

        <div
          ref={scrollRef}
          data-testid="setup-one-scroll"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-left text-sm leading-relaxed text-white/75"
        >
          <SetupOneScrollBody lang={lang} />
          <div data-testid="setup-one-scroll-end" aria-hidden className="h-1" />
        </div>

        {!readToEnd && prefsReady && (
          <p data-testid="setup-scroll-hint" className="text-center text-xs text-white/45">
            {t(lang, 'gateScrollHint')}
          </p>
        )}

        <button
          type="button"
          data-testid="setup-start"
          disabled={startDisabled}
          aria-label={t(lang, 'splashStart')}
          aria-disabled={startDisabled}
          onClick={() => void start()}
          className="ui-btn splash-start-pulse mx-auto h-14 min-w-[14rem] rounded-full border border-rose-100/35 bg-gradient-to-b from-rose-100 to-rose-200/90 px-10 text-lg font-semibold tracking-[0.12em] text-[#2a1218] shadow-[0_18px_50px_-18px_rgba(255,200,210,0.85)] disabled:opacity-50"
        >
          {busy ? t(lang, 'gateAudioPlaying') : t(lang, 'splashStart')}
        </button>
      </div>

      <p className="pb-6 text-center text-xs text-white/25">{APP_REVISION}</p>
    </main>
  );
}
