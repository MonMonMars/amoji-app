# Music streaming / playlist

**Performance flow (sing / dance / body sync):** [SING_DANCE_PIPELINE.md](./SING_DANCE_PIPELINE.md)

## Today

Sing, dance, and piano use three layers:

1. **Original procedural WebAudio** themes (`apps/web/lib/music.ts`) — including style aliases (`pop`, `jazz`, `lofi`, `hiphop`, `electronic`, `ballad`, `rock`, `cantopop`).
2. **Bundled CC0 clips** under `apps/web/public/audio/` (`performance-clips.ts`, `LIBRARY.md`).
3. **Royalty-free stream previews** from Mixkit Free Stock Music (`music-catalog.ts`) when the user names a genre (e.g. “play jazz”, “粵語歌”, “lofi”, “J-pop” / `jpop`, **American pop** / `uspop`). Owner catalog ids **MV039–MV118** (80 Mixkit beds: J-pop `music-jpop-vault.ts` + `music-jpop-vault-v2.ts`, US `music-us-pop-vault.ts`, world/lofi expansion `music-world-vault.ts` **MV099–MV118**; registry `music-mv-registry.ts`). Reserved legacy slot **MV001–MV038**; core vault **MV039–MV098**; expansion **MV069–MV083** (JP), **MV084–MV098** (US), **MV099–MV118** (world mix).

TTS karaoke ditties live in `songs.ts` (original lyrics; no third-party audio).

## API

```ts
resolveStreamPlaylist(style?: string): string | null
detectMusicStyle(text: string): MusicStyleId | undefined
pickStreamTrack(style, n): StreamTrack | null
```

- Empty style → `null` → keep local CC0 / procedural band.
- Named style → HTTPS Mixkit preview URL (or PD) played via `<audio>` for **dance beds**.
- Sung “songs” still prefer gendered CC0 vocal clips + original lyric bank.

## Allowed sources

- First-party hosted CC0 files (`public/audio/`)
- Mixkit Free Stock Music License (commercial OK; no attribution required)
- Explicit Wikimedia / public-domain recordings already in the CC0 pack
- Future: oEmbed partners under their ToS

## Not allowed

- Scraping Spotify, YouTube, Apple Music, NetEase, etc.
- Hard-coding private stream manifests or DRM-bypass URLs
- Shipping copyrighted karaoke beds without a license row in `docs/ASSETS.md` / `LIBRARY.md`

## Product preference

**Music ask UX** (`apps/web/lib/music-ask.ts` + ChatPanel):

- Generic “play music / sing something” → **random** autoplay from the short free catalog; speak the **song/track name** (and genre) before the bed (`performanceIntroLine`).
- **Selection UI / chips only** when the user explicitly asks to choose / list / pick (“let me choose”, “what songs do you have”, “list songs”).
- Genre asks (“play jazz”, “something calm/lofi”) → filter catalog then random within genre; if they also asked to choose, offer 2–3 named options.
- Prefer Mixkit stream previews for instrumental beds; sung tracks stay on local CC0 vocal clips. Do not grow the static export with large audio when a legal catalog exists.

## Demo-phase / sing defaults (2026-11)

`pickPerformanceClip` soft-weights **classic / lullaby-feel** CC0 tracks (Twinkle Twinkle, Silent Night, Joy to the World, Shenandoah, Happy Birthday, flowerbed / lullaby beds) and deprioritizes short SFX, overtone drones, and sparse chant beds. All listed files remain **CC0-1.0 / public domain** — see `apps/web/public/audio/LIBRARY.md`. Do **not** ship copyrighted commercial recordings (no Louis Armstrong “What a Wonderful World” masters; use PD/CC0 equivalents already in the pack).

Voice + BGM: spoken TTS keeps a **steady** gain. Library beds stay at ambient ~30% BGM gain and are **not** auto-ducked under dialogue.

---

# Streaming providers — curated keyless Jamendo FIRST (wired live, 2026-11-24)

New modules:

