// Amoji proxy — ONE free Cloudflare Worker for both voice bridges.
//
// Route A — neural voice (edge-tts):  POST <any path> with an SSML body
//   → relays it through the Microsoft readaloud endpoint → audio/mpeg.
//   For phone networks that block the readaloud WebSocket (the original
//   "she's silent on my iPhone network" failure, r89): carriers see one
//   ordinary HTTPS POST, same as any API call. The app uses this route
//   automatically when a proxy URL is set (Settings → Voice → neural voice
//   proxy, localStorage 'amoji.ttsproxy.v1').
//
// Route B — ChatGPT voice (OpenAI):   POST /v1/audio/speech
//   → relays to api.openai.com, which refuses browser calls outright (CORS,
//   verified live 10/5). The app sends its usual
//   Authorization: Bearer <key> header and this worker forwards it VERBATIM
//   — the key never lives here, it stays in localStorage on your device.
//   Anyone who finds the worker URL can only relay requests carrying THEIR
//   OWN key at THEIR OWN cost. Only /v1/audio/speech is relayed, so the
//   worker cannot be repurposed as a general OpenAI relay.
//
// DEPLOY (free tier, no card, ~5 minutes — this is the ONLY worker you need):
//   1. Create a free Cloudflare account at https://dash.cloudflare.com
//   2. npm i -g wrangler && wrangler login
//   3. cd server/amoji-proxy && wrangler deploy
//   4. Copy the printed URL, then in the app:
//      - Settings → Voice → "Neural voice proxy": paste the URL as-is
//        (e.g. https://amoji.<you>.workers.dev/), Save, ▶ Test.
//      - Settings → Voice → "ChatGPT voice (OpenAI)" → proxy field: paste
//        https://amoji.<you>.workers.dev/v1/audio/speech, add your sk- key,
//        Save, ▶ Test.
//
// DIAGNOSE (no code change): POST with `?debug=1` (or set the Worker var
//   DEBUG=1 and run `wrangler tail`) to log the upstream handshake status,
//   every frame the readaloud socket delivers, and where `Path:turn.end`
//   lands. Silent on a normal request.
//
// COST: Cloudflare free tier is 100k requests/day — far beyond personal use.
// Route A's upstream (Microsoft readaloud) is the same free, keyless consumer
// endpoint the in-browser socket uses. Route B bills to YOUR OpenAI key as
// usual (gpt-4o-mini-tts ≈ US$0.015/min — a month of daily chats ≈ US$1).

import { EDGE_WS_HEADERS, edgeAudioPayload, edgeReadAloudUrl } from './edge-gec.js';
import { describeUpstreamFailure, sanitizeSsml } from './edge-ssml.js';

const OPENAI_SPEECH = '/v1/audio/speech';
const OPENAI_UPSTREAM = 'https://api.openai.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  // Lets the app (and curl) see whether the relay had to repair the body.
  'Access-Control-Expose-Headers': 'X-Amoji-Ssml-Repaired, X-Amoji-Attempts',
};

export default {
  /**
   * @param {Request} request
   * @param {{ EDGE_TTS_TOKEN?: string, DEBUG?: string }} [env]
   */
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') {
      return new Response(
        'Amoji proxy — POST an SSML document for neural TTS, or POST /v1/audio/speech with your own Authorization header for the ChatGPT voice.',
        { status: 405, headers: CORS },
      );
    }
    const url = new URL(request.url);
    if (url.pathname === OPENAI_SPEECH) return relayOpenAiSpeech(request);
    const debug = env?.DEBUG === '1' || url.searchParams.get('debug') === '1';
    return relayNeuralTts(request, env, debug);
  },
};

