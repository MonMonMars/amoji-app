'use client';
// Splash / title screen — shows the name + revision, then glides to login.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { APP_NAME, APP_REVISION, APP_TAGLINE } from '../lib/revision';

export default function Splash() {
  const router = useRouter();
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 2100);
    const t2 = setTimeout(() => router.push('/login'), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [router]);

  return (
    <main
      onClick={() => router.push('/login')}
      className={`relative flex min-h-dvh cursor-pointer flex-col items-center justify-center overflow-hidden bg-neutral-950 text-white transition-opacity duration-700 ${fade ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="fx-logo flex flex-col items-center">
        <div className="relative mb-6">
          <span className="absolute -inset-5 animate-ping rounded-full bg-pink-400/15" />
          <span className="relative block h-5 w-5 rounded-full bg-pink-400 shadow-[0_0_50px_14px_rgba(244,114,182,0.45)]" />
        </div>

        <h1 className="text-6xl font-bold tracking-tight">{APP_NAME}</h1>
        <p className="mt-3 text-sm tracking-[0.3em] text-white/40 uppercase">{APP_TAGLINE}</p>
      </div>

      <p className="absolute bottom-10 text-xs text-white/30">{APP_REVISION} · web demo</p>
    </main>
  );
}
