'use client';
// Mount on /select and /mode so chat SFX + VAD CDN warm before /chat.
// Silent: never plays enter/cheer. Start still calls primeAudioForChatEnter.

import { useEffect } from 'react';
import { runEarlyAudioPreload } from '../lib/early-audio-preload';
import { characterById, usePrefs } from '../lib/prefs';

export default function EarlyAudioWarm() {
  const [prefs] = usePrefs();
  useEffect(() => {
    const gender = characterById(prefs.character).gender;
    void runEarlyAudioPreload({ lang: prefs.lang, gender });
  }, [prefs.character, prefs.lang]);
  return null;
}
