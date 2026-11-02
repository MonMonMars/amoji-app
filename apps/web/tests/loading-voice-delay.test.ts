import { describe, expect, it } from 'vitest';
import { THINKING_SOUND_DELAY_MS } from '../lib/thinking-sound';
import { WARMUP_FIRST_MS } from '../lib/warmup';
import { OPEN_CHEER_MS, OPEN_CHEER_FOLLOW_MS, OPEN_IDLE_BRIEF_MS } from '../lib/open-phase';

describe('loading voice / SFX delay (Mon: not in the first seconds)', () => {
  it('defers thinking um, warmup, and chat-enter cheer past the first seconds', () => {
    expect(THINKING_SOUND_DELAY_MS).toBeGreaterThanOrEqual(3000);
    expect(WARMUP_FIRST_MS).toBeGreaterThanOrEqual(3500);
    expect(OPEN_CHEER_MS).toBeGreaterThanOrEqual(3000);
    expect(OPEN_CHEER_FOLLOW_MS).toBeGreaterThan(OPEN_CHEER_MS);
    expect(OPEN_IDLE_BRIEF_MS).toBeGreaterThan(OPEN_CHEER_FOLLOW_MS);
  });
});
