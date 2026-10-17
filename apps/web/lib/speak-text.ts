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
const VOICED_SYMBOLS = /[@#＠＃$＄%％^＾&＆*＊+=~～_|\\/<>{}[\]()（）「」『』《》〈〉“”„‟«»•·※§¶†‡°`´]+/g;

// Pause glyphs some engines name ("comma", "period", "colon"). Decimal
// points between digits are protected so "3.14" stays a number.
const PAUSE_MARKS = /[.,，。、．;；:：…—–―−]+/g;

function collapseSpaces(s: string): string {
  return s.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
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
 * pause marks (not the words "hyphen" / "period"). Symbols are already gone.
 * Pause glyphs themselves are stripped later, at the synthesizer.
 */
export function cleanForSpeech(raw: string): string {
  let s = stripMarkup(stripStageDirections(raw));
  s = s.replace(/\b(?:hyphen|dash|full stop|period|comma|semicolon|colon|exclamation|question mark)\b/gi, ' ');
  s = s.replace(/\s*[—–―−]\s*/g, '，');
  s = s.replace(/\s+-\s+/g, '，');
  s = s.replace(/([\u3400-\u9fff])\s*\.\s*/g, '$1。');
  s = stripVoicedSymbols(s);
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
