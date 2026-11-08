# Voice / TTS pipeline

Shipping path for spoken lines. Detail checklist remains in root [`AMOJI_JOB_CHECKLIST.md`](../AMOJI_JOB_CHECKLIST.md); this page is the map.

## Live chain

`apps/web/lib/tts-chain.ts` (as of 2026-11-07):

```
edge → gtts → speechSynthesis
```

- **Edge** readaloud: catalog still maps per character/locale, but the published client token **403s** server-side — treat as dead until a new relay exists.
- **gtts**: Google Translate MP3 hop (`lib/gtts.ts`). Survives blocked sockets and the iOS hardware silent switch; keep as the middle tier.
- **speechSynthesis**: OS voices with the same pitch/pace hints. No `setSinkId` — Windows may still route to a communications device.

Locale → engine → voice tables: `apps/web/lib/voice-catalog.ts`. Non-shipping engines (Kokoro, Piper, MeloTTS, Bark, CosyVoice, …) stay mapped, not called.

## Text hygiene

- Cleaner on `speak()`, `sing()`, and chat display: `lib/speak-text.ts`.
- Clause pauses: PR #289 (in flight).
- Weather / news routing: merged #280.
- Volume: every `AudioContext` / `<audio>` pins `setSinkId('')` then `'default'`; tab-focus stability in #295.

## Performance music

Sing / dance / piano use `lib/music.ts` (procedural WebAudio + library clips). Streaming URLs are **not** scraped; see [`MUSIC_STREAMING.md`](./MUSIC_STREAMING.md).