- `apps/web/lib/music-stream-catalog.ts` — the hand-verified, **keyless** Jamendo catalog (28 tracks) + mood buckets.
- `apps/web/lib/music-stream-providers.ts` — provider specs and **pure** parsers (no fetch, no timers, no DOM).
- `apps/web/lib/music-stream.ts` — the network/orchestration client, rotation, cache, and the playback-routing safety gate.
- `apps/web/lib/music-stream-bed.ts` — the bridge: maps a curated `MusicTrack` onto the existing `PerformanceClip` bed shape (`stream:jamendo:<id>`), so the catalog plays through `lib/music.ts` instead of a second player.
- `apps/web/tests/music-stream.test.ts` — 35 unit tests, all network mocked.
- `apps/web/tests/music-stream-wiring.test.ts` — the live-path tests (catalog → bed → `resolveLibraryPerformance`/`startLibraryPerformance`, attribution, export safety).

**Wired live in `r2026-11-24.298`.** `lib/music.ts` now asks `resolveStreamBed()`: owner-pinned Mixkit tracks still win, then an exact curated/Mixkit id, then `curatedTrackForStyle()` for the genre+mood, then the procedural fallback. `lib/music-ask.ts` offers curated chips when the pinned pool has nothing for a style. No env var, no key, and no fetch on the playback path — this is why the Pages export stays inert.

## 1. The CORS verdict — the whole design hinges on this

**Short answer: Jamendo's audio is CORS-readable, so dance/lip-sync works. No proxy needed.**

Her dance and lip-sync read real samples through `AnalyserNode`.
`apps/web/lib/music.ts` documents the rule: a cross-origin `<audio>` whose bytes are **not** CORS-readable goes **silent** the moment it is rerouted through `createMediaElementSource`. So this was the first thing measured, not assumed.

Probed 2026-11-24 from the owner's Windows machine with `curl.exe`.

**A. Plain request, no `Origin` header** (the headers a naive `curl -I` shows):

```
curl.exe -sS -D - -o NUL -H "Range: bytes=0-1023" ^
  "https://prod-1.storage.jamendo.com/?trackid=8888&format=mp31"

HTTP/1.1 206 Partial Content
Server: nginx
Content-Length: 1024
Accept-Ranges: bytes
Content-Range: bytes 0-1023/3874304
Content-Security-Policy: block-all-mixed-content
ETag: "a9399263147621a3211b716c2ee078eb"
Last-Modified: Sat, 09 Jul 2022 05:03:35 GMT
Strict-Transport-Security: max-age=31536000; includeSubDomains
Vary: Origin
Vary: Accept-Encoding
Content-Type: audio/mpeg
```

There is **no** `Access-Control-Allow-Origin` on a plain request — expected, because CORS headers are only emitted when an `Origin` is present. That is not a failure; it means you must test with the real app origin.

**B. With the actual app origin** (`https://monmonmars.github.io`):

```
curl.exe -sS -D - -o NUL -H "Range: bytes=0-1023" ^
  -H "Origin: https://monmonmars.github.io" ^
  "https://prod-1.storage.jamendo.com/?trackid=1555709&format=mp31"

HTTP/1.1 206 Partial Content
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: https://monmonmars.github.io
Access-Control-Expose-Headers: Date, Etag, Server, Connection, Accept-Ranges, Content-Range, Content-Encoding, Content-Length, Content-Type, Content-Disposition, Last-Modified, Content-Language, Cache-Control, Retry-After, X-Amz-Bucket-Region, Expires, X-Amz*, X-Amz*, *
Vary: Origin
Content-Security-Policy: block-all-mixed-content
ETag: "77b8e55f2f98162f389b306a22b95440"
Last-Modified: Mon, 11 Jul 2022 23:38:50 GMT
Content-Type: audio/mpeg
Content-Range: bytes 0-1023/3089920
```

**C. Re-probed all 28 curated ids** with `Origin: https://monmonmars.github.io`: **28 / 28 → `HTTP/1.1 206 Partial Content` with `Access-Control-Allow-Origin: https://monmonmars.github.io`.**

Consequences the follow-up must respect:

- `Access-Control-Allow-Origin` **reflects the caller's origin** and is not `*` (plus `Access-Control-Allow-Credentials: true`). A response cached under a *different* origin will be rejected by the browser. This has been observed in practice: 2 of 13 previously sampled objects returned a **foreign** origin from the edge cache even with cache-busting params. So even an `analysable: true` track must handle a load error and retry **without** `crossOrigin` (plays, but no dance) rather than failing silently.
- `Content-Type: audio/mpeg` and `Accept-Ranges: bytes` — normal streaming, no `Content-Disposition: attachment`.
- The `from=app-devsite` query param is **not required**; the plain `?trackid=<id>&format=mp31` shape above is what every catalog row uses and was probed with.

