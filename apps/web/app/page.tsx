'use client';
/**
 * Title screen — one START runs terms + setup; the app opens /select.
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond } from 'next/font/google';
import { APP_NAME, APP_REVISION, APP_TAGLINE } from '../lib/revision';
import { t, usePrefs } from '../lib/prefs';
import { assetUrl } from '../lib/asset';
import EarlyAudioUnlock from '../components/EarlyAudioUnlock';
import { SetupOneAiNotice } from '../components/setup-one-shared';
import { hasPassedEntryGate } from '../lib/entry-gate';
import { acceptCurrentLegal, hasAcceptedCurrentLegal } from '../lib/legal-accept';
import { recordNavReturn } from '../lib/nav-return';
import { pushSelect } from '../lib/select-return';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
});

export default function Splash() {
  const router = useRouter();
  const [prefs] = usePrefs();
  const lang = prefs.lang;
  const [busy, setBusy] = useState(false);
  const startLabel = t(lang, 'splashStart');

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!hasPassedEntryGate()) {
        recordNavReturn('/');
        router.push('/setup');
        return;
      }
      if (!hasAcceptedCurrentLegal()) {
        acceptCurrentLegal();
      }
      pushSelect(router, 'splash');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      aria-labelledby="amoji-splash-title"
      aria-describedby="amoji-splash-tagline amoji-splash-revision"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#0c0810] text-white"
    >
      <EarlyAudioUnlock />

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <img
          src={assetUrl('/backgrounds/sakura.jpg')}
          alt=""
          className="animate-kenburns h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0810]/55 via-[#1a0f18]/45 to-[#0c0810]/92" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(255,180,200,0.18),transparent_55%)]" />
      </div>

      <div className="fx-logo relative z-10 flex flex-col items-center px-6 text-center">
        <p className="mb-5 text-[11px] uppercase tracking-[0.42em] text-rose-100/55">
          Amoji
        </p>
        <h1
          id="amoji-splash-title"
          className={`${display.className} splash-title-breathe text-7xl font-semibold tracking-tight text-rose-50 drop-shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:text-8xl`}
        >
          {APP_NAME}
        </h1>
        <p
          id="amoji-splash-tagline"
          className="mt-4 max-w-sm text-sm leading-relaxed tracking-[0.12em] text-rose-50/65"
        >
          {APP_TAGLINE}
        </p>
        <p className="mt-3 max-w-sm text-xs leading-relaxed text-rose-50/55">
          {t(lang, 'setupOneLead')}
        </p>

        <button
          type="button"
          data-testid="splash-start"
          aria-label={startLabel}
          disabled={busy}
          onClick={() => void start()}
          className="ui-btn splash-start-pulse mt-14 h-14 min-w-[14rem] rounded-full border border-rose-100/35 bg-gradient-to-b from-rose-100 to-rose-200/90 px-10 text-lg font-semibold tracking-[0.18em] text-[#2a1218] shadow-[0_18px_50px_-18px_rgba(255,200,210,0.85)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-100 disabled:opacity-60"
        >
          {busy ? t(lang, 'gateAudioPlaying') : startLabel}
        </button>

        <p className="mt-6 max-w-sm text-[11px] leading-relaxed text-rose-50/45">
          <SetupOneAiNotice lang={lang} className="text-[11px] leading-relaxed text-rose-50/50" />
        </p>

        <Link
          href="/setup"
          data-testid="splash-setup-link"
          aria-label={t(lang, 'splashOpenSetup')}
          onClick={() => recordNavReturn('/')}
          className="mt-5 text-sm font-medium text-rose-100/80 underline underline-offset-4 hover:text-rose-50"
        >
          {t(lang, 'splashOpenSetup')}
        </Link>
      </div>

      <p
        id="amoji-splash-revision"
        className="absolute bottom-10 z-10 text-xs text-white/35"
      >
        {APP_REVISION} · web demo
      </p>
    </main>
  );
}
