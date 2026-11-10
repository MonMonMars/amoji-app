'use client';
// Content-driven motion director — body + idle + face mood come from the
// CHAT TEXT (keyword / lexicon rules), never from LLM emotion tags.
// ChatPanel must call applyContentMood (lexicon channel), never applyLlmHints.
// Idle silence uses idle-passive-loop (relax → stretch → look). Explicit
// activities use moves.ts. Everyday chat uses chat-auto-idle buckets.

import { analyzeText } from '@amoji/emotion-core';
import { resolveChatAutoIdle } from './chat-auto-idle';
import { detectMove, type MoveKind } from './moves';
import { isPassiveIdleClip } from './idle-passive-loop';
import { feltMood, moodToHints } from './memory';

export interface ContentMotionInput {
  /** Latest user line (preferred for intent). */
  userText?: string;
  /** Assistant reply (also scanned for moves / idle cues). */
  assistantText?: string;
  thinking?: boolean;
  openGreet?: boolean;
  sessionFarewell?: boolean;
}

export interface ContentMotionPlan {
  /** One-shot body performance, if any. */
  move?: MoveKind;
  /** Idle / ambient clip for CompanionCanvas. */
  idleClip: string | null;
  /**
   * Face / orb mood from lexicon + felt-mood on the USER text only.
   * Never taken from LLM [emotion:{…}] tags.
   */
  moodHints?: Record<string, number>;
  /** True when this plan is the calm passive loop (not a performance). */
  passive: boolean;
}

function mergeHints(
  a?: Record<string, number>,
  b?: Record<string, number>,
): Record<string, number> | undefined {
  if (!a && !b) return undefined;
  return { ...(a ?? {}), ...(b ?? {}) };
}

/**
 * Lexicon mood from spoken words (emotion-core). Caps stay gentle so a single
 * word does not slam the face into full angry/joy.
 */
export function moodHintsFromText(text: string): Record<string, number> | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const lex = analyzeText(t) as Record<string, number>;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(lex)) {
    if (typeof v === 'number' && v > 0.15) out[k] = Math.min(0.85, v);
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Resolve the full body plan for a chat turn from text alone.
 * Priority: farewell / thinking / open greet → explicit move → idle bucket.
 */
export function resolveContentMotion(input: ContentMotionInput): ContentMotionPlan {
  const user = (input.userText ?? '').trim();
  const assistant = (input.assistantText ?? '').trim();
  const moodCorpus = `${user} ${assistant}`.trim();

  // Face mood: user felt-mood first, then lexicon on both lines (content only).
  const felt = feltMood(user);
  const feltHints = felt ? moodToHints(felt.mood, felt.intensity) : undefined;
  const moodHints = mergeHints(feltHints, moodHintsFromText(moodCorpus));

  if (input.sessionFarewell) {
    const idleClip = resolveChatAutoIdle({
      assistantText: assistant || user,
      userText: user,
      sessionFarewell: true,
    });
    return { move: 'goodbye', idleClip, moodHints, passive: false };
  }
  if (input.thinking) {
    const idleClip = resolveChatAutoIdle({ assistantText: '', thinking: true });
    return { idleClip, moodHints, passive: false };
  }
  if (input.openGreet) {
    const idleClip = resolveChatAutoIdle({ assistantText: assistant, openGreet: true });
    return { idleClip, moodHints, passive: true };
  }

  // Explicit activity from the USER only. Scanning the assistant reply used to
  // start dance/sing when she merely mentioned those words in ordinary chat
  // (motion ≠ talk / sticky show after weather & fun-facts).
  const move = detectMove(user);

  const idleClip = resolveChatAutoIdle({
    assistantText: assistant,
    userText: user,
    emotionHints: moodHints,
  });

  return {
    move,
    idleClip,
    moodHints,
    passive: !move && !!idleClip && isPassiveIdleClip(idleClip),
  };
}
