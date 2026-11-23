# Music streaming / playlist

**Performance flow (sing / dance / body sync):** [SING_DANCE_PIPELINE.md](./SING_DANCE_PIPELINE.md)

## Today

Sing, dance, and piano use three layers:

1. **Original procedural WebAudio** themes (`apps/web/lib/music.ts`) ‚Äî including style aliases (`pop`, `jazz`, `lofi`, `hiphop`, `electronic`, `ballad`, `rock`, `cantopop`).
2. **Bundled CC0 clips** under `apps/web/public/audio/` (`performance-clips.ts`, `LIBRARY.md`).
3. **Royalty-free stream previews** from Mixkit Free Stock Music (`music-catalog.ts`) when the user names a genre (e.g. ‚Äúplay jazz‚Äù, ‚ÄúÁ≤µË™ûÊ≠å‚Äù, ‚Äúlofi‚Äù, ‚ÄúJ-pop‚Äù / `jpop`, **American pop** / `uspop`). Owner catalog ids **MV039‚ÄìMV118** (80 Mixkit beds: J-pop `music-jpop-vault.ts` + `music-jpop-vault-v2.ts`, US `music-us-pop-vault.ts`, world/lofi expansion `music-world-vault.ts` **MV099‚ÄìMV118**; registry `music-mv-registry.ts`). Reserved legacy slot **MV001‚ÄìMV038**; core vault **MV039‚ÄìMV098**; expansion **MV069‚ÄìMV083** (JP), **MV084‚ÄìMV098** (US), **MV099‚ÄìMV118** (world mix).

TTS karaoke ditties live in `songs.ts` (original lyrics; no third-party audio).

## API

```ts
resolveStreamPlaylist(style?: string): string | null
detectMusicStyle(text: string): MusicStyleId | undefined
pickStreamTrack(style, n): StreamTrack | null
```

- Empty style ‚Üí `null` ‚Üí keep local CC0 / procedural band.
- Named style ‚Üí HTTPS Mixkit preview URL (or PD) played via `<audio>` for **dance beds**.
- Sung ‚Äúsongs‚Äù still prefer gendered CC0 vocal clips + original lyric bank.

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

- Generic ‚Äúplay music / sing something‚Äù ‚Üí **random** autoplay from the short free catalog; speak the **song/track name** (and genre) before the bed (`performanceIntroLine`).
- **Selection UI / chips only** when the user explicitly asks to choose / list / pick (‚Äúlet me choose‚Äù, ‚Äúwhat songs do you have‚Äù, ‚Äúlist songs‚Äù).
- Genre asks (‚Äúplay jazz‚Äù, ‚Äúsomething calm/lofi‚Äù) ‚Üí filter catalog then random within genre; if they also asked to choose, offer 2‚Äì3 named options.
- Prefer Mixkit stream previews for instrumental beds; sung tracks stay on local CC0 vocal clips. Do not grow the static export with large audio when a legal catalog exists.

## Demo-phase / sing defaults (2026-11)

`pickPerformanceClip` soft-weights **classic / lullaby-feel** CC0 tracks (Twinkle Twinkle, Silent Night, Joy to the World, Shenandoah, Happy Birthday, flowerbed / lullaby beds) and deprioritizes short SFX, overtone drones, and sparse chant beds. All listed files remain **CC0-1.0 / public domain** ‚Äî see `apps/web/public/audio/LIBRARY.md`. Do **not** ship copyrighted commercial recordings (no Louis Armstrong ‚ÄúWhat a Wonderful World‚Äù masters; use PD/CC0 equivalents already in the pack).

Voice + BGM: spoken TTS keeps a **steady** gain. Library beds stay at ambient ~30% BGM gain and are **not** auto-ducked under dialogue.

## Search-driven streaming providers (module landed dark, 2026-11-24)

