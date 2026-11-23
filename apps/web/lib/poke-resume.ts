// Poke resume: a poke cuts the sentence she is on (owner decision 2026-11-23,
// #562 / r286) and the reaction plays at the impact. Without this module the
// cut reply was simply lost. Now a conversation line is captured before the
// cut and re-spoken after the reaction, prefixed with a short "anyway" phrase.
//
// Scope is deliberately one line / one pending continuation:
//   - the queue reports the active line's text, not how far into it she got,
//     so this is a LINE-level resume: the interrupted line restarts from its
//     beginning. Do not describe it as clause-level.
//   - only jobs explicitly tagged `resumable` (real chat replies) arm. Poke
//     reactions, card greets, voice previews, fillers and announcements never
//     carry that tag, so poking them stays a hard cut.
//   - at most one continuation is pending; a second poke replaces and re-times
//     it instead of stacking two.
import { POKE_REACTION_MS } from './poke-hit';

/** If the speaker never frees up, drop the continuation instead of wedging. */
export const POKE_RESUME_MAX_WAIT_MS = 15_000;

export type PokeResumeLang = 'yue' | 'zh' | 'ja' | 'en';

/**
 * Small deterministic bank per language, rotated so repeats do not always say
 * the same words. Every phrase signals "continuing the same thread"; none of
 * them claims she forgot what she was saying.
 */
const RESUME_PHRASES: Record<PokeResumeLang, readonly string[]> = {
  yue: ['好，講返轉頭，', '繼續講，', '我講返落去，'],
  zh: ['好，接着說，', '繼續講，', '回到剛才，'],
  ja: ['それでね、', '話を戻すと、', '続きだけど、'],
  en: ['Anyway, ', 'As I was saying, ', 'So, back to it. '],
};

/** One rotation shared by every companion; deterministic, no randomness. */
let phraseCursor = 0;

/**
 * The resume phrase for `lang`. `index` is for tests; production callers omit
 * it and get the next slot of the shared rotation.
 */
export function resumePhraseFor(lang: string, index?: number): string {
  const bank = RESUME_PHRASES[lang as PokeResumeLang] ?? RESUME_PHRASES.en;
  const slot = index === undefined ? phraseCursor++ : index;
  return bank[((slot % bank.length) + bank.length) % bank.length]!;
}

/** Vitest only: keep phrase rotation independent between test cases. */
export function resetResumePhraseRotationForTests(): void {
  phraseCursor = 0;
}

export interface PokeResumeCandidate {
  /** The interrupted conversation line, re-spoken from its start. */
  text: string;
  /** Language of that line; selects the resume phrase. */
  lang: string;
  /** Deliver the prefixed continuation in her own voice. */
  speak: (line: string) => void;
}

export interface PokeResumeDeps {
  /** True while a companion line is playing or queued. */
  isBusy: () => boolean;
  /** Register an idle callback (voice.ts passes whenSpeechIdle). */
  whenIdle: (cb: () => void) => void;
}

/**
 * Holds the single pending continuation. Timing rule (both must be satisfied):
 *   - at least POKE_REACTION_MS after the poke, so she never talks over the
 *     recoil / impact window;
 *   - the companion queue must be idle, so she never talks over her own
 *     reaction line when that line outlasts the window.
 * A bounded deadline drops the continuation if the queue stays wedged.
 */
export class PokeResumeArbiter {
  private current: PokeResumeCandidate | null = null;
  private reactionTimer: ReturnType<typeof setTimeout> | null = null;
  private deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private token = 0;

  constructor(private readonly deps: PokeResumeDeps) {}

  /** The continuation waiting to be spoken, or null. */
  pending(): PokeResumeCandidate | null {
    return this.current;
  }

  isPending(): boolean {
    return this.current !== null;
  }

  /**
   * Arm one continuation, replacing any previous one (second poke). An empty
   * candidate is a no-op so a repeated poke cannot cancel a real pending line
   * just because the active job was the reaction itself.
   */
  arm(candidate: PokeResumeCandidate | null): boolean {
    this.cancel();
    if (!candidate || !candidate.text.trim()) return false;
    this.current = candidate;
    const token = this.token;
    this.reactionTimer = setTimeout(() => {
      this.reactionTimer = null;
      if (token !== this.token) return;
      this.waitForIdle(token);
    }, POKE_REACTION_MS);
    this.deadlineTimer = setTimeout(() => {
      this.deadlineTimer = null;
      if (token === this.token) this.cancel();
    }, POKE_RESUME_MAX_WAIT_MS);
    return true;
  }

  /** Drop the pending continuation and every timer behind it. */
  cancel(): void {
    this.token += 1;
    this.current = null;
    if (this.reactionTimer) {
      clearTimeout(this.reactionTimer);
      this.reactionTimer = null;
    }
    if (this.deadlineTimer) {
      clearTimeout(this.deadlineTimer);
      this.deadlineTimer = null;
    }
  }

  private waitForIdle(token: number): void {
    if (token !== this.token || !this.current) return;
    if (!this.deps.isBusy()) {
      this.fire(token);
      return;
    }
    this.deps.whenIdle(() => {
      if (token !== this.token || !this.current) return;
      this.fire(token);
    });
  }

  private fire(token: number): void {
    const candidate = this.current;
    if (token !== this.token || !candidate) return;
    // Clear before speaking: a queued idle callback from an older arm must not
    // fire this candidate twice, and the continuation itself may be poked.
    this.cancel();
    const line = `${resumePhraseFor(candidate.lang)}${candidate.text}`;
    try {
      candidate.speak(line);
    } catch {
      /* voice failure must not leave the arbiter stuck */
    }
  }
}
