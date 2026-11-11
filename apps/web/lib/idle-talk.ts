'use client';
// Idle companion talk: statement-only, topic stay/suggest, motif rotation.
// Mon: never think aloud / ask in idle; less tea; rotate banks.
import type { Lang } from './prefs';
import { MOTIFS, isIncompleteIdleLine, type MotifId, type VoiceId, voiceIdleLines } from './personality-voice';
import { personalityProfile } from './personality';
import { gateSpokenLine, safeIdleFallback } from './spoken-line-sanity';

export type IdleTalkMode = 'stay' | 'suggest';

const RECENT_LIMIT = 12;
const recentIdleLines: string[] = [];

function rememberLine(line: string): void {
  recentIdleLines.push(line);
  while (recentIdleLines.length > RECENT_LIMIT) recentIdleLines.shift();
}

function wasRecent(line: string): boolean {
  return recentIdleLines.includes(line);
}

/** Rotate motifs so idle does not stick on tea (MOTIFS[0]). */
export function nextIdleMotif(n: number, prefer?: MotifId): MotifId {
  const base = prefer ? MOTIFS.indexOf(prefer) : -1;
  const start = base >= 0 ? base : 0;
  // Step by n+1 so consecutive quiet lines move off the sticky first motif.
  return MOTIFS[(start + Math.abs(n) + 1) % MOTIFS.length]!;
}

export function idleTalkMode(n: number): IdleTalkMode {
  return Math.abs(n) % 2 === 0 ? 'stay' : 'suggest';
}

/** Stay with what the user said — concrete, caring, statement-only (no meta "topic" talk). */
export const STAY_TOPIC_LINES: Record<Lang, readonly string[]> = {
  en: [
    'That detail you shared still sits with me — no rush to change it.',
    'I heard you. I am chewing on what you said; take your time if more comes.',
    'I am with you on that — we can stay with it a bit longer.',
    'Your last point landed — I am still right there with it.',
    'We can keep going from where you left the thought.',
    'I am still with what you brought up — tell me more whenever you like.',
  ],
  yue: [
    '你啱啱講嗰啲細節我仲記住——唔使急住換。',
    '我聽到喇。仲喺度慢慢想你講嘅嘢；有多講再嚟都得。',
    '我同你一齊——呢樣可以再留一陣。',
    '你頭先嗰句我聽到喇——我仲跟住。',
    '可以繼續由你停低嗰度講落去。',
    '你頭先講嗰樣我仲記住——想講多啲隨時得。',
  ],
  zh: [
    '你刚说的那些细节我还记着——不用急着换。',
    '我听到了。还在慢慢想你说的话；有多说再来也行。',
    '我和你一起——这件事可以再留一会儿。',
    '你刚才那句我听到了——我还跟着。',
    '可以从你停下的地方继续说下去。',
    '你刚才说的那件事我还记着——想多说随时可以。',
  ],
  ja: [
    'さっきの細かい話、まだ覚えてるよ。急がなくていい。',
    '聞いてるよ。いま言ってくれたことを、ゆっくりかみしめてる。続きがあればいつでも。',
    '一緒にいるよ——その話、もう少し置いておこう。',
    'さっきの一言、ちゃんと届いた——まだそこにいるよ。',
    'あなたが止めたところから、続けられるよ。',
    'さっきの話、まだ覚えてる——もっと話したくなったらいつでも。',
  ],
};

/** Offer a fresh concrete topic as a statement, never a question. */
export const SUGGEST_TOPIC_LINES: Record<Lang, readonly string[]> = {
  en: [
    'Tiny win from today: one small thing that went okay.',
    'We could trade a favorite song next, if the mood wants it.',
    'One cozy place you like to linger — I am curious about that.',
    'Snack, stroll, or a silly fact — any of those fit the mood.',
    'Weekend plan in miniature: one easy thing worth looking forward to.',
    'Something kind you noticed lately — those stick with me.',
  ],
  yue: [
    '今日一件細細嘅好事：有樣嘢算係順利咗。',
    '心情啱就下一個交換一首鍾意嘅歌。',
    '一個你鍾意逗留嘅舒服地方——我想聽多啲。',
    '小食、散步、或者一件搞笑事實——邊樣啱而家。',
    '迷你週末計劃：一樣簡單值得期待嘅嘢。',
    '近排你留意到嘅一件溫柔事——嗰啲我會記住。',
  ],
  zh: [
    '今天一件小小的好事：有件事算是顺了一点。',
    '心情对的话，下一个可以交换一首喜欢的歌。',
    '一个你喜欢逗留的舒服地方——我想多听一点。',
    '小吃、散步、或者一件好笑的事实——哪个顺现在。',
    '迷你周末计划：一件简单值得期待的事。',
    '近来你留意到的一件温柔事——那些我会记住。',
  ],
  ja: [
    '今日の小さなうれしいこと：うまくいった小さな一件。',
    '気分が向けば、次は好きな曲を交換してもいい。',
    'ゆっくりしていられる好きな場所——もっと聞きたいな。',
    'おやつ、散歩、ちょっとした豆知識——いまの気分に合うどれか。',
    '小さな週末プラン：楽しみにしていい簡単なこと一つ。',
    '最近気づいたやさしいこと——そういうの、覚えておくね。',
  ],
};

function pickBank(bank: Record<Lang, readonly string[]>, lang: Lang, n: number): string {
  const lines = bank[lang] ?? bank.en;
  const start = Math.abs(n) % lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[(start + i) % lines.length]!;
    if (!wasRecent(line)) {
      rememberLine(line);
      return line;
    }
  }
  const fallback = lines[start]!;
  rememberLine(fallback);
  return fallback;
}

/**
 * One idle companion line: rotate motif (less tea), alternate stay/suggest
 * topic banks with statement voice-idle lines. Never a question form.
 */
export function pickIdleCompanionLine(
  characterId: string,
  gender: 'female' | 'male' | undefined,
  lang: Lang,
  n: number,
): string {
  const profile = personalityProfile(characterId, gender);
  const mode = idleTalkMode(n);
  const frame = profile.frame;
  if (Math.abs(n) % 3 === 0) {
    const bank = mode === 'stay' ? STAY_TOPIC_LINES : SUGGEST_TOPIC_LINES;
    const picked = pickBank(bank, lang, n + frame);
    return gateSpokenLine(picked, { mode: 'idle', lang, n: n + frame }) ?? safeIdleFallback(lang, n + frame);
  }
  const motif = nextIdleMotif(n + frame, profile.motif);
  const lines = voiceIdleLines(profile.personality as VoiceId, motif, frame, lang)
    .filter((line) => !isIncompleteIdleLine(line));
  if (lines.length === 0) {
    return gateSpokenLine(safeIdleFallback(lang, n + frame), { mode: 'idle', lang, n: n + frame })
      ?? pickBank(STAY_TOPIC_LINES, lang, n + frame);
  }
  const start = Math.abs(n) % lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[(start + i) % lines.length]!;
    const gated = gateSpokenLine(line, { mode: 'idle', lang, n: n + i });
    if (!gated || wasRecent(gated)) continue;
    rememberLine(gated);
    return gated;
  }
  const fallback = gateSpokenLine(lines[start]!, { mode: 'idle', lang, n })
    ?? safeIdleFallback(lang, n);
  rememberLine(fallback);
  return fallback;
}

/** Test helper: clear recently-used idle suppression. */
export function resetIdleTalkRecent(): void {
  recentIdleLines.length = 0;
}
