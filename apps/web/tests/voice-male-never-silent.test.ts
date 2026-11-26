/**
 * A male voice button must never be silent.
 *
 * Owner report 2026-11-26: "still no male voice. the button is here, but no
 * voice out." The male button was rendered (previous restore), and the Edge
 * relay itself is healthy — a verified UTF-8 POST returns 200 audio/mpeg. So
 * the defect is in the CHAT hop chain, not the relay:
 *
 *   freeVoiceHops(..., { preferMale: true }) = edge → synth → gtts
 *
 *   1. The chat path never passes the pinned voice id, so the Edge id is
 *      derived from `deliveryGenderForChoice()`. While the Edge breaker is open
 *      `allRelayMaleChoices()` returns [] (it is gated on the breaker), so the
 *      male pin resolves to NOTHING and the delivery falls back to the
 *      companion's gender — a male pin can become a woman's voice.
 *   2. `voice-picks.sanitize()` drops the pin under the same condition, so the
 *      male choice is erased for the whole session.
 *   3. In chat on Windows the mic play-and-record latch is active, and the male
 *      chain explicitly SKIPS the device voice ("often lands on earpiece/BT").
 *      With Edge gated off the only remaining hop is gTTS — one female speaker
 *      per `tl`, and blocked by Referer in desktop Chrome. Result: no audio.
 *      The female chain is gtts → synth → … and never skips synth, which is
 *      exactly why female voices still spoke.
 *
 * These tests drive the REAL chat path (speak → performSpeak → beginTts) with
 * the network tiers mocked, so the assertions are about the hops that run, not
 * about a re-implementation of them.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  edgeCalls: [] as Array<{ text: string; opts: Record<string, unknown> }>,
  gttsCalls: [] as Array<{ text: string; opts: Record<string, unknown> }>,
  synthUtterances: [] as Array<Record<string, unknown>>,
  edgeMode: 'ok' as 'ok' | 'fail',
  edgeDead: false,
  micLatch: false,
  voices: [] as Array<{ name: string; lang: string }>,
}));

vi.mock('../lib/edge-tts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/edge-tts')>();
  return {
    ...actual,
    edgeEndpointsDead: () => h.edgeDead,
    speakEdge: vi.fn(async (text: string, opts: Record<string, unknown>) => {
      h.edgeCalls.push({ text, opts });
      if (h.edgeMode === 'fail') throw new Error('edge-tts proxy HTTP 502');
    }),
    stopEdge: vi.fn(),
  };
});

vi.mock('../lib/gtts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/gtts')>();
  return {
    ...actual,
    speakGtts: vi.fn(async (text: string, opts: Record<string, unknown>) => {
      h.gttsCalls.push({ text, opts });
      throw new Error('gtts blocked (Referer 404)');
    }),
    stopGtts: vi.fn(),
  };
});

vi.mock('../lib/audio-output', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audio-output')>();
  return {
    ...actual,
    micCommsRoutingLatchActive: () => h.micLatch,
  };
});

// ---- tiny DOM / storage stubs the voice module expects ----------------------
class FakeUtterance {
  text: string;
  lang = '';
  pitch = 1;
  rate = 1;
  volume = 1;
  voice: { name: string; lang: string } | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

function installGlobals(voices: Array<{ name: string; lang: string }>) {
  const store = new Map<string, string>();
  const localStorageShim = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  const g = globalThis as unknown as Record<string, unknown>;
  g.localStorage = localStorageShim;
  g.window = globalThis;
  g.CustomEvent = class { type: string; detail: unknown; constructor(type: string, init?: { detail?: unknown }) { this.type = type; this.detail = init?.detail; } };
  g.addEventListener = () => undefined;
  g.dispatchEvent = () => true;
  g.SpeechSynthesisUtterance = FakeUtterance as unknown as typeof SpeechSynthesisUtterance;
  g.speechSynthesis = {
    getVoices: () => h.voices,
    speak(u: FakeUtterance) {
      h.synthUtterances.push(u as unknown as Record<string, unknown>);
      setTimeout(() => {
        try { u.onstart?.(); } catch { /* ignore */ }
        setTimeout(() => { try { u.onend?.(); } catch { /* ignore */ } }, 0);
      }, 0);
    },
    cancel: () => undefined,
    resume: () => undefined,
    pause: () => undefined,
    speaking: false,
    pending: false,
    paused: false,
    onvoiceschanged: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  h.voices = voices;
  return store;
}

