/**
 * Pixel: spoken loading "um…" filler is off — it never matched reply TTS.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

interface GttsCall {
  text: string;
  opts: Record<string, unknown>;
}

const calls: GttsCall[] = [];

vi.mock('../lib/gtts', () => ({
  PITCH_BIAS_MALE: 0.88,
  PITCH_BIAS_FEMALE: 1.04,
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

async function settle(): Promise<void> {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 40));
}

beforeEach(() => {
  calls.length = 0;
});

describe('loading filler voice disabled', () => {
  it('speakThinkingFiller does not speak any TTS', async () => {
    const voice = await import('../lib/voice');
    voice.speakThinkingFiller('a01-shino', 'yue', undefined, 'hello');
    await new Promise((r) => setTimeout(r, 3_200));
    await settle();
    expect(calls).toEqual([]);
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
