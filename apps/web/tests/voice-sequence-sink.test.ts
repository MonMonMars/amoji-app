/**
 * Owner report (2026-11-23): chat voice is INTERMITTENT —
 * "sometimes has voice, but mostly has no voice."
 *
 * A single-utterance test cannot catch that: one line proves the enqueue path
 * and the sink can work, which was already true. These tests drive the real
 * `lib/voice.ts` queue through SEVERAL replies in a row and through a reply
 * that arrives while a poke continuation is pending, because a wedged queue
 * only shows up on the SECOND or THIRD line.
 *
 * The sink here is the HTMLAudio TTS tier (gTTS), the tier chat replies use on
 * every platform. Each utterance's promise settles only when the test calls
 * `resolve()`, exactly like a real <audio> settles on `ended`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POKE_REACTION_MS } from '../lib/poke-hit';

const sink: Array<{ text: string; settle: () => void }> = [];
/** Test switch: the tier accepts the line but never starts audio (gated <audio>). */
let tierSilent = false;

vi.mock('../lib/gtts', () => ({
  PITCH_BIAS_MALE: 0.64,
  PITCH_BIAS_FEMALE: 1.30,
  GTTS_PITCH_BIAS_MIN: 0.38,
  GTTS_PITCH_BIAS_MAX: 1.72,
  GTTS_YUE_MALE_PACE_FLOOR: 0.38,
  stopGtts: () => {},
  pauseGttsForTabHide: () => {},
  resumeGttsForTabShow: () => {},
  pauseAfterClause: () => 0,
  splitClauses: (text: string) => [text],
  splitChunks: (text: string) => [text],
  speakGtts: (text: string, opts: Record<string, unknown>) => new Promise<void>((resolve) => {
    sink.push({ text, settle: resolve });
    if (tierSilent) return;
    (opts.onPlaying as (() => void) | undefined)?.();
  }),
}));

vi.mock('../lib/edge-tts', () => ({
  pauseEdgeForTabHide: () => {},
  speakEdge: () => Promise.reject(new Error('edge blocked')),
  stopEdge: () => {},
  getTtsProxy: () => null,
  resolveEdgeVoice: () => ({ name: 'stub' }),
  edgeEndpointsDead: () => true,
  resetEdgeHealth: () => {},
}));

vi.mock('../lib/play-voice-clip', () => ({
  isVoiceClipPlaying: () => false,
  playGestureClipSync: () => {},
  playVoiceClip: () => Promise.resolve(),
  stopVoiceClip: () => {},
}));

vi.mock('../lib/sfx', () => ({
  sfxEnabled: () => false,
  setSfxEnabled: () => {},
  playSfx: () => {},
  resumeSfxContext: () => {},
  sfxVoiceHold: () => {},
  sfxVoiceRelease: () => {},
}));

async function flush(): Promise<void> {
  for (let i = 0; i < 32; i += 1) await Promise.resolve();
}

