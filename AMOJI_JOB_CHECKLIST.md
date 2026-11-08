# Amoji job checklist

Locale → engine → voice lives in `apps/web/lib/voice-catalog.ts`. Non-Yue engines stay in that map. They are not deleted.

## Done

- PC audio: every `AudioContext` and `<audio>` path calls `setSinkId('')`, then `'default'`. No device id, no Howler, no Bluetooth hardcode.
- Voice: each want-list character has its own Edge slot per language (voice + pitch + pace), then gendered `speechSynthesis` with that same pitch and pace. **Edge readaloud now 403s server-side for the published client token (verified 2026-11-07: 401 without the token, 403 with it, with or without an Edge UA / extension Origin), so the Edge tier is effectively dead and a Cloudflare relay on the same token 403s too.** `canto-tts-nano` is not in the repo, so that hop is skipped. The live chain is now `edge → gtts → synth` (`apps/web/lib/tts-chain.ts`); the Google Translate MP3 tier is on the chain as of 2026-11-07 because it is the only path that survives a blocked socket *and* the iOS hardware silent switch.
- TTS cleaner on `speak()`, `sing()`, and the chat display (`apps/web/lib/speak-text.ts`).
- Wait state: IdleBreathCalm, short loading stubs (`apps/web/lib/thinking-lines.ts` — 3 entries per language, not a long list), no wait-time dance or music. `think-phrases.ts` wraps those stubs for mood selection and is exercised only by `tests/mood-voice.test.ts`; no app component imports it.
- Camera: wider polar orbit (`PHI_MIN` 0.25, `PHI_MAX` π−0.25; was 1.08 / 2.55). Yaw stays 360°. PC hold-to-pan only on a distant blank miss, and only after the hold arms.
- Scroll: history scrolls itself. The invisible lower-third pad is gone. Bottom chat wrapper does not catch empty clicks.
- Wardrobe: idle is a 40×40 icon beside settings. Press opens a full-screen view. Close returns to the preview.
- Selection: same live VRM and backdrop as chat. Bottom strip is release face portraits (numbered) plus scene thumbs lettered A… from daytime to nighttime. No back button. No 「即將推出」 row.
- LLM: anonymous race is `openai-fast` and `openai` with `reasoning_effort: low`. Keyed Groq uses `llama-3.3-70b-versatile`.
- Idle crossfades are longer so loops blend. Feet stay planted. Load T-pose is unchanged.

## In progress

- Merge stack (human): #285 setup → #292 audio gate → #291 selectable history → **#301 reply quality/privacy** → #302 chat entry. See `docs/MERGE_CHECKLIST.md`.
- Polish open: #297 poke hide, #298 HelloWave bye-only, #299 cast lighting, #300 mood orb, #283 select back.
- Status board: `docs/PROJECT_STATUS.md` + `docs/project-status.html`.

## Open / remains

