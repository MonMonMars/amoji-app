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
// COST: Cloudflare free tier is 100k requests/day — far beyond personal use.
// Route A's upstream (Microsoft readaloud) is the same free, keyless consumer
// endpoint the in-browser socket uses. Route B bills to YOUR OpenAI key as
// usual (gpt-4o-mini-tts ≈ US$0.015/min — a month of daily chats ≈ US$1).

const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const OPENAI_SPEECH = '/v1/audio/speech';
const OPENAI_UPSTREAM = 'https://api.openai.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  /** @param {Request} request */
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') {
      return new Response(
        'Amoji proxy — POST an SSML document for neural TTS, or POST /v1/audio/speech with your own Authorization header for the ChatGPT voice.',
        { status: 405, headers: CORS },
      );
    }
    const url = new URL(request.url);
    if (url.pathname === OPENAI_SPEECH) return relayOpenAiSpeech(request);
    return relayNeuralTts(request);
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
async function relayNeuralTts(request) {
  const ssml = await request.text();
  if (!ssml.includes('<speak')) {
    return new Response('invalid ssml — POST an SSML document, or /v1/audio/speech for the ChatGPT voice', { status: 400, headers: CORS });
  }
  try {
    const mp3 = await synthesize(ssml);
    return new Response(mp3, { headers: { ...CORS, 'Content-Type': 'audio/mpeg' } });
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 502, headers: CORS });
  }
}

/** Open the upstream readaloud socket from the worker, relay the mp3. */
async function synthesize(ssml) {
  const requestId = crypto.randomUUID().replaceAll('-', '');
  const ws = new WebSocket(
    `${WS_BASE}?TrustedClientToken=${TRUSTED_TOKEN}&ConnectionId=${crypto.randomUUID().replaceAll('-', '')}`,
  );
  const chunks = [];
  const pending = []; // frame-decoding promises, drained before resolve

  const result = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('upstream timeout')), 15_000);
    const finish = (fn, arg) => { clearTimeout(timer); fn(arg); };

    ws.addEventListener('open', () => {
      const now = () => new Date().toISOString();
      const config =
        `X-Timestamp:${now()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}';
      const msg =
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${now()}\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(config + '\x00');
      ws.send(msg + '\x00');
    });

    ws.addEventListener('message', (ev) => {
      if (typeof ev.data === 'string') return; // metadata — not relayed
      // binary frame: ASCII headers, terminated by \r\n\r\n, then mp3 bytes
      pending.push(
        ev.data.arrayBuffer().then((buf) => {
          const u8 = new Uint8Array(buf);
          let headerEnd = -1;
          const scan = Math.min(u8.length - 3, 160);
          for (let i = 0; i < scan; i++) {
            if (u8[i] === 13 && u8[i + 1] === 10 && u8[i + 2] === 13 && u8[i + 3] === 10) { headerEnd = i + 4; break; }
          }
          if (headerEnd >= 0 && u8.length > headerEnd) chunks.push(u8.slice(headerEnd));
        }),
      );
    });

    // drain any in-flight frame decodes before assembling the response —
    // close can race the last binary frame
    ws.addEventListener('close', () => {
      Promise.all(pending).then(
        () => finish(chunks.length ? resolve : reject, chunks.length ? new Blob(chunks, { type: 'audio/mpeg' }) : new Error('no audio from upstream')),
        (err) => finish(reject, err instanceof Error ? err : new Error(String(err))),
      );
    });
    ws.addEventListener('error', () => finish(reject, new Error('upstream socket error')));
  });

  const blob = await result;
  return blob.arrayBuffer();
}
