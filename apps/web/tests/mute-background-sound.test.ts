// Settings → 🔊 Voice → "Background sound" (owner ask, 2026-11-24):
// "add a button at the setting page, allow user mute the background sound."
//
// Contract under test:
//   • default is UNMUTED — shipping this must not change anyone's sound;
//   • turning it ON silences a loop that is ALREADY running (band, piano,
//     song-bed element, ambient scene bed) inside the same click;
//   • turning it OFF brings the loop back at the stored BGM/SFX step and lets
//     the next ambience start audibly;
//   • the character's SPOKEN voice is never touched while it is on;
//   • the choice round-trips through localStorage.
//
// The audio engines are driven through a tiny fake WebAudio graph so the
// assertions are about real gain writes, not about source text. Speech is
// exercised through the real gesture-clip player (lib/play-voice-clip.ts).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---- fake WebAudio ---------------------------------------------------------

class FakeParam {
  value = 0;
  setValueAtTime(v: number): this { this.value = v; return this; }
  linearRampToValueAtTime(v: number): this { this.value = v; return this; }
  exponentialRampToValueAtTime(v: number): this {
    this.value = Math.max(v, 0.0001);
    return this;
  }
  cancelScheduledValues(): this { return this; }
}

class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  detune = new FakeParam();
  Q = new FakeParam();
  type = 'sine';
  fftSize = 256;
  frequencyBinCount = 128;
  buffer: unknown = null;
  loop = false;
  connections: unknown[] = [];
  connect(n: unknown): unknown { this.connections.push(n); return n; }
  disconnect(): void { this.connections = []; }
  start(): void { /* scheduled */ }
  stop(): void { /* scheduled */ }
  getByteFrequencyData(bins: Uint8Array): void { bins.fill(0); }
  getByteTimeDomainData(bins: Uint8Array): void { bins.fill(128); }
}

class FakeAudioContext {
  static last: FakeAudioContext | null = null;
  // Suspended on purpose: the library bed then takes the HTMLAudioElement
  // path (the one that plays public/audio/song-bed/*.mp3), with no fetch.
  state: AudioContextState = 'suspended';
  sampleRate = 44100;
  currentTime = 0;
  destination = new FakeNode();
  constructor() { FakeAudioContext.last = this; }
  createGain(): FakeNode { return new FakeNode(); }
  createOscillator(): FakeNode { return new FakeNode(); }
  createBiquadFilter(): FakeNode { return new FakeNode(); }
  createBufferSource(): FakeNode { return new FakeNode(); }
  createAnalyser(): FakeNode { return new FakeNode(); }
  createMediaElementSource(): FakeNode { return new FakeNode(); }
  createBuffer(_channels: number, length: number): unknown {
    const data = new Float32Array(Math.max(1, length));
    return { sampleRate: 44100, getChannelData: () => data };
  }
  resume(): Promise<void> { return Promise.resolve(); }
  suspend(): Promise<void> { return Promise.resolve(); }
  close(): Promise<void> { this.state = 'closed'; return Promise.resolve(); }
  decodeAudioData(): Promise<unknown> { return Promise.resolve({ duration: 1 }); }
}

// ---- fake media element (speech clips AND song-bed loops) ------------------