- Modular GLBs are not in the repo. Drop them from `D:\Blender\projects\mon-character\free-library\modular\` into `apps/web/public/models/modular/`. Until then a cloth change reloads the outfit's full VRM. Head scale stays 1. Do not re-split.
- CosyVoice2-Yue and GPT-SoVITS wait on Pixel’s male and female reference clips plus a GPU. Not blocking.
- Kokoro, Piper, MeloTTS, and Bark are mapped below and are not called. Weights are not bundled. Bark stays optional because latency is high.
- Coqui (CPML), Fish Speech, and F5-TTS are skipped. Non-commercial.
- `speechSynthesis` has no sink pin. If Edge is blocked and only the browser voice plays, Windows can still route that API to a communications device.
- Anonymous Pollinations only exposes `openai-fast` (GPT-OSS 20B). No smarter keyless model to switch to.
- `think-phrases.ts` is unused by the wait UI. The spoken wait lines are `thinking-lines.ts`.
- Music streaming: `resolveStreamPlaylist()` returns `null` until a **licensed** catalog/embed exists (`docs/MUSIC_STREAMING.md`). Do not scrape Spotify/YouTube/etc.
- Post-merge live verify on https://monmonmars.github.io/amoji-app/setup after the stack lands.

## Voices

Recommend shipping defaults: **zh-HK-HiuMaanNeural** (F), **zh-HK-WanLungNeural** (M). HiuGaai is the brighter female alternate.

| Locale | Shipping (tried) | Kept, not bundled (not tried in-app) |
| --- | --- | --- |
| yue / zh-HK | Edge HiuMaan, HiuGaai, WanLung. speechSynthesis zh-HK (HiuMaan, HiuGaai, Sin-ji, 粤語, WanLung) | Cosy later, when refs exist |
| en | Edge Jenny / Guy. speechSynthesis en-US (Zira, Samantha, Aria / David, Mark, Guy) | Kokoro `af_heart` / `am_adam`, Piper `en_US-lessac-medium` / `en_US-ryan-medium`, MeloTTS en |
| ja | Edge Nanami / Keita. speechSynthesis ja (Nanami, Kyoko / Keita, Otoya) | MeloTTS ja, Piper `ja_JP-natsuya-medium` if a voice is installed |
| zh / zh-CN | Edge Xiaoxiao / Yunjian. speechSynthesis zh-CN (Xiaoxiao, Huihui / Yunxi, Kangkang) | MeloTTS zh, Kokoro `zf_xiaobei` / `zm_yunxi`, Piper `zh_CN-huayan-medium` |

Bark `v2/en_speaker_9` is on the English row as optional high latency. It does not ship.

Skipped, not in the map: Coqui CPML, Fish Speech CC-BY-NC, F5-TTS CC-BY-NC.

## Dialogue presets

**Correction (2026-11-07 audit).** This section used to list 20 Cantonese "dialogue preset" lines and claim they were sourced from `apps/web/lib/thinking-lines.ts`. **They are not in the repo.** None of those 20 strings appears anywhere in `apps/web`; the file actually holds three short stub arrays per language for the loading state:

```ts
LOADING_STUBS      = { yue: ['嗯……', '嗯嗯……', '嗯……等我諗下。'], ... }
LOADING_MOOD_STUBS = { <mood>: { yue: [...3], zh: [...3], ja: [...3], en: [...3] } }
```

So there is no 20-line preset bank to preserve. If Mon wants a longer spoken wait bank it has to be authored — it does not already exist on disk.

## Notes

- Loading stubs live in `apps/web/lib/thinking-lines.ts`; `think-phrases.ts` selects a stub by mood and is referenced only by `tests/mood-voice.test.ts`.
- Layout files: `SelectionBoard.tsx`, `WardrobeSwap.tsx`, `app/chat/page.tsx`, `ChatPanel.tsx`.
- TTS map: `docs/TTS_PIPELINE.md`. Privacy: `docs/PRIVACY_MEMORY.md`. Entry: `docs/CHAT_ENTRY_FLOW.md`.
- GitHub Pages: `.github/workflows/pages.yml` runs on every push to `main` (and `workflow_dispatch`). It static-exports `@amoji/web` with `AMOJI_BASE_PATH=/amoji-app` and deploys `apps/web/out` to the `github-pages` environment. Merging to `main` updates https://monmonmars.github.io/amoji-app/. Feature branches do not deploy.
- Piper / Melo / Kokoro / Bark stay in `voice-catalog.ts` as non-shipping stubs. VoxCPM2, Chatterbox, CosyVoice, and Qwen3-TTS are held for a later GPU host and are not called. Google Cloud, Azure, and Polly are not wired. **Google Translate's free MP3 endpoint IS wired** (`lib/gtts.ts`, a real chain hop since 2026-11-07) — that is not Google Cloud TTS.
- Verify: selection shows the live chat VRM on the chat backdrop; face thumbs are release portraits; scene thumbs run A (day) through L (night); a thumb tap swaps the body; chat icon opens wardrobe full-screen and close restores orbit; history wheel-scrolls; hold on a side margin pans.
- Last checklist refresh: 2026-11-09 (HKT) — docs pack + music stub + open PR merge board.
