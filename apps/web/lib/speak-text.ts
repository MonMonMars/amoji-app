// Text that is safe to hand to TTS. Chat may show a lighter clean;
// every speak path must use cleanForSpeech so engines never read labels,
// markup, or the names of punctuation marks.

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

/**
 * Spoken text. Hyphens and ASCII full stops are pauses, not words
 * ("hyphen", "period", "full stop"). CJK lines use a Chinese comma / period
 * so neural voices do not spell the mark.
 */
export function cleanForSpeech(raw: string): string {
  let s = stripMarkup(stripStageDirections(raw));
  s = s.replace(/\b(?:hyphen|dash|full stop|period|comma|semicolon|colon)\b/gi, ' ');
  s = s.replace(/\s*[—–―−]\s*/g, '，');
  s = s.replace(/\s+-\s+/g, '，');
  s = s.replace(/([\u3400-\u9fff])\s*\.\s*/g, '$1。');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
