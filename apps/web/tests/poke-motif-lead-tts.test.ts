import { describe, expect, it } from 'vitest';
import { profilePokeLine, personalityProfile } from '../lib/personality';
import { pokeLineForSpeech } from '../lib/personality-voice';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('poke TTS motif lead strip', () => {
  it('pokeLineForSpeech drops yue 「我鍾意信。」 and keeps the zone reaction', () => {
    const sample = '我鍾意信。 你揾到肩膀，我笑出聲。仲玩唔玩？';
    const spoken = pokeLineForSpeech(sample, 'yue');
    expect(spoken).not.toMatch(/^我鍾意信[。.！？]?$/);
    expect(spoken).toContain('你揾到');
  });

  it('profile poke lines with letters motif do not collapse to 我鍾意信 only', () => {
    const lettersId = 'a01-shino';
    const profile = personalityProfile(lettersId, 'female');
    if (profile.motif !== 'letters') return;
    const raw = profilePokeLine(lettersId, 'yue', 0, 'torso', 'female');
    const spoken = pokeLineForSpeech(raw, 'yue');
    expect(spoken.startsWith('我鍾意信')).toBe(false);
    expect(spoken.length).toBeGreaterThan(6);
  });

  it('pokeBurstSpokenLine applies pokeLineForSpeech before the first-sentence cap', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const voice = readFileSync(join(here, '../lib/voice.ts'), 'utf8');
    const burst = voice.slice(
      voice.indexOf('function pokeBurstSpokenLine'),
      voice.indexOf('export function playPokeBurst'),
    );
    expect(burst).toContain('pokeLineForSpeech');
  });
});