/** Chat replies a→b→c, each settling like a real <audio> 'ended'. */
async function speakAndFinish(text: string): Promise<void> {
  const voice = await import('../lib/voice');
  voice.speak(text, 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
  await flush();
  const last = sink[sink.length - 1]!;
  expect(last.text, `"${text}" must reach the audio sink`).toBe(text);
  last.settle();
  await flush();
}

describe('chat voice: several replies in sequence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sink.length = 0;
  });

  afterEach(async () => {
    const voice = await import('../lib/voice');
    voice.stopSpeaking();
    vi.clearAllTimers();
    vi.useRealTimers();
    sink.length = 0;
  });

  it('every reply in a run of five reaches the audio sink in order', async () => {
    const lines = [
      'First reply in the run.',
      'Second reply in the run.',
      'Third reply in the run.',
      'Fourth reply in the run.',
      'Fifth reply in the run.',
    ];
    for (const line of lines) {
      await speakAndFinish(line);
    }
    expect(sink.map((s) => s.text)).toEqual(lines);
  });

  it('a reply that is still queued behind another one is not dropped', async () => {
    const voice = await import('../lib/voice');
    // Two replies enqueued before the first one ends — the streamed lead plus
    // the remainder of the same turn can land like this.
    voice.speak('Lead sentence.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    voice.speak('Remainder sentence.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    expect(sink).toHaveLength(1);
    expect(sink[0]!.text).toBe('Lead sentence.');

    sink[0]!.settle();
    await flush();
    expect(sink).toHaveLength(2);
    expect(sink[1]!.text).toBe('Remainder sentence.');
  });

  it('a silent first tier does not swallow the next reply', async () => {
    const voice = await import('../lib/voice');
    voice.speak('A line that never starts.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    expect(sink).toHaveLength(1);
    // Settle it as a FAILED tier would (the queue must still advance).
    sink[0]!.settle();
    await flush();

    voice.speak('The next line must still speak.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    expect(sink).toHaveLength(2);
    expect(sink[1]!.text).toBe('The next line must still speak.');
  });
});

describe('chat voice: reply arrives while a poke continuation is pending', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    sink.length = 0;
  });

  afterEach(async () => {
    const voice = await import('../lib/voice');
    voice.stopSpeaking();
    vi.clearAllTimers();
    vi.useRealTimers();
    sink.length = 0;
  });

  it('the new reply speaks and the stale continuation is dropped', async () => {
    const voice = await import('../lib/voice');
    voice.speak('The reply a poke will interrupt.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    expect(sink).toHaveLength(1);

    voice.playPokeBurst('a01-shino', 'en', 'torso', 0);
    await flush();
    expect(voice.pendingPokeResume()).not.toBeNull();

    // The reaction window passes while her reaction line still owns the
    // speaker, so the continuation is waiting on the idle seam.
    await vi.advanceTimersByTimeAsync(POKE_REACTION_MS);
    const beforeNewTurn = sink.length;

    // The user answers instead of waiting: new user turn (cancel + interrupt),
    // then the new reply.
    voice.cancelPokeResume();
    voice.stopSpeakingForInterrupt();
    voice.speak('A brand new answer.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();

    const spoken = sink.slice(beforeNewTurn).map((s) => s.text);
    expect(spoken).toContain('A brand new answer.');
    // The stale continuation must never talk over the new turn.
    expect(spoken.some((line) => line.includes('The reply a poke will interrupt.'))).toBe(false);
    expect(voice.pendingPokeResume()).toBeNull();
  });

  it('a continuation that fires does not mute the reply after it', async () => {
    const voice = await import('../lib/voice');
    voice.speak('The interrupted reply.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    voice.playPokeBurst('a01-shino', 'en', 'torso', 0);
    await flush();

    // Let the reaction line end and the continuation fire.
    sink[sink.length - 1]!.settle();
    await vi.advanceTimersByTimeAsync(POKE_REACTION_MS);
    await flush();
    const resume = sink[sink.length - 1]!;
    expect(resume.text).toContain('The interrupted reply.');
    resume.settle();
    await flush();

    // A later reply must still be audible — the resume must not wedge the queue.
    await speakAndFinish('The reply after the continuation.');
    expect(sink[sink.length - 1]!.text).toBe('The reply after the continuation.');
  });
});

describe('chat voice: a silent line must not mute the rest of the session', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sink.length = 0;
  });

  afterEach(async () => {
    const voice = await import('../lib/voice');
    voice.stopSpeaking();
    vi.clearAllTimers();
    vi.useRealTimers();
    sink.length = 0;
  });

  it('releases the serial speaker when a line never starts audio', async () => {
    const voice = await import('../lib/voice');
    const { SILENT_LINE_RELEASE_MS } = voice;
    // Move the clock off the fake epoch's start so a start callback from an
    // earlier test cannot count as proof that THIS line is audible.
    await vi.advanceTimersByTimeAsync(1000);
    // This line reaches the tier and then goes nowhere: no onPlaying, no
    // resolve, no reject — exactly what a gated <audio> plus a dropped synth
    // does on a phone. It used to hold `playing` forever.
    tierSilent = true;
    voice.speak('A line that never sounds.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    expect(sink).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(SILENT_LINE_RELEASE_MS);
    await flush();
    tierSilent = false;

    voice.speak('The next reply must still speak.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    expect(sink.map((s) => s.text)).toContain('The next reply must still speak.');
  });

  it('never cuts a line that did start audio', async () => {
    const voice = await import('../lib/voice');
    voice.speak('A line that is actually audible.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    expect(sink).toHaveLength(1); // mock fired onPlaying
    await vi.advanceTimersByTimeAsync(voice.SILENT_LINE_RELEASE_MS + 1000);
    await flush();
    // Same single line: the watchdog must not release a speaking line.
    expect(sink).toHaveLength(1);
    sink[0]!.settle();
    await flush();
    await speakAndFinish('After the audible one.');
    expect(sink[sink.length - 1]!.text).toBe('After the audible one.');
  });
});
