'use client';
// Idle companion talk: statement-only, topic stay/suggest, motif rotation.
// Mon: never think aloud / ask in idle; less tea; rotate banks.
import type { Lang } from './prefs';
import { MOTIFS, type MotifId, type VoiceId, voiceIdleLines } from './personality-voice';
import { personalityProfile } from './personality';

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

/** Stay on the vibe the user already set — statements only. */
export const STAY_TOPIC_LINES: Record<Lang, readonly string[]> = {
  en: [
    'Still on that thread with you — no rush to leave it.',
    'Holding the same topic gently so we can linger.',
    'Same page as you. I like staying here a bit longer.',
    'Keeping your subject warm on the table between us.',
    'We can keep walking the path you started.',
    'I am still with what you brought up — it suits this quiet.',
  ],
  yue: [
    '仲喺你呢條話題度，唔使急住換。',
    '輕輕留住同一個主題，陪你再傾陣。',
    '同你同一頁。我想喺呢度多留一陣。',
    '你提起嘅嘢我仲放喺枱上面暖住。',
    '可以繼續行你起頭嗰條路。',
    '你頭先講嗰樣我仲記住——呢段靜好襯。',
  ],
  zh: [
    '还在你这条话题上，不用急着换。',
    '轻轻留着同一个主题，再陪你一会儿。',
    '和你同一页。我想在这里多留一阵。',
    '你提起的事我还放在桌上暖着。',
    '可以继续走你开头的那条路。',
    '你刚才说的那件事我还记着——这段安静很衬。',
  ],
  ja: [
    'まだその話の途中だよ。急がなくていい。',
    '同じ話題をそっと置いたまま、もう少し一緒にいよう。',
    '同じページにいる。もう少しここにいたいな。',
    'あなたが出した話題を、あたたかく置いておくね。',
    'あなたが始めた道を、そのまま歩けるよ。',
    'さっきの話、まだ覚えてる——この静けさに合ってる。',
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
  // Every third beat: explicit stay/suggest topic bank (statement).
  if (Math.abs(n) % 3 === 0) {
    const bank = mode === 'stay' ? STAY_TOPIC_LINES : SUGGEST_TOPIC_LINES;
    return pickBank(bank, lang, n + frame);
  }
  const motif = nextIdleMotif(n + frame, profile.motif);
  const lines = voiceIdleLines(profile.personality as VoiceId, motif, frame, lang);
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

/** Test helper: clear recently-used idle suppression. */
export function resetIdleTalkRecent(): void {
  recentIdleLines.length = 0;
}
