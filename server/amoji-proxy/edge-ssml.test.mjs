// Regression tests for the readaloud quirks the worker now repairs.
//
// Run: node --test server/amoji-proxy/edge-ssml.test.mjs
//
// Every case here is a measured upstream behaviour (see edge-ssml.js), not a
// guess: each one used to end as the app's "no audio from upstream".

import test from 'node:test';
import assert from 'node:assert/strict';

import { describeUpstreamFailure, ensureXmlLang, repairVolume, sanitizeSsml, stripLeadingJunk } from './edge-ssml.js';

const SPEAK_OPEN = '<speak version=\'1.0\' xmlns=\'http://www.w3.org/2001/10/synthesis\'>';

test('repairVolume converts the dB volume the app emits into a percentage', () => {
  // apps/web/lib/edge-tts.ts: `const db = (n) => `${n >= 0 ? '+' : ''}${(n * 8).toFixed(1)}dB``
  // and every prosody clause carries `volume='${db(vol)}'`. Measured against
  // the live endpoint: `volume='+0.0dB'` → 1007 "SSML parsing error:
  // 0x80045003"; the same clause with `volume='+0%'` → 200 + audio.
  assert.equal(repairVolume("<prosody volume='+0.0dB'>你好</prosody>"), "<prosody volume='+0%'>你好</prosody>");
  assert.equal(repairVolume('<prosody volume="-0.0dB">x</prosody>'), '<prosody volume="+0%">x</prosody>');
  // +6 dB is exactly double amplitude → +100%.
  assert.equal(repairVolume('<prosody volume="+6dB">x</prosody>'), '<prosody volume="+100%">x</prosody>');
  // -6 dB is half amplitude → -50%, and -100% is the SSML floor.
  assert.equal(repairVolume("<prosody volume='-6dB'>x</prosody>"), "<prosody volume='-50%'>x</prosody>");
  // -40 dB is 1% amplitude → -99%; -60 dB rounds past it and clamps at the SSML floor.
  assert.equal(repairVolume("<prosody volume='-40dB'>x</prosody>"), "<prosody volume='-99%'>x</prosody>");
  assert.equal(repairVolume("<prosody volume='-60dB'>x</prosody>"), "<prosody volume='-100%'>x</prosody>");
});

test('repairVolume leaves a percentage volume and unrelated text alone', () => {
  const ok = "<prosody pitch='+2%' rate='+4%' volume='+0%'>你好</prosody>";
  assert.equal(repairVolume(ok), ok, 'a percentage body is untouched');
  const chatter = "the reading was 3dB down, volume=' not an attribute";
  assert.equal(repairVolume(chatter), chatter);
});

test('sanitizeSsml repairs the app\'s exact styled clause end to end', () => {
  // Verbatim shape from buildEdgeSsml for a styled zh line: clause volume in
  // dB, a <break>, and an <mstts:express-as> wrapper.
  const appBody =
    `${SPEAK_OPEN.replace(/>$/, " xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='zh-HK'>")}` +
    "<voice name='zh-HK-HiuMaanNeural'>" +
    "<prosody pitch='+2%' rate='+4%' volume='+0.0dB'>今日好開心。</prosody>" +
    "<break time='220ms'/>" +
    "<mstts:express-as style='cheerful' styledegree='1.20'>" +
    "<prosody pitch='+4%' rate='+2%' volume='+1.6dB'>我見到你就想笑。</prosody>" +
    '</mstts:express-as></voice></speak>';
  const out = sanitizeSsml(appBody);
  assert.ok(!/dB/.test(out), 'no dB volume survives');
  assert.ok(!out.includes('<break'), 'break is dropped');
  assert.ok(!out.includes('express-as'), 'express-as is unwrapped');
  assert.ok(out.includes("volume='+0%'") && out.includes("volume='+20%'"), 'volume became a percentage');
  assert.ok(out.includes('今日好開心。') && out.includes('我見到你就想笑。'), 'both clauses kept their words');
  assert.ok(out.includes("xml:lang='zh-HK'"), 'xml:lang kept');
});

