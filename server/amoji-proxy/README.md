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

## Handshake (do not remove)

Microsoft's readaloud endpoint rejects a headerless socket upgrade with
**403**, which the worker surfaces as `upstream socket error`. Two things are
required, both in `edge-gec.js`:

- `EDGE_WS_HEADERS` — a `User-Agent` is the gate (verified live 2026-11-24:
  no headers → 403; `Origin` alone → 403; `User-Agent` alone → 101 open).
- `EDGE_GEC_VERSION = '2-…'` — the current `edge-tts` scheme
  (`2-<chromium version>`). The old `1-…` form no longer opens the socket.

`new WebSocket(url)` cannot send headers on Workers, so `worker.js` upgrades
through `fetch()` on an `https:` URL with `Upgrade: websocket` and uses
`response.webSocket`. `node --test server/amoji-proxy/edge-gec.test.mjs`
locks both the GEC vectors and the header requirement.

## SSML the endpoint silently drops (measured 2026-11-24)

The readaloud endpoint never returns an HTTP error for a body it dislikes. The
socket opens (101), `Path:turn.start` arrives, and then it either closes
**1007** with a reason or sends `Path:turn.end` after **zero** audio frames.
Before this change both became `502 no audio from upstream` (22 bytes) — which
is why a correctly deployed proxy looked broken.

Measured with `edge-tts` 7.3.1 as the reference client *and* with the deployed
worker: identical results for identical SSML, byte for byte.

| Body | Result |
|---|---|
| `<voice name='zh-HK-WanLungNeural'>…</voice>` | 101 → 35 audio frames → 24,912 B |
| `<mstts:express-as …>` (any style, or no style at all) | **0 B**, close 1007 `SSML is invalid` |
| `<break time='480ms'/>` anywhere | **0 B**, the turn ends empty |
| `<speak>` without `xml:lang` | **0 B**, close 1007 |
| no `<voice>` element | **0 B** |
| `<prosody>` nested or as siblings | accepted (pitch/rate/volume all fine) |
| bare `xmlns:mstts` declaration | accepted |

So `worker.js` retries once — first verbatim (a transient empty turn is what
throttling looks like), then with `mstts:express-as` unwrapped, `<break>`
removed and `xml:lang` defaulted from the voice name (`edge-ssml.js`). A
healthy body is relayed byte-for-byte and never pays for the retry; a repaired
reply carries `X-Amoji-Ssml-Repaired: 1` and `X-Amoji-Attempts: 2`.

When both attempts fail the 502 body is the upstream's own words, e.g.
`upstream closed 1007: Unsupported voice zh-HK-NoSuchVoiceNeural.` or
`upstream ended the turn with no audio (frames: turn.start, response, turn.end)`.

## Diagnosing a live deployment

POST with `?debug=1` (or set the Worker var `DEBUG=1`), then:

```sh
wrangler tail --format pretty
```

The log shows the handshake status, every frame (`text` with its `Path:`,
`binary` with `ArrayBuffer(n)` + first 24 bytes), the payload offset of the
first audio frame (`offset=130 hex=ff f3 64 c4 …`), and `turn.end`. Normal
traffic logs nothing.

An audio frame is a 2-byte big-endian header length, the ASCII header, a
`\r\n`, then mp3: `00 80` (128) means the payload starts at **130** and a
720-byte chunk arrives as 850 bytes. The header has **no** blank line and the
trailing `\r\n` is not part of the length — hence `headerLength + 2`. That
offset is locked by `edge-gec.test.mjs` against a captured frame.


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
- `edge-gec.js` — the `Sec-MS-GEC` v2 token, handshake headers, read-aloud
  URL and binary-frame parser. Shared with `apps/web` and `server/backend`.
- `edge-ssml.js` — the rejects measured above: `sanitizeSsml()` and
  `describeUpstreamFailure()`.
- `*.test.mjs` — `node --test server/amoji-proxy/edge-gec.test.mjs
  server/amoji-proxy/edge-ssml.test.mjs` (16 tests, offline).

> Replaces the earlier `server/edge-proxy` and `server/openai-proxy`
> experiments — same routes in one place. If you already deployed one of
> those, it still works; this worker just means one deploy covers both.
