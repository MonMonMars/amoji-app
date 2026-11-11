import { describe, expect, it, vi } from 'vitest';
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

describe('wait filler line banks (still substantial if re-enabled)', () => {
  it('plans whole sentences, not bare um', () => {
    const plan = planThinkingSound({ lang: 'en', characterId: 'a01-shino', userText: 'hello' });
    expect(plan.length).toBe(THINKING_SOUND_MAX_BEATS);
    for (const beat of plan) {
      expect(isSubstantialStub(beat.text)).toBe(true);
      expect(beat.text.replace(/\s/g, '').length).toBeGreaterThanOrEqual(SUBSTANTIAL_STUB_CHARS);
    }
  });

  it('bank still contains full think/search sentences', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      expect(LOADING_STUBS[lang].some((line) => isSubstantialStub(line))).toBe(true);
    }
  });
});
