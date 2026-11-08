import { describe, expect, it } from 'vitest';
import { THINKING_SOUND_DELAY_MS } from '../lib/thinking-sound';
import { WARMUP_FIRST_MS } from '../lib/warmup';
import { OPEN_CHEER_MS, OPEN_IDLE_BRIEF_MS } from '../lib/open-phase';

describe('loading voice / SFX delay (Mon: not in the first seconds)', () => {
  it('holds the thinking filler for about one second', () => {
    // t790 — the filler used to arrive too soon. One second is the agreed
    // wait: long enough that a very fast reply beats it, short enough that a
    // slow one still feels alive.
    expect(THINKING_SOUND_DELAY_MS).toBe(1_000);
    expect(WARMUP_FIRST_MS).toBe(THINKING_SOUND_DELAY_MS);
  });

  it('holds the single open welcome past immediate load without stacking delays', () => {
    expect(OPEN_CHEER_MS).toBeGreaterThanOrEqual(2000);
    expect(OPEN_IDLE_BRIEF_MS).toBeGreaterThan(OPEN_CHEER_MS);
  });
});
