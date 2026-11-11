import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EDGE_SPEECH_ORIGIN,
  criticalChatAudioPaths,
  earlyAudioPreloadStarted,
  resetEarlyAudioPreloadForTests,
  runEarlyAudioPreload,
} from '../lib/early-audio-preload';
import { OPEN_CHEER_MS } from '../lib/open-phase';
import { THINKING_SOUND_DELAY_MS } from '../lib/thinking-sound';
import { assetUrl } from '../lib/asset';

afterEach(() => {
  resetEarlyAudioPreloadForTests();
  delete process.env.NEXT_PUBLIC_BASE_PATH;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('early audio preload', () => {
  it('lists fixed Pages-relative critical clips (no loading um)', () => {
    const female = criticalChatAudioPaths('yue', 'female');
    // Loading warmup no longer pulls um_long; poke chest may still reference um.mp3.
    expect(female.some((p) => /\/um_long\.mp3$/.test(p))).toBe(false);
    expect(female).toContain('/voice-clips/universal/female/wow_woven.mp3');
    expect(female.every((p) => p.startsWith('/voice-clips/'))).toBe(true);

    const male = criticalChatAudioPaths('en', 'male');
    expect(male.some((p) => /\/um_long\.mp3$/.test(p))).toBe(false);
    expect(male).toContain('/voice-clips/ja/male/oh.mp3');
  });

  it('prefixes assetUrl with Pages basePath', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/amoji-app';
    const path = criticalChatAudioPaths('yue', 'female')[0]!;
    expect(assetUrl(path)).toBe(`/amoji-app${path}`);
  });

  it('keeps enter/cheer and thinking delays (no early audible open)', () => {
    expect(OPEN_CHEER_MS).toBeGreaterThanOrEqual(2500);
    // t790: the wait cue is tied to the 2s reply-loading threshold, so it is
    // no longer the same number as the enter cheer — both stay off the first
    // instant of the page, which is what this guards.
    expect(THINKING_SOUND_DELAY_MS).toBe(3_000);
  });

  it('exposes Edge speech origin for preconnect', () => {
    expect(EDGE_SPEECH_ORIGIN).toBe('https://speech.platform.bing.com');
  });

  it('runEarlyAudioPreload is idempotent and marks started', async () => {
    vi.stubGlobal('window', {
      Audio: class {
        preload = '';
        src = '';
        addEventListener() { /* noop */ }
      },
      setTimeout: (fn: () => void) => { fn(); return 0; },
    } as unknown as Window & typeof globalThis);
    vi.stubGlobal('document', {
      getElementById: () => null,
      createElement: () => ({
        id: '',
        rel: '',
        href: '',
        crossOrigin: '',
      }),
      head: { appendChild: () => undefined },
    } as unknown as Document);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })));

    expect(earlyAudioPreloadStarted()).toBe(false);
    const a = runEarlyAudioPreload({ lang: 'yue', gender: 'female' });
    const b = runEarlyAudioPreload({ lang: 'en', gender: 'male' });
    expect(a).toBe(b);
    expect(earlyAudioPreloadStarted()).toBe(true);
    await a;
  });
});
