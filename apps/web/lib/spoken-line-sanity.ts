// Spoken-line sanity gate for local TTS (idle + sayLocal).
// Catches unfinished templates, truncated English, memory-scrap fragments,
// and rude empty interrogations BEFORE they hit speak()/history.
// Source banks are cleaned too — this gate is the durable backstop.

import type { Lang } from './prefs';

export type SpokenGateMode = 'local' | 'idle';

export interface SpokenGateOpts {
  /** idle = also ban empty "what are you thinking" interrogations */
  mode?: SpokenGateMode;
  lang?: string;
}

/** Known-good statement fallbacks when a candidate fails the gate. */
export const SAFE_IDLE_FALLBACK: Record<Lang, readonly string[]> = {
  en: [
    'Still here with you in this quiet stretch.',
    'Holding this soft moment with you.',
    'Same page as you. The quiet suits us.',
  ],
  yue: [
    '仲喺度陪住你呢段靜。',
    '輕輕留住呢個柔軟時刻。',
    '同你同一頁。呢段靜好襯。',
  ],
  zh: [
    '还在这里陪着你这段安静。',
    '轻轻留着这个柔软时刻。',
    '和你同一页。这段安静很衬。',
  ],
  ja: [
    'この静けさの中で、まだそばにいるよ。',
    'やわらかい時間を、そっと一緒に置いておくね。',
    '同じページにいる。この静けさが似合ってる。',
  ],
};

/**
 * Hard-banned idle interrogations (rude / often empty).
 * Merged from idle-no-thinking-ask + idle-nonsense-map-line tips.
 */
const BANNED_IDLE_ASK =
  /what\s+are\s+you\s+thinking\b|what\s+shall\s+we\s+think\s+about\b|what(?:'s|\s+is)\s+on\s+your\s+mind\b|what'?s\s+your\s+quiet\s+thought\b|quiet\s+thought\s+right\s+now\b|penny\s+for\s+your\s+thoughts\b|are\s+you\s+thinking\b|in\s+that\s+head\s+of\s+yours\b|going\s+on\s+in\s+that\s+head\b|one\s+thing\s+on\s+your\s+mind\b|tell\s+me\s+what(?:'s|\s+is)\s+on\s+your\s+mind\b|心入面諗緊咩|你諗緊咩|你個腦而家轉緊咩|你心入面而家得咩|你而家嘅安靜諗法|今日我哋諗咩好|你在想什么|你在想什麼|心里面在想什么|脑子里现在转着什么|心里现在只有哪一件|你现在的安静想法|今天我们想点什么好|今なに考えてる|なに考えてる|何か考えてることある|今[、,]?\s*何を考えてる|今日は何を考えよう|今一番頭にあるのは何|頭の中で何が/i;

/**
 * Half-sentence / motif-fill leftovers that shipped as spoken lines.
 * Includes the Pixel "a small map reminding you" class of fragments.
 */
const BROKEN_FRAGMENT =
  /\ba\s+small\s+map\s+reminding\s+you\b|\ba\s+tiny\s+map\s+reminded(?:\s+me\s+of\s+you)?\b|\ba\s+tiny\s+map\s+is\s+small\b|\ba\s+pocket\s+map\s+reminding\s+you\b|\breminding\s+you\s*[.…]*\s*$|\breminded\s+me\s+of\s*$|A\s+little\s+maps\s+feels\b|Um,\s+maps\s+makes\b|^maps\s+is\b|提醒我你|轻轻提醒我想起你|輕輕提醒我你/i;

const UNFINISHED_EN =
  /\b(?:reminding|reminded|about|of|to|for|with|and|or|the|a|an|is|are|was|were|like)\s*[.…]*\s*$/i;

const CJK = /[\u3400-\u9fff]/;

function dense(text: string): string {
  return text.replace(/\s+/g, '');
}

function asLang(lang?: string): Lang {
  if (lang === 'yue' || lang === 'zh' || lang === 'ja' || lang === 'en') return lang;
  return 'en';
}

/** Pixel: never interrogate the user's private thoughts in idle / open / reengage. */
export function asksUserInnerThoughts(line: string): boolean {
  const t = (line ?? '').trim();
  if (!t) return false;
  return BANNED_IDLE_ASK.test(t);
}

/** True when a candidate must not be spoken. */
export function spokenLineLooksBroken(text: string, opts?: SpokenGateOpts): boolean {
  const t = (text ?? '').trim();
  if (!t || t === '…' || t === '...') return true;
  if (/\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(t)) return true;
  if (BROKEN_FRAGMENT.test(t)) return true;

  const d = dense(t);
  const hasCjk = CJK.test(t);
  if (hasCjk) {
    if (d.length < 4) return true;
  } else if (d.length < 12) {
    return true;
  }

  if (/\s{2,}/.test(t)) return true;
  if (/^(?:of|to|for|with|and|or|the|a|an)\b/i.test(t)) return true;
  if (!hasCjk && UNFINISHED_EN.test(t) && t.split(/\s+/).length < 8) return true;
  if ((opts?.mode ?? 'local') === 'idle' && asksUserInnerThoughts(t)) return true;
  return false;
}

/** Pick a safe known-good idle statement. */
export function safeIdleFallback(lang?: string, n = 0): string {
  const L = asLang(lang);
  const bank = SAFE_IDLE_FALLBACK[L] ?? SAFE_IDLE_FALLBACK.en;
  return bank[((n % bank.length) + bank.length) % bank.length]!;
}

/** Gate a local spoken line; idle mode falls back to a known-good statement. */
export function gateSpokenLine(
  text: string,
  opts?: SpokenGateOpts & { n?: number; fallback?: string },
): string | undefined {
  const mode = opts?.mode ?? 'local';
  const candidate = (text ?? '').trim();
  if (!spokenLineLooksBroken(candidate, { ...opts, mode })) return candidate;

  const fb = (opts?.fallback ?? (mode === 'idle' ? safeIdleFallback(opts?.lang, opts?.n ?? 0) : '')).trim();
  if (fb && !spokenLineLooksBroken(fb, { mode: 'local', lang: opts?.lang }) && !asksUserInnerThoughts(fb)) {
    return fb;
  }
  if (mode === 'idle') {
    const en = SAFE_IDLE_FALLBACK.en[0]!;
    return spokenLineLooksBroken(en, { mode: 'local' }) || asksUserInnerThoughts(en) ? undefined : en;
  }
  return undefined;
}
