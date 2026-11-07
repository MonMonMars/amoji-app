'use client';
// Shared chrome for legacy URL soft-land (/play -> /chat).
// Returning null flashed a blank frame on Pages bookmarks / old SW shells.
// The status line is localized for the same reason as SoftLandSelect.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EarlyAudioUnlock from './EarlyAudioUnlock';
import { loadPrefs, t, type StrKey } from '../lib/prefs';

type SoftLandChatProps = {
  /** Localized status copy. Defaults to the taking-you-to-chat line. */
  labelKey?: StrKey;
};

export default function SoftLandChat({
  labelKey = 'softLandChat',
}: SoftLandChatProps) {
  const router = useRouter();
  const [label, setLabel] = useState(() => t('en', labelKey));

  useEffect(() => {
    try {
      setLabel(t(loadPrefs().lang, labelKey));
    } catch {
      /* localStorage blocked — keep the English line */
    }
  }, [labelKey]);

  useEffect(() => {
    router.replace('/chat');
  }, [router]);

  return (
    <main
      className="flex min-h-dvh cursor-default flex-col items-center justify-center bg-neutral-950 text-white"
      aria-busy="true"
      aria-labelledby="amoji-softland-status"
      aria-label={label}
    >
      <EarlyAudioUnlock />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" aria-hidden />
      <p id="amoji-softland-status" role="status" className="relative text-sm tracking-wide text-white/45">{label}</p>
    </main>
  );
}