`apps/web/lib/music-stream.ts` + `apps/web/lib/music-stream-providers.ts` add a
provider-agnostic search layer (Jamendo primary; Pixabay + Incompetech backup).
**Nothing imports it yet** and no user-visible behaviour changed: the integration
into `music.ts` / `SharedAudio` / `CompanionCanvas` is a separate PR, deliberately
sequenced after the in-flight audio PRs. Tests: `apps/web/tests/music-stream.test.ts`.

### Why this is constrained

Her dance/lip-sync reads real samples through `AnalyserNode`. `music.ts` documents
the rule: a cross-origin `<audio>` whose bytes are **not** CORS-readable goes
**silent** the moment it is rerouted through `createMediaElementSource`. Therefore:

- `MusicTrack.analysable === true` °˜ set `crossOrigin='anonymous'` **before** `src`,
  then create the media source and analyser (dance onsets, lips, beat clock work).
- `MusicTrack.analysable === false` °˜ play a plain `<audio>`, never create a media
  source. It is audible, but there is no beat lock, so the body must use the
  known-tempo path (`setKnownTempo(estimateBpm(style))`).

`musicPlaybackPlan(track)` encodes exactly those two routings; use it instead of
re-deriving the rule at a call site.

### Phase 1 °X measured network assumptions (2026-11-24)

Probed from this machine with PowerShell/curl, e.g.
`curl.exe -D - -o NUL -H "Origin: https://amoji.test" "<url>"`.
Literal response headers:

| Provider | Search endpoint | Key required | Search CORS (literal) | Audio CORS (literal) | `analysable` | Licence |
| --- | --- | --- | --- | --- | --- | --- |
| **Jamendo** | `https://api.jamendo.com/v3.0/tracks/` | **yes** °X `client_id` from devportal.jamendo.com | `access-control-allow-origin: *` | `Access-Control-Allow-Origin: https://amoji.test` (reflects the request `Origin`), plus `Access-Control-Allow-Credentials: true`, `Vary: Origin`, `Content-Type: audio/mpeg`, `Accept-Ranges: bytes` | **true** | CC per track (`license_ccurl`) |
| **Pixabay** | `https://pixabay.com/api/audio/` | **yes** °X API key | `Access-Control-Allow-Origin: *` (also on the 400 key error) | `Access-Control-Allow-Origin: *` on `cdn.pixabay.com/audio/...`, `Content-Type: audio/mpeg`, `Accept-Ranges: bytes` | **true** | Pixabay Content License |
| **Incompetech** | none (static MP3s) | no | n/a | **no `Access-Control-Allow-Origin` header at all**; also `Content-Type: application/octet-stream`, `Content-Disposition: attachment` | **false** | CC BY 4.0 (attribution required) |
| **Free Music Archive** | **dead** | °X | °X | °X | n/a | °X |

Notes on those measurements:

- Jamendo needs a `client_id` even for search. Without one (or with a bad one) it
  answers **HTTP 200** with `headers.status: "failed"` and
  `error_message: "Jamendo Api Invalid Client Id Error: Your credential is not authorized."`
  °X so the parser inspects the envelope, never `response.ok`.
- Jamendo audio reflected the requesting Origin on 11 of 13 sampled objects; 2
  returned a **foreign** origin (`https://monmonmars.github.io`, `https://app.example.org`)
  even with cache-busting query params, i.e. a stale per-object edge cache. A
  browser rejects those. The follow-up must therefore still handle a load error on
  an `analysable` track and retry **without** `crossOrigin` (playable, no dance).
- Jamendo also 404s for track ids that no longer exist; rows without a playable
  `audio` URL are dropped, never fabricated.
- Pixabay's `/api/audio/` route exists (it returns Pixabay's own
  `[ERROR 400] Invalid or missing API key` rather than a 404/HTML page) and is
  CORS-open, but its **response schema could not be confirmed without a real key** °X
  `parsePixabayResponse` is deliberately tolerant and returns a `parse` reason
  instead of guessing.
