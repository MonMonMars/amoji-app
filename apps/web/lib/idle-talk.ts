'use client';
// Idle companion talk: statement-only, topic stay/suggest, motif rotation.
// Mon: never think aloud / ask in idle; less tea; rotate banks.
import type { Lang } from './prefs';
import { MOTIFS, isIncompleteIdleLine, type MotifId, type VoiceId, voiceIdleLines } from './personality-voice';
import { personalityProfile } from './personality';
import { gateSpokenLine, safeIdleFallback } from './spoken-line-sanity';
import { factTurnQuietActive } from './fact-turn-quiet';

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
    'I heard you — we can stay with this a bit longer.',
    'I am right here with what you said; no rush to switch topics.',
    'We can keep going from where you paused.',
    'Your last sentence landed — I am still listening.',
    'Take your time — I am not going anywhere.',
    'Whenever more comes to mind, I am here for it.',
  ],
  yue: [
    '我聽到喇——呢樣可以慢慢留一陣。',
    '你講嘅嘢我喺度跟緊——唔使急住換話題。',
    '我同你一齊——可以繼續由呢度講落去。',
    '你頭先嗰句我聽到喇——我仲喺度陪住。',
    '可以繼續由你停低嗰度講落去。',
    '想講多啲隨時都得——我喺度聽住。',
  ],
  zh: [
    '我听到了——这件事可以再留一会儿。',
    '你说的我正在跟着——不用急着换话题。',
    '我和你一起——可以从这里继续说下去。',
    '你刚才那句我听到了——我还在陪着你。',
    '可以从你停下的地方继续说下去。',
    '想多说随时都行——我听着呢。',
  ],
  ja: [
    '聞いてるよ——その話、もう少しそのままでいい。',
    'いま言ってくれたことについていくよ。急いで話題を変えなくていい。',
    '一緒にいるよ——ここから続けられる。',
    'さっきの一言、ちゃんと届いた——まだそばで聞いてる。',
    'あなたが止めたところから、続けられるよ。',
    'もっと言いたくなったらいつでも——ここにいるよ。',
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
    'Something kind you noticed lately — worth saying out loud if you feel like it.',
  ],
  yue: [
    '今日一件細細嘅好事：有樣嘢算係順利咗。',
    '心情啱就下一個交換一首鍾意嘅歌。',
    '一個你鍾意逗留嘅舒服地方——講多兩句都得。',
    '小食、散步、或者一件搞笑事實——邊樣啱而家。',
    '迷你週末計劃：一樣簡單值得期待嘅嘢。',
    '近排一件細事令你心軟——想分享嘅話我聽住。',
  ],
  zh: [
    '今天一件小小的好事：有件事算是顺了一点。',
    '心情对的话，下一个可以交换一首喜欢的歌。',
    '一个你喜欢逗留的舒服地方——多说两句也行。',
    '小吃、散步、或者一件好笑的事实——哪个顺现在。',
    '迷你周末计划：一件简单值得期待的事。',
    '近来一件小事让你心里变软——想分享的话我在听。',
  ],
  ja: [
    '今日の小さなうれしいこと：うまくいった小さな一件。',
    '気分が向けば、次は好きな曲を交換してもいい。',
    'ゆっくりしていられる好きな場所——少し話してもいいよ。',
    'おやつ、散歩、ちょっとした豆知識——いまの気分に合うどれか。',
    '小さな週末プラン：楽しみにしていい簡単なこと一つ。',
    '最近ひとつ心がやわらぐ出来事があったなら——話したくなったらいつでも。',
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
  // Owner 2026-11-25: a poetic motif line ("我差啲收埋一朵新鮮嘅花…") landed
  // right after a live news read and sounded bolted on to the story. A fact
  // tell keeps idle chatter silent for a short window.
  if (factTurnQuietActive()) return '';
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