// ---- Route B: OpenAI gpt-4o-mini-tts ---------------------------------------
async function relayOpenAiSpeech(request) {
  const auth = request.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return new Response('missing or malformed Authorization header', { status: 401, headers: CORS });
  }
  let upstream;
  try {
    upstream = await fetch(`${OPENAI_UPSTREAM}${OPENAI_SPEECH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: request.body,
    });
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 502, headers: CORS });
  }
  // Relay status + body. Error bodies pass through verbatim so the app's
  // probe can report "openai-tts-401: …" instead of a bare ✗, and a success
  // body is the audio/mpeg blob the tier feeds to <audio>.
  const contentType = upstream.headers.get('Content-Type') ?? 'application/octet-stream';
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { ...CORS, 'Content-Type': contentType },
  });
}

// ---- Route A: Microsoft readaloud SSML → mp3 -------------------------------
async function relayNeuralTts(request, env, debug = false) {
  const ssml = await request.text();
  if (!ssml.includes('<speak')) {
    return new Response('invalid ssml — POST an SSML document, or /v1/audio/speech for the ChatGPT voice', { status: 400, headers: CORS });
  }
  const log = debug ? makeLogger(ssml) : null;
  try {
    const { mp3, repaired, attempts } = await synthesizeWithRepair(ssml, env, log);
    log?.('result', `ok ${mp3.byteLength} bytes (attempts=${attempts}, repaired=${repaired})`);
    return new Response(mp3, {
      headers: {
        ...CORS,
        'Content-Type': 'audio/mpeg',
        'X-Amoji-Attempts': String(attempts),
        ...(repaired ? { 'X-Amoji-Ssml-Repaired': '1' } : {}),
      },
    });
  } catch (err) {
    log?.('result', `FAIL ${err?.message ?? err}`);
    console.error('neural tts failed', err);
    // The upstream's close reason ("Unsupported voice …", "ended the turn
    // with no audio") is the only actionable signal — pass it through.
    const detail = err?.message || err?.stack || String(err);
    return new Response(detail || 'neural tts failed', { status: 502, headers: CORS });
  }
}

/**
 * The readaloud endpoint answers a body it dislikes by ending the turn with
 * zero audio (or closing 1007), never with an HTTP error — so a relay gets
 * exactly one shot at the caller's SSML. Retry once: verbatim (a transient
 * empty turn is what throttling looks like), or with the known-fatal markup
 * removed (see edge-ssml.js) when the body contains any.
 */
async function synthesizeWithRepair(ssml, env, log) {
  const repaired = sanitizeSsml(ssml);
  const attempts = repaired === ssml
    ? [{ label: 'verbatim', body: ssml }, { label: 'retry', body: ssml }]
    : [{ label: 'verbatim', body: ssml }, { label: 'repaired', body: repaired }];
  let failure;
  for (const [index, attempt] of attempts.entries()) {
    log?.('attempt', `${index + 1}/${attempts.length} ${attempt.label}`);
    try {
      const mp3 = await synthesize(attempt.body, env, log);
      return { mp3, repaired: attempt.label === 'repaired', attempts: index + 1 };
    } catch (err) {
      if (err?.code !== 'no-audio') throw err; // timeouts/handshakes won't fix themselves
      failure = err;
      log?.('attempt-failed', `${attempt.label}: ${err.message}`);
    }
  }
  throw failure;
}

/** Debug sink. Silent unless ?debug=1 / DEBUG=1, so production stays quiet. */
function makeLogger(ssml) {
  const id = Math.random().toString(36).slice(2, 8);
  let seq = 0;
  const started = Date.now();
  console.log(`[${id}] ssml ${ssml.length} chars: ${ssml.replace(/\s+/g, ' ').slice(0, 200)}`);
  return (step, detail) => {
    console.log(`[${id}] +${String(Date.now() - started).padStart(4)}ms #${seq++} ${step}: ${detail}`);
  };
}

const hex = (u8, n) =>
  [...u8.subarray(0, n)].map((b) => b.toString(16).padStart(2, '0')).join(' ');

const describeData = (data) => {
  if (typeof data === 'string') return `string(${data.length}) ${JSON.stringify(data.slice(0, 160))}`;
  const kind = data?.constructor?.name ?? typeof data;
  const bytes = toBytes(data);
  if (!bytes) return `${kind} (no byte view)`;
  return `${kind}(${bytes.length}) hex[0..24]=${hex(bytes, 24)}`;
};

/**
 * Upgrade to the readaloud socket through `fetch()` so we can send the
 * handshake headers. `new WebSocket(url)` cannot set headers on Workers
 * (or in Node), and Microsoft rejects a headerless upgrade with 403 — that
 * 403 is the whole "upstream socket error" this worker used to return.
 */
async function openReadAloudSocket(connectionId, log) {
  // Workerd's fetch() refuses a `wss:` URL — the upgrade form is an `https:`
  // URL plus `Upgrade: websocket`, and the response carries `.webSocket`.
  const url = edgeReadAloudUrl(connectionId).replace(/^wss:/, 'https:');
  log?.('connect', `GET ${url.replace(/Sec-MS-GEC=[^&]+/, 'Sec-MS-GEC=<redacted>')}`);
  const response = await fetch(url, {
    headers: { Upgrade: 'websocket', ...EDGE_WS_HEADERS },
  });
  log?.('handshake', `status=${response.status} webSocket=${response.webSocket ? 'yes' : 'NO'} cf-ray=${response.headers.get('cf-ray') ?? '-'}`);
  const ws = response.webSocket;
  if (!ws) {
    const body = await response.text().catch(() => '');
    log?.('handshake-body', JSON.stringify(body.slice(0, 200)));
    const err = new Error(`upstream handshake ${response.status}`);
    err.code = 'handshake';
    throw err;
  }
  return ws;
}

