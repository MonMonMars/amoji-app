# Amoji edge-tts proxy

A tiny **free Cloudflare Worker** that carries the app's neural-voice SSML over
plain HTTPS, for networks that block the readaloud WebSocket (the original
"she's silent on my iPhone network" failure, r89).

- `POST` an SSML document → receive `audio/mpeg`.
- No API key, no upstream credential — the same free Microsoft readaloud
  endpoint the in-browser socket already uses, relayed server-side so mobile
  carriers can't see a WebSocket at all.
- Free tier: 100k requests/day.

## Deploy (one time, ~5 minutes)

```sh
npm i -g wrangler
wrangler login          # free Cloudflare account
cd server/edge-proxy
wrangler deploy         # prints https://amoji-tts.<you>.workers.dev/
```

## Point the app at it

In the app (any page), run once, then reload:

```js
localStorage.setItem('amoji.ttsproxy.v1', 'https://amoji-tts.<you>.workers.dev/');
```

To go back to the direct socket:

```js
localStorage.removeItem('amoji.ttsproxy.v1');
```

Settings → Voice self-test shows which tier actually spoke.

## Files

- `worker.js` — the whole proxy (single file, no build step). Exports a
  standard Workers `fetch` handler; CORS is open (`*`) so the GitHub Pages
  app can call it from any origin.
