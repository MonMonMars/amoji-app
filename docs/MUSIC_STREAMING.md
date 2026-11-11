# Music streaming / playlist

## Today

Sing, dance, and piano use three layers:

1. **Original procedural WebAudio** themes (`apps/web/lib/music.ts`) — including style aliases (`pop`, `jazz`, `lofi`, `hiphop`, `electronic`, `ballad`, `rock`, `cantopop`).
2. **Bundled CC0 clips** under `apps/web/public/audio/` (`performance-clips.ts`, `LIBRARY.md`).
3. **Royalty-free stream previews** from Mixkit Free Stock Music (`music-catalog.ts`) when the user names a genre (e.g. “play jazz”, “粵語歌”, “lofi”).

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

Ask the user what style they want when the request is vague; map that style to Mixkit / local beds. Prefer stream previews over growing the static export with large audio when a legal catalog exists.

## Demo-phase / sing defaults (2026-11)

`pickPerformanceClip` soft-weights **classic / lullaby-feel** CC0 tracks (Twinkle Twinkle, Silent Night, Joy to the World, Shenandoah, Happy Birthday, flowerbed / lullaby beds) and deprioritizes short SFX, overtone drones, and sparse chant beds. All listed files remain **CC0-1.0 / public domain** — see `apps/web/public/audio/LIBRARY.md`. Do **not** ship copyrighted commercial recordings (no Louis Armstrong “What a Wonderful World” masters; use PD/CC0 equivalents already in the pack).

Voice + BGM: spoken TTS keeps a **steady** gain. Library beds stay at ambient ~30% BGM gain and are **not** auto-ducked under dialogue.
