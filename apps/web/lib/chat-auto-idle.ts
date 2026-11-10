// Content-driven idle pick for /chat — no manual rail pins.
// Uses lightweight keyword buckets + content mood hints (lexicon / felt-mood),
// never LLM [emotion:{…}] tags. Dance / music only on explicit intent.

import { idleClipById } from './idle-clips';
import type { IdleCuratedCategory } from './idle-curated-rail';
import { FAREWELL_WAVE_CLIP_ID, isFarewellText } from './idle-farewell';

const BREATHING_CLIPS = ['IdleBreathCalm', 'StandardIdle', 'IdleMixamoBreathing'] as const;

/** Opening greet / light chit-chat — never the wave gesture. */
const CHITCHAT_CLIPS = ['lib_C25', 'LookAround', 'Thinking', 'IdleInnersceneSam'] as const;

/** Calm defaults for ordinary Q&A — no dance fallthrough. */
const NEUTRAL_CHAT_CLIPS = [
  'IdleBreathCalm',
  'StandardIdle',
  'IdleMixamoBreathing',
  'LookAround',
  'Thinking',
  'IdleNeutral',
] as const;

const SING_INTENT =
  /(唱歌|唱首歌|唱k|一齊唱|一齐唱|\bsing(?:ing)?\b|\bkaraoke\b|カラオケ|歌を歌)/i;

type BucketCategory =
  | IdleCuratedCategory
  | 'greet'
  | 'scared'
  | 'music';

type Bucket = { category: BucketCategory; patterns: RegExp[] };

