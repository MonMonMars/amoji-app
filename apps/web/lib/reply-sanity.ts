// Heuristic gate for shaped companion replies. Catches empty reasoning-model
// garbage, wrong-language sludge, and template filler BEFORE the user sees it.
// Story mode and recipe/detail turns are exempt — those legitimately run longer.

const CJK = /[\u3400-\u9fff]/g;

const FILLER_EN =
  /(?:^|[\s,.!])((?:i'?m\s+)?always\s+here|everything\s+happens\s+for\s+a\s+reason|hope\s+this\s+helps|as\s+an?\s+ai\b[^.]{0,40})/i;
const FILLER_ZH = /一切都会好|我一直都在|作为\s*AI|希望帮到你|希望幫到你|祝您|加油[，,！!]/;

const META =
  /^(?:the\s+user|user\s+(?:asked|wants)|analysis|reasoning|plan)\b|^(?:分析|推理|用戶想|用户想)/i;

/** Extra system lines for a single quality retry. */
export const STRICT_REPLY_APPENDIX = `QUALITY RETRY: Your previous answer was unusable. Reply again NOW.
- Answer ONLY what the user just said — 1 to 3 short spoken sentences.
- No chain-of-thought, no scene monologue, no English mixed into Cantonese unless they used English.
- No vague comfort lines ("I'm always here", "everything happens for a reason", 一切都会好, 希望帮到你).
- Then the [emotion:{...}] line.`;

export interface SanityOpts {
  language?: string;
  lastUser?: string;
  detailed?: boolean;
  persona?: string;
}

function dense(text: string): string {
  return text.replace(/\s/g, '');
}

function expectsCjk(lang?: string): boolean {
  return !lang || lang === 'yue' || lang === 'zh' || lang === 'ja';
}

/** True when a finished, shaped reply should be rejected and retried once. */
export function replyLooksNonsense(shaped: string, opts?: SanityOpts): boolean {
  if (opts?.detailed) return false;
  const persona = opts?.persona ?? '';
  if (/STORY MODE|故事模式|ストーリーモード/i.test(persona)) return false;

  const t = shaped.trim();
  if (!t || t === '…') return true;

  const d = dense(t);
  if (d.length < 5 && !/^嗯/.test(t)) return true;

  if (FILLER_EN.test(t) || FILLER_ZH.test(t)) return true;
  if (META.test(t)) return true;

  const letters = (t.match(/[\p{L}\p{N}]/gu) ?? []).length;
  if (letters < 3 && d.length > 0) return true;

  const lang = opts?.language ?? 'yue';
  if (expectsCjk(lang) && d.length >= 10) {
    const cjkCount = (t.match(CJK) ?? []).length;
    if (cjkCount * 2 < d.length) return true;
  }

  if (lang === 'yue' && d.length >= 12) {
    if (/您|聊天|然后|虽然|因为/.test(t) && !/[嘅唔喎啦吓咩囉咋啫]/.test(t)) return true;
  }

  const user = opts?.lastUser ?? '';
  if (lang === 'yue' && !/[A-Za-z]{4,}/.test(user)) {
    const latin = (t.match(/[A-Za-z]/g) ?? []).length;
    if (latin > d.length * 0.35) return true;
  }

  return false;
}
