import { describe, expect, it } from 'vitest';
import {
  THINKING_SOUND_DELAY_MS,
  THINKING_SOUND_MAX_BEATS,
  planThinkingSound,
  startThinkingSound,
  stopThinkingSound,
  thinkingFillerAllowed,
  loadingUmSfxAllowed,
} from '../lib/thinking-sound';
import { SUBSTANTIAL_STUB_CHARS, WARMUP_FIRST_MS, WARMUP_MAX_LINES, isSubstantialStub } from '../lib/warmup';
import { LOADING_STUBS } from '../lib/thinking-lines';

describe('loading um filler disabled (Pixel)', () => {
  it('never allows spoken filler or recorded um SFX', () => {
    expect(thinkingFillerAllowed()).toBe(false);
    expect(loadingUmSfxAllowed()).toBe(false);
  });

  it('startThinkingSound never calls say', () => {
    const said: string[] = [];
    const session = startThinkingSound({
      lang: 'en',
      characterId: 'a01-shino',
      say: (t) => said.push(t),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (id) => clearTimeout(id),
    });
    expect(said).toEqual([]);
    session.stop();
    stopThinkingSound();
    expect(said).toEqual([]);
  });

  it('keeps historical timing constants for reference', () => {
    expect(THINKING_SOUND_DELAY_MS).toBe(3_000);
    expect(WARMUP_FIRST_MS).toBe(3_000);
    expect(THINKING_SOUND_MAX_BEATS).toBe(WARMUP_MAX_LINES);
  });
});

describe('wait filler line banks (kept but not planned while disabled)', () => {
  it('planThinkingSound returns no beats while filler is off', () => {
    expect(planThinkingSound({ lang: 'en', characterId: 'a01-shino', userText: 'hello' })).toEqual([]);
  });

  it('bank still contains full think/search sentences if ever re-enabled', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      expect(LOADING_STUBS[lang].some((line) => isSubstantialStub(line))).toBe(true);
      expect(LOADING_STUBS[lang].some((line) => line.replace(/\s/g, '').length >= SUBSTANTIAL_STUB_CHARS)).toBe(true);
    }
    expect(THINKING_SOUND_MAX_BEATS).toBe(WARMUP_MAX_LINES);
  });
});
