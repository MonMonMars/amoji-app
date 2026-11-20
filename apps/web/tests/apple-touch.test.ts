import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAppleTouchDevice } from '../lib/apple-touch';

describe('isAppleTouchDevice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects iPhone, iPad, and iPadOS desktop UA', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      maxTouchPoints: 5,
    });
    expect(isAppleTouchDevice()).toBe(true);

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
      maxTouchPoints: 5,
    });
    expect(isAppleTouchDevice()).toBe(true);

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      maxTouchPoints: 5,
    });
    expect(isAppleTouchDevice()).toBe(true);
  });

  it('does not treat a desktop Mac or Windows box as Apple touch', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      maxTouchPoints: 0,
    });
    expect(isAppleTouchDevice()).toBe(false);

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      maxTouchPoints: 0,
    });
    expect(isAppleTouchDevice()).toBe(false);
  });
});
