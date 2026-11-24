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
// What the endpoint rejects (re-measured 2026-11-24, one variable at a time,
// voice zh-HK-HiuMaanNeural — the earlier table below was an over-attribution):
//   volume='+0.0dB'              FATAL. `1007 … SSML parsing error: 0x80045003`.
//                                Every other attribute of the same clause is
//                                fine; `volume='+0%'` is fine.
//   <speak> without xml:lang     closed 1007
//   no <voice name='…'>          empty turn (nothing to speak with)
//   <mstts:express-as …>         ACCEPTED (measured 200 + audio, zh and styledegree)
//   <break time='…'/>            ACCEPTED (measured 200 + audio)
//   <prosody> pitch/rate         ACCEPTED
//   xmlns:mstts declaration      ACCEPTED on its own (harmless)
//
// The volume finding is the one that matters for this app: `apps/web`'s
// `db()` helper renders prosody volume as `±N.NdB`, which is attached to
// EVERY spoken clause, so every line was refused while pitch and rate — the
// only things anyone thought to test in isolation — were never the problem.
//
// One defect is invisible in the markup: a UTF-8 BOM (or any leading
// whitespace) before `<speak>`. The endpoint's .NET reader parses the body as
// XML and reports it as `1007: Data at the root level is invalid. Line 1,
// position 1.` — the same close code it uses for genuinely fatal markup, so a
// BOM looks exactly like a broken voice. `stripLeadingJunk` removes it before
// the body is relayed, which makes the proxy safe for `curl --data-binary @f`
// callers whose shell tooling wrote the file with a BOM.
//
// So a relay can repair a body without losing the chosen voice or the
// prosody contour: unwrap express-as, drop breaks, and default xml:lang
// from the voice name. `worker.js` retries with the repaired body only
// AFTER the verbatim body produced no audio, so healthy requests are
// relayed byte-for-byte.

/** `<mstts:express-as …>…</mstts:express-as>` → `…` (unwrapped when present). */
const EXPRESS_AS_OPEN = /<mstts:express-as\b[^>]*>/gi;
const EXPRESS_AS_CLOSE = /<\/mstts:express-as\s*>/gi;
/** `<break …/>` and `<break …>…</break>` are dropped when present. */
const BREAK_SELF_CLOSING = /<break\b[^>]*\/>/gi;
const BREAK_PAIRED = /<break\b[^>]*>[\s\S]*?<\/break\s*>/gi;

/** `volume='+0.0dB'` — the one attribute that fails the whole utterance. */
const VOLUME_DB = /\bvolume\s*=\s*(["'])\s*([+-]?\d+(?:\.\d+)?)\s*dB\s*\1/gi;

/**
 * Rewrite a prosody `volume` given in decibels to the percentage form the
 * endpoint accepts. `0 dB` → `+0%`, `+6 dB` → `+100%`, `-6 dB` → `-50%`.
 *
 * The endpoint's SSML parser rejects `volume='…dB'` outright with
 * `1007 … SSML parsing error: 0x80045003`, while the identical clause using
 * `volume='…%'` synthesizes normally — so this is a unit conversion, not a
 * style change: the loudness contour the caller asked for is preserved.
 */
export function repairVolume(ssml) {
  return ssml.replace(VOLUME_DB, (whole, quote, raw) => {
    const decibels = Number(raw);
    if (!Number.isFinite(decibels)) return whole;
    // SSML forbids volume below -100%; leave headroom above +100% for a lift.
    const percent = Math.round((10 ** (decibels / 20) - 1) * 100);
    const clamped = Math.max(-100, Math.min(200, percent));
    return `volume=${quote}${clamped >= 0 ? '+' : ''}${clamped}%${quote}`;
  });
}

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
 * Strip a leading BOM and any whitespace before the XML declaration or
 * `<speak>`. The endpoint's .NET XML reader rejects either with
 * `1007: Data at the root level is invalid. Line 1, position 1.`
 */
export function stripLeadingJunk(ssml) {
  return String(ssml).replace(/^(?:\uFEFF|\uFFFE|[\s\u0000]+)+/, '');
}

/**
 * Repair the markup this endpoint is known to reject, keeping the voice and
 * every `<prosody>` contour. Idempotent: a body that is already clean comes
 * back identical, so callers can compare `sanitizeSsml(ssml) !== ssml`.
 */
export function sanitizeSsml(ssml) {
  return ensureXmlLang(
    repairVolume(stripLeadingJunk(ssml)).replace(EXPRESS_AS_OPEN, '').replace(EXPRESS_AS_CLOSE, '').replace(BREAK_SELF_CLOSING, '').replace(BREAK_PAIRED, ''),
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
