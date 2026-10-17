import { describe, expect, it } from 'vitest';
import { interactionLines, pickCharacterInteraction } from '../lib/interaction-lines';
import { FEMALE_PERSONALITIES, MALE_PERSONALITIES, profilePokeLine } from '../lib/personality';

const ZONES = ['head', 'torso', 'chest', 'side', 'back', 'hand'] as const;

describe('interaction lines', () => {
  it('has more than 10 cheerful lines per personality and zone', () => {
    for (const p of [...FEMALE_PERSONALITIES, ...MALE_PERSONALITIES]) {
      for (const zone of ZONES) {
        const lines = interactionLines(p, zone, 'yue');
        expect(lines.length).toBeGreaterThan(10);
        for (const line of lines) {
          expect(line).not.toMatch(/痛|討厭|讨厌|angry|hate/i);
          expect(/[?？]/.test(line)).toBe(true);
        }
      }
    }
  });

  it('male and female personalities do not share the same opening vibe in English', () => {
    const a = pickCharacterInteraction('a01-shino', 'female', 'hand', 'en');
    const b = pickCharacterInteraction('a98-ethan', 'male', 'hand', 'en');
    expect(a.length).toBeGreaterThan(8);
    expect(b.length).toBeGreaterThan(8);
    expect(a).not.toBe(b);
  });

  it('switching characters changes the spoken poke line', () => {
    const a = profilePokeLine('a01-shino', 'en', 0, 'hand', 'female');
    const b = profilePokeLine('a02-shibu', 'en', 0, 'hand', 'female');
    const c = profilePokeLine('a98-ethan', 'en', 0, 'hand', 'male');
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });
});
