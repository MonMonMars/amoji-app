// Idle-only ability / showcase invites. After a topical or demo-phase content
// turn, mute the idle reminder rail so a fun-fact never ends with "want to
// see me dance?". Deterministic stripping of bolted invites lives in
// topic-mixture.ts; this module owns the quiet-window mute + thin wrappers
// ChatPanel already imports.
//
// IMPORTANT: do NOT import from 'use client' modules (demo-phase, prefs hooks,
// …). Pulling client-only demo-phase exports into the /api/chat server graph
// made Next page collection fail (array export no longer callable as .find).

import {
  detectAbilityOfferKind,
  detectUserAbilityTopics,
  stripOffTopicAbilityTacks,
  type AbilityTopic,
} from './topic-mixture';

/** How long after a topical/content turn skill offers stay muted. */
export const SKILL_OFFER_SUPPRESS_MS = 90_000;

/** Content topics that mute the idle ability rail (not dance/sing/music). */
const TOPICAL_MUTE: ReadonlySet<AbilityTopic> = new Set([
  'weather',
  'news',
  'story',
  'funFact',
  'funScience',
]);

const WEATHER_OR_NEWS_RE =
  /\b(weather|forecast|temperature|headline|news|最新ニュース|天気)\b|天氣|天气|新聞|新闻|天氣預報|天气预报/i;

const LONG_CONTENT_RE =
  /(?:\bstory\b|tell\s+(?:me\s+)?a\s+story|bedtime\s+story|fun\s+fact|did\s+you\s+know|random\s+fact|fun\s+science|science\s+fact|how\s+(?:do\s+i|to|can\s+i)\b)|講個?故|故事|童話|冷知識|有趣知識|科學趣|豆知識|自然科学|讲个故|冷知识|科学趣味|お話して|物語|豆知識|面白い科学|點樣整|怎么搞|怎麼辦|怎么办/i;

/** True when the user asked for topical/demo content (fun fact, weather, …). */
export function isTopicalContentTurn(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (LONG_CONTENT_RE.test(t)) return true;
  if (WEATHER_OR_NEWS_RE.test(t)) return true;
  const topics = detectUserAbilityTopics(t);
  for (const k of topics) {
    if (TOPICAL_MUTE.has(k)) return true;
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