class FakeAudio {
  static instances: FakeAudio[] = [];
  src = '';
  volume = 1;
  muted = false;
  paused = true;
  loop = false;
  currentTime = 0;
  duration = 1;
  ended = false;
  dataset: Record<string, string> = {};
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onplay: (() => void) | null = null;
  private listeners = new Map<string, Set<(e?: unknown) => void>>();
  constructor(url?: string) {
    this.src = url ?? '';
    FakeAudio.instances.push(this);
  }
  addEventListener(type: string, fn: (e?: unknown) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: (e?: unknown) => void): void {
    this.listeners.get(type)?.delete(fn);
  }
  dispatch(type: string): void {
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
  play(): Promise<void> {
    this.paused = false;
    this.currentTime = Math.max(this.currentTime, 0.5);
    try { this.onplay?.(); } catch { /* ignore */ }
    this.dispatch('playing');
    return Promise.resolve();
  }
  pause(): void { this.paused = true; }
}

// ---- harness ---------------------------------------------------------------

type Installed = {
  restore: () => void;
  storage: Map<string, string>;
};

function installBrowser(): Installed {
  const g = globalThis as Record<string, unknown> & {
    window?: unknown;
    localStorage?: unknown;
    Audio?: unknown;
  };
  const prevWindow = g.window;
  const prevLs = g.localStorage;
  const prevAudio = g.Audio;
  const prevCustomEvent = (globalThis as { CustomEvent?: unknown }).CustomEvent;

  const storage = new Map<string, string>();
  const ls = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => { storage.set(k, String(v)); },
    removeItem: (k: string) => { storage.delete(k); },
    clear: () => storage.clear(),
    key: (i: number) => Array.from(storage.keys())[i] ?? null,
    get length() { return storage.size; },
  } as unknown as Storage;

  const listeners = new Map<string, Set<(e: unknown) => void>>();
  const win = {
    localStorage: ls,
    AudioContext: FakeAudioContext,
    location: { href: 'http://localhost/' },
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: (e: unknown) => void) => {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent: (e: { type: string }) => {
      for (const fn of listeners.get(e.type) ?? []) fn(e);
      return true;
    },
  };

  g.window = win;
  g.localStorage = ls;
  g.Audio = FakeAudio;
  FakeAudio.instances = [];
  FakeAudioContext.last = null;
  if (typeof (globalThis as { CustomEvent?: unknown }).CustomEvent === 'undefined') {
    class MiniCustomEvent<T> {
      type: string;
      detail: T;
      constructor(type: string, init?: { detail?: T }) {
        this.type = type;
        this.detail = init?.detail as T;
      }
    }
    (globalThis as { CustomEvent?: unknown }).CustomEvent = MiniCustomEvent;
  }

  return {
    storage,
    restore: () => {
      g.window = prevWindow;
      g.localStorage = prevLs;
      g.Audio = prevAudio;
      if (prevCustomEvent === undefined) delete (globalThis as { CustomEvent?: unknown }).CustomEvent;
      else (globalThis as { CustomEvent?: unknown }).CustomEvent = prevCustomEvent;
    },
  };
}

/** Fresh module graph bound to the fake window (subscriptions register on import). */
async function loadEngines() {
  vi.resetModules();
  const bg = await import('../lib/background-sound');
  const music = await import('../lib/music');
  const sfx = await import('../lib/sfx');
  return { bg, music, sfx };
}

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

let browser: Installed | null = null;
let engines: Awaited<ReturnType<typeof loadEngines>> | null = null;

beforeEach(async () => {
  browser = installBrowser();
  engines = await loadEngines();
});

afterEach(() => {
  try {
    engines?.music.endPerformanceMusic();
    engines?.music.stopPiano();
    engines?.sfx.ambientStop();
  } catch { /* ignore */ }
  browser?.restore();
  browser = null;
  engines = null;
});

