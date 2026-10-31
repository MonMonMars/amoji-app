// Text that is safe to hand to TTS. Chat may show a lighter clean;
// every speak path must use cleanForSpeech so engines never read labels,
// markup, or the names of punctuation marks.
//
// Symbols (@ # $ % ^ & * and the like) are removed here. Commas, periods,
// and other pause marks stay in cleanForSpeech so clause splitters can
// still breathe — each synthesizer then calls stripVoicedGlyphs on the
// actual audio string so those glyphs are not spoken.

const EMOTION_WORD = /^(?:happy|happ(y|iness)|sad|sadness|angry|anger|joy|excited|excitement|fear|scared|smile|smiles|laughs?|giggles?|sighs?|cries|cry|whispers?|neutral|love|shy|embarrassed|thinking|thinks|grin|grins|nods?|winks?|微笑|大笑|笑|嘆氣|歎氣|開心|難過|生氣|害怕)$/i;

function stripStageDirections(s: string): string {
  return s
    .replace(/\[emotion:\{[^}]*\}\]/gi, ' ')
    .replace(/\[(?:emotion|mood|feeling|action)\s*:[^\]]*\]/gi, ' ')
    .replace(/\[([^[\]\n]{1,32})\]/g, (full, inner: string) => (EMOTION_WORD.test(inner.trim()) ? ' ' : full))
    .replace(/[（(]([^（）()\n]{1,24})[）)]/g, (full, inner: string) => (EMOTION_WORD.test(inner.trim()) ? ' ' : full))
    .replace(/\*([^*\n]{1,40})\*/g, (full, inner: string) => (EMOTION_WORD.test(inner.trim()) ? ' ' : full));
}

function stripMarkup(s: string): string {
  return s
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]+`/g, ' ')
    .replace(/<[^>\n]+>/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\{[^{}\n]{0,180}\}/g, ' ');
}

/** Display text: drop tags and code, keep normal punctuation for reading. */
export function cleanForDisplay(raw: string): string {
  const s = stripMarkup(stripStageDirections(raw))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return s;
}

// Glyphs engines read aloud as words ("at", "hash", "dollar", "percent"…).
// Apostrophes and in-word hyphens stay so "don't" / "well-known" still speak.
// ! and ? stay — they shape intonation and are not named.
const VOICED_SYMBOLS = /[@#＠＃$＄%％^＾&＆*＊+=~～〜_|\\/<>{}[\]()（）「」『』《》〈〉“”„‟«»•·※§¶†‡°`´]+/g;

// Pause glyphs some engines name ("comma", "period", "colon"). Decimal
// points between digits are protected so "3.14" stays a number.
const PAUSE_MARKS = /[.,，。、．;；:：…⋯—–―−]+/g;

function collapseSpaces(s: string): string {
  return s.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Drop symbols that TTS would pronounce. Pause marks are left in place. */
export function stripVoicedSymbols(raw: string): string {
  return collapseSpaces(raw.replace(VOICED_SYMBOLS, ' '));
}

/**
 * Audio string for the synthesizer. Symbols and pause glyphs are gone;
 * the caller keeps any breath break it already scheduled from the original
 * punctuation. No word is substituted for a symbol.
 */
export function stripVoicedGlyphs(raw: string): string {
  const decimals: string[] = [];
  let s = stripVoicedSymbols(raw).replace(/\d\.\d/g, (m) => {
    const token = `\uE000${decimals.length}\uE001`;
    decimals.push(m);
    return token;
  });
  s = s.replace(PAUSE_MARKS, ' ');
  s = s.replace(/\uE000(\d+)\uE001/g, (_, i: string) => decimals[Number(i)] ?? '');
  return collapseSpaces(s);
}

/**
 * Spoken text before clause splitting. Hyphens and ASCII full stops become
 * pause marks (not the words "hyphen" / "period" / "tilde"). Symbols are
 * already gone. Pause glyphs themselves are stripped later, at the synthesizer.
 */

/** t771: ban spoken hehe/haha/giggle tokens — laughs are CLIP_LIBRARY / playLaughSfx only. */
const LAUGH_TOKEN_RE = /\b(?:hehe|haha|ha\s*ha|heehee|hihi|giggle|giggling|teehee|tehee)\b|[哈呵嘻]{2,}|ふふ+|うふふ+|あはは+|えへへ+/gi;

export function stripLaughTokens(raw: string): string {
  return collapseSpaces(String(raw || '').replace(LAUGH_TOKEN_RE, ' '));
}

/** t773/t775/t777: strip hashtags, @handles, URLs, and common site chrome before TTS. */
const HASHTAG_RE = /#(?!\d+\b)[\w\u00C0-\u024F\u3400-\u9FFF]*[A-Za-z\u00C0-\u024F\u3400-\u9FFF][\w\u00C0-\u024F\u3400-\u9FFF]*/g;
const HANDLE_RE = /@[\w.\u00C0-\u024F\u3400-\u9FFF]+/g;
const WEB_URL_RE = /(?:https?:\/\/|www\.)\S+/gi;
const CHROME_RE = /\b(?:subscribe|sign up|read more|click here|share this|follow us|advertisement|sponsored|cookie policy|terms of (?:use|service)|all rights reserved)\b/gi;
const SOURCE_TAIL_RE = /\s*[|\u2013\u2014\-]\s*(?:Google News|Reuters|BBC(?: News)?|NPR|CNN|The Guardian|NHK|RTHK|SCMP|Bloomberg|AP(?: News)?|Yahoo(?: News)?|Wikipedia)\s*$/i;

export function sanitizeWebForSpeech(raw: string): string {
  let s = String(raw || '')
    .replace(WEB_URL_RE, ' ')
    .replace(HASHTAG_RE, ' ')
    .replace(HANDLE_RE, ' ')
    .replace(CHROME_RE, ' ')
    .replace(SOURCE_TAIL_RE, ' ');
  s = s.replace(/\s+[-|]\s+[A-Za-z][A-Za-z .]{1,40}$/g, ' ');
  return collapseSpaces(s);
}

export function cleanForSpeech(raw: string): string {
  // t773/t777: drop web chrome before TTS; t771: never speak laugh tokens.
  let s = sanitizeWebForSpeech(stripMarkup(stripStageDirections(raw)));
  s = s.replace(/\b(?:hyphen|dash|em dash|en dash|full stop|period|comma|semicolon|colon|tilde|ellipsis|exclamation(?: mark| point)?|question mark)\b/gi, ' ');
  s = s.replace(/\s*[—–―−]\s*/g, '，');
  s = s.replace(/\s+-\s+/g, '，');
  s = s.replace(/([\u3400-\u9fff])\s*\.\s*/g, '$1。');
  s = stripVoicedSymbols(s);
  s = stripLaughTokens(s);
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+([,.;!?，。！？])/g, '$1');
  return s;
}