## 2. Provider table (measured, literal headers)

| Provider | Search endpoint | Key needed? | Search CORS (literal) | Audio CORS (literal) | `analysable` | Licence |
| --- | --- | --- | --- | --- | --- | --- |
| **Jamendo audio storage** `prod-1.storage.jamendo.com` | n/a (direct stream) | **no** | n/a | `Access-Control-Allow-Origin: https://monmonmars.github.io` (reflected; `Vary: Origin`, `Access-Control-Allow-Credentials: true`), `Content-Type: audio/mpeg`, `Accept-Ranges: bytes`, 206 | **true** | CC per track |
| **Jamendo search** `api.jamendo.com/v3.0/tracks/` | yes | **yes** — `client_id` | `access-control-allow-origin: *` | n/a (returns JSON metadata) | n/a | — |
| **Pixabay search** `pixabay.com/api/audio/` | yes | **yes** — API key | `Access-Control-Allow-Origin: *` (also on its 400 key error) | `Access-Control-Allow-Origin: *` on `cdn.pixabay.com/audio/...`, `Content-Type: audio/mpeg`, `Accept-Ranges: bytes` | **true** | Pixabay Content License |
| **Incompetech** | none (static MP3s) | no | n/a | **no `Access-Control-Allow-Origin` header at all**; also `Content-Type: application/octet-stream`, `Content-Disposition: attachment` | **false** | CC BY 4.0 (attribution required) |
| **Free Music Archive** | **dead** | — | — | — | n/a | — |

Notes:

- Jamendo answers **HTTP 200** even for an invalid key, with `headers.status: "failed"` and `error_message: "Jamendo Api Invalid Client Id Error: ..."` — the parser inspects the envelope, never `response.ok`.
- Incompetech is a **playback-only** fallback. Never route it through the analyser.
- **Free Music Archive's public API is gone**: `api.freemusicarchive.org` resolves to an SOA record only (no A/AAAA), `/api` and `/api/get/tracks.json` return 404, and the site is “Powered by Tribe of Noise”. The `fma` row stays as `retired: true` so nobody re-adds it.

## 3. The keyless curated catalog — now the PRIMARY source

The owner's objection was decisive: **“my app user will not login to that website.”** So the default must be a list we ship, not a search every user authenticates for.

**Keyless stream shape (no account, no `client_id`, no cookies):**

```
https://prod-1.storage.jamendo.com/?trackid=<id>&format=mp31
```

Invalid/made-up ids 404, so every row was probed individually. **28 tracks survived** (target was 20–40); each one is `206`/`200`, `audio/mpeg`, and carries the reflected CORS header.

### How each row was verified (do not add a row without repeating this)

1. GET the storage URL with `Range: bytes=0-…` → 206/200 and the reflected `Access-Control-Allow-Origin`.
2. Parse the MP3's own **ID3v2** frames: `TIT2` (title), `TPE1` (artist), `TCON` (genre), `TCOP` (CC licence URL), plus the Xing/Info frame count for exact duration. This is the file's metadata, **not** a guess.
3. Cross-check `https://www.jamendo.com/track/<id>` → 200 and `og:title` matches `"<artist> - <title>"`.

Where an id failed step 1 or 3 it was dropped. **No title or artist in this catalog is invented** — every `title`/`artist` came out of the MP3 or the track page.

### The 28 curated tracks

`durationSec` is exact (Xing frames). `genre` is the file's own tag, `—` means the file had no `TCON`. `mood` is derived from the genre tag only (heuristic, see the caveat below).