const DANNY = { name: 'Microsoft Danny - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK' };
const TRACY = { name: 'Microsoft Tracy - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK' };

type VoiceModule = typeof import('../lib/voice');
type PicksModule = typeof import('../lib/voice-picks');
type CapabilityModule = typeof import('../lib/voice-capability');
type RouteModule = typeof import('../lib/male-voice-route');
type RegistryModule = typeof import('../lib/tts-button-registry');

let voiceMod: VoiceModule;
let picksMod: PicksModule;
let capMod: CapabilityModule;
let routeMod: RouteModule;
let registryMod: RegistryModule;

async function waitFor(check: () => boolean, ms = 1200): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('waitFor timed out');
}

beforeAll(async () => {
  installGlobals([DANNY, TRACY]);
  voiceMod = await import('../lib/voice');
  picksMod = await import('../lib/voice-picks');
  capMod = await import('../lib/voice-capability');
  routeMod = await import('../lib/male-voice-route');
  registryMod = await import('../lib/tts-button-registry');
});

beforeEach(() => {
  h.edgeCalls.length = 0;
  h.gttsCalls.length = 0;
  h.synthUtterances.length = 0;
  h.edgeMode = 'ok';
  h.edgeDead = false;
  h.micLatch = false;
  h.voices = [DANNY, TRACY];
  voiceMod.stopSpeaking();
  picksMod.resetVoicePicks();
});

afterEach(() => {
  voiceMod.stopSpeaking();
});

describe('male pin in the CHAT path names the exact male Edge voice', () => {
  it('Cantonese: WanLung, not HiuMaan, not undefined', async () => {
    picksMod.saveVoicePick('yue', 'edge:zh-HK-WanLungNeural');
    voiceMod.speak('今日天氣幾好啊', 'a03-fumiriya', 'yue');
    await waitFor(() => h.edgeCalls.length > 0);
    expect(h.edgeCalls[0]!.opts.voiceId).toBe('zh-HK-WanLungNeural');
    expect(h.edgeCalls[0]!.opts.gender).toBe('male');
  });
});

describe('when the Edge relay is unavailable the male line still has a male hop', () => {
  const male = 'edge:zh-HK-WanLungNeural';

  it('neural voice off + mic latch: uses the device male voice and never the female MP3', async () => {
    // The pin is saved while Edge is healthy (the "button is here" state), then
    // neural TTS is switched off before the reply — the male chain becomes
    // synth → gtts, and the old code skipped synth under the mic latch, leaving
    // only the female, Referer-blocked Google MP3: total silence.
    picksMod.saveVoicePick('yue', male);
    expect(picksMod.voicePickFor('yue')).toBe(male);
    localStorage.setItem('amoji.neural.v1', 'off');
    h.micLatch = true;
    voiceMod.speak('你好呀朋友', 'a03-fumiriya', 'yue');
    await waitFor(() => h.synthUtterances.some((u) => String(u.text).trim().length > 0));
    const spokenWith = h.synthUtterances
      .map((u) => String((u.voice as { name?: string } | null)?.name ?? ''))
      .join(' | ');
    expect(spokenWith).toMatch(/Danny/i);
    expect(h.gttsCalls).toHaveLength(0);
    localStorage.setItem('amoji.neural.v1', 'on');
  });

  it('breaker open + mic latch: same guarantee', async () => {
    picksMod.saveVoicePick('yue', male);
    h.edgeDead = true;
    h.micLatch = true;
    voiceMod.speak('早晨呀你食咗飯未', 'a03-fumiriya', 'yue');
    await waitFor(() => h.synthUtterances.some((u) => String(u.text).trim().length > 0));
    const spokenWith = h.synthUtterances
      .map((u) => String((u.voice as { name?: string } | null)?.name ?? ''))
      .join(' | ');
    expect(spokenWith).toMatch(/Danny/i);
    expect(h.gttsCalls).toHaveLength(0);
  });
});

