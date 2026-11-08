// Content-driven idle pick for /chat — no manual rail pins.
// Uses lightweight keyword buckets + emotionHints on the last assistant reply.

import { idleClipById } from './idle-clips';
import type { IdleCuratedCategory } from './idle-curated-rail';

const BREATHING_CLIPS = ['IdleBreathCalm', 'StandardIdle', 'IdleMixamoBreathing'] as const;

type Bucket = { category: IdleCuratedCategory | 'greet' | 'scared'; patterns: RegExp[] };

const KEYWORD_BUCKETS: readonly Bucket[] = [
  {
    category: 'greet',
    patterns: [
      /\b(hi|hello|hey|good\s+(morning|evening|night)|welcome)\b/i,
      /你好|您好|哈囉|嗨|早晨|晚安|歡迎|欢迎/,
      /こんにちは|こんばんは|おはよう|やあ|いらっしゃい/,
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
const CATEGORY_CLIP: Record<Bucket['category'], string> = {
  greet: 'HelloWave',
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

function pickBreathingDefault(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % BREATHING_CLIPS.length;
  return BREATHING_CLIPS[idx]!;
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
  const id = CATEGORY_CLIP[cat as Bucket['category']];
  if (id && idleClipById(id)) return id;
  if (cat === 'sing') return 'IdleMixamoHappy';
  if (cat === 'think') return 'Thinking';
  if (cat === 'react') return 'Cheer';
  if (cat === 'dance') return 'lib_C113';
  return pickBreathingDefault(seed);
}

export interface ChatAutoIdleInput {
  /** Last assistant line (primary signal). */
  assistantText: string;
  emotionHints?: Record<string, number>;
  /** When the brain is still generating. */
  thinking?: boolean;
}

/** Resolve a playable idle clip id, or null when nothing fits. */
export function resolveChatAutoIdle(input: ChatAutoIdleInput): string | null {
  if (input.thinking) {
    return idleClipById('Thinking') ? 'Thinking' : 'IdleBreathCalm';
  }
  const text = input.assistantText.trim();
  const seed = text || 'idle';
  const bucket = matchBucket(text);
  if (bucket) return clipForCategory(bucket, seed);
  const emo = topEmotionCategory(input.emotionHints);
  if (emo) return clipForCategory(emo, seed);
  const clip = pickBreathingDefault(seed);
  return idleClipById(clip) ? clip : 'IdleBreathCalm';
}
