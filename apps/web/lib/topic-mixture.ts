// One spoken turn = one topic by default.
// Free short replies and demo-phase chips stay single-topic; ability /
// showcase invites are idle-only and never hitchhike onto unrelated answers.
// Multi-beat / richer talk is gated (see allowsRichTopicMixture).
// Pure heuristics — no LLM, unit-testable in node.

import { SHOWCASE_OFFERS, TUTORIAL_LINES, type ShowcaseKind } from './showcase';
import type { Lang } from './prefs';

/** Ability / activity topics that must not hitchhike onto unrelated answers. */
export type AbilityTopic =
  | 'dance'
  | 'song'
  | 'music'
  | 'weather'
  | 'news'
  | 'story'
  | 'funFact'
  | 'funScience';

const ALL_ABILITY: readonly AbilityTopic[] = [
  'dance',
  'song',
  'music',
  'weather',
  'news',
  'story',
  'funFact',
  'funScience',
] as const;

/** User asks that open an ability / content lane. */
const USER_TOPIC_RE: Record<AbilityTopic, RegExp> = {
  dance:
    /\b(?:dance|dancing|danc(?:e|ing)\s+for\s+me|put\s+on\s+a\s+(?:little\s+)?dance)\b|跳舞|跳支舞|踊っ|ダンス|一齊跳|一起跳/i,
  song:
    /\b(?:sing|song|singing|sing\s+(?:a\s+)?song|sing\s+together|duet)\b|唱[首歌]?|唱歌|一齊唱|一起唱|歌って|一曲/i,
  music:
    /\b(?:play\s+(?:some\s+)?music|put\s+on\s+(?:some\s+)?music|listen\s+to\s+(?:some\s+)?music|bgm|playlist)\b|播音樂|播音乐|放音樂|放音乐|音楽をかけ|聽吓音樂|听点音乐/i,
  weather:
    /\b(?:weather|forecast|temperature|how\s+(?:hot|cold|warm)|is\s+it\s+raining)\b|天氣|天气|気温|予報|今日の天気/i,
  news:
    /\b(?:news|headline|headlines|what's\s+happening|latest\s+news)\b|新聞|新闻|ニュース|頭條|头条/i,
  story:
    /\b(?:story|stories|bedtime\s+story|tell\s+(?:me\s+)?a\s+(?:little\s+)?story)\b|故事|故仔|童話|お話|物語|講個?故/i,
  funFact:
    /\b(?:fun\s+fact|random\s+fact|did\s+you\s+know|trivia|冷知識|有趣知識|豆知識)\b|冷知识|有趣冷知識/i,
  funScience:
    /\b(?:fun\s+science|science\s+fact|explain\s+(?:the\s+)?science|why\s+is\s+(?:the\s+)?sky)\b|科學趣|轻松科学|ゆるい科学|自然科学|科学趣味|有趣科學/i,
};

const INVITE_FRAME =
  /(?:want(?:\s+me|\s+to|\s+us)?|wanna|shall\s+i|should\s+i|can\s+i|how\s+about|maybe\s+(?:i|we)\s+(?:can|could)|i\s+can\s+(?:put|play|sing|dance|tell|check|share|read|do)|let(?:'s|\s+us)\s+(?:dance|sing|play)|要不要|想不想|想唔想|要唔要|好不好|好唔好|してみる|しようか|どうかな|見てみる|聴いてみる|聞いてみる|いい\？|見る\？)/i;

const KIND_IN_SENTENCE: Record<AbilityTopic, RegExp> = {
  dance: /\b(?:danc(?:e|ing|er)?|step|choreograph)\b|跳(?:舞|支舞)|踊|ダンス/i,
  song: /\b(?:sing(?:ing)?|song|vocal|duet)\b|唱[首歌]?|歌う|一曲/i,
  music: /\b(?:music|tune|bgm|playlist|melody)\b|音樂|音乐|音楽|曲をかけ/i,
  weather: /\b(?:weather|forecast|temperature|outside)\b|天氣|天气|気温|予報/i,
  news: /\b(?:news|headline|headlines)\b|新聞|新闻|ニュース|好消息/i,
  story: /\b(?:story|stories|tale)\b|故事|故仔|お話|物語/i,
  funFact: /\b(?:fun\s+fact|trivia|did\s+you\s+know)\b|冷知識|冷知识|豆知識/i,
  funScience: /\b(?:fun\s+science|science\s+fact)\b|科學趣|科学趣味|ゆるい科学/i,
};

const SOFT_CHECKIN =
  /(?:what\s+about\s+you|how\s+(?:are|is)\s+(?:you|it)|how(?:'s| is) that|want\s+to\s+(?:hear|know)\s+more|another\s+(?:one|fact)|你呢|那你呢|そっちはどう|もっと聞かせ|想唔想聽多啲|想不想再听)/i;

const LANGS: readonly Lang[] = ['en', 'yue', 'zh', 'ja'];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s"'“”‘’~～…]+/g, '')
    .replace(/[?!？！.。,，、;；:：]/g, '');
}

function knownPitchNorms(): Map<string, AbilityTopic | 'tutorial'> {
  const out = new Map<string, AbilityTopic | 'tutorial'>();
  for (const lang of LANGS) {
    for (const kind of Object.keys(SHOWCASE_OFFERS.en) as ShowcaseKind[]) {
      for (const line of SHOWCASE_OFFERS[lang][kind]) {
        out.set(normalize(line), kind === 'song' ? 'song' : (kind as AbilityTopic));
      }
    }
    for (const line of TUTORIAL_LINES[lang]) {
      out.set(normalize(line), 'tutorial');
    }
  }
  return out;
}

const KNOWN_PITCH = knownPitchNorms();

function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    buf += ch;
    const cjkEnd = ch === '。' || ch === '！' || ch === '？';
    const latinEnd = ch === '!' || ch === '?';
    const period = ch === '.' && !/\d\.\d/.test(text.slice(Math.max(0, i - 1), i + 2));
    if (!cjkEnd && !latinEnd && !period) continue;
    const next = text.charAt(i + 1);
    if (next === '。' || next === '！' || next === '？' || next === '!') continue;
    if (period && next === '.') continue;
    if ((latinEnd || period) && next && !/[\s\n]/.test(next)) continue;
    const piece = buf.trim();
    if (piece) out.push(piece);
    buf = '';
  }
  const rest = buf.trim();
  if (rest) out.push(rest);
  return out;
}

function joinSentences(parts: string[]): string {
  return parts.join(' ').replace(/([。！？，、；：])\s+(?=[\u3400-\u9fff\u3040-\u30ff])/g, '$1');
}

/** Topics the user explicitly opened this turn. */
export function detectUserAbilityTopics(userText?: string): Set<AbilityTopic> {
  const allowed = new Set<AbilityTopic>();
  const t = (userText ?? '').trim();
  if (!t) return allowed;
  for (const kind of ALL_ABILITY) {
    if (USER_TOPIC_RE[kind].test(t)) allowed.add(kind);
  }
  if (allowed.has('song')) allowed.add('music');
  return allowed;
}

/** Which ability (if any) this sentence is offering. */
export function detectAbilityOfferKind(sentence: string): AbilityTopic | 'tutorial' | null {
  const s = sentence.trim();
  if (!s) return null;
  const known = KNOWN_PITCH.get(normalize(s));
  if (known) return known;

  for (const lang of LANGS) {
    for (const kind of Object.keys(SHOWCASE_OFFERS.en) as ShowcaseKind[]) {
      for (const line of SHOWCASE_OFFERS[lang][kind]) {
        const nLine = normalize(line);
        const nSent = normalize(s);
        if (nSent.length >= 8 && (nSent.includes(nLine) || nLine.includes(nSent))) {
          return kind === 'song' ? 'song' : (kind as AbilityTopic);
        }
      }
    }
  }

  if (SOFT_CHECKIN.test(s) && !INVITE_FRAME.test(s)) return null;
  if (!INVITE_FRAME.test(s) && !/[?？]\s*$/.test(s)) return null;

  for (const kind of ALL_ABILITY) {
    if (KIND_IN_SENTENCE[kind].test(s) && (INVITE_FRAME.test(s) || /[?？]\s*$/.test(s))) {
      if ((kind === 'funFact' || kind === 'funScience') && SOFT_CHECKIN.test(s)) continue;
      return kind;
    }
  }
  return null;
}

function offerAllowed(
  offer: AbilityTopic | 'tutorial',
  allowed: Set<AbilityTopic>,
): boolean {
  if (offer === 'tutorial') return false;
  if (allowed.size === 0) return false;
  if (allowed.has(offer)) return true;
  if ((offer === 'music' || offer === 'song') && (allowed.has('music') || allowed.has('song'))) {
    return true;
  }
  return false;
}

/**
 * Gate for multi-beat / richer talk.
 *
 * Default is one topic at a time (free short replies, demo-phase chips).
 * Exception — richer multi-beat OK only on long conversations with a
 * smart/capable LLM path:
 *   - story mode (any brain; narrative needs beats)
 *   - detailed / long companion AND keyed BYOK brain
 *
 * Ability / showcase invites are NEVER covered by this exception — they stay
 * idle-only (see stripOffTopicAbilityTacks).
 */
export type TopicMixtureGate = {
  story?: boolean;
  detailed?: boolean;
  keyedBrain?: boolean;
};

/** True when multi-beat / richer talk may weave more than one beat. */
export function allowsRichTopicMixture(gate: TopicMixtureGate): boolean {
  if (gate.story) return true;
  if (gate.detailed && gate.keyedBrain) return true;
  return false;
}

/** Free short / demo / keyless turns must stay single-topic. */
export function mustStayOneTopic(gate: TopicMixtureGate): boolean {
  return !allowsRichTopicMixture(gate);
}

/**
 * Strip off-topic ability / tutorial tack-ons from a shaped spoken reply.
 * Always applies on topical turns — the rich-mixture exception does NOT
 * authorize bolting dance onto Jupiter facts.
 */
export function stripOffTopicAbilityTacks(reply: string, userText?: string): string {
  const text = reply.trim();
  if (!text) return reply;
  if (!userText?.trim()) return reply;

  const allowed = detectUserAbilityTopics(userText);
  const sentences = splitSentences(text);
  if (sentences.length <= 1) {
    const only = sentences[0] ?? text;
    const offer = detectAbilityOfferKind(only);
    if (!offer || offerAllowed(offer, allowed)) return reply;
    const cut = only.split(/\s*[—–―]+\s*|——/).map((p) => p.trim()).filter(Boolean);
    if (cut.length >= 2) {
      const kept = cut.filter((p) => {
        const k = detectAbilityOfferKind(p.endsWith('?') || p.endsWith('？') ? p : `${p}?`);
        return !k || offerAllowed(k, allowed);
      });
      if (kept.length) return kept.join(' ').trim();
    }
    return '';
  }

  const kept: string[] = [];
  for (const s of sentences) {
    const offer = detectAbilityOfferKind(s);
    if (offer && !offerAllowed(offer, allowed)) continue;
    kept.push(s);
  }
  if (!kept.length) {
    const firstContent = sentences.find((s) => !detectAbilityOfferKind(s));
    return (firstContent ?? sentences[0] ?? '').trim();
  }
  return joinSentences(kept).replace(/\s{2,}/g, ' ').trim();
}
