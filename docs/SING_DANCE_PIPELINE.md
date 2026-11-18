# Sing / dance / listen pipeline

Durable summary of the performance flow. Full plan (gaps, P0–P2, mermaid): see team artifact `sing-dance-process-plan.md` on agent runs, or the expanded doc in `/opt/cursor/artifacts/` for Pixel reviews.

## Flow (library shows)

1. **Detect** — `music-ask.ts` (`resolveMusicAsk`) for play/list/pick; `moves.ts` / `content-motion.ts` for sing & dance keywords; `ChatPanel` short-circuits before LLM when matched.
2. **Intro** — `performanceIntroLine` names the track; body stays calm (`armPerfDance` only).
3. **Play** — `whenSpeechIdle` → `startLibraryPerformance` (`music.ts`); `perfPreserve` shields from generic `stopMusic()`.
4. **Body** — on `amoji:library-clip` `playing`, `commitPendingPerfDance` → `resolvePerfMotion` (+ `owner-dance-picks`) → `triggerMove` / `holdMove`; `CompanionCanvas` `playPerf` with `LoopRepeat` and BPM `timeScale`.
5. **Sing mouth** — RMS analyser on the vocal bed feeds `feedSpeechLevel` (after audible gate, not during intro).
6. **End** — `endPerformanceMusic` / clip `stopped` → `clearMove`, idle crossfade; new chat `send()` also calls `endPerformanceMusic`.

## Kinds today

| User intent | `beginShow` kind | Audio | Body |
|-------------|------------------|-------|------|
| Sing | `song` | CC0 vocal clip | `sing` VRMA |
| Dance | `dance` | CC0 or Mixkit BGM | `dance` VRMA |
| Play music | `dance` + `bed` | instrumental BGM | **listen-only** — calm idle, no VRMA until dance ask |

## Related docs

- [MUSIC_STREAMING.md](./MUSIC_STREAMING.md) — catalog, Mixkit, UX rules
- `apps/web/public/audio/LIBRARY.md` — CC0 assets
- `public/models/anims/DEFERRED_DANCE_VRMA.md` — leggy clip rollout

## Planned improvements (P0)

- ~~Explicit **listen** phase (BGM + calm idle, no dance until asked)~~ — **r212** `musicAskListenOnly` + `beginShow(listenOnly)`
- ~~Beat-aligned VRMA start from audio clock~~ — **r213** `libraryBedPlaybackSec` + `beatAlignedVrmaTime` on `playPerf` at `library-clip` `playing`
- ~~Unified session state (replace scattered pending refs)~~ — **r214** `performance-session.ts` + instant BGM stop on `endPerformanceMusic`
- Duet path aligned with library gate