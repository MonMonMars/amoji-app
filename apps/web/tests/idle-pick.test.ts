import { afterEach, describe, expect, it } from 'vitest';
import { IDLE_CLIP_OPTIONS } from '../lib/idle-clips';
import { idlePickFor, resetIdlePicks, saveIdlePick } from '../lib/idle-pick';

afterEach(() => resetIdlePicks());

describe('idle clip rails', () => {
  it('labels the on-disk idles a01 / b02 and keeps them unique', () => {
    expect(IDLE_CLIP_OPTIONS.map((c) => c.label)).toEqual([
      'a01', 'a02', 'a03', 'a04', 'b01', 'b02', 'b03', 'b04',
    ]);
    expect(new Set(IDLE_CLIP_OPTIONS.map((c) => c.id)).size).toBe(IDLE_CLIP_OPTIONS.length);
    expect(IDLE_CLIP_OPTIONS.find((c) => c.label === 'b01')?.id).toBe('IdleBreathCalm');
  });

  it('saves a pin per companion', () => {
    expect(saveIdlePick('a01-shino', 'IdleHug')).toBe('IdleHug');
    expect(idlePickFor('a01-shino')).toBe('IdleHug');
    expect(idlePickFor('a02-shibu')).toBeNull();
    expect(saveIdlePick('a01-shino', 'not-a-clip')).toBe('IdleHug');
  });
});