| # | id | title | artist | dur | licence | genre | mood |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 8888 | Dub'n Khmer | Stygmate | 321s | CC BY-ND 2.5 | — | — |
| 2 | 654467 | Lit de parade | CHASMA | 195s | CC BY-SA 2.5 | — | — |
| 3 | 776462 | Infinite Loop | Figures in Motion | 324s | CC BY 3.0 | — | — |
| 4 | 843579 | C Est Moi Le Pauvre | Les Résidus Plasmiques | 181s | CC BY-SA 3.0 | — | — |
| 5 | 888397 | Waves | Small Scale Revolution | 94s | CC BY-SA 3.0 | — | — |
| 6 | 993073 | Strange Electronic and Brass Drum and Bass | Dajte Grammy | 98s | CC BY-NC-SA 3.0 | drumnbass, electronic | upbeat |
| 7 | 1040042 | Le domaine des carpes | Time Sequencers | 403s | CC BY-SA 3.0 | ambiant | calm |
| 8 | 1072508 | The Moment Of Light | BILLY KORG | 187s | CC BY-SA 3.0 | — | — |
| 9 | 1120043 | Oh baby | Armando Lagozza | 173s | CC BY-NC-SA 3.0 | indie, pop | upbeat |
| 10 | 1215937 | akustische Seele | Uwe Haupt | 181s | CC BY-ND 3.0 | chillout | calm |
| 11 | 1282341 | Lonely Planet | DJ Frankie Holmes | 224s | CC BY 3.0 | electronic | upbeat |
| 12 | 1319502 | Wanna See You | Niki J Crawford | 249s | CC BY-NC-ND 3.0 | rnb | upbeat |
| 13 | 1337756 | Junior Italy | Evesent | 94s | CC BY-NC-ND 3.0 | pop | upbeat |
| 14 | 1388694 | 2AM | Blaine T. Goodwin | 120s | CC BY-NC-ND 3.0 | chillout | calm |
| 15 | 1464238 | Transfer | Defenix 21 | 293s | CC BY-NC-ND 3.0 | deephouse | upbeat |
| 16 | 1470768 | Echo Chamber (dry mix) | Christian Zell | 253s | CC BY 3.0 | filmscore, chillout | calm |
| 17 | 1486484 | The Predilection-SLMR | The Predilection | 151s | CC BY-NC-ND 3.0 | hiphop | upbeat |
| 18 | 1493736 | Aftermath | The ARTISANS Beats | 233s | CC BY-NC-ND 3.0 | synthwave | upbeat |
| 19 | 1524636 | Life is Beautiful \| Happy Inspirational | ANtarcticbreeze | 256s | CC BY-NC-ND 3.0 | poprock | upbeat |
| 20 | 1532301 | Fashion Luxury | TimTaj | 150s | CC BY-NC-ND 3.0 | house, pop | upbeat |
| 21 | 1555709 | Cyber Creature | Jake Beyond | 256s | CC BY-NC-ND 3.0 | synthwave | upbeat |
| 22 | 1588292 | Long Funky Nights | Funkilla | 70s | CC BY-NC-ND 3.0 | — | — |
| 23 | 1610421 | Chrysophylax | Eidunn | 244s | CC BY-SA 3.0 | trap | upbeat |
| 24 | 1662028 | LOVABLE | hantell | 243s | CC BY-NC-ND 3.0 | smoothjazz | calm |
| 25 | 1943821 | DJ FARG | Dareius | 143s | CC BY-NC-ND 3.0 | electronic | upbeat |
| 26 | 2151520 | Mediterranea | piccadillyCircus | 230s | CC BY-NC-SA 3.0 | gypsy, latin | upbeat |
| 27 | 2311861 | Funky Trap | Jackson Frost | 91s | CC BY-NC-ND 3.0 | trap, hiphop | upbeat |
| 28 | 2347616 | Bob | Airbox | 302s | CC BY-NC-ND 3.0 | reggae | upbeat |

Result: **16 upbeat / 5 calm / 7 unmapped**. `curatedJamendoForMood()` returns those buckets; unmapped rows are excluded rather than guessed.

### Rejection log (why the count is 28 and not 40+)

Probed 560+ candidate ids harvested from public Jamendo track/album pages; most 404 (nonexistent), and the rest were dropped for a concrete reason:

| id | reason dropped |
| --- | --- |
| 1701132 | 14 s ident; ID3 artist disagreed with the track page |
| 2016996 | 8.3 MB embedded album art — unacceptable streaming latency |
| 1987304, 1564941, 2202649, 1996324, 1968122, 2338075, 1610447 | `jamendo.com/track/<id>` returned 404 (unverifiable attribution) |
| 2346379, 895554 | title duplicated the artist; not a real title |
| all other candidates | storage URL 404 / no audio |

