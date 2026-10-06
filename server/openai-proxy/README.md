# Amoji OpenAI voice proxy

A tiny **free Cloudflare Worker** that relays the app's ChatGPT-voice call to
`api.openai.com`, for the simple reason that **api.openai.com refuses browser
calls** (CORS, verified live 10/5). Without this, the paid emotional tier in
Settings → Voice can never speak from a web page no matter how good the key.

- `POST /v1/audio/speech` with your usual `Authorization: Bearer <key>`
  header → receives `audio/mpeg` (or the upstream error, verbatim, so a bad
  key names itself in the app's one-tap test).
- **Your key never lives in the worker.** The app sends the same header it
  would send to OpenAI directly; the worker forwards it verbatim. The key
  stays in localStorage on your device — anyone who finds the worker URL can
  only relay requests carrying *their own* key, at *their own* cost.
- **Single-purpose**: only `/v1/audio/speech` is relayed. Every other path
  is refused, so it cannot be repurposed as a general OpenAI relay.
- Free tier: 100k requests/day. Upstream `gpt-4o-mini-tts` usage bills to
  your OpenAI key as usual (≈ US$0.015/min — a month of daily chats ≈ US$1).

## Deploy (one time, ~5 minutes)

```sh
npm i -g wrangler
wrangler login            # free Cloudflare account
cd server/openai-proxy
wrangler deploy           # prints https://amoji-openai.<you>.workers.dev/
```

## Point the app at it

Settings → Voice → **ChatGPT voice (OpenAI)** → proxy field:

```
https://amoji-openai.<you>.workers.dev/v1/audio/speech
```

Save, paste your `sk-…` key above it, tap **▶ Test** — ✓ and her ChatGPT
voice is live. Leave the proxy field blank only if you're calling OpenAI
from something that isn't a browser.

## Files

- `worker.js` — the whole proxy (single file, no build step). Exports a
  standard Workers `fetch` handler; CORS is open (`*`) so the GitHub Pages
  app can call it from any origin, and `Authorization` is an allowed header
  since the app sends the key cross-origin.