/** True when the engine would have a word to say, not a lone mark. */
export function isSpeakableText(s: string): boolean {
  return /[\p{L}\p{N}]/u.test(s);
}

/** BCP-47 tag for a companion language. Short laughs must use this too — an unset lang makes the engine guess, then stick. */
export function speechLocale(lang: string): string {
  if (lang === 'yue') return 'zh-HK';
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'ja') return 'ja-JP';
  return 'en-US';
}

/**
 * Lead-tic deltas (giggle / gasp). Kept small: a short "haha" at +30% pitch
 * is a squeak, and some engines keep that rate for the next utterance.
 */
export function clampLeadProsody(pitch: number, rate: number): { pitch: number; rate: number } {
  return { pitch: clamp(pitch, -0.08, 0.08), rate: clamp(rate, -0.06, 0.06) };
}

/** Absolute browser pitch/rate. speechSynthesis past ~1.3 sounds sped up and can leak into the next line. */
export function clampBrowserProsody(pitch: number, rate: number): { pitch: number; rate: number } {
  return { pitch: clamp(pitch, 0.9, 1.18), rate: clamp(rate, 0.92, 1.12) };
}

/** Even tighter window for a chuckle, so the laugh sits next to the speaking voice. */
export function clampLaughDelivery(pitch: number, rate: number): { pitch: number; rate: number } {
  return { pitch: clamp(pitch, 0.96, 1.08), rate: clamp(rate, 0.96, 1.04) };
}

export interface SpokenLead {
  text: string;
  pitch: number;
  rate: number;
}

/**
 * A vocal tic safe to synthesize. Trailing bangs are dropped — on a one-word
 * laugh they make the engine yelp instead of chuckle. Empty / symbol-only
 * tics are dropped so nothing spells "exclamation mark".
 */
export function prepareSpokenLead(lead?: { text: string; pitch: number; rate: number } | null): SpokenLead | undefined {
  if (!lead) return undefined;
  const text = cleanForSpeech(lead.text).replace(/[!！]+$/g, '').trim();
  if (!isSpeakableText(text)) return undefined;
  const prosody = clampLeadProsody(lead.pitch, lead.rate);
  return { text, pitch: prosody.pitch, rate: prosody.rate };
}

/** Fold a lead into a single spoken string (Google TTS has no separate prosody tag). */
export function joinSpeechLead(lead: string, body: string, lang: string): string {
  const a = cleanForSpeech(lead).replace(/[!！]+$/g, '').trim();
  const b = cleanForSpeech(body);
  if (!isSpeakableText(a)) return b;
  if (!isSpeakableText(b)) return a;
  const cjk = lang === 'yue' || lang === 'zh' || lang === 'ja';
  if (/[，,。.!！?？、]$/.test(a)) return `${a}${cjk ? '' : ' '}${b}`.replace(/\s+/g, ' ').trim();
  return `${a}${cjk ? '，' : ', '}${b}`.replace(/\s+/g, ' ').trim();
}
