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
    'I just stretched my shoulders — feels nice.',
    'I am right here with you — take your time.',
    'We can sit with what you said, or pick a small new thing later.',
  ],
  yue: [
    '我啱啱伸咗下膊頭——舒服咗少少。',
    '我喺度陪住你——唔使急。',
    '可以繼續你頭先講嗰樣，或者一陣再揀件小事。',
  ],
  zh: [
    '我刚伸了伸肩膀——舒服一点了。',
    '我在这里陪着你——不用着急。',
    '可以继续你刚才说的那件事，或者等会儿再挑件小事。',
  ],
  ja: [
    '肩を伸ばしたばかり——ちょっと楽。',
    'ここにいるよ——急がなくていい。',
    'さっきの話のままでもいいし、あとで小さな話題でもいいよ。',
  ],
};

/** Hard-banned idle interrogations (rude / often empty). */
const BANNED_IDLE_ASK =
  /what\s+are\s+you\s+thinking\b|what\s+shall\s+we\s+think\s+about\b|what'?s\s+on\s+your\s+mind\b|what\s+is\s+on\s+your\s+mind\b|what'?s\s+your\s+quiet\s+thought\b|quiet\s+thought\s+right\s+now\b|penny\s+for\s+your\s+thoughts\b|are\s+you\s+thinking\b|what'?s\s+going\s+on\s+in\s+that\s+head\b|in\s+that\s+head\s+of\s+yours\b|one\s+thing\s+on\s+your\s+mind\b|tell\s+me\s+what(?:'s|\s+is)\s+on\s+your\s+mind\b|心入面諗緊咩|你諗緊咩|你個腦而家轉緊咩|你心入面而家得咩|你而家嘅安靜諗法|今日我哋諗咩好|你在想什么|你在想什麼|心里面在想什么|脑子里现在转着什么|心里现在只有哪一件|你现在的安静想法|今天我们想点什么好|今なに考えてる|なに考えてる|何か考えてることある|今[、,]?\s*何を考えてる|今日は何を考えよう|今一番頭にあるのは何|頭の中で何が/i;

/** Pixel: never interrogate the user's private thoughts in idle / open / reengage. */
export function asksUserInnerThoughts(line: string): boolean {
  const t = (line ?? '').trim();
  if (!t) return false;
  return BANNED_IDLE_ASK.test(t);
}

/**
 * Pixel: never ask to “continue last time / pick up where we left off”.
 * History is kept silently; only the user may bring it up.
 */
const BANNED_HISTORY_RESUME_ASK =
  /\blast\s+time\s+we\s+(?:were\s+)?talking\b|\bpick\s+(?:it\s+)?(?:back\s+)?up\b.*\b(?:left\s+off|where)\b|\bpick\s+up\s+where\s+we\s+left\s+off\b|\bcontinue\s+(?:our\s+)?(?:talk|chat|conversation|thread)\b|\bcontinue\s+(?:the\s+)?(?:previous|last|earlier)\b|\bwhere\s+we\s+left\s+off\b|\bwant\s+to\s+pick\s+it\s+back\s+up\b|上次傾開|繼續嗰個話題|继续那个话题|继续刚才的话题|繼續之前個話題|我們繼續聊好嗎|我们继续聊好吗|我哋繼續傾好嗎|続きをし|さっきの話、続き|前回は「|続き、話す|Shall we continue the chat/i;

export function asksToResumeHistory(line: string): boolean {
  const t = (line ?? '').trim();
  if (!t) return false;
  return BANNED_HISTORY_RESUME_ASK.test(t);
}

/**
 * Presence nags that sound like "are you still there?" after silence.
 * Idle / reengage should offer a concrete topic instead.
 */
const BANNED_PRESENCE_NAG =
  /you'?ve\s+gone\s+quiet\b|are\s+you\s+still\s+there\b|still\s+there\s*\?|did\s+you\s+walk\s+away\b|it'?s\s+been\s+a\s+minute[.…]*\s*still\s+here\b|still\s+here\s+if\s+you\s+want\s+company\b|i'?ll\s+be\s+right\s+here\s+whenever\s+you'?re\s+back\b|你靜咗喎|好耐冇聲喎|你安静下来了|好一会儿没声音|静かになっちゃった|しばらく無音|仲喺度陪住你呢段靜|还在这里陪着你这段安静|この静けさの中で、まだそばにいる/i;

export function asksPresenceNag(line: string): boolean {
  const t = (line ?? '').trim();
  if (!t) return false;
  return BANNED_PRESENCE_NAG.test(t);
}

/**
 * Half-sentence / motif-fill leftovers that shipped as spoken lines.
 * Includes the Pixel "a small map reminding you" class of fragments.
 */
