/**
 * Owner 2026-11-26: asking to hear a song opened the reply with a lone "呀"
 * before "好！呢首叫…". 呀 is a sentence-final particle, so spoken alone it
 * sounds like a stray word. No mood tic may be a bare particle.
 */
import { describe, it, expect } from 'vitest';
import {
  INTERJECTIONS,
  INTERJECTION_AT,
  SENTENCE_FINAL_PARTICLES,
  interjectionSpeakable,
  pickInterjection,
} from '../lib/fillers';
import { cleanForDisplay, cleanForSpeech, stripLoneLeadParticle } from '../lib/speak-text';

const STRONG = INTERJECTION_AT + 0.1;

describe('a reply never opens on a lone sentence-final particle', () => {
  it('Cantonese joy is a real cheer, not 呀', () => {
    const hit = pickInterjection('joy', STRONG, 'yue');
    expect(hit?.text).toBeTruthy();
    expect(hit?.text).not.toBe('呀！');
    expect([...(hit?.text ?? '')].length).toBeGreaterThan(1);
  });

  it('Mandarin joy is a real cheer, not 呀', () => {
    const hit = pickInterjection('joy', STRONG, 'zh');
    expect(hit?.text).toBeTruthy();
    expect(hit?.text).not.toBe('呀！');
  });

  it('the soft love tic is not a bare 呀 either', () => {
    for (const lang of ['yue', 'zh'] as const) {
      const hit = pickInterjection('love', STRONG, lang);
      expect(hit?.text, lang).not.toMatch(/^呀/);
    }
  });

  it('every tic in every language is speakable as a lead', () => {
    for (const [emotion, byLang] of Object.entries(INTERJECTIONS)) {
      for (const [lang, hit] of Object.entries(byLang)) {
        if (!hit) continue;
        expect(interjectionSpeakable(hit.text), `${emotion}/${lang}: ${hit.text}`).toBe(true);
      }
    }
  });

  it('keeps real one-character exclamations', () => {
    expect(interjectionSpeakable('哇！')).toBe(true);
    expect(interjectionSpeakable('咦？！')).toBe(true);
    expect(interjectionSpeakable('哎呀……')).toBe(true);
  });

  it('rejects a bare particle even with punctuation around it', () => {
    for (const particle of SENTENCE_FINAL_PARTICLES) {
      expect(interjectionSpeakable(`${particle}！`), particle).toBe(false);
      expect(interjectionSpeakable(`${particle}……`), particle).toBe(false);
      expect(interjectionSpeakable(` ${particle} `), particle).toBe(false);
    }
    expect(interjectionSpeakable('')).toBe(false);
    expect(interjectionSpeakable('……')).toBe(false);
  });

  it('leaves Japanese and English joy untouched', () => {
    expect(pickInterjection('joy', STRONG, 'ja')?.text).toBe('やった！');
    expect(pickInterjection('joy', STRONG, 'en')?.text).toBe('ah!');
  });
});

describe('text-level: a reply never opens on a lone particle', () => {
  it('strips a leading lone 呀 from a model reply, displayed and spoken', () => {
    const reply = '呀\n\n好！呢首叫「Soave」——我而家唱俾你聽。';
    expect(stripLoneLeadParticle(reply)).toBe('好！呢首叫「Soave」——我而家唱俾你聽。');
    expect(cleanForDisplay(reply)).toBe('好！呢首叫「Soave」——我而家唱俾你聽。');
    expect(cleanForSpeech(reply)).not.toMatch(/^\s*呀/u);
  });

  it('handles a leading particle with punctuation on one line', () => {
    for (const lead of ['呀！', '呀，', '呀。', '呀……', '嗯，', '哦！', ' 呀 ']) {
      expect(stripLoneLeadParticle(`${lead}我而家唱俾你聽。`), lead).toBe('我而家唱俾你聽。');
    }
  });

  it('keeps real exclamations and in-sentence particles', () => {
    expect(stripLoneLeadParticle('哇！呢首好正。')).toBe('哇！呢首好正。');
    expect(stripLoneLeadParticle('咦？！')).toBe('咦？！');
    expect(stripLoneLeadParticle('哎呀！你嚇親我。')).toBe('哎呀！你嚇親我。');
    expect(stripLoneLeadParticle('好呀！我而家唱俾你聽。')).toBe('好呀！我而家唱俾你聽。');
    expect(stripLoneLeadParticle('我而家唱俾你聽呀。')).toBe('我而家唱俾你聽呀。');
  });

  it('never empties a line that is only the particle', () => {
    expect(stripLoneLeadParticle('呀')).toBe('呀');
    expect(stripLoneLeadParticle('呀！')).toBe('呀！');
  });
});
