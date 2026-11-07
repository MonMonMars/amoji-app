'use client';
/**
 * The entry gate's decision logic, kept as a pure reducer.
 *
 * The screen itself is a thin renderer, so every promise the gate makes
 * ("you cannot walk past it", "a user with broken audio is never trapped")
 * is a property of this function and can be tested without a DOM.
 *
 * Phases, in the only order the reducer allows:
 *
 *   adult ──▶ audio ──(heard)──▶ mic ──▶ done
 *               │
 *               └──(heard nothing)──▶ help ──(continue anyway)──▶ mic
 *
 * Rules encoded here on purpose:
 *  - `audio` is unreachable until the 18+ box is ticked;
 *  - `done` is unreachable until the user has answered the audio question
 *    one way or the other — the app never infers the answer;
 *  - `help` always offers a way out, so a phone with genuinely dead audio is
 *    not bricked behind this screen.
 */
import type { AudioHeard, MicOutcome } from './entry-gate';

export type GatePhase = 'adult' | 'audio' | 'help' | 'mic' | 'done';

export interface GateState {
  phase: GatePhase;
  /** the 18+ box */
  adult: boolean;
  /** the user's own answer to "did you hear her?" */
  heard: AudioHeard;
  /** true once the sample has actually been played at least once */
  tested: boolean;
  mic: MicOutcome;
}

export const INITIAL_GATE: GateState = {
  phase: 'adult',
  adult: false,
  heard: null,
  tested: false,
  mic: 'skipped',
};

export type GateEvent =
  | { type: 'toggleAdult' }
  | { type: 'confirmAdult' }
  | { type: 'testPlayed' }
  | { type: 'heardYes' }
  | { type: 'heardNo' }
  | { type: 'testAgain' }
  | { type: 'continueAnyway' }
  | { type: 'micDone'; outcome: MicOutcome }
  | { type: 'skipMic' }
  | { type: 'enterApp' }
  | { type: 'back' };

export function reduceGate(state: GateState, event: GateEvent): GateState {
  switch (event.type) {
    case 'toggleAdult':
      return state.phase === 'adult' ? { ...state, adult: !state.adult } : state;

    case 'confirmAdult':
      // Unticked box: stay put. The button is also disabled, but the reducer
      // is the authority — a stray Enter key must not open the audio step.
      if (!state.adult) return state;
      return state.phase === 'adult' ? { ...state, phase: 'audio', tested: false } : state;

    case 'testPlayed':
      // Only marks that the sample was played; it is NOT an answer, and it
      // certainly is not proof of sound.
      if (state.phase !== 'audio') return state;
      return { ...state, tested: true };

    case 'heardYes':
      // She was heard — the audio question is answered, move to the mic ask.
      // Refused before the sample was played: the question has not been asked
      // yet, so there would be nothing to answer.
      if (state.phase !== 'audio' && state.phase !== 'help') return state;
      if (!state.tested) return state;
      return { ...state, heard: 'yes', phase: 'mic' };

    case 'heardNo':
      if (state.phase !== 'audio') return state;
      if (!state.tested) return state;
      // Deliberately NOT a dead end: no answer is recorded yet ("no" is only
      // committed by continueAnyway), and the help list takes over.
      return { ...state, phase: 'help' };

    case 'testAgain':
      if (state.phase !== 'help') return state;
      return { ...state, phase: 'audio', tested: true };

    case 'continueAnyway':
      // The escape hatch for a user whose audio really is broken. It still
      // records the honest answer — "I heard nothing" — so later screens can
      // behave accordingly instead of assuming sound was verified.
      if (state.phase !== 'help') return state;
      return { ...state, heard: 'no', phase: 'mic' };

    case 'micDone':
      // Stay on the mic step so the OUTCOME can be read ("ready" / "blocked"
      // / "this browser cannot"), then the user enters the app themselves.
      if (state.phase !== 'mic') return state;
      return { ...state, mic: event.outcome };

    case 'skipMic':
      // Mic is genuinely optional: skipping is an answer, so it may finish.
      if (state.phase !== 'mic') return state;
      return { ...state, mic: 'skipped', phase: 'done' };

    case 'enterApp':
      if (state.phase !== 'mic') return state;
      return { ...state, phase: 'done' };

    case 'back':
      if (state.phase === 'audio') return { ...state, phase: 'adult' };
      if (state.phase === 'help') return { ...state, phase: 'audio' };
      if (state.phase === 'mic') return { ...state, phase: 'audio', mic: 'skipped' };
      return state;

    default:
      return state;
  }
}

/** True only when every question was answered by the user. */
export function canEnterApp(state: GateState): boolean {
  return state.phase === 'done' && state.adult && state.heard !== null;
}

/** The troubleshooting list is on screen. */
export function showsTroubleshooting(state: GateState): boolean {
  return state.phase === 'help';
}
