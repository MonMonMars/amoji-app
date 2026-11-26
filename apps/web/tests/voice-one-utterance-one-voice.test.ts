/**
 * One utterance = ONE voice (owner report 2026-11-26, verbatim):
 * "it switch to different sound in one talk. first normally is the default
 * voice, second is the new voice."
 *
 * Mechanism proved on this module before the fix: a reply is queued as more
 * than one SpeechJob (the streamed first sentence, then the remainder), and
 * every job re-read `voicePickFor(lang)` when it BEGAN. A pick made while the
 * first chunk was still talking therefore swapped the speaker for the second:
 *   chunk 1 tl = en-GB, chunk 2 tl = en-US   (one reply, two speakers)
 * The poke-resume continuation had the same defect: it rebuilt the interrupted
 * line through speak() with no memory of the voice that line started in.
 *
 * Now ChatPanel opens one SpeechUtterance per reply, its first chunk captures
 * the choice id, and every later chunk (including a poke resume) derives
 * `tl` / Edge id / delivery gender from that same id. This suite pins:
 *   1. a mid-reply pick does NOT change the rest of the reply, and the NEXT
 *      reply does use the new pick;
 *   2. a poke resume keeps the speaker of the reply it is resuming;
 *   3. the wiring that makes (1) and (2) true cannot be removed silently.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POKE_REACTION_MS } from '../lib/poke-hit';
import { resetVoicePicks, saveVoicePick } from '../lib/voice-picks';

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

function between(source: string, start: string, end: string): string {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`missing slice: ${start} .. ${end}`);
  return source.slice(a, b);
}

/** Two genuinely different Google speakers in the same language. */
const VOICE_A = 'gtts:en-GB:f:mid';
const VOICE_B = 'gtts:en-US:f:mid';
const TL_A = 'en-GB';
const TL_B = 'en-US';

const gttsCalls: Array<{ text: string; opts: Record<string, unknown>; resolve: () => void }> = [];

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
    gttsCalls.push({ text, opts, resolve });
    (opts.onPlaying as (() => void) | undefined)?.();
  }),
}));