describe('a male pin never resolves to a female Edge voice', () => {
  it('keeps its male identity and pin while the breaker is open', () => {
    h.edgeDead = true;
    picksMod.saveVoicePick('yue', 'edge:zh-HK-WanLungNeural');
    expect(picksMod.voicePickFor('yue')).toBe('edge:zh-HK-WanLungNeural');
    const id = picksMod.voicePickFor('yue');
    expect(capMod.voiceChoiceById(id)?.edgeVoiceId).toBe('zh-HK-WanLungNeural');
    expect(capMod.deliveryGenderForChoice('yue', id, 'female')).toBe('male');
  });

  it('names the exact male Edge id per locale, even with no pin at all', () => {
    expect(routeMod.chatMaleEdgeVoiceId('yue', 'edge:zh-HK-WanLungNeural', 'male', 'mid')).toBe('zh-HK-WanLungNeural');
    expect(routeMod.chatMaleEdgeVoiceId('zh', 'edge:zh-CN-YunjianNeural', 'male', 'mid')).toBe('zh-CN-YunjianNeural');
    expect(routeMod.chatMaleEdgeVoiceId('ja', 'edge:ja-JP-KeitaNeural', 'male', 'mid')).toBe('ja-JP-KeitaNeural');
    expect(routeMod.chatMaleEdgeVoiceId('en', 'edge:en-US-GuyNeural', 'male', 'mid')).toBe('en-US-GuyNeural');
    // A stale/foreign pin must still resolve to the locale's male seed.
    expect(routeMod.chatMaleEdgeVoiceId('yue', 'gtts:yue:f:mid', 'male', 'mid')).toBe('zh-HK-WanLungNeural');
    // Never the female tier voice for a male line.
    expect(routeMod.chatMaleEdgeVoiceId('yue', null, 'male', 'mid')).not.toBe('zh-HK-HiuMaanNeural');
    expect(routeMod.chatMaleEdgeVoiceId('yue', null, 'female', 'mid')).toBe('zh-HK-HiuMaanNeural');
  });
});

describe('maleVoiceRoute decides the only trustworthy male hop', () => {
  it('prefers Edge while the relay is live', () => {
    const route = routeMod.maleVoiceRoute('yue', { edgeAvailable: true, deviceVoices: [TRACY] });
    expect(route.kind).toBe('edge');
  });

  it('falls to an installed male device voice when Edge is gated off', () => {
    const route = routeMod.maleVoiceRoute('yue', { edgeAvailable: false, deviceVoices: [TRACY, DANNY] });
    expect(route.kind).toBe('device');
    expect(route.deviceVoiceName).toMatch(/Danny/i);
  });

  it('reports unavailable when Edge is off and the OS has only a female voice', () => {
    const route = routeMod.maleVoiceRoute('yue', { edgeAvailable: false, deviceVoices: [TRACY] });
    expect(route.kind).toBe('unavailable');
  });

  it('keeps the device hop when the list is absent or not populated yet', () => {
    expect(routeMod.maleVoiceRoute('yue', { edgeAvailable: false, deviceVoices: null }).kind).toBe('device');
    expect(routeMod.maleVoiceRoute('yue', { edgeAvailable: false, deviceVoices: [] }).kind).toBe('device');
  });

  it('disables the male button instead of offering silence', () => {
    h.voices = [TRACY];
    h.edgeDead = true;
    const [button] = registryMod.selectRelayVoiceButtons('yue');
    expect(button?.id).toBe('edge:zh-HK-WanLungNeural');
    expect(button?.unavailableReason).toBeTruthy();
    h.voices = [TRACY, DANNY];
    expect(registryMod.selectRelayVoiceButtons('yue')[0]?.unavailableReason ?? null).toBeNull();
    h.edgeDead = false;
    expect(registryMod.selectRelayVoiceButtons('yue')[0]?.unavailableReason ?? null).toBeNull();
  });

  it('keeps male identity but offers no button when no relay is configured at all', () => {
    localStorage.setItem('amoji.ttsproxy.v1', '');
    try {
      picksMod.saveVoicePick('yue', 'edge:zh-HK-WanLungNeural');
      expect(picksMod.voicePickFor('yue', 'male')).toBe('edge:zh-HK-WanLungNeural');
      // Identity survives: a male pin never degrades to the companion's gender.
      expect(capMod.deliveryGenderForChoice('yue', 'edge:zh-HK-WanLungNeural', 'female')).toBe('male');
      // ...but with no relay there is no honest male button to render.
      expect(registryMod.selectRelayVoiceButtons('yue')).toHaveLength(0);
    } finally {
      localStorage.removeItem('amoji.ttsproxy.v1');
    }
  });
});
