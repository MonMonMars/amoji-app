// SSML defects and repair for Microsoft's free Edge read-aloud endpoint.
//
// Measured 2026-11-24 against speech.platform.bing.com, with both the
// reference client (edge-tts 7.3.1, `python rawdump.py`) and this Worker.
// The endpoint reports nothing useful for a body it dislikes: the socket
// opens (101), `Path:turn.start` arrives, and then it either
//
//   • closes with code 1007 + a reason ("Unsupported voice …"), or
//   • sends `Path:turn.end` after ZERO audio frames.
//
// Both surface to the app as an undiagnosable "no audio from upstream",
// which is what made the r135 proxy look broken while the socket was fine.
//
// What the endpoint rejects (all measured, all 0 audio):
//   <mstts:express-as …>         rejected even with no style/styledegree
//   <break time='…'/>            rejected; the whole utterance is dropped
//   <speak> without xml:lang     closed 1007
//   no <voice name='…'>          empty turn (nothing to speak with)
//   <prosody> nested/siblings    ACCEPTED — pitch/rate/volume all fine
//   xmlns:mstts declaration      ACCEPTED on its own (harmless)
//
// So a relay can repair a body without losing the chosen voice or the
// prosody contour: unwrap express-as, drop breaks, and default xml:lang
// from the voice name. `worker.js` retries with the repaired body only
// AFTER the verbatim body produced no audio, so healthy requests are
// relayed byte-for-byte.

/** `<mstts:express-as …>…</mstts:express-as>` → `…` (element itself is fatal). */
const EXPRESS_AS_OPEN = /<mstts:express-as\b[^>]*>/gi;
const EXPRESS_AS_CLOSE = /<\/mstts:express-as\s*>/gi;
/** `<break …/>` and `<break …>…</break>` are both fatal; audio needs neither. */
const BREAK_SELF_CLOSING = /<break\b[^>]*\/>/gi;
const BREAK_PAIRED = /<break\b[^>]*>[\s\S]*?<\/break\s*>/gi;

/**
 * Add `xml:lang` to `<speak>` when it is missing, derived from the first
 * `<voice name='zh-HK-WanLungNeural'>` (`zh-HK`). Returns `ssml` unchanged
 * when `<speak>` already declares a language or no voice name is found.
 */
export function ensureXmlLang(ssml) {
  const open = /<speak\b[^>]*>/i.exec(ssml);
  if (!open) return ssml;
  if (/\bxml:lang\s*=/i.test(open[0])) return ssml;
  const voice = /<voice\b[^>]*\bname\s*=\s*["']([^"']+)["']/i.exec(ssml);
  const lang = voice?.[1].match(/^([a-z]{2,3}-[A-Za-z0-9]+)/)?.[1];
  if (!lang) return ssml;
  const patched = open[0].replace(/>\s*$/, ` xml:lang='${lang}'>`);
  return ssml.slice(0, open.index) + patched + ssml.slice(open.index + open[0].length);
}

/**
 * Repair the markup this endpoint is known to reject, keeping the voice and
 * every `<prosody>` contour. Idempotent: a body that is already clean comes
 * back identical, so callers can compare `sanitizeSsml(ssml) !== ssml`.
 */
export function sanitizeSsml(ssml) {
  return ensureXmlLang(
    ssml.replace(EXPRESS_AS_OPEN, '').replace(EXPRESS_AS_CLOSE, '').replace(BREAK_SELF_CLOSING, '').replace(BREAK_PAIRED, ''),
  );
}

/**
 * Turn what the upstream actually did into the sentence the app shows on
 * ▶ Test. Replaces the old, unactionable "no audio from upstream".
 *
 * @param {{ closeCode?: number|null, closeReason?: string|null, sawTurnEnd?: boolean, paths?: string[] }} how
 */
export function describeUpstreamFailure({ closeCode = null, closeReason = null, sawTurnEnd = false, paths = [] } = {}) {
  const reason = (closeReason ?? '').trim();
  if (sawTurnEnd) {
    const seen = [...new Set(paths)].filter(Boolean).join(', ');
    return `upstream ended the turn with no audio${seen ? ` (frames: ${seen})` : ''}`;
  }
  if (typeof closeCode === 'number' && closeCode !== 1000 && closeCode !== 1005) {
    return `upstream closed ${closeCode}${reason ? `: ${reason}` : ''}`;
  }
  return `upstream closed before any audio${reason ? `: ${reason}` : ''}`;
}
