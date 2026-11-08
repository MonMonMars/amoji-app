import { describe, expect, it } from 'vitest';
import { hasReachedScrollEnd } from '../lib/scroll-unlock';

function fakeEl(partial: {
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
}): HTMLElement {
  return partial as unknown as HTMLElement;
}

describe('scroll-to-unlock helper', () => {
  it('unlocks immediately when content fits without scrolling', () => {
    expect(hasReachedScrollEnd(fakeEl({ scrollHeight: 200, clientHeight: 200, scrollTop: 0 }))).toBe(true);
    expect(hasReachedScrollEnd(fakeEl({ scrollHeight: 210, clientHeight: 200, scrollTop: 0 }))).toBe(true);
  });

  it('stays locked until the reader reaches the bottom', () => {
    expect(hasReachedScrollEnd(fakeEl({ scrollHeight: 800, clientHeight: 200, scrollTop: 0 }))).toBe(false);
    expect(hasReachedScrollEnd(fakeEl({ scrollHeight: 800, clientHeight: 200, scrollTop: 580 }))).toBe(false);
    expect(hasReachedScrollEnd(fakeEl({ scrollHeight: 800, clientHeight: 200, scrollTop: 600 }))).toBe(true);
  });
});
