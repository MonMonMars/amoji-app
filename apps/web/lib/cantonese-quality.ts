// Post-shape cleanup for Hong Kong Cantonese — blocks written-Mandarin and
// assistant-template phrasing DimDik persona.js forbids (作為 AI, bullet lists…).

const WHOLE_LINE_RE = [
  /^作為\s*AI/m,
  /^作為\s*人工智能/m,
  /^您好[,，]?\s*我(?:是|係)/m,
  /^首先/m,
  /^其次/m,
  /^最後/m,
  /^最后/m,
  /^總結/m,
  /^总结/m,
  /^希望(?:可以)?幫到你/m,
  /^希望(?:可以)?帮到你/m,
  /^你可以嘗試以下/m,
  /^你可以尝试以下/m,
];

const INLINE_RE = [
  /作為\s*AI[^。！？\n]*/gu,
  /作為\s*人工智能[^。！？\n]*/gu,
  /希望(?:可以)?幫到你[^。！？\n]*/gu,
  /希望(?:可以)?帮到你[^。！？\n]*/gu,
];

/** Markdown / numbered bullet runs the companion must never speak aloud. */
const BULLET_BLOCK = /(?:^|\n)\s*(?:[-•·]|\d{1,2}[.)、])\s+\S[^\n]*(?:\n\s*(?:[-•·]|\d{1,2}[.)、])\s+\S[^\n]*)+/gu;

function dropBadLines(text: string): string {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const kept = lines.filter((line) => !WHOLE_LINE_RE.some((re) => re.test(line)));
  return (kept.length ? kept.join('\n') : lines[0] ?? '').trim();
}

function dropBadSentences(text: string): string {
  const chunks = text
    .split(/(?<=[。！？!?])\s*/u)
    .map((s) => s.trim())
    .filter(Boolean);
  const kept = chunks.filter(
    (s) =>
      !WHOLE_LINE_RE.some((re) => re.test(s))
      && !/^\d{1,2}[.)、]\s/.test(s)
      && !/^[-•·]\s/.test(s),
  );
  return (kept.length ? kept.join('') : chunks[chunks.length - 1] ?? text).trim();
}

/** Strip DimDik-forbidden patterns; no-op on non-Cantonese-looking text. */
export function polishCantoneseReply(text: string): string {
  let s = text.replace(BULLET_BLOCK, ' ').trim();
  s = dropBadLines(s);
  s = dropBadSentences(s);
  for (const re of INLINE_RE) s = s.replace(re, '');
  s = s.replace(/\d{1,2}[.)、]\s[^。！？\n]+/gu, '');
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}
