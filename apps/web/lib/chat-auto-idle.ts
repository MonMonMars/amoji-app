// Content-driven idle pick for /chat — no manual rail pins.
// Uses lightweight keyword buckets + emotionHints on the last assistant reply.

import { idleClipById } from './idle-clips';
import type { IdleCuratedCategory } from './idle-curated-rail';
import { FAREWELL_WAVE_CLIP_ID, isFarewellText } from './idle-farewell';

const BREATHING_CLIPS = ['IdleBreathCalm', 'StandardIdle', 'IdleMixamoBreathing'] as const;

/** Opening greet / light chit-chat — never the wave gesture. */
const CHITCHAT_CLIPS = ['lib_C25', 'LookAround', 'Thinking', 'IdleInnersceneSam'] as const;

type Bucket = { category: IdleCuratedCategory | 'greet' | 'scared'; patterns: RegExp[] };

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
      /諗下|想想|思考|想想|或許|或许|可能|嗯+/,
      /考え|思う|かな|うーん/,
    ],
  },
  {
    category: 'dance',
    patterns: [
      /\b(dance|dancing|groove|party|hip[- ]?hop|jazz)\b/i,
      /跳舞|舞曲|熱舞|热舞|派對|派对/,
      /ダンス|踊/,
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

/** Category → curated clip id (first playable match). */
const CATEGORY_CLIP: Record<Bucket['category'] | IdleCuratedCategory, string> = {
  greet: 'lib_C25',
  think: 'Thinking',
  dance: 'lib_C113',
  scared: 'lib_C146',
  react: 'Cheer',
  breathe: 'IdleBreathCalm',
  look: 'LookAround',
  stretch: 'Relax',
  sing: 'IdleMixamoHappy',
  martial: 'lib_C121',
};

function pickFromList(seed: string, list: readonly string[]): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const playable = list.filter((id) => idleClipById(id));
  const pool = playable.length ? playable : [...BREATHING_CLIPS];
  const idx = Math.abs(h) % pool.length;
  return pool[idx]!;
}

function pickBreathingDefault(seed: string): string {
  return pickFromList(seed, BREATHING_CLIPS);
}

function pickChitchatDefault(seed: string): string {
  return pickFromList(seed, CHITCHAT_CLIPS);
}

function topEmotionCategory(hints: Record<string, number> | undefined): IdleCuratedCategory | null {
  if (!hints) return null;
  let best: { key: string; v: number } | null = null;
  for (const [key, v] of Object.entries(hints)) {
    if (v <= 0.35) continue;
    if (!best || v > best.v) best = { key, v };
  }
  if (!best) return null;
  const k = best.key.toLowerCase();
  if (k.includes('joy') || k.includes('happy') || k.includes('delight')) return 'sing';
  if (k.includes('sad') || k.includes('fear') || k.includes('anx')) return 'react';
  if (k.includes('anger') || k.includes('rage')) return 'react';
  if (k.includes('confus') || k.includes('think')) return 'think';
  if (k.includes('surprise')) return 'react';
  return null;
}

function matchBucket(text: string): Bucket['category'] | null {
  const t = text.trim();
  if (!t) return null;
  for (const bucket of KEYWORD_BUCKETS) {
    if (bucket.patterns.some((re) => re.test(t))) return bucket.category;
  }
  return null;
}

function clipForCategory(cat: Bucket['category'] | IdleCuratedCategory, seed: string): string {
  if (cat === 'breathe') return pickBreathingDefault(seed);
  if (cat === 'greet') return pickChitchatDefault(seed);
  const id = CATEGORY_CLIP[cat];
  if (id && idleClipById(id)) return id;
  if (cat === 'sing') return 'IdleMixamoHappy';
  if (cat === 'think') return 'Thinking';
  if (cat === 'react') return 'Cheer';
  if (cat === 'dance') return 'lib_C113';
  return pickBreathingDefault(seed);
}

function resolveFarewellWave(): string | null {
  return idleClipById(FAREWELL_WAVE_CLIP_ID) ? FAREWELL_WAVE_CLIP_ID : null;
}

export interface ChatAutoIdleInput {
  assistantText: string;
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
  const text = input.assistantText.trim();
  const seed = text || 'idle';

  if (isFarewellText(text)) {
    return resolveFarewellWave() ?? pickBreathingDefault(seed);
  }
  if (input.openGreet) {
    return pickChitchatDefault(seed);
  }

  const bucket = matchBucket(text);
  if (bucket) return clipForCategory(bucket, seed);
  const emo = topEmotionCategory(input.emotionHints);
  if (emo) return clipForCategory(emo, seed);
  const clip = pickBreathingDefault(seed);
  return idleClipById(clip) ? clip : 'IdleBreathCalm';
}
