'use client';
// Mount on splash / login / SoftLand / select so the first user gesture unlocks
// AudioContext + silent media + synth + SFX BEFORE /chat (iPhone gate).
// Does not play cheer/enter SFX. Mute All still honored by speak().
// Imports primeAudioForChatEnter only — does not edit voice.ts (#158 lock).

import { useEffect } from 'react';
import { primeAudioForChatEnter } from '../lib/voice';

const GESTURES = ['pointerdown', 'keydown', 'touchstart'] as const;

export default function EarlyAudioUnlock() {
  useEffect(() => {
    let armed = true;
    const fire = () => {
      if (!armed) return;
      armed = false;
      try {
        primeAudioForChatEnter();
      } catch {
        /* ignore */
      }
      for (const ev of GESTURES) {
        window.removeEventListener(ev, fire);
      }
    };
    for (const ev of GESTURES) {
      window.addEventListener(ev, fire, { once: true, passive: true });
    }
    return () => {
      armed = false;
      for (const ev of GESTURES) {
        window.removeEventListener(ev, fire);
      }
    };
  }, []);
  return null;
}
