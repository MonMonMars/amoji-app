'use client';
// Single source of truth: TTS gender follows the selected companion in prefs,
// not a hand-maintained id set (roster trims left stale ids → wrong male voice).

import { characterById } from './prefs';

/** Neural / browser voice gender for a companion id (unknown ids → default cast member). */
export function characterVoiceGender(characterId: string): 'female' | 'male' {
  return characterById(characterId).gender;
}
