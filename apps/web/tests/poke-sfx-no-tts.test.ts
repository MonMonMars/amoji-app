// Poke voice is a premade zone MP3. The speaking indicator must follow that
// clip — never a parallel feedUtterance / notifySpeaking / speak() of the
// same poke line (synth / Edge / gTTS double).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(path.join(here, rel), 'utf8');
}

describe('poke SFX owns voice — no TTS double', () => {
  it('ChatPanel poke effect only calls playPokeBurst', () => {
    const panel = read('../components/ChatPanel.tsx');
    const pokeBlock = panel.slice(
      panel.indexOf('const lastPokeRef = useRef(pokeCount)'),
      panel.indexOf('const lastHandRef = useRef(handHoldCount)'),
    );
    expect(pokeBlock).toContain("playPokeBurst(characterId, pokeZone || 'torso')");
    expect(pokeBlock).not.toContain('feedUtterance');
    expect(pokeBlock).not.toContain('notifySpeaking');
    expect(pokeBlock).not.toMatch(/\bspeak\s*\(/);
    expect(pokeBlock).not.toMatch(/\bsayLocal\s*\(/);
    expect(pokeBlock).not.toMatch(/pokeReactionLine|pokeSectionPlaceholderLine/);
    expect(pokeBlock).not.toContain('setHistory');
  });

  it('playPokeBurst is clip-only and never queues a TTS tier', () => {
    const voice = read('../lib/voice.ts');
    const burst = voice.slice(
      voice.indexOf('export function playPokeBurst'),
      voice.indexOf('export function playLaughBurst'),
    );
    expect(burst).toContain('recordedPokeClip');
    expect(burst).toContain('playVoiceClip');
    expect(burst).not.toMatch(/\bspeak\s*\(/);
    expect(burst).not.toContain('beginTts');
    expect(burst).not.toContain('speakGtts');
    expect(burst).not.toContain('speakEdge');
    expect(burst).not.toContain('synthSpeak');
    expect(burst).not.toContain('lineQueue');
  });

  it('playVoiceClip drives the speaking indicator from the MP3', () => {
    const clip = read('../lib/play-voice-clip.ts');
    const body = clip.slice(clip.indexOf('export function playVoiceClip'));
    expect(body).toContain('noteSpeechStarted');
    expect(body).toContain('followAudioElement');
  });
});
