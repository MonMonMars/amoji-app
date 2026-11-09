// The spoken "um…" wait cue: when it may speak, what it says, and how a reply
// takes the floor back.
//
// Mon's three complaints (t790) map onto the three things this module owns:
//   1. TIMING — nothing audible until WARMUP_FIRST_MS (3s) after the turn is
//      sent, so a fast reply is answered in silence.
//   2. LENGTH — two beats, and each beat after the threshold is a whole
//      "let me think / let me search" sentence, never one bare "um…".
//   3. VOICE — a beat is handed to `say`, which voice.ts wires to its own TTS
//      path, so the filler is spoken by the character's current voice at the
//      character's pitch instead of by a recorded clip of someone else.
//
// Nothing here plays audio: a beat is a timer that calls `say`. That is what
// makes "no filler before ~1s" and "a fast reply never emits one" provable in a
// unit test with injected timers.

import type { Lang } from './prefs';
import { isMasterMuted } from './master-mute';
import { WARMUP_FIRST_MS, WARMUP_GAP_MS, WARMUP_MAX_LINES, pickWaitLine } from './warmup';

/** Nothing audible for this long after the turn was sent. */
export const THINKING_SOUND_DELAY_MS = WARMUP_FIRST_MS;

/** Gap to the second beat. */
export const THINKING_SOUND_GAP_MS = WARMUP_GAP_MS;

/** Two beats, then she waits in silence. */
export const THINKING_SOUND_MAX_BEATS = WARMUP_MAX_LINES;

const VOICE_MUTE_KEY = 'amoji.voice.v1';

function voiceRepliesOn(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(VOICE_MUTE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * The cue is ordinary speech in her own voice, so it follows Voice replies and
 * Mute All — not the SFX switch. A muted wait simply stays silent instead of
 * pretending to think.
 */
export function thinkingFillerAllowed(): boolean {
  return voiceRepliesOn() && !isMasterMuted();
}

/** One spoken beat of the wait. */
export interface ThinkingSoundBeat {
  text: string;
  /** Milliseconds after the turn was sent. */
  atMs: number;
}

export interface ThinkingSoundPlanOpts {
  lang: Lang;
  /** Felt mood — tints which line comes first. */
  mood?: string;
  characterId?: string;
  /** The user's words: a lookup says "let me search", not "let me think". */
  userText?: string;
}

/**
 * The whole cue for one wait: her first beat at 3s, the next a gap later.
 * Consecutive beats are always different lines, so the wait sounds like
 * continued thought rather than a stuck record.
 */
export function planThinkingSound(opts: ThinkingSoundPlanOpts): ThinkingSoundBeat[] {
  const beats: ThinkingSoundBeat[] = [];
  let atMs = THINKING_SOUND_DELAY_MS;
  let previous: string | undefined;
  for (let i = 0; i < THINKING_SOUND_MAX_BEATS; i += 1) {
    // Every beat is a whole sentence: the cue only starts once the wait is
    // real, so a bare "um…" there sounds like a clipped sigh.
    const text = pickWaitLine(opts.characterId ?? '', opts.lang, i, opts.userText, previous, opts.mood);
    beats.push({ text, atMs });
    previous = text;
    atMs += THINKING_SOUND_GAP_MS;
  }
  return beats;
}

type TimerId = ReturnType<typeof setTimeout>;

export interface ThinkingSoundOpts extends ThinkingSoundPlanOpts {
  /** Speak one beat. voice.ts passes its own TTS path. */
  say: (text: string) => void;
  /** Injectable for tests; default to the global timers. */
  setTimer?: (fn: () => void, ms: number) => TimerId;
  clearTimer?: (id: TimerId) => void;
}

export interface ThinkingSoundSession {
  /** Drop the cue. Idempotent and final — no beat speaks after it. */
  stop: () => void;
}

let active: ThinkingSoundSession | null = null;

/**
 * Arm the cue. Calling it again replaces the previous wait instead of layering
 * a second one on top.
 */
export function startThinkingSound(opts: ThinkingSoundOpts): ThinkingSoundSession {
  stopThinkingSound();
  const plan = planThinkingSound(opts);
  const setTimer = opts.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = opts.clearTimer ?? ((id: TimerId) => clearTimeout(id));
  const armed = new Set<TimerId>();
  let stopped = false;

  const arm = (index: number): void => {
    if (stopped || index >= plan.length) return;
    const beat = plan[index]!;
    const prevAt = index === 0 ? 0 : plan[index - 1]!.atMs;
    const id = setTimer(() => {
      armed.delete(id);
      // Re-check on fire: a timer already in the queue must not speak after
      // the reply landed, however close the two were.
      if (stopped || !thinkingFillerAllowed()) return;
      try {
        opts.say(beat.text);
      } catch {
        /* decorative: the wait still ends normally */
      }
      arm(index + 1);
    }, Math.max(0, beat.atMs - prevAt));
    armed.add(id);
  };

  const session: ThinkingSoundSession = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      for (const id of armed) clearTimer(id);
      armed.clear();
      if (active === session) active = null;
    },
  };
  active = session;
  arm(0);
  return session;
}

/** Silence the cue: no armed beat fires and no later beat is armed. */
export function stopThinkingSound(): void {
  const current = active;
  active = null;
  current?.stop();
}
