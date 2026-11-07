'use client';
// Shared chrome for legacy URL soft-lands (/mode, /story, /setup -> /select).
// Returning null flashed a blank frame on Pages bookmarks / old SW shells.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type SoftLandSelectProps = {
  /** Seed SelectionBoard mode via sessionStorage before replace. */
  seedSelectMode?: 'chat' | 'story' | 'kid';
  label?: string;
};

export default function SoftLandSelect({
  seedSelectMode,
  label = 'Taking you to character select...',
}: SoftLandSelectProps) {
  const router = useRouter();
  useEffect(() => {
    if (seedSelectMode) {
      try {
        sessionStorage.setItem('amoji.selectMode', seedSelectMode);
      } catch {
        /* ignore */
      }
    }
    router.replace('/select');
  }, [router, seedSelectMode]);

  return (
    <main
      className="flex min-h-dvh cursor-default flex-col items-center justify-center bg-neutral-950 text-white"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />
      <p className="relative text-sm tracking-wide text-white/45">{label}</p>
    </main>
  );
}
