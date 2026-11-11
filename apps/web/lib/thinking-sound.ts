// Loading wait cue — spoken "um…" filler is DISABLED (Pixel: mismatched TTS).
// Plan helpers remain for tests / possible future re-enable; start is a no-op.

import type { Lang } from './prefs';
import { WARMUP_FIRST_MS, WARMUP_GAP_MS, WARMUP_MAX_LINES, pickWaitLine } from './warmup';

/** Historical delay constant (filler no longer speaks). */
export const THINKING_SOUND_DELAY_MS = WARMUP_FIRST_MS;

/** Gap to the second beat (unused while filler is off). */
export const THINKING_SOUND_GAP_MS = WARMUP_GAP_MS;

/** Two beats max (unused while filler is off). */
export const THINKING_SOUND_MAX_BEATS = WARMUP_MAX_LINES;

/**
 * Pixel: the loading "um…" voice never matched the reply TTS and sounded odd.
 * Keep the wait silent — thinking bar + Thinking pose only; no spoken filler.
 */
export function thinkingFillerAllowed(): boolean {
  return false;
}

/** Recorded long-UM / think / search clips must not play during waits either. */
export function loadingUmSfxAllowed(): boolean {
  return false;
}

/** One spoken beat of the wait (planning only; not played). */
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
 * The whole cue for one wait — kept for unit coverage of line picking.
 * startThinkingSound no longer schedules these.
 */
export function planThinkingSound(opts: ThinkingSoundPlanOpts): ThinkingSoundBeat[] {
  const beats: ThinkingSoundBeat[] = [];
  let atMs = THINKING_SOUND_DELAY_MS;
  let previous: string | undefined;
  for (let i = 0; i < THINKING_SOUND_MAX_BEATS; i += 1) {
    const text = pickWaitLine(opts.characterId ?? '', opts.lang, i, opts.userText, previous, opts.mood);
    beats.push({ text, atMs });
    previous = text;
    atMs += THINKING_SOUND_GAP_MS;
  }
  return beats;
}

export interface ThinkingSoundOpts extends ThinkingSoundPlanOpts {
  /** Speak one beat. Ignored while filler is disabled. */
  say: (text: string) => void;
  setTimer?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (id: ReturnType<typeof setTimeout>) => void;
}

export interface ThinkingSoundSession {
  /** Drop the cue. Idempotent. */
  stop: () => void;
}

let active: ThinkingSoundSession | null = null;

/** No-op: spoken loading filler is off. */
export function startThinkingSound(_opts: ThinkingSoundOpts): ThinkingSoundSession {
  stopThinkingSound();
  const session: ThinkingSoundSession = {
    stop: () => {
      if (active === session) active = null;
    },
  };
  active = session;
  return session;
}

/** Silence the cue (no-op when already idle). */
export function stopThinkingSound(): void {
  const current = active;
  active = null;
  current?.stop();
}
