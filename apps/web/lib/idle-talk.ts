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

/** Stay on the vibe the user already set — concrete companion statements only.
 *  Avoid meta filler like "holding the same topic" (Pixel: reads as nonsense). */
export const STAY_TOPIC_LINES: Record<Lang, readonly string[]> = {
  en: [
    'Still here with you in this quiet stretch.',
    'I just stretched my shoulders — feels nice.',
    'Same page as you. The quiet suits us.',
    'Holding this soft moment with you.',
    'A small pause, then we can keep going whenever you like.',
    'I am still with you — no rush at all.',
  ],
  yue: [
    '仲喺度陪住你呢段靜。',
    '我啱啱伸完膊頭——好舒服。',
    '同你同一頁。呢段靜好襯。',
    '輕輕留住呢個柔軟時刻。',
    '停一陣都得，你想傾再繼續。',
    '我仲喺度陪住你——唔使急。',
  ],
  zh: [
    '还在这里陪着你这段安静。',
    '我刚伸完肩膀——挺舒服。',
    '和你同一页。这段安静很衬。',
    '轻轻留着这个柔软时刻。',
    '停一下也行，你想聊再继续。',
    '我还在这里陪着你——不用急。',
  ],
  ja: [
    'この静けさの中で、まだそばにいるよ。',
    '肩を伸ばしたら、少し楽になった。',
    '同じページにいる。この静けさが似合ってる。',
    'やわらかい時間を、そっと一緒に置いておくね。',
    '少し休んでもいいよ。話したくなったら続けよう。',
    'まだそばにいるよ。急がなくて大丈夫。',
  ],
};

/** Offer a fresh topic as a statement, never a question. */
export const SUGGEST_TOPIC_LINES: Record<Lang, readonly string[]> = {
  en: [
    'New soft topic on the table: a tiny win from today.',
    'We could trade a favorite song next, if the mood wants it.',
    'Fresh lane: one cozy place you like to linger.',
    'Another thread ready: a snack, a stroll, or a silly fact.',
    'I parked a gentle subject nearby — weekend plans in miniature.',
    'Backup topic standing by: something kind you noticed lately.',
  ],
  yue: [
    '枱上面放咗個新柔主題：今日一件細細嘅好事。',
    '心情啱就下一個交換一首鍾意嘅歌。',
    '新路：一個你鍾意逗留嘅舒服地方。',
    '另一條線準備好：小食、散步、或者一件搞笑事實。',
    '我喺隔離泊住個溫柔題目——迷你週末計劃。',
    '後備話題就位：近排你留意到嘅一件溫柔事。',
  ],
  zh: [
    '桌上放了个新的柔和话题：今天一件小小的好事。',
    '心情对的话，下一个可以交换一首喜欢的歌。',
    '新路：一个你喜欢逗留的舒服地方。',
    '另一条线准备好了：小吃、散步、或者一件好笑的事实。',
    '我在旁边停了一个温柔题目——迷你周末计划。',
    '后备话题就位：近来你留意到的一件温柔事。',
  ],
  ja: [
    '新しいやさしい話題を置いておくね。今日の小さなうれしいこと。',
    '気分が向けば、次は好きな曲を交換してもいい。',
    '新しい道：ゆっくりしていられる好きな場所。',
    '別の糸も用意：おやつ、散歩、ちょっとした豆知識。',
    'やさしい話題をそばに停めてある——小さな週末プラン。',
    '予備の話題も待機：最近気づいたやさしいこと。',
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