describe('background sound mute', () => {
  it('defaults to unmuted and writes nothing to storage on boot', async () => {
    const { bg, music } = engines!;
    expect(bg.isBackgroundSoundMuted()).toBe(false);
    expect(browser!.storage.get('amoji.bgm-mute.v1')).toBeUndefined();
    // A default app still has audible music.
    music.startMusic('juno');
    expect(music.musicPlaying()).toBe(true);
    expect(music.backgroundSoundSnapshot().band).toBeGreaterThan(0);
  });

  it('round-trips through localStorage and survives a fresh module graph', async () => {
    const { bg } = engines!;
    bg.setBackgroundSoundMuted(true);
    expect(bg.isBackgroundSoundMuted()).toBe(true);
    expect(browser!.storage.get('amoji.bgm-mute.v1')).toBe('on');

    // Reload: new module instance, same storage.
    engines!.music.endPerformanceMusic();
    engines!.sfx.ambientStop();
    const reloaded = await loadEngines();
    expect(reloaded.bg.isBackgroundSoundMuted()).toBe(true);

    reloaded.bg.setBackgroundSoundMuted(false);
    expect(browser!.storage.get('amoji.bgm-mute.v1')).toBe('off');
    expect((await loadEngines()).bg.isBackgroundSoundMuted()).toBe(false);
  });

  it('(a) mutes a band loop that is already playing, instantly', () => {
    const { bg, music } = engines!;
    music.startMusic('juno');
    const before = music.backgroundSoundSnapshot().band;
    expect(before).toBeCloseTo(0.12 * 0.8, 6); // theme volume × BGM step

    bg.setBackgroundSoundMuted(true); // CustomEvent → music.applyBackgroundSoundMute()
    expect(music.backgroundSoundSnapshot().band).toBe(0);
    // The loop is still scheduled — only its output is silenced.
    expect(music.musicPlaying()).toBe(true);
  });

  it('(a) mutes a piano arrangement that is already playing, instantly', () => {
    const { bg, music } = engines!;
    music.startPiano('juno');
    expect(music.backgroundSoundSnapshot().piano).toBeGreaterThan(0);
    bg.setBackgroundSoundMuted(true);
    expect(music.backgroundSoundSnapshot().piano).toBe(0);
  });

  it('(a) mutes an already-running song-bed / ambience loop, instantly', async () => {
    const { bg, music, sfx } = engines!;
    // Suspended shared context → the library bed takes the HTMLAudioElement
    // path, which is what plays public/audio/song-bed/*.mp3 on a phone.
    music.startLibraryPerformance({ kind: 'dance', lang: 'en', gender: 'female', n: 0, ms: 4000 });
    await flush();
    const bed = music.backgroundSoundSnapshot();
    expect(bed.bedVolume).toBeGreaterThan(0);
    expect(bed.bedMuted).toBe(false);

    sfx.ambientStart('rain');
    expect(sfx.ambientPlaying()).toBe(true);
    expect(sfx.ambientGainSnapshot()).toBeGreaterThan(0);

    bg.setBackgroundSoundMuted(true);
    const muted = music.backgroundSoundSnapshot();
    expect(muted.bedVolume).toBe(0);
    expect(muted.bedMuted).toBe(true);
    expect(sfx.ambientGainSnapshot()).toBe(0);
  });

  it('(a) a streamed keyless music bed obeys the same mute switch', async () => {
    const { bg, music } = engines!;
    // 'jazz' has no owner/Mixkit match, so this resolves to the curated
    // Jamendo catalog — a real cross-origin streamed bed, not a local file.
    music.startLibraryPerformance({ kind: 'dance', style: 'jazz', lang: 'en', n: 0, ms: 4000 });
    await flush();
    const bed = FakeAudio.instances.at(-1)!;
    expect(bed.src).toContain('prod-1.storage.jamendo.com');
    const live = music.backgroundSoundSnapshot();
    expect(live.bedVolume).toBeGreaterThan(0);
    expect(live.bedMuted).toBe(false);

    bg.setBackgroundSoundMuted(true);
    const muted = music.backgroundSoundSnapshot();
    expect(muted.bedVolume).toBe(0);
    expect(muted.bedMuted).toBe(true);

    bg.setBackgroundSoundMuted(false);
    expect(music.backgroundSoundSnapshot().bedVolume).toBeGreaterThan(0);
    expect(music.backgroundSoundSnapshot().bedMuted).toBe(false);
  });

  it('(b) unmute restores the running beds at the stored steps', async () => {
    const { bg, music, sfx } = engines!;
    music.startMusic('juno');
    sfx.ambientStart('rain');

    bg.setBackgroundSoundMuted(true);
    expect(music.backgroundSoundSnapshot().band).toBe(0);
    expect(sfx.ambientGainSnapshot()).toBe(0);

    bg.setBackgroundSoundMuted(false);
    expect(music.backgroundSoundSnapshot().band).toBeCloseTo(0.12 * 0.8, 6);
    expect(sfx.ambientGainSnapshot()).toBeCloseTo(0.8, 6);
  });

  it('(b) ambience started while muted stays silent, then speaks on unmute', () => {
    const { bg, sfx } = engines!;
    bg.setBackgroundSoundMuted(true);
    sfx.ambientStart('ember');
    expect(sfx.ambientGainSnapshot()).toBe(0);

    bg.setBackgroundSoundMuted(false);
    expect(sfx.ambientGainSnapshot()).toBeCloseTo(0.8, 6);

    // …and a scene change while unmuted is audible from the start.
    sfx.ambientStart('meadow');
    expect(sfx.ambientGainSnapshot()).toBeCloseTo(0.8, 6);
  });

  it('(c) a spoken clip still plays while background sound is muted', async () => {
    const { bg, sfx } = engines!;
    bg.setBackgroundSoundMuted(true);
    sfx.ambientStart('rain'); // a muted bed is running at the same time
    expect(sfx.ambientGainSnapshot()).toBe(0);

    const clip = await import('../lib/play-voice-clip');
    // Real gesture-clip path: creates its <audio> through the fake Audio ctor.
    clip.playGestureClipSync('/voice-clips/en/hello.mp3', 'hello', () => undefined);
    await flush();

    const speech = FakeAudio.instances.at(-1)!;
    expect(speech.paused).toBe(false);
    expect(speech.muted).toBe(false);
    expect(speech.volume).toBeGreaterThan(0);
    expect(speech.src).toContain('voice-clips/en/hello.mp3');
    clip.stopVoiceClip();
  });

  it('never reaches for the speech engine or pauses foreign media', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const web = join(__dirname, '..');
    const read = (p: string) => readFileSync(join(web, p), 'utf8');

    // The toggle must not know speech exists: no synth calls, no stopSpeaking,
    // no blanket pause of every media element (that is Mute All's job).
    for (const file of ['lib/background-sound.ts', 'lib/music.ts', 'lib/sfx.ts']) {
      const src = read(file);
      expect(src).not.toContain('speechSynthesis');
      expect(src).not.toContain('stopSpeaking');
      expect(src).not.toContain('restoreMediaElementsAfterUnmute');
    }
    const toggle = read('lib/background-sound.ts');
    expect(toggle).toContain("'amoji.bgm-mute.v1'");
    expect(toggle).toContain("=== 'on'");
    // Engines read the flag at every gain write, so a later volume-step change
    // cannot un-mute a muted bed.
    expect(read('lib/music.ts')).toContain('backgroundSoundOnFactor()');
    expect(read('lib/sfx.ts')).toContain('backgroundSoundOnFactor()');
    // The bed element is owned by this switch: a Mute-all unmute or a tab
    // return must not turn a deliberately muted song-bed back on.
    expect(read('lib/music.ts')).toContain("dataset.amojiBgm = '1'");
    expect(read('lib/master-mute.ts')).toContain("dataset.amojiBgm === '1'");
    expect(read('lib/audio-tab-visibility.ts')).toContain("dataset.amojiBgm === '1'");
  });

  it('Settings exposes the switch in the Voice section with an accessible label', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const sheet = readFileSync(join(__dirname, '..', 'components', 'SettingsSheet.tsx'), 'utf8');
    expect(sheet).toContain("t(lang, 'backgroundSound')");
    expect(sheet).toContain('subscribeBackgroundSound');
    expect(sheet).toContain('setBackgroundSoundMuted');
    expect(sheet).toContain('backgroundMuted === null');
    // Reuses the existing Toggle (role="switch" + aria-label), no new widget.
    expect(sheet).toContain('role="switch"');
    expect(sheet).toContain('aria-checked');
  });
});
