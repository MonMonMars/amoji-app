'use client';
// Shared chrome for legacy URL soft-lands (/mode, /story, /setup -> /select).
// Returning null flashed a blank frame on Pages bookmarks / old SW shells.
// The status line is localized: a yue/zh/ja user used to hit an English-only
// "Taking you to character select..." frame here.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EarlyAudioUnlock from './EarlyAudioUnlock';
import { primeChatStartGesture } from '../lib/chat-start-gesture';
import { loadPrefs, t, type StrKey } from '../lib/prefs';
import { replaceSelect, type SelectReturnFrom } from '../lib/select-return';

type SoftLandSelectProps = {
  /** Seed SelectionBoard mode via sessionStorage before replace. */
  seedSelectMode?: 'chat' | 'story' | 'kid';
  /** Localized status copy. Defaults to the character-select line. */
  labelKey?: StrKey;
  /** Record legacy soft-land origin for /select back navigation. */
  selectReturnFrom?: SelectReturnFrom;
};

export default function SoftLandSelect({
  seedSelectMode,
  labelKey = 'softLandSelect',
  selectReturnFrom = 'mode',
}: SoftLandSelectProps) {
  const router = useRouter();
  // Start from the English default so the static export keeps a stable first
  // paint, then swap to the stored language in the same tick as the redirect.
  const [label, setLabel] = useState(() => t('en', labelKey));

  useEffect(() => {
    try {
      setLabel(t(loadPrefs().lang, labelKey));
    } catch {
      /* localStorage blocked — keep the English line */
    }
  }, [labelKey]);

  useEffect(() => {
    try {
      primeChatStartGesture();
    } catch {
      /* ignore */
    }
    if (seedSelectMode) {
      try {
        sessionStorage.setItem('amoji.selectMode', seedSelectMode);
      } catch {
        /* ignore */
      }
    }
    replaceSelect(router, selectReturnFrom);
  }, [router, seedSelectMode, selectReturnFrom]);

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
