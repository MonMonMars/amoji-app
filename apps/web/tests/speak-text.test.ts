import { describe, expect, it } from 'vitest';
import { cleanForDisplay, cleanForSpeech, stripVoicedGlyphs } from '../lib/speak-text';

describe('speak text cleaner', () => {
  it('strips emotion labels and markup before speech', () => {
    const raw = '你好呀 [happy] *laughs* (微笑)\n[emotion:{"joy":0.9}] `code` https://example.com';
    expect(cleanForSpeech(raw)).toBe('你好呀');
    expect(cleanForDisplay(raw)).toBe('你好呀');
  });

  it('does not speak the names of punctuation marks', () => {
    expect(cleanForSpeech('等陣 hyphen 先 period')).toBe('等陣 先');
    expect(cleanForSpeech('我想清楚 — 先講')).toContain('，');
    expect(cleanForSpeech('我想清楚 — 先講')).not.toMatch(/hyphen|dash|period|full stop/i);
    expect(cleanForSpeech('你好. 再講')).toBe('你好。再講');
  });

  it('leaves display punctuation in place when speech rewrites it', () => {
    const raw = 'Wait — really. hyphen next.';
    const shown = cleanForDisplay(raw);
    const spoken = cleanForSpeech(raw);
    expect(shown).toContain('—');
    expect(shown).toContain('hyphen');
    expect(shown).toContain('.');
    expect(spoken).not.toContain('—');
    expect(spoken).not.toMatch(/\bhyphen\b/i);
    expect(spoken).not.toBe(shown);
    expect(cleanForDisplay('你好. 再講')).toBe('你好. 再講');
    expect(cleanForSpeech('你好. 再講')).toBe('你好。再講');
  });

  it('keeps commas, periods, and symbols on screen', () => {
    const line = 'Haha, you got my head. Email me @ x #1 for $5 & 10%.';
    expect(cleanForDisplay(line)).toBe(line);
  });

  it('strips symbols from speech and pause glyphs from the audio string', () => {
    const line = 'Haha, you got my head. Email me @ x #1 for $5 & 10%.';
    const prepared = cleanForSpeech(line);
    expect(prepared).not.toMatch(/[@#$%^&*]/);
    expect(prepared).toContain(',');
    expect(prepared).toContain('.');
    const spoken = stripVoicedGlyphs(prepared);
    expect(spoken).toBe('Haha you got my head Email me x 1 for 5 10');
    expect(spoken).not.toMatch(/\b(comma|period|at|hash|dollar|percent|ampersand|and)\b/i);
  });

  it('keeps contractions and decimal points', () => {
    expect(stripVoicedGlyphs("don't stop. pi is 3.14.")).toBe("don't stop pi is 3.14");
  });

  it('cleans a poke laugh without substituting words for the bang', () => {
    expect(cleanForSpeech('Haha!')).toBe('Haha!');
    expect(stripVoicedGlyphs('哈哈！')).toBe('哈哈！');
    expect(stripVoicedGlyphs('呵呵……')).toBe('呵呵');
  });
});
