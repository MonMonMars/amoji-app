# Music streaming / playlist stub

## Today

Sing, dance, and piano use **original procedural WebAudio** themes plus optional **bundled library clips** (`apps/web/lib/music.ts`, `performance-clips`). No third-party stream scrape, no undocumented CDN hotlinks.

## Stub

```ts
/** Prefer a legal catalog URL when one exists; otherwise null → keep WebAudio. */
export function resolveStreamPlaylist(_style?: string): string | null {
  return null;
}
```

Call sites may check this before falling back to `startPerformanceMusic` / `startLibraryPerformance`. Returning `null` is the correct shipping behavior until a licensed source is wired.

## Allowed future sources

- First-party hosted files with clear redistribution rights
- Explicit embed APIs / oEmbed partners under their ToS
- Royalty-free catalogs with a documented license file in-repo or in ASSETS

## Not allowed

- Scraping Spotify, YouTube, Apple Music, NetEase, etc.
- Hard-coding private stream manifests or DRM-bypass URLs
- Shipping copyrighted karaoke beds without a license row in `docs/ASSETS.md`

## Product preference

Prefer **stream/embed URLs** over growing the static export with large audio when a legal catalog exists; until then keep the procedural band.
