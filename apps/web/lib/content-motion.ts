'use client';
// Content-driven motion director — body + idle + face mood come from the
// CHAT TEXT (keyword / lexicon rules), never from LLM emotion tags.
// ChatPanel must call applyContentMood (lexicon channel), never applyLlmHints.
// Idle silence uses idle-passive-loop (relax → stretch → look). Explicit
// activities use moves.ts. Everyday chat uses chat-auto-idle buckets.
//
// User movement rules applied here:
// - dance / sing / music → detectMove (user) + performance-motion preferred clips
// - weather / news / story talk → calm look/breathe idle (via chat-auto-idle)
// - cheer / clap / goodbye emotion beats from moves.ts (assistant replies OK)
// - HelloWave only on farewell / goodbye
// - open greet stays passive (no wave / no dance)

import { analyzeText } from '@amoji/emotion-core';
import { resolveChatAutoIdle } from './chat-auto-idle';
import { detectMove, type MoveKind } from './moves';
import { isPassiveIdleClip } from './idle-passive-loop';
import { feltMood, moodToHints } from './memory';
import { idleClipById } from './idle-clips';
import { detectMusicStyle, STYLE_CLIP_HINTS } from './music-catalog';
import { resolvePerfMotion } from './performance-motion';

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

/** Short emotion beats — OK from assistant reply; never sticky shows. */
const EMOTION_MOVES: ReadonlySet<MoveKind> = new Set([
  'cheer',
  'clap',
  'idea',
  'goodbye',
  'blush',
]);

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
 * Body move from chat content:
 * - Activity (dance/sing/piano/…) only from the USER (avoids sticky dance
 *   when she merely mentions dancing after weather / fun facts).
 * - Emotion beats (cheer/clap/goodbye/…) also from the ASSISTANT reply.
 */
export function detectContentMove(userText: string, assistantText: string): MoveKind | undefined {
  const userMove = detectMove(userText);
  if (userMove && !EMOTION_MOVES.has(userMove)) return userMove;
  const assistMove = detectMove(assistantText);
  if (assistMove && EMOTION_MOVES.has(assistMove)) return assistMove;
  return userMove;
}

function perfStyleHint(text: string, fallback: string): string {
  const id = detectMusicStyle(text);
  if (!id || id === 'default') return fallback;
  return STYLE_CLIP_HINTS[id]?.[0] ?? fallback;
}

function firstPlayable(ids: readonly string[]): string | null {
  for (const id of ids) {
    if (idleClipById(id)) return id;
  }
  return null;
}

/**
 * Prefer performance-motion plant-feet shortlist for dance / sing / music.
 * Falls back to null so chat-auto-idle can pick its catalog pose.
 */
export function preferredPerfIdleForContent(
  kind: 'song' | 'dance',
  text: string,
): string | null {
  const fallback = kind === 'song' ? 'soft ballad' : 'cheerful pop';
  const style = perfStyleHint(text, fallback);
  const profile = resolvePerfMotion({
    id: `content-${kind}`,
    kind,
    style,
  });
  return firstPlayable(profile.preferredClipIds);
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

  const move = detectContentMove(user, assistant);
  const corpus = moodCorpus || 'idle';

  let idleClip = resolveChatAutoIdle({
    assistantText: assistant,
    userText: user,
    emotionHints: moodHints,
  });

  // Dance / sing → prefer performance-motion shortlist clips for the body idle.
  if (move === 'dance') {
    idleClip = preferredPerfIdleForContent('dance', corpus) ?? idleClip;
  } else if (move === 'sing') {
    idleClip = preferredPerfIdleForContent('song', corpus) ?? idleClip;
  }

  return {
    move,
    idleClip,
    moodHints,
    passive: !move && !!idleClip && isPassiveIdleClip(idleClip),
  };
}
