/**
 * Owner ask (2026-11-23): "how about the poke will stop the talk, but after
 * the reaction, the character will say something to resume the previous talk."
 *
 * The cut itself is the earlier owner decision (#562 / r286) and stays cut.
 * This file pins the second half:
 *   - a conversation line is captured before the cut and continued after the
 *     reaction window AND after her reaction line finishes;
 *   - the continuation is in the interrupted line's language and is prefixed
 *     with a short resume phrase;
 *   - a new user turn / mute / audition / performance cancels it;
 *   - two pokes leave exactly one pending continuation;
 *   - only jobs tagged `resumable` arm, so greets/previews/fillers/reactions
 *     stay a hard cut.
 *
 * Resume scope is LINE-level: the queue exposes the active line's text, not a
 * clause cursor, so the interrupted line restarts from its beginning.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LineQueue } from '../lib/speech-queue';
import {
  POKE_RESUME_MAX_WAIT_MS,
  PokeResumeArbiter,
  resetResumePhraseRotationForTests,
  resumePhraseFor,
} from '../lib/poke-resume';
import { POKE_REACTION_MS } from '../lib/poke-hit';

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

function between(source: string, start: string, end: string): string {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`missing slice: ${start} .. ${end}`);
  return source.slice(a, b);
}

const LANGS = ['yue', 'zh', 'ja', 'en'] as const;

describe('resume phrase bank', () => {
  it('has a small deterministic bank for every language', () => {
    for (const lang of LANGS) {
      const seen = new Set<string>();
      for (let i = 0; i < 3; i += 1) {
        const phrase = resumePhraseFor(lang, i);
        expect(phrase.length, `${lang}[${i}]`).toBeGreaterThan(0);
        seen.add(phrase);
        // explicit index is stable (no randomness)
        expect(resumePhraseFor(lang, i)).toBe(phrase);
      }
      expect(seen.size, `${lang} needs 2-3 distinct phrases`).toBeGreaterThanOrEqual(2);
      // index 3 wraps to index 0
      expect(resumePhraseFor(lang, 3)).toBe(resumePhraseFor(lang, 0));
    }
  });

  it('never claims she forgot the thread', () => {
    for (const lang of LANGS) {
      for (let i = 0; i < 3; i += 1) {
        const phrase = resumePhraseFor(lang, i);
        expect(phrase).not.toMatch(/唔記得|唔記|不記得|忘记|忘了|忘れ|forgot|lost my train/i);
      }
    }
  });
});

describe('PokeResumeArbiter timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetResumePhraseRotationForTests();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('never continues before POKE_REACTION_MS, then continues in the same language', () => {
    const text = '今日真係好熱，記得帶水。';
    const expected = `${resumePhraseFor('yue', 0)}${text}`;
    const calls: string[] = [];
    const arb = new PokeResumeArbiter({ isBusy: () => false, whenIdle: () => undefined });
    arb.arm({ text, lang: 'yue', speak: (line) => calls.push(line) });

    vi.advanceTimersByTime(POKE_REACTION_MS - 1);
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(calls).toEqual([expected]);
    expect(arb.isPending()).toBe(false);
  });

  it('prefers the interrupted line language for the resume phrase', () => {
    for (const lang of LANGS) {
      resetResumePhraseRotationForTests();
      const calls: string[] = [];
      const arb = new PokeResumeArbiter({ isBusy: () => false, whenIdle: () => undefined });
      arb.arm({ text: 'The rest of the thought.', lang, speak: (line) => calls.push(line) });
      vi.advanceTimersByTime(POKE_REACTION_MS);
      expect(calls, lang).toHaveLength(1);
      expect(calls[0]!.startsWith(resumePhraseFor(lang, 0)), lang).toBe(true);
      expect(calls[0]!.endsWith('The rest of the thought.'), lang).toBe(true);
    }
  });

  it('waits for the reaction line to finish when it outlasts the window', () => {
    const calls: string[] = [];
    let busy = true;
    let idle: (() => void) | null = null;
    const arb = new PokeResumeArbiter({
      isBusy: () => busy,
      whenIdle: (cb) => { idle = cb; },
    });
    arb.arm({ text: 'A continued reply.', lang: 'en', speak: (line) => calls.push(line) });

    vi.advanceTimersByTime(POKE_REACTION_MS);
    expect(calls).toEqual([]);
    expect(idle).not.toBeNull();

    busy = false;
    idle!();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('A continued reply.');
  });

  it('two rapid pokes leave exactly one continuation, not two', () => {
    const calls: string[] = [];
    const arb = new PokeResumeArbiter({ isBusy: () => false, whenIdle: () => undefined });
    arb.arm({ text: 'first interrupted line', lang: 'en', speak: (line) => calls.push(line) });
    vi.advanceTimersByTime(600);
    arb.arm({ text: 'second interrupted line', lang: 'en', speak: (line) => calls.push(line) });

    // The second arm restarts the window; the first must not fire at 1200ms.
    vi.advanceTimersByTime(600);
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(600);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('second interrupted line');
    expect(calls[0]).not.toContain('first interrupted line');
    expect(arb.isPending()).toBe(false);
  });

  it('a user turn / mute seam cancels the continuation', () => {
    const calls: string[] = [];
    const arb = new PokeResumeArbiter({ isBusy: () => false, whenIdle: () => undefined });
    arb.arm({ text: 'Never mind this reply.', lang: 'en', speak: (line) => calls.push(line) });
    arb.cancel();

    vi.advanceTimersByTime(POKE_RESUME_MAX_WAIT_MS);
    expect(calls).toEqual([]);
    expect(arb.isPending()).toBe(false);
  });

  it('drops a continuation the speaker never frees up for', () => {
    const calls: string[] = [];
    let idle: (() => void) | null = null;
    const arb = new PokeResumeArbiter({
      isBusy: () => true,
      whenIdle: (cb) => { idle = cb; },
    });
    arb.arm({ text: 'A stuck queue must not wedge this.', lang: 'en', speak: (line) => calls.push(line) });

    vi.advanceTimersByTime(POKE_REACTION_MS);
    expect(idle).not.toBeNull();
    vi.advanceTimersByTime(POKE_RESUME_MAX_WAIT_MS);
    expect(arb.isPending()).toBe(false);

    // A stale idle callback must not resurrect the dropped line.
    idle!();
    expect(calls).toEqual([]);
  });

  it('drives the real LineQueue: continuation waits for the reaction line', () => {
    const q = new LineQueue<string>();
    const calls: string[] = [];
    let idle: (() => void) | null = null;
    const arb = new PokeResumeArbiter({
      isBusy: () => q.pending(),
      whenIdle: (cb) => { idle = cb; },
    });

    q.enqueue('poke-yelp');
    const reaction = q.begin()!;
    arb.arm({ text: 'The interrupted reply.', lang: 'en', speak: (line) => calls.push(line) });

    vi.advanceTimersByTime(POKE_REACTION_MS);
    expect(calls).toEqual([]); // yelp still owns the speaker
    q.finished(reaction.epoch);
    expect(q.pending()).toBe(false);
    idle!();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('The interrupted reply.');
  });
});

describe('LineQueue read-only accessors for the poke snapshot', () => {
  it('reports the active line and queued tail without disturbing them', () => {
    const q = new LineQueue<string>();
    q.enqueue('reply-line');
    q.enqueue('reply-tail');
    expect(q.activeItem()).toBeNull();
    expect(q.queuedItems()).toEqual(['reply-line', 'reply-tail']);

    const live = q.begin()!;
    expect(q.activeItem()).toBe('reply-line');
    expect(q.queuedItems()).toEqual(['reply-tail']);
    // Read-only: reading did not start, drop or reorder anything.
    expect(q.begin()).toBeNull();

    q.interrupt();
    expect(q.activeItem()).toBeNull();
    expect(q.queuedItems()).toEqual([]);
    q.finished(live.epoch);
  });
});

describe('voice + ChatPanel wiring', () => {
  const voice = read('lib/voice.ts');
  const panel = read('components/ChatPanel.tsx');

  it('captures the line before the poke interrupt and arms after the reaction speak', () => {
    const burst = between(voice, 'export function playPokeBurst', 'export function playLaughBurst');
    const captureAt = burst.indexOf('capturePokeResume()');
    const interruptAt = burst.indexOf('interruptSpeechForPoke()');
    const reactionAt = burst.indexOf('speak(line,');
    const armAt = burst.indexOf('pokeResume.arm(');

    expect(captureAt).toBeGreaterThan(-1);
    expect(captureAt).toBeLessThan(interruptAt); // snapshot must precede the cut
    expect(reactionAt).toBeGreaterThan(interruptAt); // #562: impact/reaction first
    expect(armAt).toBeGreaterThan(reactionAt);
    expect(burst).toContain('POKE RESUME PAIR');
  });

  it('arms only explicitly tagged conversation jobs', () => {
    const capture = between(voice, 'function capturePokeResume', 'export function speechPending');
    expect(capture).toContain('lineQueue.activeItem()');
    expect(capture).toContain('lineQueue.queuedItems()');
    expect(capture).toContain('job.resumable === true');
    // A resumed continuation stays tagged so a second poke can pick it up.
    expect(capture).toContain('{ resumable: true }');

    const speak = between(voice, 'export function speak(', 'function performSpeak(');
    expect(speak).toContain('resumable: opts?.resumable === true');

    // Chat replies opt in; the poke reaction itself does not.
    const tags = panel.match(/\{ resumable: true \}/g) ?? [];
    expect(tags.length).toBeGreaterThanOrEqual(7);
    const burst = between(voice, 'export function playPokeBurst', 'export function playLaughBurst');
    expect(burst).not.toContain('resumable: true');
    // sayLocal is shared by replies, intros and announcements; it must not
    // blanket-tag, or demo/greeting lines would arm a resume.
    const sayLocal = between(panel, 'const sayLocal = (', '// speak a just-arrived reply');
    expect(sayLocal).toContain('speak(gated');
    expect(sayLocal).not.toContain('resumable');
  });

  it('cancels on the new-user-turn, mute, audition and performance seams', () => {
    expect(between(voice, 'export function stopSpeaking(', 'export function stopSpeakingForInterrupt'))
      .toContain('cancelPokeResume()');
    expect(between(voice, 'export function stopSpeakingForCardAudition(', 'export function speakThinkingFiller'))
      .toContain('cancelPokeResume()');
    expect(between(voice, 'export function sing(', 'function performSing('))
      .toContain('cancelPokeResume()');
    // Master mute reaches stopSpeaking() via silenceAllOutputs(), so the
    // stopSpeaking seam above covers mute as well.

    // The important one: a typed / spoken turn cancels before any quick return.
    expect(panel).toMatch(/const send = async[\s\S]{0,260}cancelPokeResume\(\)/);
    // Music / dance / sing show and martial clip take the stage.
    expect(panel).toMatch(/const beginShow = \([\s\S]{0,460}cancelPokeResume\(\)/);
    const martial = between(panel, "if (x === 'kungfu' || x === 'taichi')", 'sayLocal(flow.line');
    expect(martial).toContain('cancelPokeResume()');
    expect(panel).toMatch(/const beginActionGame = \([\s\S]{0,200}cancelPokeResume\(\)/);
  });

  it('card greets / voice previews never enter the resumable queue path', () => {
    const greet = between(voice, 'export function playVoiceGreeting', 'export function previewLibraryClip');
    expect(greet).not.toContain('lineQueue.enqueue');
    expect(greet).not.toContain('pokeResume.arm');
    const preview = between(voice, 'export function previewVoiceChoice', 'export function previewOsVoice');
    expect(preview).not.toContain('lineQueue.enqueue');
    expect(preview).not.toContain('pokeResume.arm');
    // Spoken loading filler is hard-off; it must not enter the queue either.
    const filler = between(voice, 'export function speakThinkingFiller', 'function enqueueThinkingFiller');
    expect(filler).not.toContain('lineQueue.enqueue');
  });
});

// ---------------------------------------------------------------------------
// Behaviour on the real voice module (mocked TTS tiers, no browser).
// ---------------------------------------------------------------------------

const gttsCalls: Array<{ text: string; opts: Record<string, unknown>; resolve: () => void }> = [];

vi.mock('../lib/gtts', () => ({
  PITCH_BIAS_MALE: 0.64,
  PITCH_BIAS_FEMALE: 1.30,
  GTTS_PITCH_BIAS_MIN: 0.38,
  GTTS_PITCH_BIAS_MAX: 1.72,
  GTTS_YUE_MALE_PACE_FLOOR: 0.38,
  stopGtts: () => {},
  pauseGttsForTabHide: () => {},
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
  for (let i = 0; i < 24; i += 1) await Promise.resolve();
}

describe('poke resume on the real voice queue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetResumePhraseRotationForTests();
    gttsCalls.length = 0;
  });

  afterEach(async () => {
    const voice = await import('../lib/voice');
    voice.stopSpeaking();
    vi.clearAllTimers();
    vi.useRealTimers();
    gttsCalls.length = 0;
  });

  it('re-speaks the interrupted conversation reply after the reaction window', async () => {
    const voice = await import('../lib/voice');
    const reply = 'The answer is already here.';
    voice.speak(reply, 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    expect(gttsCalls).toHaveLength(1);
    expect(gttsCalls[0]!.text).toContain('answer');

    voice.playPokeBurst('a01-shino', 'en', 'torso', 0);
    await flush();
    expect(voice.pendingPokeResume()).not.toBeNull();

    const reaction = gttsCalls[gttsCalls.length - 1]!;
    expect(reaction.text).not.toContain('answer');

    await vi.advanceTimersByTimeAsync(POKE_REACTION_MS - 1);
    expect(gttsCalls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    // Window passed, but her own reaction line still owns the speaker.
    expect(gttsCalls).toHaveLength(2);

    reaction.resolve();
    await vi.advanceTimersByTimeAsync(0);
    await flush();

    expect(gttsCalls).toHaveLength(3);
    expect(gttsCalls[2]!.text.startsWith(resumePhraseFor('en', 0))).toBe(true);
    expect(gttsCalls[2]!.text).toContain(reply);
  });

  it('a new user turn cancels the pending continuation before it can speak', async () => {
    const voice = await import('../lib/voice');
    voice.speak('A reply that will be cut.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    voice.playPokeBurst('a01-shino', 'en', 'torso', 0);
    await flush();
    expect(voice.pendingPokeResume()).not.toBeNull();

    // ChatPanel.send() calls cancelPokeResume() first; stopSpeaking() is the
    // same cancel seam and is what stopSpeakingForInterrupt() reaches.
    voice.stopSpeaking();
    expect(voice.pendingPokeResume()).toBeNull();

    const before = gttsCalls.length;
    await vi.advanceTimersByTimeAsync(POKE_RESUME_MAX_WAIT_MS);
    await flush();
    expect(gttsCalls.length).toBe(before);
  });

  it('does not arm for a non-conversation line (greet / preview / filler)', async () => {
    const voice = await import('../lib/voice');
    // No `resumable` tag: exactly how reactions, greets, previews and fillers
    // enter the queue (or they do not enter it at all).
    voice.speak('Hi there, nice to see you.', 'a01-shino', 'en');
    await flush();
    expect(gttsCalls).toHaveLength(1);

    voice.playPokeBurst('a01-shino', 'en', 'torso', 0);
    await flush();
    expect(voice.pendingPokeResume()).toBeNull();
  });
});