test('sanitizeSsml unwraps mstts:express-as but keeps voice and prosody', () => {
  // The app's own SSML shape: <mstts:express-as> makes the endpoint drop the
  // whole utterance (measured: 0 audio frames, close 1007), while the nested
  // <prosody> is accepted.
  const styled =
    '<speak version=\'1.0\' xmlns=\'http://www.w3.org/2001/10/synthesis\' ' +
    'xmlns:mstts=\'http://www.w3.org/2001/mstts\' xml:lang=\'zh-HK\'>' +
    '<voice name=\'zh-HK-WanLungNeural\'>' +
    '<mstts:express-as style=\'chat\' styledegree=\'1.20\'>' +
    '<prosody pitch=\'+3%\' rate=\'+6%\'>你好。</prosody>' +
    '</mstts:express-as></voice></speak>';
  const repaired = sanitizeSsml(styled);
  assert.ok(!/express-as/i.test(repaired));
  assert.match(repaired, /<voice name='zh-HK-WanLungNeural'>/);
  assert.match(repaired, /<prosody pitch='\+3%' rate='\+6%'>你好。<\/prosody>/);
  // xmlns:mstts alone is accepted upstream, so it is left alone.
  assert.match(repaired, /xmlns:mstts=/);
});

test('sanitizeSsml drops <break/> in both forms', () => {
  const withBreaks =
    `${SPEAK_OPEN}<voice name='zh-HK-WanLungNeural'>` +
    "你好<break time='480ms'/><prosody rate='+6%'>好呀</prosody><break time='300ms'></break></voice></speak>";
  const repaired = sanitizeSsml(withBreaks);
  assert.ok(!/<break/i.test(repaired));
  assert.match(repaired, /你好<prosody rate='\+6%'>好呀<\/prosody>/);
});

test('sanitizeSsml defaults xml:lang from the voice name', () => {
  // Measured: a <speak> without xml:lang is closed 1007 with no audio.
  const noLang = `${SPEAK_OPEN}<voice name='zh-HK-HiuMaanNeural'>你好。</voice></speak>`;
  assert.match(sanitizeSsml(noLang), /xml:lang='zh-HK'/);
  const cn = `${SPEAK_OPEN}<voice name='zh-CN-YunxiNeural'>你好。</voice></speak>`;
  assert.match(sanitizeSsml(cn), /xml:lang='zh-CN'/);
});

test('sanitizeSsml is identity on a body the endpoint accepts', () => {
  const clean = `${SPEAK_OPEN.replace('>', " xml:lang='zh-HK'>")}<voice name='zh-HK-WanLungNeural'><prosody rate='+6%'>你好。</prosody></voice></speak>`;
  assert.equal(sanitizeSsml(clean), clean);
  // Idempotent, so the worker never retries a repair that changed nothing.
  assert.equal(sanitizeSsml(sanitizeSsml(clean)), clean);
});

test('ensureXmlLang leaves an existing language alone', () => {
  const indented = "<speak version='1.0' xml:lang='ja-JP' ><voice name='ja-JP-KeitaNeural'>あ</voice></speak>";
  assert.equal(ensureXmlLang(indented), indented);
});

test('describeUpstreamFailure keeps the close reason the endpoint sent', () => {
  // Literal line from `wrangler tail`: code=1007 reason=Unsupported voice …
  assert.equal(
    describeUpstreamFailure({ closeCode: 1007, closeReason: 'Unsupported voice zh-HK-NoSuchVoiceNeural.', sawTurnEnd: false }),
    'upstream closed 1007: Unsupported voice zh-HK-NoSuchVoiceNeural.',
  );
});

test('describeUpstreamFailure names the empty turn and the frames seen', () => {
  assert.equal(
    describeUpstreamFailure({ closeCode: 1000, closeReason: '', sawTurnEnd: true, paths: ['turn.start', 'response', 'turn.end'] }),
    'upstream ended the turn with no audio (frames: turn.start, response, turn.end)',
  );
  assert.equal(
    describeUpstreamFailure({ closeCode: 1006, closeReason: '', sawTurnEnd: false }),
    'upstream closed 1006',
  );
});

test('stripLeadingJunk removes a UTF-8 BOM before <speak>', () => {
  // Measured 2026-11-24: a body starting EF BB BF is closed 1007 with
  // "Data at the root level is invalid. Line 1, position 1." — the .NET XML
  // reader never sees the '<speak'. PowerShell's `Set-Content -Encoding UTF8`
  // writes exactly this, so `curl --data-binary @file` reproduces it.
  const body = `${SPEAK_OPEN}<voice name='zh-HK-WanLungNeural'>你好</voice></speak>`;
  assert.equal(stripLeadingJunk(`\uFEFF${body}`), body);
  assert.equal(stripLeadingJunk(`\uFEFF\r\n\t ${body}`), body);
  assert.equal(stripLeadingJunk(body), body, 'a clean body is returned unchanged');
});

test('sanitizeSsml strips a BOM as part of the repair pass', () => {
  const body = `${SPEAK_OPEN.replace(/>$/, " xml:lang='zh-HK'>")}<voice name='zh-HK-WanLungNeural'>你好</voice></speak>`;
  assert.equal(sanitizeSsml(`\uFEFF${body}`), body);
});