const BROKEN_FRAGMENT =
  /\ba\s+small\s+map\s+reminding\s+you\b|\ba\s+tiny\s+map\s+reminded(?:\s+me\s+of\s+you)?\b|\ba\s+tiny\s+map\s+is\s+small\b|\ba\s+pocket\s+map\s+reminding\s+you\b|\breminding\s+you\s*[.…]*\s*$|\breminded\s+me\s+of\s*$|A\s+little\s+maps\s+feels\b|Um,\s+maps\s+makes\b|^maps\s+is\b|提醒我你|轻轻提醒我想起你|輕輕提醒我你/i;

/** Metaphor-sludge idle fills: "friendly riddle is charged / voltage / tiny burst". */
const BROKEN_METAPHOR_SLUDGE =
  /充滿電|充满电|電壓感覺友善|电压感觉友善|細爆發|小爆发|短短.{0,8}爆發|短短.{0,8}爆发|is charged and ready|voltage feels friendly|tiny burst|充電済み|電圧は友好|小さなバースト|短い.{0,8}バースト|soul\s+thread|energy\s+field\s+hums|cosmic\s+whisper|nexus\s+of\s+(?:feelings?|vibes?)|wavelength\s+of\s+(?:your\s+)?heart|quantum\s+vibes?|vibe\s+resonance|aura\s+sync/i;

/** Meta topic-narration sludge ("holding this topic / same thread") — not real talk. */
const BROKEN_META_TOPIC =
  /still\s+on\s+that\s+thread\b|holding\s+the\s+same\s+topic\b|holding\s+this\s+soft\s+moment\b|same\s+page\s+as\s+you\b|keeping\s+your\s+subject\s+warm\b|we\s+can\s+keep\s+walking\s+the\s+path\s+you\s+started\b|仲喺你呢條話題度|輕輕留住同一個主題|輕輕留住呢個柔軟時刻|同你同一頁|你提起嘅嘢我仲放喺枱上面暖住|还在你这条话题上|轻轻留着同一个主题|轻轻留着这个柔软时刻|和你同一页|你提起的事我还放在桌上暖着|まだその話の途中|同じ話題をそっと置いたまま|同じページにいる|あなたが出した話題を、あたたかく|やわらかい時間を、そっと一緒に/i;

/** Opaque / invented vocab with no clear meaning for the listener. */
const BROKEN_OPAQUE_VOCAB =
  /\b(?:vibronic|chrono\s+feelings?|soul\s+frequency|manifest(?:ing)?\s+abundance|quantum\s+vibes?|vibe\s+resonance|aura\s+sync)\b|(?:個|的|の)vibe\b|オーラ同期|量子バイブス|灵魂频率|靈魂頻率|量子\s*vibes?/i;

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

/** True when a candidate must not be spoken. */
export function spokenLineLooksBroken(text: string, opts?: SpokenGateOpts): boolean {
  const t = (text ?? '').trim();
  if (!t || t === '…' || t === '...') return true;
  if (/\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(t)) return true;
  if (BROKEN_FRAGMENT.test(t)) return true;
  if (BROKEN_METAPHOR_SLUDGE.test(t)) return true;
  if (BROKEN_META_TOPIC.test(t)) return true;
  if (BROKEN_OPAQUE_VOCAB.test(t)) return true;

  const d = dense(t);
  const hasCjk = CJK.test(t);
  if (hasCjk) {
    if (d.length < 4) return true;
  } else if (d.length < 12) {
    return true;
  }

  if (/\s{2,}/.test(t)) return true;
  // Leading article/preposition scraps ("a  pause", "of you") — not finished
  // sentences that legitimately start with "a pocket map …".
  if (/^(?:of|to|for|with|and|or|the|a|an)\b/i.test(t)) {
    const words = t.split(/\s+/).filter(Boolean).length;
    if (words < 6 || /^(?:of|to|for|with|and|or|the|a|an)\s*[.…]*$/i.test(t)) return true;
  }
  if (!hasCjk && UNFINISHED_EN.test(t) && t.split(/\s+/).length < 8) return true;
  if ((opts?.mode ?? 'local') === 'idle' && asksUserInnerThoughts(t)) return true;
  if ((opts?.mode ?? 'local') === 'idle' && asksPresenceNag(t)) return true;
  // Local + idle: never volunteer “continue last time” — history is quiet.
  if (asksToResumeHistory(t)) return true;
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
  if (fb && !spokenLineLooksBroken(fb, { mode: 'local', lang: opts?.lang })) return fb;
  if (mode === 'idle') {
    const en = SAFE_IDLE_FALLBACK.en[0]!;
    return spokenLineLooksBroken(en, { mode: 'local' }) ? undefined : en;
  }
  return undefined;
}
