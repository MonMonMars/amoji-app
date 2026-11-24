'use client';
// Card greetings are TAP ONLY and single-flight.
//
// Owner report 2026-11-25: scrolling the select board said "hi"/"hello" again
// and again — many greetings at once — and the same burst happened on a swipe.
// There were two independent causes:
//
//   1. The character and language fans greeted from `onSelect`, which also
//      fires for wheel, drag, arrow keys and the scroll chevrons. One scroll
//      therefore started a greeting per step.
//   2. A superseded greeting could still start talking later: the MP3 tier
//      retries `play()` after a sink pin, so a cancel issued before that retry
//      did not silence the old element. Several then spoke together.
//
// This module owns the pure policy — which gestures may speak, and the
// single-flight gate that retires an earlier greeting before the next begins.
// `lib/voice.ts` applies the gate to playVoiceGreeting/previewVoiceChoice and
// `lib/gtts.ts` refuses to start a retired line, so overlap is structurally
// impossible rather than merely unlikely.

/**
 * Why a card changed. Only `tap` is a deliberate activation; every other
 * event is navigation or viewport motion and must stay silent.
 */
export type CardGreetEvent =
  | 'tap'
  | 'wheel'
  | 'drag'
  | 'arrow'
  | 'focus'
  | 'visibility';

/**
 * The single rule from the owner report: "no hi at the scrolling, only say hi
 * when click on the card".
 */
export function greetAllowedForEvent(event: CardGreetEvent): boolean {
  return event === 'tap';
}

export type GreetGateOptions = {
  /** Injectable clock (tests). */
  now?: () => number;
  /**
   * Rapid repeat window for the SAME card. A double-tap must not queue a
   * second greeting; the one already speaking is the answer.
   */
  debounceMs?: number;
};

export type GreetGate = {
  /**
   * Claim the speaker for a new greeting. Returns the flight id, or null when
   * this event must stay silent (non-tap, or a same-card double-tap).
   * A non-null id automatically retires every earlier flight.
   */
  begin(event: CardGreetEvent, key: string): number | null;
  /** True while `id` is still the newest greeting (older flights are retired). */
  isCurrent(id: number): boolean;
  /** Retire everything in flight (master mute, route change, teardown). */
  cancel(): void;
  /** Vitest only — module gates are shared between tests. */
  resetForTests(): void;
};

export function createGreetGate(opts: GreetGateOptions = {}): GreetGate {
  const now = opts.now ?? (() => Date.now());
  const debounceMs = opts.debounceMs ?? 600;
  let flights = 0;
  let lastKey = '';
  let lastAt = Number.NEGATIVE_INFINITY;

  return {
    begin(event, key) {
      if (!greetAllowedForEvent(event)) return null;
      const at = now();
      // Same card, too soon: keep the greeting that is already speaking.
      if (key === lastKey && at - lastAt < debounceMs) return null;
      lastKey = key;
      lastAt = at;
      // Single flight. Bumping the counter is the cancel token: every earlier
      // chain sees isCurrent() === false and must not start (or continue).
      flights += 1;
      return flights;
    },
    isCurrent(id) {
      return id === flights;
    },
    cancel() {
      flights += 1;
    },
    resetForTests() {
      flights = 0;
      lastKey = '';
      lastAt = Number.NEGATIVE_INFINITY;
    },
  };
}

/** Shared gate for every select-board / settings audition. */
export const cardGreetGate: GreetGate = createGreetGate();
