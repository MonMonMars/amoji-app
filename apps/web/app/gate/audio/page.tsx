'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PreChatAudioGate from '../../../components/PreChatAudioGate';

function AudioGateInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/chat';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/chat';
  return <PreChatAudioGate nextHref={safeNext} onDone={() => router.replace(safeNext)} />;
}

export default function AudioGatePage() {
  return (
    <Suspense fallback={<div data-testid="chat-audio-gate-boot" className="fixed inset-0 bg-neutral-950" aria-busy />}>
      <AudioGateInner />
    </Suspense>
  );
}
