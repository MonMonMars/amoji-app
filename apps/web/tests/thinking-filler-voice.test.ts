/**
 * The wait filler must be spoken by the SAME voice as the character's reply.
 *
 * Mon: "make the voice match the same voice as the TTS that the character is
 * using." The old filler played a CLIP_LIBRARY recording (a real human mp3),
 * so it was a different person in every language and a different engine from
 * the reply's TTS.
 *
 * This test runs the REAL voice.ts chain in node with only the transports
 * stubbed, captures what each `speakGtts` call was given, and compares the
 * reply against every filler beat. Same locale, same pitch bias, same voice.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gttsCharacterPitchBias } from '../lib/gtts-timbre';
import { recordedFillerClip } from '../lib/voice-clips';
import { planThinkingSound } from '../lib/thinking-sound';

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

// The neural tier is dead in the field (403s), so the free chain goes straight
// to the HTTP MP3 voice — the speaker both reply and filler must share.
vi.mock('../lib/edge-tts', () => ({
  speakEdge: () => Promise.reject(new Error('edge blocked')),
  stopEdge: () => {},
  getTtsProxy: () => null,
  resolveEdgeVoice: () => 'stub',
  edgeEndpointsDead: () => true,
}));

/** Let the promise chain settle without real timers. */
async function settle(): Promise<void> {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 60));
}

beforeEach(() => {
  calls.length = 0;
});

describe('the wait filler speaks in the reply voice', () => {
  it('uses the same pitch bias and locale as the character reply', async () => {
    const voice = await import('../lib/voice');
    voice.speak('Here is the answer you asked for.', 'a03-fumiriya', 'en', { joy: 0.4 });
    await settle();
    expect(calls.length).toBeGreaterThan(0);
    const reply = calls[0]!;

    calls.length = 0;
    voice.speakThinkingFiller('a03-fumiriya', 'en', undefined, 'hello');
    // First beat waits WARMUP_FIRST_MS (3s); drive past that like the real clock.
    await new Promise((r) => setTimeout(r, 3_200));
    await settle();

    expect(calls.length).toBeGreaterThan(0);
    for (const beat of calls) {
      expect(beat.opts.lang).toBe(reply.opts.lang);
      expect(beat.opts.pitchBias).toBe(reply.opts.pitchBias);
    }
  }, 20_000);

  it('gives a female character the female pitch, same as her reply', async () => {
    const voice = await import('../lib/voice');
    voice.speak('Hello there, how are you today?', 'a01-shino', 'yue', { joy: 0.4 });
    await settle();
    const reply = calls[0]!;

    calls.length = 0;
    voice.speakThinkingFiller('a01-shino', 'yue', undefined, 'hello');
    await new Promise((r) => setTimeout(r, 3_200));
    await settle();

    expect(calls.length).toBeGreaterThan(0);
    const expectedFemale = gttsCharacterPitchBias('female', 'a01-shino');
    expect(reply.opts.pitchBias).toBe(expectedFemale);
    for (const beat of calls) expect(beat.opts.pitchBias).toBe(reply.opts.pitchBias);
  }, 20_000);

  it('never plays a recorded clip for the filler, only live TTS', async () => {
    const voice = await import('../lib/voice');
    voice.speakThinkingFiller('a01-shino', 'yue', undefined, 'hello');
    await new Promise((r) => setTimeout(r, 3_200));
    await settle();
    // The old path asked voice-clips for a gender um.mp3 — that is the
    // different-person sound Mon heard. Every beat must be gTTS text instead.
    for (const beat of calls) {
      expect(beat.text).not.toBe(recordedFillerClip('female', 'um', 'yue'));
      expect(beat.text.length).toBeGreaterThan(3);
    }
  }, 20_000);

  it('a real reply drops the filler so the reply is never talked over', async () => {
    const voice = await import('../lib/voice');
    voice.speakThinkingFiller('a01-shino', 'en', undefined, 'hello');
    await new Promise((r) => setTimeout(r, 3_200));
    await settle();
    const saidByFiller = calls.length;
    expect(saidByFiller).toBeGreaterThan(0);

    calls.length = 0;
    voice.speak('The real answer is here.', 'a01-shino', 'en', { joy: 0.4 });
    await settle();
    // What is left in flight is the reply itself; no second filler beat may
    // be spoken after it.
    const after = calls.map((c) => c.text).join(' | ');
    for (const beat of planThinkingSound({ lang: 'en', characterId: 'a01-shino' })) {
      expect(after).not.toContain(beat.text);
    }
  }, 20_000);
});
