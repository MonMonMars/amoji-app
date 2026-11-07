'use client';
// Mount on /select (and /change) so chat SFX + VAD CDN warm before /chat.
// Silent: never plays enter/cheer. Start still calls primeAudioForChatEnter.

import { useEffect } from 'react';
import { runEarlyAudioPreload } from '../lib/early-audio-preload';
import { characterById, usePrefs } from '../lib/prefs';

export default function EarlyAudioWarm() {
  // Hold until localStorage sync - first effect used to fire on DEFAULT_PREFS
  // (Aiko/yue), and runEarlyAudioPreload once-latch then skipped the real
  // character/lang warm (wrong gender clips stuck as the warm path).
  const [prefs, , prefsReady] = usePrefs();
  useEffect(() => {
    if (!prefsReady) return;
    const gender = characterById(prefs.character).gender;
    void runEarlyAudioPreload({ lang: prefs.lang, gender });
  }, [prefsReady, prefs.character, prefs.lang]);
  return null;
}
