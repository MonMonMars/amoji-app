// Guard against bolting ability reminders (dance / sing / music / weather /
// news / story / tutorial) onto unrelated topical replies. Showcase offers
// stay on quiet idle only — never the closing beat of a fun-fact, science,
// weather, news, or story answer.
// Pure heuristics — no LLM, unit-testable in node.

import { DEMO_PHASE_BUTTONS, type DemoPhaseId } from './demo-phase';
import { SHOWCASE_OFFERS, TUTORIAL_LINES, type ShowcaseKind } from './showcase';
import type { Lang } from './prefs';
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

const LANGS: readonly Lang[] = ['en', 'yue', 'zh', 'ja'];

const WEATHER_OR_NEWS_RE =
  /\b(weather|forecast|temperature|headline|news|最新ニュース|天気)\b|天氣|天气|新聞|新闻|天氣預報|天气预报/i;

/**
 * Showcase-style ability invites across dance / sing / music / weather /
 * news / story (any UI language). Soft on-topic check-ins are NOT matched.
 */
const ABILITY_INVITE_RE =
  /(?:want to see me danc|see me dancing|want me to (?:sing|dance|check the weather|read (?:one )?cheerful|tell you a (?:little )?story)|shall i (?:sing|dance|play|check|share|tell|read)|want to listen to some music|put on (?:a little )?dance|put (?:on )?some music|want me to check the weather|shall i tell you what it is like outside|shall i share a bit of good news|want me to (?:read one cheerful headline|tell you a (?:little )?story)|想唔想睇我跳|想不想看我跳|想唔想聽我唱|想不想听我唱|想唔想聽吓音樂|想不想听点音乐|想我睇吓而家天氣|想我看一下天气|要不要我報個天氣|要不要我报个天气|想我讀一條|想我读一条|要不要我講一件今日|要不要我讲一件今天|想唔想聽我講個小故事|想不想听我讲个小故事|要不要我講故|要不要我讲故事|ダンス[、,]?\s*見て|歌[、,]?\s*聴いて|音楽[、,]?\s*聴いて|踊ってあげる|一曲うたって|今の天気[、,]?\s*見て|天気チェック|軽いニュース|今日のいい話|小さな物語|短いストーリー)/i;

const SOFT_CHECKIN_RE =
  /(?:want to hear another(?:\s+fun)?\s+fact|another\s+(?:fun\s+)?fact|what about you|how(?:'s| is) that|想唔想聽多啲|想不想再听|もっと聞かせ)/i;

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

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s"'“”‘’~～…]+/g, '')
    .replace(/[?!？！.。,，、;；:：]/g, '');
}

function knownPitchNorms(): Set<string> {
  const out = new Set<string>();
  for (const lang of LANGS) {
    for (const kind of Object.keys(SHOWCASE_OFFERS.en) as ShowcaseKind[]) {
      for (const line of SHOWCASE_OFFERS[lang][kind]) out.add(normalize(line));
    }
    for (const line of TUTORIAL_LINES[lang]) out.add(normalize(line));
  }
  return out;
}

const KNOWN_PITCH = knownPitchNorms();

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

/** A sentence that is a dance / sing / music / weather / news / story invite. */
export function isAbilityInviteLine(text: string): boolean {
  const s = text.trim();
  if (!s) return false;
  if (SOFT_CHECKIN_RE.test(s) && !/\b(?:danc|sing|music|weather|news|story)\b/i.test(s)) {
    return false;
  }
  if (ABILITY_INVITE_RE.test(s)) return true;
  const n = normalize(s);
  if (KNOWN_PITCH.has(n)) return true;
  for (const pitch of KNOWN_PITCH) {
    if (n.length >= 8 && (n.includes(pitch) || pitch.includes(n))) return true;
  }
  return false;
}

function splitSpokenSentences(text: string): string[] {
  const parts = text.match(/[^。！？.!?\n]+[。！？.!?]?/g);
  if (!parts) return text.trim() ? [text.trim()] : [];
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Drop showcase-style ability invites from a topical reply so a Jupiter
 * fun-fact never ends with "want to see me dance?" (or weather/news/story).
 */
export function stripOfftopicAbilityTack(reply: string, userText: string): string {
  if (!reply.trim() || !isTopicalContentTurn(userText)) return reply;
  const sentences = splitSpokenSentences(reply);
  if (sentences.length <= 1) {
    // Single-sentence mix: try em-dash cut ("Fact. — Want to dance?").
    const only = sentences[0] ?? reply;
    if (!isAbilityInviteLine(only)) return reply;
    const cut = only.split(/\s*[—–―]+\s*|——/).map((p) => p.trim()).filter(Boolean);
    if (cut.length >= 2) {
      const kept = cut.filter((p) => !isAbilityInviteLine(/[?？]$/.test(p) ? p : `${p}?`));
      if (kept.length) return kept.join(' ').trim();
    }
    return reply; // never wipe a whole reply that is only an invite
  }
  const kept = sentences.filter((s, i) => {
    // Keep leading content; drop any ability-invite sentence after the first.
    if (i === 0) return true;
    return !isAbilityInviteLine(s);
  });
  // Also drop a trailing invite even if somehow first survived alone.
  while (kept.length > 1 && isAbilityInviteLine(kept[kept.length - 1]!)) {
    kept.pop();
  }
  if (kept.length === sentences.length) return reply;
  const cjk = reply.includes('。') || /[\u3400-\u9fff]/.test(reply);
  return kept.join(cjk ? '' : ' ').trim();
}
