// Amoji OpenAI voice proxy — free Cloudflare Worker.
//
// WHY: api.openai.com refuses browser calls (CORS, verified live 10/5), so
// the app's ChatGPT-voice tier (apps/web/lib/openai-tts.ts, r112) cannot
// reach it from a web page — the tier silently fell through to the free
// voices no matter how good the key was. This worker relays that ONE call
// over the same plain HTTPS the Pages app is already allowed to make.
//
// KEY MODEL: your OpenAI key never lives in this worker. The app sends its
// usual   Authorization: Bearer <key>   header and the worker forwards it
// verbatim, so the key stays exactly where it already was — localStorage on
// your device. Anyone who finds the worker URL can only relay requests
// carrying THEIR OWN key, at THEIR OWN cost; nothing of yours is exposed.
//
// SCOPE: only POST /v1/audio/speech is relayed (gpt-4o-mini-tts). Every
// other path is refused, so the worker cannot be repurposed as a general
// OpenAI relay (chat completions, images, …).
//
// DEPLOY (free tier, no card, ~5 minutes — same flow as server/edge-proxy):
//   1. Create a free Cloudflare account at https://dash.cloudflare.com
//   2. npm i -g wrangler && wrangler login
//   3. cd server/openai-proxy && wrangler deploy
//   4. Copy the printed URL, then in the app: Settings → Voice →
//      "ChatGPT voice (OpenAI)" → proxy field, paste:
//        https://amoji-openai.<you>.workers.dev/v1/audio/speech
//      Save, tap ▶ Test — ✓ means her ChatGPT voice is live on this device.
//
// COST: Cloudflare free tier is 100k requests/day — far beyond personal use.
// Upstream gpt-4o-mini-tts usage bills to YOUR OpenAI key as usual
// (≈ US$0.015/min — a month of daily chats ≈ US$1).

const UPSTREAM = 'https://api.openai.com';
const ALLOWED_PATH = '/v1/audio/speech';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  /** @param {Request} request */
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== ALLOWED_PATH) {
      return new Response(
        'Amoji OpenAI voice proxy — POST /v1/audio/speech with your own Authorization header; relays to api.openai.com.',
        { status: 405, headers: CORS },
      );
    }
    const auth = request.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) {
      return new Response('missing or malformed Authorization header', { status: 401, headers: CORS });
    }
    let upstream;
    try {
      upstream = await fetch(`${UPSTREAM}${ALLOWED_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: request.body,
      });
    } catch (err) {
      return new Response(String(err?.message ?? err), { status: 502, headers: CORS });
    }
    // Relay status + body. Error bodies pass through verbatim so the app's
    // probe can report "openai-tts-401: …" instead of a bare ✗, and a
    // success body is the audio/mpeg blob the tier feeds to <audio>.
    const contentType = upstream.headers.get('Content-Type') ?? 'application/octet-stream';
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...CORS, 'Content-Type': contentType },
    });
  },
};
