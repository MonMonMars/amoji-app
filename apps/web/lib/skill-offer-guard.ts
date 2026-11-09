// Guard against bolting ability reminders (dance / sing / music) onto
// unrelated topical replies. Showcase offers stay on quiet idle / new-topic
// moments only — never the closing beat of a fun-fact, weather, news, or
// story answer.

import { DEMO_PHASE_BUTTONS, type DemoPhaseId } from './demo-phase';
import { wantsLongCompanionReply } from './topic-suggestions';

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

/** Showcase-style performance invites (any UI language). */
const ABILITY_INVITE_RE =
  /(?:want to see me danc|see me dancing|want me to (?:sing|dance)|shall i (?:sing|dance|play)|listen to some music|put on (?:a little )?dance|put (?:on )?some music|想唔想睇我跳|想不想看我跳|想唔想聽我唱|想不想听我唱|想唔想聽吓音樂|想不想听点音乐|ダンス[、,]?\s*見て|歌[、,]?\s*聴いて|音楽[、,]?\s*聴いて|踊ってあげる|一曲うたって)/i;

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

/** A single sentence that is a dance / sing / music ability invite. */
export function isAbilityInviteLine(text: string): boolean {
  return ABILITY_INVITE_RE.test(text.trim());
}

function splitSpokenSentences(text: string): string[] {
  const parts = text.match(/[^。！？.!?\n]+[。！？.!?]?/g);
  if (!parts) return text.trim() ? [text.trim()] : [];
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Drop trailing showcase-style ability invites from a topical reply so a
 * Jupiter fun-fact never ends with "want to see me dance?".
 */
export function stripOfftopicAbilityTack(reply: string, userText: string): string {
  if (!reply.trim() || !isTopicalContentTurn(userText)) return reply;
  const sentences = splitSpokenSentences(reply);
  // Only drop trailing tack-ons — never wipe a whole reply that is itself an invite.
  if (sentences.length <= 1) return reply;
  let end = sentences.length;
  while (end > 1 && isAbilityInviteLine(sentences[end - 1]!)) {
    end -= 1;
  }
  if (end === sentences.length) return reply;
  const cjk = reply.includes('。') || /[\u3400-\u9fff]/.test(reply);
  return sentences.slice(0, end).join(cjk ? '' : ' ').trim();
}