- **Free Music Archive's public API is gone**: `api.freemusicarchive.org` resolves
  to an SOA record only (no A/AAAA, so no server), `/api` and
  `/api/get/tracks.json` both return 404, and the site is now "Powered by Tribe of
  Noise". The `fma` row is kept as `retired: true` so nobody re-adds it.

### Env vars the owner must set

| Var | Provider | Effect when unset |
| --- | --- | --- |
| `NEXT_PUBLIC_JAMENDO_CLIENT_ID` | Jamendo | provider reports `available() === false`; search returns `no-key`, never fake rows |
| `NEXT_PUBLIC_PIXABAY_API_KEY` | Pixabay | same |

No key is needed for Incompetech (curated static MP3s, playback-only, never analysable).

### Module surface

```ts
interface MusicTrack {
  id: string; provider: 'jamendo' | 'pixabay' | 'incompetech' | 'fma';
  title: string; artist: string; durationSec: number;   // 0 = provider did not publish it
  streamUrl: string; licence: string; attribution: string;
  analysable: boolean;   // provider CDN verified CORS °X the analyser safety gate
  shareUrl?: string;
}

createMusicStream(deps?): MusicStream    // injectable env/fetch/now/timeoutMs/cacheTtlMs
  .providers()            // MusicProvider[] (in preference order)
  .capabilities()         // { id, keyEnv, keyPresent, available, audioAnalysable, licence, °K }
  .availableProviders()   // ids that would answer right now
  .search(q, { limit?, providers? })  // never throws; { tracks, failures, fromCache }
  .clearCache()

musicStream() / searchMusic(q, opts) / musicStreamCapabilities()   // shared instance
musicPlaybackPlan(track)  // °˜ analysable | untapped routing decision
musicAttributionLine(track)
```

Behavioural contract:

- `available()` is synchronous and truthful °X key presence only, no network.
- `search()` never throws and never invents tracks. Failures come back as
  `{ provider, reason, detail }` with `reason` in
  `no-key | no-api | timeout | network | http | parse | provider-error`.
- Every fetch has an `AbortController` timeout (`DEFAULT_TIMEOUT_MS = 8_000`) that
  really aborts the request; a hanging provider cannot wedge the picker.
- Results are cached in memory for 60 s; **failures are never cached**, so a
  transient timeout retries. **Debouncing keystrokes is the caller's job** (250 ms).
- Zero imports at module top level perform I/O °X safe to import in tests and in
  either server or client bundles.

### Follow-up integration (NOT done here)

When the concurrent audio PRs have merged, in this order:

1. `apps/web/lib/music.ts` °X `playClipElement()` builds `new Audio(url)`, which
   assigns `src` in the constructor and makes `crossOrigin` too late. Change it to
   `const audio = new Audio(); audio.crossOrigin = plan.crossOrigin ?? 'anonymous'`-style
   two-step construction, honouring `musicPlaybackPlan()`.
2. `apps/web/lib/music.ts` °X `armClipFromElement()` currently gates on
   `isSameOriginUrl(url)`. Replace that gate with the plan's `routeThroughAnalyser`
   flag so CORS-open cross-origin audio gets the real analyser, and keep
   `setKnownTempo(estimateBpm(clipStyle))` as the fallback branch (including the
   retry-without-`crossOrigin` path for the stale-allowlist case).
3. `apps/web/lib/performance-clips.ts` °X carry the plan/`analysable` bit on the
   synthetic clip that `streamDanceClip()` in `music.ts` builds, so a searched
   track and a catalogue track take the same route.
4. New picker UI (debounced `searchMusic` + `musicAttributionLine` on each row;
   `musicStreamCapabilities()` for the "set `NEXT_PUBLIC_JAMENDO_CLIENT_ID`" empty state).
5. `apps/web/lib/live-beat.ts` needs **no** change.

Nothing in this list is done in this PR, so no `APP_REVISION` / `sw.js` / `revision.txt`
bump: there is no user-visible change to cache-bust.
