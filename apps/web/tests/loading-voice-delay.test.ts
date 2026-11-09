import { describe, expect, it } from 'vitest';
import { THINKING_SOUND_DELAY_MS } from '../lib/thinking-sound';
import { WARMUP_FIRST_MS } from '../lib/warmup';
import { OPEN_CHEER_MS, OPEN_IDLE_BRIEF_MS } from '../lib/open-phase';

describe('loading voice / SFX delay (Mon: not in the first seconds)', () => {
  it('holds the thinking filler for three seconds', () => {
    // Pixel: "um…." must not appear immediately — wait 3s of loading first.
    expect(THINKING_SOUND_DELAY_MS).toBe(3_000);
    expect(WARMUP_FIRST_MS).toBe(THINKING_SOUND_DELAY_MS);
  });

  it('holds the single open welcome past immediate load without stacking delays', () => {
    expect(OPEN_CHEER_MS).toBeGreaterThanOrEqual(2000);
    expect(OPEN_IDLE_BRIEF_MS).toBeGreaterThan(OPEN_CHEER_MS);
  });
});