**Metadata completeness:** all 28 have a real `title` and `artist`, so `metadataIncomplete: false` for every row, and `CURATED_JAMENDO_TRACKS` is asserted to be complete in the tests. The 7 rows with `genre: null` are **not** metadata-incomplete in the legal sense — the MP3 simply had no `TCON` frame; they just cannot be mood-bucketed. If the owner ever sets a `client_id`, the follow-up can backfill genre/mood from the API.

### Honest limits

- `mood` is derived from the artist's own genre tag, **not** from listening. Nobody has auditioned all 28 and confirmed tempo.
- Durations are exact for these files; `mp31` is ~96 kbps, so streaming cost is low but quality is "background music", not hi-fi.
- Licences are mostly **CC BY-NC-\\*** and **CC BY-ND**: non-commercial and no-derivatives. Attribution is a **licence obligation**, so `attribution` must stay visible/spoken. If the product ever ships commercially, re-review the NC rows.

### Rotation (no more "always the same first track")

`createMusicStream()` keeps a **shuffle bag**: both `nextCurated()` and `search('')` deal from a shuffled pass of all 28 tracks, every track exactly once per pass, and a freshly refilled pass is prevented from opening with the track that closed the previous pass. `resetRotation()` clears it (tests, fresh session).

## 4. The optional API-backed search (SECOND)

Gated behind `NEXT_PUBLIC_JAMENDO_CLIENT_ID`. This is **not** the headline and must never be required.

- **The `client_id` belongs to the APP.** The developer registers once at `devportal.jamendo.com`; end users never log in, never see Jamendo, never paste a key. This directly answers the owner's objection.
- **All users share one quota.** Hence the 60 s in-memory cache, and failures are **never** cached so a transient timeout retries. Debouncing keystrokes (200–300 ms) is the caller's job.
- **Failure degrades to the curated list, never to an error.** `jamendo`'s provider row is `available() === true` with or without a key (the catalog is keyless); a rejected/missing key just skips the extra API rows. `failures` still report the reason for diagnostics, but the UI already has playable tracks.
- **The key is visible in the client bundle.** This is a static site; any `NEXT_PUBLIC_*` value ships to the browser. For a read-only public API that is acceptable and is **not** a leaked secret — do not treat it as one, and do not move it behind a proxy just to hide it. If misuse ever becomes a problem, the remedy is a server-side proxy plus rotating the key, not pretending it is private.

Pixabay stays as an optional second keyed provider (`NEXT_PUBLIC_PIXABAY_API_KEY`); its audio parser is deliberately defensive because the audio response schema could not be confirmed without a real key.

## 5. Env vars

| Var | Provider | When unset |
| --- | --- | --- |
| *(none)* | Jamendo curated catalog | — it is the default source; always works |
| `NEXT_PUBLIC_JAMENDO_CLIENT_ID` | Jamendo text search | search falls back to the curated catalog; `keyPresent: false`; reason `no-key` |
| `NEXT_PUBLIC_PIXABAY_API_KEY` | Pixabay | provider `available() === false`, search reports `no-key` |

## 6. Module surface

```ts
type MusicTrack = {
  id: string;                       // `jamendo:<raw id>`
  provider: 'jamendo' | 'pixabay' | 'incompetech' | 'fma';
  title: string | null;             // null, never invented
  artist: string | null;
  metadataIncomplete: boolean;      // true when title or artist is null
  source: 'curated' | 'search';
  durationSec: number;              // 0 = provider published none
  streamUrl: string;
  licence: string;
  attribution: string;              // licence obligation — show or speak it
  analysable: boolean;              // the CORS safety gate
  genre?: string | null;
  mood?: 'upbeat' | 'calm' | null;
  shareUrl?: string;
};

// The PRIMARY, keyless feature
CURATED_JAMENDO_TRACKS        // 28 verified tracks, catalog order
curatedMusicTracks()          // shared instance copy
nextCuratedMusicTrack()       // one shuffled track (bag rotation)
curatedJamendoSearch(q, opts) // pure local keyword search, accent-insensitive
curatedJamendoForMood('upbeat' | 'calm')

createMusicStream(deps?)      // injectable env/fetch/now/timeoutMs/cacheTtlMs
  .curatedTracks() / .nextCurated() / .resetRotation()
  .providers() / .capabilities() / .availableProviders()
  .search(q, { limit?, providers? })  // never throws; { tracks, failures, fromCache }
  .clearCache()

musicStream() / searchMusic(q, opts) / musicStreamCapabilities()
musicPlaybackPlan(track)      // analysable | untapped routing decision
musicAttributionLine(track)
```

