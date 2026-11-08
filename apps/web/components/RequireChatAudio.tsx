'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { hasChatAudioReady } from '../lib/pre-chat-audio';
import PreChatAudioGate from './PreChatAudioGate';

type Status = 'checking' | 'blocked' | 'ok';

export default function RequireChatAudio({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(hasChatAudioReady() ? 'ok' : 'blocked');
  }, []);

  if (status === 'checking') {
    return (
      <div
        data-testid="chat-audio-gate-boot"
        className="fixed inset-0 z-[9000] bg-neutral-950"
        aria-busy="true"
        aria-hidden="true"
      />
    );
  }

  if (status === 'blocked') {
    return <PreChatAudioGate onDone={() => setStatus('ok')} showBack />;
  }

  return <>{children}</>;
}
