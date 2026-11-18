// Idle-only ability / showcase invites. After a topical or demo-phase content
// turn, mute the idle reminder rail so a fun-fact never ends with "want to
// see me dance?". Deterministic stripping of bolted invites lives in
// topic-mixture.ts; this module owns the quiet-window mute + thin wrappers
// ChatPanel already imports.
//
// IMPORTANT: do NOT import from 'use client' modules (demo-phase, prefs hooks,
// …). Pulling client-only demo-phase exports into the /api/chat server graph
// made Next page collection fail (array export no longer callable as .find).

import { userOpensContentDelivery } from './content-continuation';
import { musicAskHandledByApp } from './music-ask';
import {
  detectAbilityOfferKind,
  detectUserAbilityTopics,
  stripOffTopicAbilityTacks,
  type AbilityTopic,
} from './topic-mixture';

export const SKILL_OFFER_SUPPRESS_MS = 90_000;

const TOPICAL_MUTE: ReadonlySet<AbilityTopic> = new Set([
  'weather',
  'news',
  'story',
  'funFact',
  'funScience',
]);

const WEATHER_OR_NEWS_RE =
  /\b(weather|forecast|temperature|headline|news|AI\s+news|最新ニュース|天気)\b|天氣|天气|新聞|新闻|天氣預報|天气预报|AI新聞|AI新闻|AIニュース/i;

const LONG_CONTENT_RE =
  /(?:\bstory\b|tell\s+(?:me\s+)?a\s+story|bedtime\s+story|fun\s+fact|did\s+you\s+know|random\s+fact|fun\s+science|science\s+fact|how\s+(?:do\s+i|to|can\s+i)\b|something personal|little secret|whisper|tell\s+(?:me\s+)?(?:a\s+)?joke|clean joke|short poem|life tip)|講個?故|故事|童話|冷知識|有趣知識|科學趣|豆知識|自然科学|讲个故|冷知识|科学趣味|お話して|物語|豆知識|面白い科学|點樣整|怎么搞|怎麼辦|怎么办|心里话|心裡話|悄悄話|悄悄话|秘密|笑話|笑话|小詩|小诗|小貼士|小贴士/i;

export function isTopicalContentTurn(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (userOpensContentDelivery(t)) return true;
  if (LONG_CONTENT_RE.test(t)) return true;
  if (WEATHER_OR_NEWS_RE.test(t)) return true;
  const topics = detectUserAbilityTopics(t);
  for (const k of topics) {
    if (TOPICAL_MUTE.has(k)) return true;
  }
  return false;
}

export function shouldSuppressSkillOffer(
  lastTopicalAt: number,
  now = Date.now(),
  windowMs = SKILL_OFFER_SUPPRESS_MS,
): boolean {
  if (lastTopicalAt <= 0) return false;
  return now - lastTopicalAt < windowMs;
}

export function isAbilityInviteLine(text: string): boolean {
  return detectAbilityOfferKind(text) != null;
}

const MUSIC_CAPABILITY_DENY =
  /\b(?:never listen(?:s)? to music|don'?t listen to music|i don'?t listen to music|can'?t play music|cannot play music|no music to play|i don'?t have music)\b|我唔聽歌|我冇音樂|播唔到音樂|播不到音乐|不能播音樂|不能播音乐|冇歌可以播|没有音乐可以播/i;

export function stripMusicCapabilityDenial(reply: string, userText: string): string {
  if (!reply.trim() || !userText.trim()) return reply;
  if (!musicAskHandledByApp(userText)) return reply;
  if (!MUSIC_CAPABILITY_DENY.test(reply)) return reply;
  const parts = reply
    .split(/(?<=[。！？.!?])\s*/)
    .map((s) => s.trim())
    .filter((s) => s && !MUSIC_CAPABILITY_DENY.test(s));
  if (!parts.length) return '';
  return parts.join(' ').trim();
}

export function stripOfftopicAbilityTack(reply: string, userText: string): string {
  if (!reply.trim()) return reply;
  if (!userText.trim()) return reply;
  const sansDeny = stripMusicCapabilityDenial(reply, userText);
  const cleaned = stripOffTopicAbilityTacks(sansDeny, userText);
  return cleaned || sansDeny;
}