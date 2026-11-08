import { describe, expect, it, vi } from 'vitest';
import {
  THINKING_SOUND_DELAY_MS,
  THINKING_SOUND_GAP_MS,
  THINKING_SOUND_MAX_BEATS,
  planThinkingSound,
  startThinkingSound,
  stopThinkingSound,
  thinkingFillerAllowed,
} from '../lib/thinking-sound';
import { SUBSTANTIAL_STUB_CHARS, WARMUP_FIRST_MS, WARMUP_MAX_LINES, isSubstantialStub } from '../lib/warmup';
import { LOADING_STUBS } from '../lib/thinking-lines';

/** Manual clock so "not before 2s" is asserted against real elapsed time. */
function clock() {
  let now = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  let seq = 1;
  return {
    setTimer: (fn: () => void, ms: number) => {
      const id = seq++;
      timers.set(id, { at: now + ms, fn });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: (id: ReturnType<typeof setTimeout>) => {
      timers.delete(id as unknown as number);
    },
    /** Advance time, firing due timers in order. */
    advance: (ms: number) => {
      const target = now + ms;
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = target;
    },
    now: () => now,
    pending: () => timers.size,
  };
}

describe('wait filler timing (Mon: not before ~1s)', () => {
  it('waits about one second before the first beat', () => {
    expect(THINKING_SOUND_DELAY_MS).toBe(1_000);
    expect(WARMUP_FIRST_MS).toBe(1_000);
    const c = clock();
    const said: string[] = [];
    startThinkingSound({
      lang: 'en',
      characterId: 'a01-shino',
      say: (t) => said.push(t),
      setTimer: c.setTimer,
      clearTimer: c.clearTimer,
    });
    c.advance(THINKING_SOUND_DELAY_MS - 1);
    expect(said).toEqual([]);
    c.advance(1);
    expect(said).toHaveLength(1);
  });

  it('never emits a filler when the reply lands first', () => {
    const c = clock();
    const said: string[] = [];
    const session = startThinkingSound({
      lang: 'yue',
      characterId: 'a01-shino',
      say: (t) => said.push(t),
      setTimer: c.setTimer,
      clearTimer: c.clearTimer,
    });
    // A fast reply arrives inside the 2s grace window.
    c.advance(900);
    session.stop();
    c.advance(60_000);
    expect(said).toEqual([]);
    expect(c.pending()).toBe(0);
  });

  it('drops the second beat too when the reply lands between beats', () => {
    const c = clock();
    const said: string[] = [];
    startThinkingSound({
      lang: 'en',
      characterId: 'a01-shino',
      say: (t) => said.push(t),
      setTimer: c.setTimer,
      clearTimer: c.clearTimer,
    });
    c.advance(THINKING_SOUND_DELAY_MS);
    expect(said).toHaveLength(1);
    stopThinkingSound();
    c.advance(60_000);
    expect(said).toHaveLength(1);
    expect(c.pending()).toBe(0);
  });

  it('keeps a beat that is already counting down from firing after stop()', () => {
    const c = clock();
    const said: string[] = [];
    const session = startThinkingSound({
      lang: 'en',
      characterId: 'a01-shino',
      say: (t) => said.push(t),
      setTimer: c.setTimer,
      clearTimer: c.clearTimer,
    });
    c.advance(THINKING_SOUND_DELAY_MS - 1);
    session.stop();
    // Even without the clear landing, the callback re-checks and refuses.
    c.advance(1);
    expect(said).toEqual([]);
  });
});

describe('wait filler length (Mon: too short)', () => {
  it('speaks two beats, each a full sentence rather than a bare sound', () => {
    expect(THINKING_SOUND_MAX_BEATS).toBe(2);
    expect(WARMUP_MAX_LINES).toBe(2);
    const beats = planThinkingSound({ lang: 'en', characterId: 'a01-shino' });
    expect(beats).toHaveLength(2);
    for (const beat of beats) {
      expect(beat.text.trim().length).toBeGreaterThanOrEqual(SUBSTANTIAL_STUB_CHARS);
      expect(isSubstantialStub(beat.text), beat.text).toBe(true);
    }
  });

  it('never repeats the same line twice in a row', () => {
    for (const lang of ['yue', 'zh', 'ja', 'en'] as const) {
      for (const userText of ['hello', "what's the weather?", 'how are you?']) {
        const beats = planThinkingSound({ lang, characterId: 'a03-fumiriya', userText });
        expect(beats[0]!.text).not.toBe(beats[1]!.text);
      }
    }
  });

  it('spaces the beats by the gap so the first one can finish', () => {
    const beats = planThinkingSound({ lang: 'yue', characterId: 'a01-shino' });
    expect(beats[0]!.atMs).toBe(THINKING_SOUND_DELAY_MS);
    expect(beats[1]!.atMs - beats[0]!.atMs).toBe(THINKING_SOUND_GAP_MS);
    expect(THINKING_SOUND_GAP_MS).toBeGreaterThan(3_000);
  });

  it('every shipped language has a substantial line to say', () => {
    for (const lang of ['yue', 'zh', 'ja', 'en'] as const) {
      const long = LOADING_STUBS[lang].filter(isSubstantialStub);
      expect(long.length, lang).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('wait filler gates', () => {
  it('stays silent when voice replies are off or the app is muted', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => store.get(k) ?? null } });
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null });
    expect(thinkingFillerAllowed()).toBe(true);
    store.set('amoji.voice.v1', 'off');
    expect(thinkingFillerAllowed()).toBe(false);
    store.set('amoji.voice.v1', 'on');
    store.set('amoji.mute.v1', 'on');
    expect(thinkingFillerAllowed()).toBe(false);
    vi.unstubAllGlobals();
  });
});
