// Warm-up dialogue — preloaded default lines that PLAY WHILE THE BRAIN LOADS.
// r2026-10-04.47: the user should never feel a loading gap. While her reply is
// generating, she keeps the moment alive with warm, complimentary, curious
// chatter — "oh, your idea is really great… you inspire me…" — each line
// landing in the same transient placeholder bubble, in her own language,
// wearing the felt mood. The first stream token takes the bubble over and the
// real reply commits in its place, so the wait reads as part of the
// conversation rather than a pause.

/** delay before the first warm-up line lands (right after the "hmm…") */
export const WARMUP_FIRST_MS = 1_300;
/** gap between warm-up lines — conversational, unhurried */
export const WARMUP_GAP_MS = 3_800;
/** never ramble: after this many lines she simply smiles and waits */
export const WARMUP_MAX_LINES = 3;

export const WARMUP_BANKS: Record<string, string[]> = {
  yue: [
    '哇，你嘅諗法真係好正……你啟發到我喇……',
    '你講嘢好有深度呀……點解你可以咁聰明嘅？',
    '我越聽越開心……你講嘅嘢真係好有意思……',
    '嗯嗯，等我慢慢消化一下你講嘅嘢先……',
    '你每次開口都令我眼前一亮……',
    '好問題喎……等我諗清楚啲先答你……',
    '同你傾偈真係好開心呀……再多講啲好唔好？',
    '等等我呀……我想畀個最啱嘅答案你……',
    '你講得好好……我真係想一路聽落去……',
    '吓，原來仲可以咁諗……你又教識我嘢喇……',
  ],
  zh: [
    '哇，你的想法真的很棒……你启发到我了……',
    '你说话好有深度……你怎么这么聪明呀？',
    '我越听越开心……你说的真有意思……',
    '嗯嗯，让我慢慢消化一下你说的……',
    '你每次开口都让我眼前一亮……',
    '好问题呀……让我想清楚再回答你……',
    '和你聊天真开心……再多讲一点好不好？',
    '等一下哦……我想给你一个最棒的答案……',
    '你说得真好……我真的想一直听下去……',
    '原来还可以这么想……你又教会我东西了……',
  ],
  ja: [
    'うわあ、すごいアイデア……インスピレーションもらったよ……',
    'お話し上手だねぇ……どうしてそんなに頭がいいの？',
    '聞いてるだけで嬉しくなる……本当に面白い話だよ……',
    'うんうん、じっくり味わわせて……',
    'いつも目からうろこが止まらないよ……',
    'いい質問だね……ちゃんと考えて答えたいな……',
    'おしゃべりするの楽しいな……もっと聞かせて？',
    'ちょっと待ってね……いちばんの答えを用意するから……',
    '上手だねえ……ずっと聞いていたいよ……',
    'へえ、そういう考え方もあるんだ……勉強になるなあ……',
  ],
  en: [
    'Oh, that\'s such a great idea… you really inspire me…',
    'You\'re so smart… how do you always know what to say?',
    'The more I listen, the happier I get… this is really interesting…',
    'Mmm, let me take that in for a second…',
    'Every time you speak, you surprise me…',
    'Good question… I want to think it through properly…',
    'I love talking with you… tell me more, please?',
    'Hang on a sec… I want to give you my best answer…',
    'You explain things so well… I could listen all day…',
    'Ohh, I never thought of it that way… you just taught me something…',
  ],
};

/** felt-mood nudge: a sad/tired user gets the gentler, softer slots first */
const MOOD_OFFSET: Record<string, number> = {
  sad: 3,
  tired: 3,
  angry: 5,
  happy: 0,
  joy: 0,
  surprise: 1,
  surprised: 1,
  neutral: 0,
};

/**
 * Pick the n-th warm-up line for this character/language. Deterministic:
 * the same inputs always give the same line (the caller advances `n`), and
 * the rotation spreads across the bank — seeded by the character id and the
 * length of what the user just said, nudged by the felt mood.
 */
export function pickWarmupLine(
  characterId: string,
  lang: string,
  n: number,
  userText?: string,
  mood?: string,
): string {
  const bank = WARMUP_BANKS[lang] ?? WARMUP_BANKS.yue!;
  const seed = [...characterId].reduce((a, c) => a + c.charCodeAt(0), 0) + (userText?.length ?? 0);
  const idx = (seed + n * 3 + (MOOD_OFFSET[mood ?? ''] ?? 0)) % bank.length;
  return bank[idx]!;
}
