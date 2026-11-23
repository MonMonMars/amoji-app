// Locks the Edge read-aloud handshake so it cannot silently rot again.
//
// Run: node --test server/amoji-proxy/edge-gec.test.mjs
//
// The vectors below come from the published reference client
// edge-tts 7.3.1 (`edge_tts.drm.generate_sec_ms_gec_v2`), so a change in our
// port shows up as a failing assertion instead of a live "upstream socket
// error" the owner discovers on his phone.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EDGE_GEC_VERSION,
  EDGE_WS_HEADERS,
  secMsGec,
  edgeReadAloudUrl,
  edgeAudioPayload,
} from './edge-gec.js';

// edge-tts 7.3.1: generate_sec_ms_gec_v2(1764000000.0)
const VECTOR_A_TIME = 1764000000;
const VECTOR_A = 'BB2B3ADE6A8DD1F3-B07567543B86F99C3539F563D8D3368C59A22CAF50BF1E35F42DA34792F80A76';
// edge-tts 7.3.1: generate_sec_ms_gec_v2(1732220000.0)
const VECTOR_B_TIME = 1732220000;
const VECTOR_B = '1B4C55B1D5AAEE4F-0F5DDEB6C34360C8D23A756B30427A83F6FDE841D934A701A5AB212BD7929816';

test('secMsGec matches the reference edge-tts v2 vectors', () => {
  assert.equal(secMsGec(VECTOR_A_TIME), VECTOR_A);
  assert.equal(secMsGec(VECTOR_B_TIME), VECTOR_B);
});

test('secMsGec token shape is <16 hex>-<64 hex>', () => {
  assert.match(secMsGec(VECTOR_A_TIME), /^[0-9A-F]{16}-[0-9A-F]{64}$/);
});

test('secMsGec floors the clock to a 300 s bucket', () => {
  assert.equal(secMsGec(VECTOR_A_TIME + 299), secMsGec(VECTOR_A_TIME));
  assert.notEqual(secMsGec(VECTOR_A_TIME + 300), secMsGec(VECTOR_A_TIME));
});

test('Sec-MS-GEC-Version uses the current 2-<chromium> scheme', () => {
  // edge-tts 7.3.1 constants.py: SEC_MS_GEC_VERSION = f"2-{CHROMIUM_FULL_VERSION}".
  // The old `1-<version>` form is rejected by the endpoint.
  assert.equal(EDGE_GEC_VERSION, '2-143.0.3650.75');
  assert.match(EDGE_GEC_VERSION, /^2-\d+\.\d+\.\d+\.\d+$/);
});

test('read-aloud URL carries token, connection id, GEC and version', () => {
  const id = '0123456789abcdef0123456789abcdef';
  const url = new URL(edgeReadAloudUrl(id, VECTOR_B_TIME));
  assert.equal(url.protocol, 'wss:');
  assert.equal(url.host, 'speech.platform.bing.com');
  assert.equal(url.pathname, '/consumer/speech/synthesize/readaloud/edge/v1');
  assert.equal(url.searchParams.get('TrustedClientToken'), '6A5AA1D4EAFF4E9FB37E23D68491D6F4');
  assert.equal(url.searchParams.get('ConnectionId'), id);
  assert.equal(url.searchParams.get('Sec-MS-GEC'), VECTOR_B);
  assert.equal(url.searchParams.get('Sec-MS-GEC-Version'), EDGE_GEC_VERSION);
});

test('handshake headers include the User-Agent the endpoint requires', () => {
  // Verified live 2026-11-24: a headerless upgrade (and one with only
  // Origin/Cookie) is rejected with HTTP 403; adding a User-Agent opens it.
  assert.match(EDGE_WS_HEADERS['User-Agent'], /Mozilla\/5\.0 .*Chrome\/\d+/);
  assert.match(EDGE_WS_HEADERS.Origin, /^chrome-extension:\/\//);
  assert.equal(Object.isFrozen(EDGE_WS_HEADERS), true);
});

test('edgeAudioPayload strips the Edge binary frame header', () => {
  const frame = new Uint8Array([0x00, 0x04, 0x58, 0x00, 0x00, 0x00, 0xff, 0xfb, 0x90, 0x64]);
  const audio = edgeAudioPayload(frame);
  assert.ok(audio);
  assert.deepEqual([...audio], [0xff, 0xfb, 0x90, 0x64]);
  assert.equal(edgeAudioPayload(new Uint8Array([1, 2])), null);
});

// Fixture captured from a live turn (2026-11-24, zh-HK-WanLungNeural) with the
// reference client. `wrangler tail` showed the same frame from the Worker:
// `ArrayBuffer(850)` starting `00 80 58 2d 52 65 71 75 65 73 74 49 64 3a`.
// Literal `raw[:128]` (note: NO blank line, and the trailing CRLF is NOT part
// of the 128 the prefix counts):
//   \x00\x80 X-RequestId:<32>\r\n Content-Type:audio/mpeg\r\n
//   X-StreamId:<32>\r\n Path:audio \r\n
// so the mp3 payload starts at headerLength + 2 = 130 and 850 = 130 + 720.
// edge-tts 7.3.1 parses the identical frame as `data[header_length + 2:]` and
// both clients collect the same 24,912 audio bytes for the same SSML — this
// test locks that offset so a wrong `-2`/`+4` cannot ship again.
const liveFrame = (payload, { withContentType = true } = {}) => {
  const id = 'c6f2a347776f4b4bb9bc018f7e9c94ac';
  const stream = 'B33DE0076A8D48C1AB4FDD4C77DF5376';
  const header =
    `X-RequestId:${id}\r\n` +
    (withContentType ? 'Content-Type:audio/mpeg\r\n' : '') +
    `X-StreamId:${stream}\r\n` +
    'Path:audio';
  // The 2-byte prefix counts itself plus the header text, not the CRLF that
  // follows the text — which is why the payload offset is headerLength + 2.
  const headerLength = header.length + 2;
  const payloadStart = headerLength + 2;
  const frame = new Uint8Array(payloadStart + payload.length);
  frame[0] = (headerLength >> 8) & 0xff;
  frame[1] = headerLength & 0xff;
  frame.set(new TextEncoder().encode(header), 2);
  frame[payloadStart - 2] = 0x0d;
  frame[payloadStart - 1] = 0x0a;
  frame.set(payload, payloadStart);
  return { frame, headerLength };
};

test('edgeAudioPayload keeps every byte of a live 850-byte audio frame', () => {
  const payload = new Uint8Array(720);
  payload.set([0xff, 0xf3, 0x64, 0xc4, 0x00, 0x00, 0x00, 0x03]);
  const { frame, headerLength } = liveFrame(payload);
  assert.equal(headerLength, 128);
  assert.equal(frame.length, 850);
  assert.deepEqual([...frame.subarray(0, 2)], [0x00, 0x80]);
  const audio = edgeAudioPayload(frame);
  assert.ok(audio);
  assert.equal(audio.length, 720);
  assert.equal(frame.length - audio.length, headerLength + 2);
  assert.deepEqual([...audio.subarray(0, 8)], [0xff, 0xf3, 0x64, 0xc4, 0x00, 0x00, 0x00, 0x03]);
});

test('edgeAudioPayload returns null for the empty end-of-audio frame', () => {
  // The turn ends with one more `Path:audio` frame carrying no payload and no
  // Content-Type (`00 67` = header length 103). It must not become audio.
  const { frame } = liveFrame(new Uint8Array(0), { withContentType: false });
  assert.equal(frame.length, 105);
  const audio = edgeAudioPayload(frame);
  assert.ok(!audio || audio.length === 0);
});
