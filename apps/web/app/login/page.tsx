'use client';
// Login — just a name. Kept on-device; she can learn it into memory later.
// r2026-11-08: both Continue and Skip now go to /gate (18+ + audio readiness)
// instead of straight to /select. The gate is what makes the product's
// adult-only promise explicit and catches the iPhone silent switch before the
// user meets the chat room; /select keeps its own EntryGuard as a backstop for
// deep links and old service-worker shells.
import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadProfile, saveProfile } from '../../lib/profile';
import { ensureUserNameFromProfile } from '../../lib/memory';
import { t, usePrefs } from '../../lib/prefs';
import { APP_NAME, APP_REVISION, APP_TAGLINE } from '../../lib/revision';
import EarlyAudioUnlock from '../../components/EarlyAudioUnlock';
import { hasPassedEntryGate } from '../../lib/entry-gate';
import { primeAudioForChatEnter } from '../../lib/voice';

/** Gate first; already-passed users keep the direct path to /select. */
function afterLoginPath(): string {
  try {
    return hasPassedEntryGate() ? '/select' : '/gate';
  } catch {
    return '/gate';
  }
}

export default function Login() {
  const router = useRouter();
  const [prefs, , prefsReady] = usePrefs();
  // null until profile sync — empty string would flash then jump, and a fast Continue could wipe the saved name.
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setName(loadProfile().name ?? '');
  }, []);
  const bootReady = prefsReady && name !== null;

  const go = () => {
    if (name === null) return;
    try { primeAudioForChatEnter(); } catch { /* ignore */ }
    saveProfile({ name });
    ensureUserNameFromProfile(name);
    router.push(afterLoginPath());
  };

  const lang = prefs.lang;

  return (
    <main aria-labelledby="amoji-login-title" className="fx-page relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden bg-neutral-950 px-6 text-white">
      <EarlyAudioUnlock />
      {/* ambient glows — same mood as the splash */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="fx-logo mb-2 flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full bg-pink-400 shadow-[0_0_30px_6px_rgba(244,114,182,0.4)]" />
        <h1 id="amoji-login-title" className="text-3xl font-bold tracking-tight">{APP_NAME}</h1>
      </div>
      <p className="text-sm tracking-[0.25em] text-white/35 uppercase">{APP_TAGLINE}</p>

      <div
        className={`fx-rise mt-8 w-full max-w-sm ${bootReady ? '' : 'opacity-0'}`}
        style={{ '--d': '160ms' } as CSSProperties}
        aria-busy={!bootReady}
      >
        <label htmlFor="amoji-login-name" className="mb-2 block text-center text-sm text-white/60">{t(lang, 'loginPrompt')}</label>
        <input
          id="amoji-login-name"
          name="name"
          autoComplete="nickname"
          value={name ?? ''}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && bootReady && go()}
          maxLength={24}
          autoFocus={bootReady}
          disabled={!bootReady}
          className="h-12 w-full rounded-full border border-white/15 bg-white/5 px-5 text-center text-lg text-white placeholder-white/25 outline-none backdrop-blur-md transition focus:border-pink-300/60 focus:bg-white/10"
          placeholder="Simon"
        />
        <button
          type="button"
          onClick={go}
          disabled={!bootReady}
          aria-label={t(lang, 'loginCta')}
          className="ui-btn ui-btn-primary mt-4 h-12 w-full rounded-full bg-white text-base font-semibold text-black shadow-[0_10px_40px_-12px_rgba(255,255,255,0.45)] disabled:pointer-events-none disabled:opacity-60"
        >
          {t(lang, 'loginCta')}
        </button>
        <div className="mt-3 text-center">
          <button type="button" onClick={() => { try { primeAudioForChatEnter(); } catch { /* ignore */ } router.push(afterLoginPath()); }} disabled={!bootReady} aria-label={t(lang, 'loginSkip')} className="ui-btn rounded-full px-3 py-1 text-xs text-white/35 underline-offset-4 hover:underline disabled:pointer-events-none">
            {t(lang, 'loginSkip')}
          </button>
        </div>
        {/* AI disclosure — the first screen a new user interacts with says
            plainly that they are talking to a model, not a person. Given a
            bordered card and near-body contrast on purpose: this is the
            transparency notice, not fine print. */}
        <p
          data-testid="ai-notice"
          className="mt-6 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs leading-relaxed text-white/60"
        >
          {t(lang, 'aiNotice')}
        </p>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-white/35">
          {t(lang, 'safetyCrisisLine')}{' '}
          <Link href="/safety" className="underline underline-offset-4 hover:text-white/60">
            {t(lang, 'safetyTitle')}
          </Link>
        </p>
      </div>

      <p className="absolute bottom-8 text-xs text-white/25">{APP_REVISION}</p>
    </main>
  );
}
