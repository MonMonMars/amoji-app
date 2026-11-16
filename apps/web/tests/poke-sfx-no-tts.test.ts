// Poke voice uses the pinned chat voice (speak + voicePickFor). Optional zone
// SFX queues under Voice replies. No parallel feedUtterance / history.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(path.join(here, rel), 'utf8');
}

describe('poke pinned voice — no history double', () => {
  it('ChatPanel poke effect only calls playPokeBurst with lang', () => {
    const panel = read('../components/ChatPanel.tsx');
    const pokeBlock = panel.slice(
      panel.indexOf('const lastPokeRef = useRef(pokeCount)'),
      panel.indexOf('const lastHandRef = useRef(handHoldCount)'),
    );
    expect(pokeBlock).toContain('playPokeBurst(characterId, lang, pokeZone');
    expect(pokeBlock).not.toContain('feedUtterance');
    expect(pokeBlock).not.toContain('notifySpeaking');
    expect(pokeBlock).not.toMatch(/\bspeak\s*\(/);
    expect(pokeBlock).not.toMatch(/\bsayLocal\s*\(/);
    expect(pokeBlock).not.toMatch(/pokeReactionLine|pokeSectionPlaceholderLine/);
    expect(pokeBlock).not.toContain('setHistory');
  });

  it('hand-hold uses poke burst; shy line only after repeated drags', () => {
    const panel = read('../components/ChatPanel.tsx');
    const handBlock = panel.slice(
      panel.indexOf('const lastHandRef = useRef(handHoldCount)'),
      panel.indexOf('// Body idle loop while quiet'),
    );
    expect(handBlock).toContain("playPokeBurst(characterId, lang, 'hand'");
    expect(handBlock).toContain('HAND_HOLD_SHY_SPEAK_AFTER');
    expect(handBlock).toContain('handHoldShyLine');
    expect(handBlock).not.toContain('pickCharacterInteraction');
  });

  it('playPokeBurst speaks with voice pin; SFX is optional under voice', () => {
    const voice = read('../lib/voice.ts');
    const burst = voice.slice(
      voice.indexOf('export function playPokeBurst'),
      voice.indexOf('export function playLaughBurst'),
    );
    expect(burst).toContain('voiceOutputAllowed');
    expect(burst).toContain('pokeBurstSpokenLine');
    expect(burst).toMatch(/\bspeak\s*\(/);
    expect(burst).toContain('recordedPokeClip');
    expect(burst).toContain('sfxOnly');
    expect(burst).not.toContain('feedUtterance');
  });
});