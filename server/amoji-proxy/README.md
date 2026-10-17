# Amoji proxy

One tiny **free Cloudflare Worker** that carries BOTH voice bridges the app
needs, so you deploy once and paste two URLs.

| Route | Purpose |
|---|---|
| `POST <any path>` with an SSML body | **Neural voice** — relays through the Microsoft readaloud endpoint → `audio/mpeg`, for phone networks that block the readaloud WebSocket (r89's "she's silent on my iPhone network"). |
| `POST /v1/audio/speech` with your `Authorization: Bearer <key>` header | **ChatGPT voice** — relays to `api.openai.com`, which refuses browser calls outright (CORS). Your key never lives in the worker: the app sends its usual header and the worker forwards it verbatim, so the key stays in localStorage on your device. Only this one path is relayed, so the worker can't be repurposed as a general OpenAI relay. |

Error bodies pass through verbatim in both directions, so the app's one-tap
▶ Test shows the real cause (`openai-tts-401: …`, `upstream timeout`, …)
instead of a bare ✗.

Free tier: 100k requests/day. Route A's upstream is the same free, keyless
consumer endpoint the in-browser socket already uses; Route B bills to your
OpenAI key as usual (gpt-4o-mini-tts ≈ US$0.015/min — a month of daily chats
≈ US$1).

## Deploy (one time, ~5 minutes — the only worker you need)

```sh
npm i -g wrangler
wrangler login            # free Cloudflare account
cd server/amoji-proxy
wrangler deploy           # prints https://amoji.<you>.workers.dev/
```

## Pages vs local

| | Local `pnpm dev` | GitHub Pages |
|---|---|---|
| Default | Direct Edge WebSocket. Leave `NEXT_PUBLIC_TTS_PROXY` empty. No key. | Same socket. The workflow ships no voice secret. |
| When `wss://speech.platform.bing.com` is blocked | Set `NEXT_PUBLIC_TTS_PROXY` in `apps/web/.env.local` to this worker, or paste the URL under Settings → Voice. | Add an Actions **variable** `AMOJI_TTS_PROXY` (not a secret) and redeploy. |
| Paid clouds | Not required. OpenAI speech is an opt-in key in Settings. The worker forwards that header and does not store it. | Same. Do not put `sk-` keys in the workflow. |

The Edge route uses the public read-aloud client token. Optional Worker var `EDGE_TTS_TOKEN` overrides it if Microsoft rotates that published value. It is not a credential you need to create an account for.

## Point the app at it

**Settings → Voice → Neural voice proxy** — paste the URL as-is:

```
https://amoji.<you>.workers.dev/
```

Save, tap ▶ Test. (To go back to the direct socket: clear the field.)

**Settings → Voice → ChatGPT voice (OpenAI)** — proxy field:

```
https://amoji.<you>.workers.dev/v1/audio/speech
```

Add your `sk-…` key above it, Save, tap ▶ Test — ✓ and both voices are live.

## Files

- `worker.js` — the whole proxy (single file, no build step). Exports a
  standard Workers `fetch` handler; CORS is open (`*`) so the GitHub Pages
  app can call it from any origin, and `Authorization` is an allowed header
  since the ChatGPT-voice route carries the key cross-origin.

> Replaces the earlier `server/edge-proxy` and `server/openai-proxy`
> experiments — same routes in one place. If you already deployed one of
> those, it still works; this worker just means one deploy covers both.
