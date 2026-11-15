/**
 * Pixel: spoken loading "um…" filler is off — it never matched reply TTS.
 * Bare um stubs and speakThinkingFiller must not hit gTTS.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

interface GttsCall {
  text: string;
  opts: Record<string, unknown>;
}

const calls: GttsCall[] = [];
const clipCalls: string[] = [];

vi.mock('../lib/gtts', () => ({
  PITCH_BIAS_MALE: 0.64,
  PITCH_BIAS_FEMALE: 1.30,
  GTTS_PITCH_BIAS_MIN: 0.38,
  GTTS_PITCH_BIAS_MAX: 1.72,
  GTTS_YUE_MALE_PACE_FLOOR: 0.38,
  stopGtts: () => {},
  speakGtts: (text: string, opts: Record<string, unknown>) => {
    calls.push({ text, opts });
    (opts.onPlaying as (() => void) | undefined)?.();
    return Promise.resolve();
  },
}));

vi.mock('../lib/edge-tts', () => ({
  speakEdge: () => Promise.reject(new Error('edge blocked')),
  stopEdge: () => {},
  getTtsProxy: () => null,
  resolveEdgeVoice: () => 'stub',
  edgeEndpointsDead: () => true,
}));

vi.mock('../lib/play-voice-clip', () => ({
  isVoiceClipPlaying: () => false,
  playGestureClipSync: () => {},
  playVoiceClip: (file: string) => {
    clipCalls.push(file);
    return Promise.resolve();
  },
  stopVoiceClip: () => {},
}));

async function settle(): Promise<void> {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 40));
}

beforeEach(() => {
  calls.length = 0;
  clipCalls.length = 0;
});

describe('loading filler voice disabled', () => {
  it('speakThinkingFiller does not speak any TTS', async () => {
    const voice = await import('../lib/voice');
    voice.speakThinkingFiller('a01-shino', 'yue', undefined, 'hello');
    await new Promise((r) => setTimeout(r, 3_200));
    await settle();
    expect(calls).toEqual([]);
    expect(clipCalls).toEqual([]);
  }, 15_000);

  it('bare um / think stubs never reach gTTS or um clips', async () => {
    const voice = await import('../lib/voice');
    for (const stub of ['um……', '嗯……', 'um…… let me think.', '嗯……等我諗下。', 'ha……']) {
      voice.speak(stub, 'a01-shino', 'en', { joy: 0.4 });
    }
    await settle();
    expect(calls).toEqual([]);
    expect(clipCalls.every((f) => !/\/um(_long)?[^/]*\.mp3$/i.test(f))).toBe(true);
  }, 15_000);

  it('strong love mood does not play um lead clip before a real reply', async () => {
    const voice = await import('../lib/voice');
    voice.speak('The real answer is here.', 'a01-shino', 'yue', { love: 0.95 });
    await settle();
    expect(clipCalls.every((f) => !/\/um(_long)?[^/]*\.mp3$/i.test(f))).toBe(true);
    expect(calls.some((c) => /real answer|答案|喺度/i.test(c.text) || c.text.length > 0)).toBe(true);
  }, 15_000);

  it('a real reply still speaks normally', async () => {
    const voice = await import('../lib/voice');
    voice.speakThinkingFiller('a01-shino', 'en', undefined, 'hello');
    voice.speak('The real answer is here.', 'a01-shino', 'en', { joy: 0.4 });
    await settle();
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.some((c) => /real answer/i.test(c.text))).toBe(true);
  }, 15_000);
});
