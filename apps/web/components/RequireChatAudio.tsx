'use client';

/**
 * Soft session marker only — never hard-blocks /chat.
 * Audio is prompted earlier (/gate/audio after rules). If the user skipped or
 * sessionStorage was cleared, chat still mounts; we mark ready so later hops
 * do not bounce into a stuck gate.
 */
import { useEffect, type ReactNode } from 'react';
import { hasChatAudioReady, markChatAudioReady } from '../lib/pre-chat-audio';

export default function RequireChatAudio({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!hasChatAudioReady()) markChatAudioReady();
  }, []);

  return <>{children}</>;
}
