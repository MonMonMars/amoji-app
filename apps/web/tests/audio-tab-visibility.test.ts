import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isTabAudioObscured,
  registerTabVisibilityHooks,
  resetAudioTabVisibilityForTests,
  shouldSuppressVisibilityAudioBurst,
  VISIBILITY_RESUME_DEBOUNCE_MS,
} from '../lib/audio-tab-visibility';

describe('audio tab visibility', () => {
  beforeEach(() => {
    resetAudioTabVisibilityForTests();
    vi.useRealTimers();
  });

  it('exports a debounce window for resume', () => {
    expect(VISIBILITY_RESUME_DEBOUNCE_MS).toBeGreaterThanOrEqual(200);
    expect(VISIBILITY_RESUME_DEBOUNCE_MS).toBeLessThanOrEqual(500);
  });

  it('registers hide/show hooks for voice integration', () => {
    const onHide = vi.fn();
    const onShow = vi.fn();
    registerTabVisibilityHooks({ onHide, onShow });
    expect(isTabAudioObscured()).toBe(false);
    expect(shouldSuppressVisibilityAudioBurst()).toBe(false);
  });
});