Behavioural contract:

- `available()` is synchronous and truthful (key presence + not retired, no network). Jamendo is available **always** because of the keyless catalog (`keylessCatalog: true` in `capabilities()`).
- `search()` never throws and never invents tracks. An **empty query** returns a shuffled batch of the curated catalog with **no network**. Failures come back as `{ provider, reason, detail }` with `reason` in `no-key | no-api | timeout | network | http | parse | provider-error`.
- Results are merged in preference order, de-duplicated by id and URL, curated first, so a dead API can never hide the catalog.
- Every fetch has an `AbortController` timeout (`DEFAULT_TIMEOUT_MS = 8_000`) that really aborts; a hanging provider cannot wedge the picker.
- Zero imports at module top level perform I/O — safe in tests, server or client bundles.

## 7. The safety gate (`musicPlaybackPlan`)

```ts
analysable: true  → kind: 'analysable', crossOrigin: 'anonymous',
                    routeThroughAnalyser: true
analysable: false → kind: 'untapped', crossOrigin: null,
                    routeThroughAnalyser: false
```

- `analysable: true` ⇒ set `crossOrigin = 'anonymous'` **before** `src`, then create the media source and analyser. Dance onsets, lip-sync and the beat clock work.
- `analysable: false` ⇒ plain `<audio>`, **never** create a media source. Audible, but no beat lock → body must use `setKnownTempo(estimateBpm(style))`.
- Never re-derive this rule at a call site. Use the plan.

## 8. Integration as shipped (`r2026-11-24.298`)

The plan above was followed, with one deliberate substitution noted at the end.

1. **Two-step construction — done.** `apps/web/lib/music.ts:playClipElement()` takes an optional `playback` plan, builds `new Audio()`, sets `crossOrigin` **before** `src`, and treats a rejected play as untappable rather than fatal.
2. **Analyser gate — done.** `armClipFromElement()` now gates on `playback ? playback.analysable : isSameOriginUrl(url)`. The known-tempo path is untouched, and a failed analysable play retries once without `crossOrigin` (the stale-allowlist case) before the procedural bed takes over.
3. **Resolution — done, keyless-first.** `resolveStreamBed()` in `lib/music.ts` orders: exact Mixkit id → exact curated id → owner pins (`pickStreamTrack`, unchanged) → `curatedTrackForStyle(style, n, mood)` → procedural. Chip options in `lib/music-ask.ts` fall back to `curatedTracksForStyle()` when the pinned pool is empty for that style. Attribution (`musicAttributionLine`) goes to the now-playing chip and is spoken by `performanceIntroLine(…, artist)`.
4. **Plan on the clip — done.** `lib/performance-clips.ts` carries `artist`, `analysable` and `attribution`; `lib/music-stream-bed.ts` builds the synthetic clip with `analysable: plan.routeThroughAnalyser` and `license: 'Jamendo-CC'`.
5. **Optional key UI — NOT done.** `NEXT_PUBLIC_JAMENDO_CLIENT_ID` still only gates text search and has no settings surface. Deliberate: it is an env value a Pages build cannot have, so a UI for it would be dead there.
6. **`live-beat.ts` untouched.** Confirmed.

**Deliberate substitution:** bare "play music / let's dance" routes through the same `resolveStreamBed()` chain rather than calling `nextCuratedMusicTrack()` directly. One resolver means the owner's pinned tracks keep working exactly as before and the curated catalog only fills the gap; a second entry point could have reordered pins and regressed the existing dance tests.

**Export safety:** `lib/music-stream-bed.ts` imports only the pure catalog + `musicPlaybackPlan`; no `fetch`, no `searchMusic`, no env read, so `AMOJI_EXPORT=1` bundles keep zero API references (asserted in `tests/music-stream-wiring.test.ts`).
