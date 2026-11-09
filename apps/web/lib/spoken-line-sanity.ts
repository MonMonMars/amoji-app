'use client';
// Spoken-line gate for idle / local TTS: reject unfinished fills, map nonsense,
// and rude "what are you thinking" interrogations before they reach the user.
import type { Lang } from './prefs';

export type SpokenGateMode = 'idle' | 'local';

export type SpokenGateOpts = {
  mode?: SpokenGateMode;
  lang?: Lang;
  n?: number;
  fallback?: string;
};

/** Pixel: never interrogate the user's private thoughts in idle / open / reengage. */
export function asksUserInnerThoughts(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (
    /what are you thinking/i.test(t) ||
    /\bare you thinking\b/i.test(t) ||
    /what(?:'s| is) on your mind/i.test(t) ||
    /penny for your thoughts/i.test(t) ||
    /in that head of yours/i.test(t) ||
    /going on in that head/i.test(t) ||
    /quiet thought right now/i.test(t) ||
    /one thing on your mind/i.test(t) ||
    /tell me what(?:'s| is) on your mind/i.test(t)
  ) {
    return true;
  }
  if (
    /你諗緊咩/.test(t) ||
    /心入面諗緊咩/.test(t) ||
    /你個腦而家轉緊咩/.test(t) ||
    /你在想什么/.test(t) ||
    /你在想什麼/.test(t) ||
    /心里面在想什么/.test(t) ||
    /脑子里现在转着什么/.test(t) ||
    /今[、,]?\s*何を考えてる/.test(t) ||
    /なに考えてる/.test(t) ||
    /何か考えてることある/.test(t) ||
    /頭の中で何が/.test(t)
  ) {
    return true;
  }
  return false;
}

/** Unfinished templates, empty scrap, or known Pixel map-fragment bugs. */
export function spokenLineLooksBroken(line: string, _opts?: { mode?: SpokenGateMode }): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/\{[a-zA-Z_]+\}/.test(trimmed)) return true;
  if (/\ba small map reminding you\b/i.test(trimmed)) return true;
  if (/\ba tiny map reminded me of you\b/i.test(trimmed)) return true;
  if (/提醒我你/.test(trimmed)) return true;
  if (/轻轻提醒我想起你/.test(trimmed)) return true;
  if (/\ba\s{2,}\w/i.test(trimmed)) return true;
  if (/^\s*reminding you\b/i.test(trimmed)) return true;
  return false;
}

const SAFE_IDLE: Record<Lang, readonly string[]> = {
  en: [
    'Still here with you in this quiet stretch.',
    'Soft company, no rush — I am nearby.',
    'Keeping the mood gentle while we linger.',
  ],
  yue: [
    '仲喺度陪住你呢段靜。',
    '輕輕陪住，唔使急。',
    '呢段靜我陪住你。',
  ],
  zh: [
    '还在这里陪着你这段安静。',
    '轻轻陪着，不用急。',
    '这段安静我陪着你。',
  ],
  ja: [
    'この静けさの中で、まだそばにいるよ。',
    '急がなくていい。やさしくそばにいるね。',
    '静かなまま、そばにいるよ。',
  ],
};

export function safeIdleFallback(lang: Lang, n = 0): string {
  const bank = SAFE_IDLE[lang] ?? SAFE_IDLE.en;
  return bank[Math.abs(n) % bank.length]!;
}

/**
 * Reject broken / thought-interrogating lines. Idle mode may substitute
 * `fallback` or a language-safe statement; other modes return undefined.
 */
export function gateSpokenLine(line: string, opts?: SpokenGateOpts): string | undefined {
  const mode = opts?.mode ?? 'local';
  const trimmed = line.trim();
  const bad =
    spokenLineLooksBroken(trimmed, { mode }) ||
    (mode === 'idle' && asksUserInnerThoughts(trimmed));
  if (!bad) return trimmed || undefined;
  if (mode === 'idle') {
    const fb = (opts?.fallback ?? safeIdleFallback(opts?.lang ?? 'en', opts?.n ?? 0)).trim();
    if (!fb || spokenLineLooksBroken(fb) || asksUserInnerThoughts(fb)) {
      return safeIdleFallback(opts?.lang ?? 'en', opts?.n ?? 0);
    }
    return fb;
  }
  return undefined;
}