/** Normalize a WebSocket binary frame: workerd hands over ArrayBuffer, browsers Blob. */
function toBytes(data) {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (data instanceof Blob) return null; // async path, see frameBytes()
  return null;
}

function frameBytes(data) {
  const sync = toBytes(data);
  if (sync) return Promise.resolve(sync);
  if (typeof data?.arrayBuffer === 'function') return data.arrayBuffer().then((buf) => new Uint8Array(buf));
  return Promise.resolve(new Uint8Array(data));
}

/** Path header of a readaloud control frame (`Path:turn.end`, `Path:audio`…). */
function framePath(text) {
  return /(?:^|\r\n)Path:([^\r\n]+)/i.exec(text)?.[1].trim() ?? null;
}

/** Open the upstream readaloud socket from the worker, relay the mp3. */
async function synthesize(ssml, env, log = null) {
  // GEC is bound to the public client token. A custom EDGE_TTS_TOKEN is not
  // hashed into that token, so the socket stays on the public client id.
  void env;
  const requestId = crypto.randomUUID().replaceAll('-', '');
  const ws = await openReadAloudSocket(crypto.randomUUID().replaceAll('-', ''), log);
  const chunks = [];
  const pending = []; // frame-decoding promises, drained before settling
  const paths = []; // control frames the upstream sent, for the failure message
  let audioFrames = 0;
  let maxFrame = 0;
  let sawTurnEnd = false;
  let closed = null;

  const blob = await new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => settle(reject, new Error('upstream timeout')), 15_000);
    function settle(fn, arg) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* already closed */ }
      fn(arg);
    }
    // Drain in-flight frame decodes first: the last binary frame races turn.end.
    function done() {
      Promise.all(pending).then(
        () => {
          log?.('done', `audioFrames=${audioFrames} chunks=${chunks.length} bytes=${chunks.reduce((n, c) => n + c.length, 0)} maxFrame=${maxFrame} closed=${closed ? `${closed.code}:${closed.reason}` : 'no'}`);
          if (chunks.length) return settle(resolve, new Blob(chunks, { type: 'audio/mpeg' }));
          const err = new Error(describeUpstreamFailure({
            closeCode: closed?.code ?? null,
            closeReason: closed?.reason ?? null,
            sawTurnEnd,
            paths,
          }));
          err.code = 'no-audio';
          settle(reject, err);
        },
        (e) => settle(reject, e instanceof Error ? e : new Error(String(e))),
      );
    }

    // Listeners must exist before accept(): workerd starts dispatching the
    // moment the socket is accepted, and frames delivered with no listener
    // are gone (this order is what `wrangler tail` confirmed delivers all 36).
    ws.addEventListener('message', (ev) => {
      if (typeof ev.data === 'string') {
        const path = framePath(ev.data);
        if (path) paths.push(path);
        log?.('text', `${path ?? '?'} ${describeData(ev.data)}`);
        // The service keeps the socket open after the turn, so `close` alone
        // never fires — resolve on the turn.end text frame like edge-tts does.
        if (path === 'turn.end') {
          sawTurnEnd = true;
          done();
        }
        return;
      }
      // binary frame: ASCII headers, terminated by \r\n\r\n, then mp3 bytes
      log?.('binary', describeData(ev.data));
      pending.push(
        frameBytes(ev.data).then((bytes) => {
          maxFrame = Math.max(maxFrame, bytes.length);
          const audio = edgeAudioPayload(bytes);
          if (audio && audio.length) {
            audioFrames += 1;
            if (audioFrames === 1) log?.('first-audio', `offset=${bytes.length - audio.length} hex=${hex(audio, 8)}`);
            chunks.push(audio);
          } else {
            log?.('binary-dropped', `no payload len=${bytes.length} hex=${hex(bytes, 12)}`);
          }
        }),
      );
    });

    ws.addEventListener('close', (ev) => {
      closed = { code: ev.code, reason: ev.reason ?? '' };
      log?.('close', `code=${closed.code} reason=${closed.reason}`);
      done();
    });
    ws.addEventListener('error', () => {
      const err = new Error('upstream socket error');
      err.code = 'socket';
      settle(reject, err);
    });

    ws.accept();
    log?.('accept', 'listeners attached, socket accepted');

    // The socket is already open (fetch upgraded it), and the `open` event has
    // therefore already fired — send immediately instead of waiting for it.
    const now = () => new Date().toISOString();
    const config =
      `X-Timestamp:${now()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
      '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}';
    const msg =
      `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${now()}\r\nPath:ssml\r\n\r\n${ssml}`;
    ws.send(config);
    ws.send(msg);
    log?.('sent', `config ${config.length} chars, ssml ${msg.length} chars`);
  });

  return blob.arrayBuffer();
}
