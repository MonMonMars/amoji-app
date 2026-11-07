'use client';
// Shared chrome for legacy URL soft-land (/play -> /chat).
// Returning null flashed a blank frame on Pages bookmarks / old SW shells.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EarlyAudioUnlock from './EarlyAudioUnlock';

type SoftLandChatProps = {
  label?: string;
};

export default function SoftLandChat({
  label = 'Taking you to chat...',
}: SoftLandChatProps) {
  const router = useRouter();
  useEffect(() => {
    router.replace('/chat');
  }, [router]);

  return (
    <main
      className="flex min-h-dvh cursor-default flex-col items-center justify-center bg-neutral-950 text-white"
      aria-busy="true"
      aria-label={label}
    >
      <EarlyAudioUnlock />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />
      <p role="status" className="relative text-sm tracking-wide text-white/45">{label}</p>
    </main>
  );
}