vi.mock('../lib/edge-tts', () => ({
  pauseEdgeForTabHide: () => {},
  resumeEdgeForTabShow: () => {},
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

async function flush(): Promise<void> {
  for (let i = 0; i < 32; i += 1) await Promise.resolve();
}

async function teardown(): Promise<void> {
  const voice = await import('../lib/voice');
  voice.stopSpeaking();
  vi.clearAllTimers();
  vi.useRealTimers();
  gttsCalls.length = 0;
  resetVoicePicks();
}

describe('one reply speaks in one voice', () => {
  beforeEach(() => {
    gttsCalls.length = 0;
    resetVoicePicks();
  });

  afterEach(teardown);

  it('a pick made mid-reply applies to the NEXT reply, not to the rest of this one', async () => {
    const voice = await import('../lib/voice');
    saveVoicePick('en', VOICE_A);

    // ChatPanel.send: one handle for the whole turn.
    const utterance = voice.beginSpeechUtterance('en');

    // The streamed first sentence queues and starts talking.
    voice.speak(
      'The first sentence of the answer.',
      'a01-shino',
      'en',
      undefined,
      undefined,
      1,
      0,
      voice.withUtterance({ resumable: true }, utterance),
    );
    await flush();
    expect(gttsCalls).toHaveLength(1);
    expect(gttsCalls[0]!.opts.tl).toBe(TL_A);

    // The user taps the other speaker WHILE that sentence is still playing.
    saveVoicePick('en', VOICE_B);

    // speakReply queues the remainder of the same reply, with the same handle.
    voice.speak(
      'And this is the rest of the same answer.',
      'a01-shino',
      'en',
      undefined,
      undefined,
      1,
      0,
      voice.withUtterance({ resumable: true }, utterance),
    );
    await flush();
    // Still queued behind the line that is talking.
    expect(gttsCalls).toHaveLength(1);

    gttsCalls[0]!.resolve();
    await flush();
    expect(gttsCalls).toHaveLength(2);
    expect(gttsCalls[1]!.text).toContain('rest of the same answer');
    // Fails pre-fix: the tail re-read the live pin and came back in en-US.
    expect(gttsCalls[1]!.opts.tl).toBe(TL_A);

    // The next reply is a NEW utterance: it uses the voice the user picked.
    gttsCalls[1]!.resolve();
    await flush();
    voice.speak(
      'A brand new answer.',
      'a01-shino',
      'en',
      undefined,
      undefined,
      1,
      0,
      voice.withUtterance({ resumable: true }, voice.beginSpeechUtterance('en')),
    );
    await flush();
    expect(gttsCalls).toHaveLength(3);
    expect(gttsCalls[2]!.opts.tl).toBe(TL_B);

    gttsCalls[2]!.resolve();
    await flush();
  }, 20_000);
});

describe('a poke resume keeps the voice of the reply it resumes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    gttsCalls.length = 0;
    resetVoicePicks();
  });

  afterEach(teardown);

  it('the continuation repeats the interrupted line in its original speaker', async () => {
    const voice = await import('../lib/voice');
    saveVoicePick('en', VOICE_A);

    voice.speak('The answer that gets interrupted.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    expect(gttsCalls).toHaveLength(1);
    expect(gttsCalls[0]!.opts.tl).toBe(TL_A);

    // The user picks the other speaker, THEN pokes while her reply still plays.
    saveVoicePick('en', VOICE_B);
    voice.playPokeBurst('a01-shino', 'en', 'torso', 0);
    await flush();
    const reaction = gttsCalls[gttsCalls.length - 1]!;
    expect(reaction.text).not.toContain('interrupted');

    await vi.advanceTimersByTimeAsync(POKE_REACTION_MS);
    expect(gttsCalls).toHaveLength(2);
    reaction.resolve();
    await vi.advanceTimersByTimeAsync(0);
    await flush();

    const resumed = gttsCalls[gttsCalls.length - 1]!;
    expect(resumed.text).toContain('The answer that gets interrupted.');
    // Fails pre-fix: the rebuild called speak() with no pin and read en-US.
    expect(resumed.opts.tl).toBe(TL_A);

    resumed.resolve();
    await flush();
  }, 20_000);
});

describe('wiring: one reply opens one utterance and threads it through every chunk', () => {
  const panel = read('components/ChatPanel.tsx');
  const voiceSrc = read('lib/voice.ts');

  it('ChatPanel creates one handle per turn and gives it to the lead AND the remainder', () => {
    const send = between(panel, 'const send = async', 'const endVoiceMode');
    expect(send).toContain('const replyUtterance = beginSpeechUtterance(lang);');
    // Streamed first sentence.
    expect(send).toMatch(/onPartial: \(partial\) => \{[\s\S]*?withUtterance\(\{ resumable: true \}, replyUtterance\)/);
    // Both speakReply call sites (streamed lane + server lane) receive it.
    const refs = send.match(/replyUtterance/g) ?? [];
    expect(refs.length).toBeGreaterThanOrEqual(4); // declaration + onPartial + 2 calls
  });

  it('every reply chunk in speakReply carries the handle', () => {
    const replyBody = between(panel, 'const speakReply =', '// t794/t796 + Pixel entry');
    const threaded = replyBody.match(/withUtterance\(\{ resumable: true \}, utterance\)/g) ?? [];
    expect(threaded.length).toBeGreaterThanOrEqual(7);
  });

  it('the queue stores a pin and performSpeak reads the live pick only when none was captured', () => {
    const speakFn = between(voiceSrc, 'export function speak(', 'function performSpeak(');
    // The pin is captured per character gender, not per locale alone — a reply
    // must inherit the voice of THIS character's gender.
    expect(speakFn).toContain('voicePin: speechPinFor(characterId, lang, opts?.utterance)');
    // The resumable tag itself is untouched (poke capture contract).
    expect(speakFn).toContain('resumable: opts?.resumable === true');

    const drain = between(voiceSrc, 'function drainSpeech(', 'function primeAudioForChatEnter');
    expect(drain).toContain('job.voicePin,');

    const perf = between(voiceSrc, 'function performSpeak(', 'function performClip(');
    expect(perf).toContain('pinnedChoice !== undefined');
    // Exactly one live read, and only as the fallback for jobs without a pin.
    expect((perf.match(/effectiveVoiceChoiceId\(/g) ?? []).length).toBe(1);
  });

  it('the poke snapshot carries the reply pin into the continuation', () => {
    const capture = between(voiceSrc, 'function capturePokeResume', 'export function speechPending');
    expect(capture).toContain('head.voicePin');
    expect(capture).toContain('speechUtteranceFor(head.lang, head.voicePin ?? null)');
  });
});
