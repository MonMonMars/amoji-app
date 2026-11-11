/**
 * Executes the REAL gtts.ts speakGtts() - compiled with esbuild, then run in a
 * vm with a stub Audio - driving the chunk chain end to end.
 *
 * Note on the model: the chain is SEQUENTIAL. It creates one <audio> at a time
 * and only advances when that element ends. So a test must end each chunk to
 * observe the next one; "1 audio created" means "1 playing", not "1 chunk".
 *
 * Proves behaviour, not source shape:
 *   - the whole line plays through, one element per clause
 *   - stopGtts() rejects 'canceled' IMMEDIATELY (this was a real bug: the
 *     promise used to hang until the 10s stall watchdog and then report
 *     "chunk stalled" instead)
 *   - a chunk error rejects so the caller can fall through to synth
 *   - onPlaying fires exactly once
 *   - Cantonese asks for `yue`, not the Hong Kong Mandarin `zh-HK`
 *   - no chunk exceeds the endpoint cap
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const WEB = join(here, '..');
const REPO = join(WEB, '..', '..');
const SRC = join(WEB, 'lib/gtts.ts');

/**
 * Resolve the esbuild binary for the HOST platform. Hardcoding the win32 path
 * broke CI on Linux, so look up the platform package in the pnpm store.
 */
