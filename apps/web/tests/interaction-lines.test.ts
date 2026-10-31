import { describe, expect, it, vi } from 'vitest';
import { interactionLines, maybeLaughLead, pickCharacterInteraction, pokePhase, pokeReactionLine } from '../lib/interaction-lines';
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

  it('poke laugh lead is disabled (t769/t771 — SFX only)', () => {
    expect(maybeLaughLead('en')).toBeUndefined();
    expect(maybeLaughLead('yue')).toBeUndefined();
  });

  it('poke talk is a short question, not a paragraph', () => {
    const line = pickCharacterInteraction('a01-shino', 'female', 'head', 'en');
    expect(line.length).toBeLessThan(48);
    expect(line.endsWith('?') || /[?？]/.test(line)).toBe(true);
    expect(line.split(/[.!?]/).filter(Boolean).length).toBeLessThan(3);
  });

  it('male and female personalities do not share the same opening vibe in English', () => {
    const a = pickCharacterInteraction('a01-shino', 'female', 'hand', 'en');
    const b = pickCharacterInteraction('a98-ethan', 'male', 'hand', 'en');
    expect(a.length).toBeGreaterThan(8);
    expect(b.length).toBeGreaterThan(8);
    expect(a).not.toBe(b);
  });

  it('rotates poke lines by phase, zone, direction, and count', () => {
    const zone = 'chest';
    const lines = [1, 2, 3, 4, 5, 6].map((n) => pokeReactionLine('a01-shino', 'female', zone, 'front', 'en', n));
    expect(new Set(lines).size).toBeGreaterThanOrEqual(4);
    expect(pokePhase(1)).toBe('impact');
    expect(pokePhase(2)).toBe('recover');
    expect(pokePhase(3)).toBe('settle');
    expect(lines[0]).not.toBe(pokeReactionLine('a01-shino', 'female', 'head', 'front', 'en', 1));
    expect(lines[0]).not.toBe(pokeReactionLine('a01-shino', 'female', zone, 'left', 'en', 1));
    expect(lines[1]?.toLowerCase()).toContain('front');
    expect(pokeReactionLine('a01-shino', 'female', 'armL', 'right', 'en', 1).toLowerCase()).toContain('left arm');
    const male = pokeReactionLine('a98-ethan', 'male', zone, 'back', 'en', 2);
    const female = pokeReactionLine('a01-shino', 'female', zone, 'back', 'en', 2);
    expect(male).not.toBe(female);
    for (const line of lines) expect(/[?？]/.test(line)).toBe(true);
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

describe('t769/t771 maybeLaughLead', () => {
  it('never returns a TTS laugh lead', () => {
    for (let i = 0; i < 20; i++) {
      expect(maybeLaughLead('en')).toBeUndefined();
      expect(maybeLaughLead('yue')).toBeUndefined();
    }
  });
});
