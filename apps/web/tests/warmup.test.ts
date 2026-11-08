import { describe, expect, it } from 'vitest';
import { YUE_THINKING_LINES } from '../lib/thinking-lines';
import {
  SUBSTANTIAL_STUB_CHARS,
  WARMUP_BANKS,
  WARMUP_FIRST_MS,
  WARMUP_GAP_MS,
  WARMUP_MAX_LINES,
  isSubstantialStub,
  pickWaitLine,
} from '../lib/warmup';

const LANGS = ['yue', 'zh', 'ja', 'en'] as const;

describe('wait beat banks', () => {
  it('ships at least six lines per language', () => {
    for (const lang of LANGS) {
      expect(WARMUP_BANKS[lang]!.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('uses the Cantonese loading bank as-is', () => {
    expect([...WARMUP_BANKS.yue!]).toEqual([...YUE_THINKING_LINES]);
    expect(YUE_THINKING_LINES).toHaveLength(6);
    expect(WARMUP_BANKS.en).toContain('um…… let me think.');
    expect(WARMUP_BANKS.en).toContain('um…… let me search the web.');
  });

  it('keeps every line short enough to say in a pause', () => {
    for (const lang of LANGS) {
      for (const line of WARMUP_BANKS[lang]!) {
        expect(line.length, line).toBeLessThanOrEqual(32);
        expect(line.toLowerCase()).not.toMatch(/inspire|please wait|don't rush|好問題|好问题/);
      }
    }
  });

  it('spaces the beats but stays conversational', () => {
    expect(WARMUP_FIRST_MS).toBe(1_000);
    expect(WARMUP_GAP_MS).toBeGreaterThanOrEqual(2500);
    expect(WARMUP_GAP_MS).toBeLessThanOrEqual(6000);
    expect(WARMUP_MAX_LINES).toBe(2);
  });
});

describe('pickWaitLine', () => {
  it('is deterministic for the same inputs', () => {
    expect(pickWaitLine('jun', 'yue', 1, 'hello')).toBe(pickWaitLine('jun', 'yue', 1, 'hello'));
  });

  it('always picks a whole sentence, never a bare sound', () => {
    // Mon: "keep the um voice longer, too short now." A wait that only starts
    // after 2s must not then say a one-syllable "um…".
    for (const lang of LANGS) {
      for (const text of ['hello', "what's the weather here?", 'how are you?']) {
        for (let n = 0; n < 4; n += 1) {
          const line = pickWaitLine('jun', lang, n, text);
          expect(isSubstantialStub(line), `${lang} ${n} ${line}`).toBe(true);
          expect(line.trim().length).toBeGreaterThanOrEqual(SUBSTANTIAL_STUB_CHARS);
        }
      }
    }
  });

  it('announces the search when the turn actually looks something up', () => {
    expect(pickWaitLine('jun', 'en', 0, "what's the weather here?")).toBe('um…… let me search the web.');
    expect(pickWaitLine('jun', 'en', 0, 'how are you?')).toBe('um…… let me think.');
    expect(pickWaitLine('jun', 'yue', 0, '天氣點呀')).toBe('嗯……等我上網搵下。');
  });

  it('takes the other sentence on the next beat', () => {
    const first = pickWaitLine('jun', 'en', 0, 'how are you?');
    const second = pickWaitLine('jun', 'en', 1, 'how are you?', first);
    expect(second).not.toBe(first);
    expect(second).toBe('um…… let me search the web.');
  });

  it('honours an avoid hint even when it is the preferred line', () => {
    const avoid = 'um…… let me search the web.';
    const line = pickWaitLine('jun', 'en', 0, "what's the weather here?", avoid);
    expect(line).not.toBe(avoid);
    expect(isSubstantialStub(line)).toBe(true);
  });

  it('falls back to the Cantonese bank for unknown languages', () => {
    expect(WARMUP_BANKS.fr).toBeUndefined();
    expect(WARMUP_BANKS.yue).toContain(pickWaitLine('jun', 'fr', 0, 'salut'));
  });

  it('a felt mood prefers its own sentence but stays substantial', () => {
    const sad = pickWaitLine('jun', 'en', 0, 'hello', undefined, 'sad');
    expect(isSubstantialStub(sad)).toBe(true);
    expect(sad).toBe(pickWaitLine('jun', 'en', 0, 'hello', undefined, 'sad'));
  });
});