function findEsbuild(): string | null {
  const triple = `${process.platform}-${process.arch}`;
  const binName = process.platform === 'win32' ? 'esbuild.exe' : 'esbuild';
  try {
    const store = join(REPO, 'node_modules/.pnpm');
    const dir = readdirSync(store).find((d) => d.startsWith(`@esbuild+${triple}@`));
    if (!dir) return null;
    const candidate = join(store, dir, 'node_modules', '@esbuild', triple, binName);
    return existsSync(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

const ESBUILD = findEsbuild();
/** The runtime suite needs esbuild; skip (not fail) where it is unavailable. */
const esbuildAvailable = ESBUILD !== null;

let JS = '';

beforeAll(() => {
  if (!ESBUILD) return;
  JS = execFileSync(
    ESBUILD,
    [
      SRC,
      '--format=cjs',
      '--target=es2020',
      '--bundle',
      '--external:./audio-output',
      '--external:./playback-volume',
      '--external:./prefs',
      '--external:./speak-text',
      '--external:./speech',
    ],
    { encoding: 'utf8' },
  );
});

interface Stub {
  src: string;
  playbackRate: number;
  paused: boolean;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  onplay: (() => void) | null;
  play(): Promise<void>;
  pause(): void;
}

function boot() {
  const created: Stub[] = [];
  class A implements Stub {
    src: string;
    playbackRate = 1;
    preload = '';
    volume = 1;
    paused = true;
    /** Mirrors HTMLMediaElement.dataset so amojiAudio tagging does not throw. */
    dataset: Record<string, string> = {};
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onplay: (() => void) | null = null;
    constructor(src: string) {
      this.src = src;
      created.push(this);
    }
    play() {
      this.paused = false;
      queueMicrotask(() => this.onplay?.());
      return Promise.resolve();
    }
    pause() { this.paused = true; }
  }

  const moduleObj = { exports: {} as Record<string, unknown> };
  const sandbox = {
    module: moduleObj,
    exports: moduleObj.exports,
    require: (id: string) => {
      if (id.includes('audio-output')) {
        return {
          pinDefaultOutput: () => {},
          pinDefaultOutputAsync: () => Promise.resolve(),
        };
      }
      if (id.includes('playback-volume')) return { applyPlaybackVolume: () => {} };
      if (id.includes('speak-text')) return { stripVoicedGlyphs: (s: string) => s };
      if (id.includes('speech')) return { followAudioElement: () => {} };
      return {};
    },
    Audio: A,
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
    setTimeout,
    clearTimeout,
    queueMicrotask,
    Promise,
    console,
    Math,
    encodeURIComponent,
    decodeURIComponent,
    RegExp,
    Error,
    String,
  };
  vm.createContext(sandbox);
  vm.runInContext(JS, sandbox);
  return {
    api: moduleObj.exports as {
      speakGtts: (t: string, o: Record<string, unknown>) => Promise<void>;
      stopGtts: () => void;
    },
    created,
  };
}

/** End the currently-playing chunk repeatedly so the sequential chain advances. */
async function playThrough(created: Stub[], done: Promise<void>, maxChunks = 40) {
  for (let i = 0; i < maxChunks * 4; i += 1) {
    const a = created.find((x) => !x.paused && x.onended);
    if (a?.onended) {
      a.paused = true;
      a.onended();
    }
    const settled = await Promise.race([
      done.then(() => true).catch(() => true),
      new Promise((r) => setTimeout(() => r(false), 8)),
    ]);
    if (settled) break;
  }
  await done;
}

const textOf = (a: Stub) => {
  const q = /q=([^&]*)/.exec(a.src)?.[1] ?? '';
  return decodeURIComponent(q);
};

// Skip (not fail) when the host has no esbuild binary: this suite is a
// behavioural proof, not a CI gate. The source-shape suite (gtts-chain) still
// runs everywhere.
describe.skipIf(!esbuildAvailable)('speakGtts real behaviour (esbuild + vm)', () => {
  it('keeps each clause as its own request so pauses can breathe', async () => {
    // Merging short clauses into one MP3 erased the gap after 。 — she sounded
    // breathless. One request per clause; onPlaying still fires once for the line.
    const { api, created } = boot();
    let onPlayingCount = 0;
    const p = api.speakGtts('第一句。第二句。第三句。', {
      lang: 'yue',
      onPlaying: () => { onPlayingCount += 1; },
    });
    await playThrough(created, p);
    expect(created.length).toBe(3);
    expect(textOf(created[0]!)).toContain('第一句');
    expect(textOf(created[2]!)).toContain('第三句');
    expect(onPlayingCount).toBe(1);
  });

  it('cancels immediately — not after the 10s stall watchdog', async () => {
    // REAL BUG this caught: stopGtts() used to only pause the element, so the
    // awaiting caller hung ~10s and then reported "chunk stalled" instead of
    // "canceled". A superseded line must fall through at once.
    const { api, created } = boot();
    const p = api.speakGtts('取消測試。', { lang: 'en' });
    await new Promise((r) => setTimeout(r, 20));
    expect(created.length).toBeGreaterThan(0);
    const t0 = Date.now();
    api.stopGtts();
    await expect(p).rejects.toThrow(/canceled/i);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('rejects on a chunk error so the caller can fall through to synth', async () => {
    const { api, created } = boot();
    const p = api.speakGtts('會失敗。', { lang: 'en' });
    await new Promise((r) => setTimeout(r, 20));
    created[0]!.onerror?.();
    await expect(p).rejects.toThrow(/gtts playback failed/i);  });

  it('asks Google for real Cantonese, not the Hong Kong Mandarin voice', async () => {
    const { api, created } = boot();
    void api.speakGtts('你好。', { lang: 'yue' }).catch(() => {});
    await new Promise((r) => setTimeout(r, 20));
    expect(created[0]!.src).toContain('tl=yue');
    expect(created[0]!.src).not.toContain('tl=zh-HK');
  });

  it('bounds playbackRate so a sad line never drags below 0.88', async () => {
    const { api, created } = boot();
    void api.speakGtts('慢啲講。', { lang: 'yue', rate: 0.4 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 20));
    expect(created[0]!.playbackRate).toBeGreaterThanOrEqual(0.88);
  });

  it('keeps male Cantonese gTTS near conversational pace despite pitch bias', async () => {
    const { api, created } = boot();
    void api.speakGtts('你好呀。', { lang: 'yue', pitchBias: 0.88 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 20));
    expect(created[0]!.playbackRate).toBeGreaterThanOrEqual(1.04);
    expect(created[0]!.playbackRate).toBeLessThanOrEqual(1.25);
  });

  it('splits a long line into several capped requests, played in order', async () => {
    const { api, created } = boot();
    // Well over 120 chars per clause, so the merge step cannot collapse it.
    const long = `這是一段很長的話${'內容'.repeat(80)}。`;
    await playThrough(created, api.speakGtts(long, { lang: 'zh' }));
    expect(created.length).toBeGreaterThan(1);
    for (const a of created) {
      expect(textOf(a).length).toBeLessThanOrEqual(120);
    }
  });
});
