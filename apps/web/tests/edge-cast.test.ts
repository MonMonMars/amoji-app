import { describe, expect, it } from 'vitest';
import { edgeCastRoster, edgeCastVoice } from '../lib/edge-cast';
import { isFemaleNeuralVoice, isMaleNeuralVoice } from '../lib/voice-catalog';

const LOCALES = ['yue', 'zh', 'ja', 'en'] as const;

describe('per-character Edge cast', () => {
  it('gives every roster character a unique signature in each language', () => {
    const roster = edgeCastRoster();
    expect(roster.length).toBeGreaterThan(40);
    for (const locale of LOCALES) {
      const seen = new Set<string>();
      const femaleVoices = new Set<string>();
      for (const c of roster) {
        const voice = edgeCastVoice(c.id, locale);
        expect(voice, c.id).not.toBeNull();
        const key = `${voice!.id}|${voice!.pitch}|${voice!.rate}`;
        expect(seen.has(key), `${locale} ${c.id} shares ${key}`).toBe(false);
        seen.add(key);
        if (c.gender === 'female') {
          expect(isFemaleNeuralVoice(voice!.id), voice!.id).toBe(true);
          expect(isMaleNeuralVoice(voice!.id), voice!.id).toBe(false);
          expect(voice!.pitch, `${locale} ${c.id}`).toBeGreaterThanOrEqual(0);
          femaleVoices.add(voice!.id);
        } else {
          expect(isMaleNeuralVoice(voice!.id), voice!.id).toBe(true);
          expect(isFemaleNeuralVoice(voice!.id), voice!.id).toBe(false);
          expect(voice!.pitch, `${locale} ${c.id}`).toBeLessThanOrEqual(0);
        }
      }
      expect(femaleVoices.size).toBeGreaterThan(0);
    }
  });

  it('spreads English and Mandarin across many neural voices, and keeps Yue on zh-HK', () => {
    const females = edgeCastRoster().filter((c) => c.gender === 'female');
    const ids = (locale: string) => new Set(females.map((c) => edgeCastVoice(c.id, locale)!.id));
    expect(ids('en').size).toBeGreaterThan(10);
    expect(ids('zh').size).toBeGreaterThan(2);
    expect([...ids('yue')].every((id) => id.startsWith('zh-HK-'))).toBe(true);
    expect(ids('yue').size).toBe(2);
    expect(ids('ja')).toEqual(new Set(['ja-JP-NanamiNeural']));
    const shared = females.filter((c) => edgeCastVoice(c.id, 'ja')!.id === 'ja-JP-NanamiNeural');
    const pitches = new Set(shared.map((c) => `${edgeCastVoice(c.id, 'ja')!.pitch}|${edgeCastVoice(c.id, 'ja')!.rate}`));
    expect(pitches.size).toBe(shared.length);
  });
});