// Regression tests for the readaloud quirks the worker now repairs.
//
// Run: node --test server/amoji-proxy/edge-ssml.test.mjs
//
// Every case here is a measured upstream behaviour (see edge-ssml.js), not a
// guess: each one used to end as the app's "no audio from upstream".

import test from 'node:test';
import assert from 'node:assert/strict';

import { describeUpstreamFailure, ensureXmlLang, sanitizeSsml } from './edge-ssml.js';

const SPEAK_OPEN = '<speak version=\'1.0\' xmlns=\'http://www.w3.org/2001/10/synthesis\'>';

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