/** Explicit-intent buckets only — no loose "party" / "jazz" / joy→dance fallthrough. */
const KEYWORD_BUCKETS: readonly Bucket[] = [
  {
    category: 'greet',
    patterns: [
      /\b(hi|hello|hey|good\s+(morning|evening)|welcome)\b/i,
      /你好|您好|哈囉|嗨|早晨|歡迎|欢迎/,
      /こんにちは|おはよう|やあ|いらっしゃい/,
    ],
  },
  {
    category: 'think',
    patterns: [
      /\b(let me think|hmm+|thinking|wonder|maybe|perhaps)\b/i,
      /諗下|想想|思考|或許|或许|可能|嗯+/,
      /考え|思う|かな|うーん/,
    ],
  },
  {
    category: 'dance',
    patterns: [
      /\b(danc(?:e|ing)|let(?:'s| us)\s+dance|dance\s+with)\b/i,
      /(跳舞|跳個舞|跳支舞|跳一支舞|舞一段|來跳舞|来跳舞)/,
      /ダンス|踊って|踊ろう/,
    ],
  },
  {
    category: 'music',
    patterns: [
      /\b(music|concert|playlist|listen(?:ing)?\s+to\s+(?:music|a\s+song)|put\s+on\s+(?:some\s+)?music)\b/i,
      /音樂|音乐|音樂會|音乐会|演唱會|演唱会|聽歌|听歌|播音樂|播音乐|放音樂|放音乐/,
      /音楽|ライブ|コンサート|聴いて/,
    ],
  },
  {
    category: 'martial',
    patterns: [
      /\b(tai\s?chi|kung\s?fu|martial\s+arts)\b/i,
      /太極|太极|功夫|武打/,
      /太極拳|カンフー/,
    ],
  },
  {
    category: 'scared',
    patterns: [
      /\b(scared|afraid|frighten|spooky|creepy|yikes)\b/i,
      /害怕|驚|怕|恐怖|嚇|吓/,
      /怖い|こわい|びっくり/,
    ],
  },
  {
    category: 'react',
    patterns: [
      /\b(wow|yay|hurray|awesome|great job|congrat)/i,
      /太好了|好棒|厲害|厉害|恭喜/,
      /すごい|やった/,
    ],
  },
];

/** Category → curated clip id (first playable match). HelloWave is farewell-only. */
const CATEGORY_CLIP: Record<BucketCategory | 'breathe' | 'look' | 'stretch' | 'sing', string> = {
  greet: 'lib_C25',
  think: 'Thinking',
  dance: 'lib_C113',
  // Listening-to-music idle (rail / library #12) — not LookAround.
  music: 'lib_C41',
  martial: 'lib_C121',
  scared: 'lib_C146',
  react: 'Cheer',
  breathe: 'IdleBreathCalm',
  look: 'LookAround',
  stretch: 'Relax',
  sing: 'IdleMixamoHappy',
};

/** Music / concert talk without a full dance ask — sway with the catalog. */
const MUSIC_POSE_CLIPS = [
  'lib_C41', // ListeningToMusic
  'lib_C112', // GentleSway
  'lib_C113', // DancingMedium / hip-hop arms
  'lib_C114', // Party
  'IdleMixamoHappy',
] as const;

function pickFromPool(seed: string, pool: readonly string[]): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const playable = pool.filter((id) => idleClipById(id));
  if (!playable.length) return 'IdleBreathCalm';
  const idx = Math.abs(h) % playable.length;
  return playable[idx]!;
}

function pickBreathingDefault(seed: string): string {
  return pickFromPool(seed, BREATHING_CLIPS);
}

function pickChitchatDefault(seed: string): string {
  return pickFromPool(seed, CHITCHAT_CLIPS);
}

function pickNeutralChatIdle(seed: string): string {
  return pickFromPool(seed, NEUTRAL_CHAT_CLIPS);
}

function pickDanceClip(text: string): string {
  const t = text.toLowerCase();
  if (/jazz|爵士/.test(t)) return idleClipById('lib_C112') ? 'lib_C112' : 'lib_C113';
  if (/robot|機器人|机器人/.test(t)) return idleClipById('lib_C111') ? 'lib_C111' : 'lib_C113';
  if (/party|派對|派对|club|夜店/.test(t)) return idleClipById('lib_C114') ? 'lib_C114' : 'lib_C113';
  if (/hip[- ]?hop|嘻哈/.test(t)) return idleClipById('lib_C113') ? 'lib_C113' : 'lib_C113';
  return idleClipById('lib_C113') ? 'lib_C113' : pickBreathingDefault(text);
}

function pickMusicClip(text: string): string {
  const t = text.toLowerCase();
  // Genre cues share the dance shortlist so talk about music still moves.
  if (/jazz|爵士|lofi|lofí|chill|ballad|抒情/.test(t)) {
    return idleClipById('lib_C112') ? 'lib_C112' : pickFromPool(text, MUSIC_POSE_CLIPS);
  }
  if (/party|派對|派对|club|夜店|edm|disco/.test(t)) {
    return idleClipById('lib_C114') ? 'lib_C114' : pickFromPool(text, MUSIC_POSE_CLIPS);
  }
  if (/hip[- ]?hop|嘻哈|upbeat|快歌/.test(t)) {
    return idleClipById('lib_C113') ? 'lib_C113' : pickFromPool(text, MUSIC_POSE_CLIPS);
  }
  if (/listen|聽歌|听歌|concert|演唱會|演唱会|音樂會|音乐会/.test(t)) {
    return idleClipById('lib_C41') ? 'lib_C41' : pickFromPool(text, MUSIC_POSE_CLIPS);
  }
  return pickFromPool(text, MUSIC_POSE_CLIPS);
}

function topEmotionCategory(
  hints: Record<string, number> | undefined,
  corpus: string,
): IdleCuratedCategory | null {
  if (!hints) return null;
  let best: { key: string; v: number } | null = null;
  for (const [key, v] of Object.entries(hints)) {
    if (v <= 0.5) continue;
    if (!best || v > best.v) best = { key, v };
  }
  if (!best) return null;
  const k = best.key.toLowerCase();
  if (SING_INTENT.test(corpus) && (k.includes('joy') || k.includes('happy'))) return 'sing';
  if (k.includes('confus') || k.includes('think')) return 'think';
  if (k.includes('surprise')) return 'look';
  // Joy/sad/anger no longer map to sing/dance idles — neutral chat stays calm.
  return null;
}

function matchBucket(text: string): BucketCategory | null {
  const t = text.trim();
  if (!t) return null;
  for (const bucket of KEYWORD_BUCKETS) {
    if (bucket.patterns.some((re) => re.test(t))) return bucket.category;
  }
  return null;
}

const USER_INTENT_CATEGORIES = new Set<BucketCategory>(['dance', 'music', 'martial']);

function resolveBucket(userText: string, assistantText: string): BucketCategory | null {
  const user = matchBucket(userText);
  if (user && USER_INTENT_CATEGORIES.has(user)) return user;
  const assist = matchBucket(assistantText);
  if (assist) return assist;
  return user;
}

function clipForCategory(cat: BucketCategory | IdleCuratedCategory, seed: string, corpus: string): string {
  if (cat === 'breathe') return pickBreathingDefault(seed);
  if (cat === 'greet') return pickChitchatDefault(seed);
  if (cat === 'dance') return pickDanceClip(corpus);
  if (cat === 'music') return pickMusicClip(corpus);
  const id = CATEGORY_CLIP[cat as BucketCategory];
  if (id && idleClipById(id)) return id;
  if (cat === 'sing') return idleClipById('IdleMixamoHappy') ? 'IdleMixamoHappy' : pickBreathingDefault(seed);
  if (cat === 'think') return idleClipById('Thinking') ? 'Thinking' : pickBreathingDefault(seed);
  if (cat === 'react') return idleClipById('Cheer') ? 'Cheer' : pickBreathingDefault(seed);
  return pickNeutralChatIdle(seed);
}

function resolveFarewellWave(): string | null {
  return idleClipById(FAREWELL_WAVE_CLIP_ID) ? FAREWELL_WAVE_CLIP_ID : null;
}

export interface ChatAutoIdleInput {
  assistantText: string;
  /** Latest user line — dance / music intents checked here first. */
  userText?: string;
  emotionHints?: Record<string, number>;
  thinking?: boolean;
  openGreet?: boolean;
  sessionFarewell?: boolean;
}

/** Resolve a playable idle clip id, or null when nothing fits. */
export function resolveChatAutoIdle(input: ChatAutoIdleInput): string | null {
  if (input.sessionFarewell) {
    return resolveFarewellWave() ?? pickBreathingDefault('bye');
  }
  if (input.thinking) {
    return idleClipById('Thinking') ? 'Thinking' : 'IdleBreathCalm';
  }
  const assistantText = input.assistantText.trim();
  const userText = (input.userText ?? '').trim();
  const corpus = `${userText} ${assistantText}`.trim();
  const seed = assistantText || userText || 'idle';

  if (isFarewellText(assistantText)) {
    return resolveFarewellWave() ?? pickBreathingDefault(seed);
  }
  if (input.openGreet) {
    return pickChitchatDefault(seed);
  }

  const bucket = resolveBucket(userText, assistantText);
  if (bucket) return clipForCategory(bucket, seed, corpus);
  const emo = topEmotionCategory(input.emotionHints, corpus);
  if (emo) return clipForCategory(emo, seed, corpus);
  const clip = pickNeutralChatIdle(seed);
  return idleClipById(clip) ? clip : 'IdleBreathCalm';
}
