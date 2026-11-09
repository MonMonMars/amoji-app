// Idle-only ability / showcase invites. After a topical or demo-phase content
// turn, mute the idle reminder rail so a fun-fact never ends with "want to
// see me dance?". Deterministic stripping of bolted invites lives in
// topic-mixture.ts; this module owns the quiet-window mute + thin wrappers
// ChatPanel already imports.

import { DEMO_PHASE_BUTTONS, type DemoPhaseId } from './demo-phase';
import { wantsLongCompanionReply } from './topic-suggestions';
import {
  detectAbilityOfferKind,
  detectUserAbilityTopics,
  stripOffTopicAbilityTacks,
} from './topic-mixture';

/** How long after a topical/content turn skill offers stay muted. */
export const SKILL_OFFER_SUPPRESS_MS = 90_000;

/** Demo-phase chips that deliver factual / narrative content — not performances. */
export const TOPICAL_DEMO_PHASE_IDS: readonly DemoPhaseId[] = [
  'weather',
  'news',
  'story',
  'funFact',
  'funScience',
] as const;

const WEATHER_OR_NEWS_RE =
  /\b(weather|forecast|temperature|headline|news|最新ニュース|天気)\b|天氣|天气|新聞|新闻|天氣預報|天气预报/i;

function demoTopicalPromptSet(): Set<string> {
  const out = new Set<string>();
  for (const id of TOPICAL_DEMO_PHASE_IDS) {
    const btn = DEMO_PHASE_BUTTONS.find((b) => b.id === id);
    if (!btn) continue;
    for (const line of Object.values(btn.prompt)) {
      const t = line.trim().toLowerCase();
      if (t) out.add(t);
    }
  }
  return out;
}

const DEMO_TOPICAL_PROMPTS = demoTopicalPromptSet();

/** True when the user asked for topical/demo content (fun fact, weather, …). */
export function isTopicalContentTurn(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (DEMO_TOPICAL_PROMPTS.has(t.toLowerCase())) return true;
  if (wantsLongCompanionReply(t)) return true;
  if (WEATHER_OR_NEWS_RE.test(t)) return true;
  const topics = detectUserAbilityTopics(t);
  for (const k of topics) {
    if (k === 'funFact' || k === 'funScience' || k === 'weather' || k === 'news' || k === 'story') {
      return true;
    }
  }
  return false;
}

/** Mute skill offers for a window after a topical content turn. */
export function shouldSuppressSkillOffer(
  lastTopicalAt: number,
  now = Date.now(),
  windowMs = SKILL_OFFER_SUPPRESS_MS,
): boolean {
  if (lastTopicalAt <= 0) return false;
  return now - lastTopicalAt < windowMs;
}

/** A single sentence that is a dance / sing / music (etc.) ability invite. */
export function isAbilityInviteLine(text: string): boolean {
  return detectAbilityOfferKind(text) != null;
}

/**
 * Drop offtopic ability / showcase tack-ons from a topical reply.
 * Thin alias kept for ChatPanel + existing tests — always strips, even when
 * the rich multi-beat exception is open (dance never bolts onto Jupiter).
 */
export function stripOfftopicAbilityTack(reply: string, userText: string): string {
  if (!reply.trim()) return reply;
  if (!userText.trim()) return reply;
  // When the user asked for a performance, stripOffTopicAbilityTacks keeps it.
  const cleaned = stripOffTopicAbilityTacks(reply, userText);
  return cleaned || reply;
}
