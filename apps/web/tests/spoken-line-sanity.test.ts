import { describe, expect, it } from 'vitest';
import {
  asksUserInnerThoughts,
  gateSpokenLine,
  safeIdleFallback,
  spokenLineLooksBroken,
} from '../lib/spoken-line-sanity';

describe('spoken-line-sanity', () => {
  it('flags map nonsense and unfinished fills', () => {
    expect(spokenLineLooksBroken('a small map reminding you')).toBe(true);
    expect(spokenLineLooksBroken('a tiny map reminded me of you in a soft way.')).toBe(true);
    expect(spokenLineLooksBroken('{thing} near you')).toBe(true);
    expect(spokenLineLooksBroken('')).toBe(true);
    expect(spokenLineLooksBroken('Still here with you.')).toBe(false);
  });

  it('flags thought interrogation across langs', () => {
    expect(asksUserInnerThoughts('What are you thinking?')).toBe(true);
    expect(asksUserInnerThoughts("You've gone quiet — are you thinking?")).toBe(true);
    expect(asksUserInnerThoughts("What's on your mind?")).toBe(true);
    expect(asksUserInnerThoughts('你諗緊咩呀？')).toBe(true);
    expect(asksUserInnerThoughts('你在想什么呀？')).toBe(true);
    expect(asksUserInnerThoughts('今、何を考えてる？')).toBe(true);
    expect(asksUserInnerThoughts('Looking at a pocket map made me think of you, softly.')).toBe(false);
  });

  it('gates idle lines to a safe fallback', () => {
    const out = gateSpokenLine('What are you thinking?', {
      mode: 'idle',
      lang: 'en',
      n: 0,
      fallback: safeIdleFallback('en', 0),
    });
    expect(out).toBeTruthy();
    expect(asksUserInnerThoughts(out!)).toBe(false);
    expect(spokenLineLooksBroken(out!)).toBe(false);

    expect(gateSpokenLine('a small map reminding you', { mode: 'local' })).toBeUndefined();
  });
});
