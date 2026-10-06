// Amoji edge-tts proxy — free Cloudflare Worker.
//
// WHY: some mobile networks block the readaloud WebSocket, which used to
// silence the neural voice entirely (r89). This worker carries the SAME SSML
// over plain HTTPS POST and returns one mp3 — networks can't distinguish it
// from any other API call. The app's edge-tts.ts automatically uses it when
// a proxy URL is configured (setTtsProxy / localStorage 'amoji.ttsproxy.v1').
//
// DEPLOY (free tier, no card, ~5 minutes):
//   1. Create a free Cloudflare account at https://dash.cloudflare.com
//   2. npm i -g wrangler && wrangler login
//   3. cd server/edge-proxy && wrangler deploy
//   4. Copy the printed URL, then in the app console (or a future Settings
//      field) run:
//        localStorage.setItem('amoji.ttsproxy.v1', 'https://amoji-tts.<you>.workers.dev/')
//      and reload. Settings → Voice test will confirm the chain.
//
// COST: Cloudflare's free tier is 100k requests/day — comfortably beyond
// personal use. No upstream key: the Microsoft readaloud endpoint is the
// same free, keyless consumer endpoint the browser socket uses.

const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  /** @param {Request} request */
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') {
      return new Response('Amoji TTS proxy — POST SSML, receive audio/mpeg.', { status: 405, headers: CORS });
    }
    const ssml = await request.text();
    if (!ssml.includes('<speak')) {
      return new Response('invalid ssml', { status: 400, headers: CORS });
    }
    try {
      const mp3 = await synthesize(ssml);
      return new Response(mp3, { headers: { ...CORS, 'Content-Type': 'audio/mpeg' } });
    } catch (err) {
      return new Response(String(err?.message ?? err), { status: 502, headers: CORS });
    }
  },
};

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
