'use client';
// Login — just a name. Kept on-device; she can learn it into memory later.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadProfile, saveProfile } from '../../lib/profile';
import { t, usePrefs } from '../../lib/prefs';
import { APP_NAME, APP_REVISION, APP_TAGLINE } from '../../lib/revision';

export default function Login() {
  const router = useRouter();
  const [prefs] = usePrefs();
  const [name, setName] = useState('');

  useEffect(() => {
    setName(loadProfile().name);
  }, []);

  const go = () => {
    saveProfile({ name });
    router.push('/select');
  };

  const lang = prefs.lang;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-white">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full bg-pink-400 shadow-[0_0_30px_6px_rgba(244,114,182,0.4)]" />
        <h1 className="text-3xl font-bold tracking-tight">{APP_NAME}</h1>
      </div>
      <p className="text-sm tracking-[0.25em] text-white/35 uppercase">{APP_TAGLINE}</p>

      <div className="mt-8 w-full max-w-sm">
        <label className="mb-2 block text-center text-sm text-white/60">{t(lang, 'loginPrompt')}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
          maxLength={24}
          autoFocus
          className="h-12 w-full rounded-full border border-white/15 bg-white/5 px-5 text-center text-lg text-white placeholder-white/25 outline-none backdrop-blur-md transition focus:border-pink-300/60 focus:bg-white/10"
          placeholder="Simon"
        />
        <button
          onClick={go}
          className="mt-4 h-12 w-full rounded-full bg-white text-base font-semibold text-black transition hover:bg-white/85"
        >
          {t(lang, 'loginCta')}
        </button>
        <div className="mt-3 text-center">
          <button onClick={() => router.push('/select')} className="text-xs text-white/35 underline-offset-4 hover:underline">
            {t(lang, 'loginSkip')}
          </button>
        </div>
      </div>

      <p className="absolute bottom-8 text-xs text-white/25">{APP_REVISION}</p>
    </main>
  );
}
