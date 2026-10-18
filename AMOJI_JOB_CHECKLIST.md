# Amoji job checklist

Locale → engine → voice lives in `apps/web/lib/voice-catalog.ts`. Non-Yue engines stay in that map. They are not deleted.

## Done

- PC audio: every `AudioContext` and `<audio>` path calls `setSinkId('')`, then `'default'`. No device id, no Howler, no Bluetooth hardcode.
- Voice: each want-list character has its own Edge slot per language (voice + pitch + pace), then gendered `speechSynthesis` with that same pitch and pace. Yue stays on Edge `zh-HK` (only two female voices and one male on the free list). `canto-tts-nano` is not in the repo, so that hop is skipped. gTTS is not on this chain.
- TTS cleaner on `speak()`, `sing()`, and the chat display (`apps/web/lib/speak-text.ts`).
- Wait state: IdleBreathCalm, the 20 Cantonese lines below, no wait-time dance or music.
- Camera: wider polar orbit (`PHI_MIN` 0.25, `PHI_MAX` π−0.25; was 1.08 / 2.55). Yaw stays 360°. PC hold-to-pan only on a distant blank miss, and only after the hold arms.
- Scroll: history scrolls itself. The invisible lower-third pad is gone. Bottom chat wrapper does not catch empty clicks.
- Wardrobe: idle is a 40×40 icon beside settings. Press opens a full-screen view. Close returns to the preview.
- Selection: same live VRM and backdrop as chat. Bottom strip is release face portraits (numbered) plus scene thumbs lettered A… from daytime to nighttime. No back button. No 「即將推出」 row.
- LLM: anonymous race is `openai-fast` and `openai` with `reasoning_effort: low`. Keyed Groq uses `llama-3.3-70b-versatile`.
- Idle crossfades are longer so loops blend. Feet stay planted. Load T-pose is unchanged.

## In progress

- None in this branch.

## Open / remains

- Modular GLBs are not in the repo. Drop them from `D:\Blender\projects\mon-character\free-library\modular\` into `apps/web/public/models/modular/`. Until then a cloth change reloads the outfit's full VRM. Head scale stays 1. Do not re-split.
- CosyVoice2-Yue and GPT-SoVITS wait on Pixel’s male and female reference clips plus a GPU. Not blocking.
- Kokoro, Piper, MeloTTS, and Bark are mapped below and are not called. Weights are not bundled. Bark stays optional because latency is high.
- Coqui (CPML), Fish Speech, and F5-TTS are skipped. Non-commercial.
- `speechSynthesis` has no sink pin. If Edge is blocked and only the browser voice plays, Windows can still route that API to a communications device.
- Anonymous Pollinations only exposes `openai-fast` (GPT-OSS 20B). No smarter keyless model to switch to.
- `think-phrases.ts` is unused by the wait UI. The spoken wait lines are `thinking-lines.ts`.

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

1. 嗯，等我諗下先
2. 嗯嗯嗯
3. 唔聲，咁樣諗下諗下
4. 我思考緊啦
5. 我諗下先
6. 咁樣啦
7. 嗯，呢個好問題，等我諗下，咁樣囉
8. 等陣，我想清楚啲先
9. 嗯……畀我諗一諗
10. 好問題嚟嘅，諗下先
11. 唔好意思，諗緊啊
12. 等等我，即刻諗到
13. 嗯嗯，咁樣先……
14. 我諗下點答你好
15. 稍等，腦海整理緊
16. 呵，等我搵下啱嘅講法
17. 嗯，再諗清楚少少
18. 靜一靜，諗下先
19. 咁……等我諗定先講
20. 嗯嗯嗯，差唔多諗到喇

## Notes

- Source of the 20 lines: `apps/web/lib/thinking-lines.ts`. Yue warmup and yue thinking fillers copy that list.
- Layout files: `SelectionBoard.tsx`, `WardrobeSwap.tsx`, `app/chat/page.tsx`, `ChatPanel.tsx`.
- PR: https://github.com/MonMonMars/amoji-app/pull/7
- GitHub Pages: `.github/workflows/pages.yml` runs on every push to `main` (and `workflow_dispatch`). It static-exports `@amoji/web` with `AMOJI_BASE_PATH=/amoji-app` and deploys `apps/web/out` to the `github-pages` environment. Merging this PR is what updates https://monmonmars.github.io/amoji-app/. The PR branch itself does not deploy.
- Piper / Melo / Kokoro / Bark stay in `voice-catalog.ts` as non-shipping stubs. VoxCPM2, Chatterbox, CosyVoice, and Qwen3-TTS are held for a later GPU host and are not called. Google Cloud, Azure, and Polly are not wired.
- Verify: selection shows the live chat VRM on the chat backdrop; face thumbs are release portraits; scene thumbs run A (day) through L (night); a thumb tap swaps the body; chat icon opens wardrobe full-screen and close restores orbit; history wheel-scrolls; hold on a side margin pans.
