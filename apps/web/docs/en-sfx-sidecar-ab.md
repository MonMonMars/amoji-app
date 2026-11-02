# EN emotion/SFX sidecar A/B (Silencio-2 蝜?Chatterbox-Turbo 蝜?Vui Nano 蝜?Lure)

**Status:** DESKTOP test spike. Flags default **off**. Not in `freeVoiceHops()`. Edge chat / Yue / ja untouched. **No EN+Cantonese code-switch.** Reaction CMA clips stay as clips (Wanted wire is a separate PR).

Mon GO 2026-11-02: put Silencio-class EN emotion/SFX engines behind **distinct voice-select buttons** so Mon can A/B quality.

## How Mon hits the buttons

1. Start the local gateway (DESKTOP, D: HF cache already set by setup scripts):

   ```powershell
   cd "D:\AI app development\amoji-app"   # or the worktree
   .\tools\en-sfx-gateway\run-gateway.ps1
   ```

   Listens on `http://127.0.0.1:8765` (`GET /health`, `POST /tts`).

2. Run the web app (`apps/web`) as usual (`pnpm dev` / static export preview).

3. Open **`/en-sfx-ab`**.

4. Tap one of the labeled engine buttons:

   | Button | Engine | Flag (default off) |
   |--------|--------|--------------------|
   | **Edge (baseline)** | shipping Edge EN | ??|
   | **Silencio-2 (test)** | `tools/silencio2-sidecar` | `NEXT_PUBLIC_AMOJI_SILENCIO2` |
   | **Chatterbox-Turbo (test)** | `tools/chatterbox-turbo-sidecar` | `NEXT_PUBLIC_AMOJI_CHATTERBOX_TURBO` |
   | **Vui Nano (test)** | `tools/vui-nano-sidecar` | `NEXT_PUBLIC_AMOJI_VUI_NANO` |
   | **Lure-TTS-0.6B (test)** | `tools/lure-tts-sidecar` | `NEXT_PUBLIC_AMOJI_LURE_TTS` |

5. Tap a sample (`[laugh]`, `[sigh]`, ?? to preview. Pick persists in `localStorage` key `amoji.enSfxAb.engine.v1`.

**Fail-closed:** unhealthy / missing sidecar ??page uses Edge speak for that sample. Sidecars never enter the shipping chat hop chain.

## Architecture

- Static export ??no Next API routes. Browser talks to **localhost gateway** (`tools/en-sfx-gateway/gateway.py`) which shells out to each engine?謒?smoke/synth entry on D:.
- Weights live under `D:\LocalAI\cache\huggingface` (set `HF_HOME` / `HUGGINGFACE_HUB_CACHE`). **Not in git.**
- Per-engine venvs under each `tools/<engine>-sidecar/.venv` on D: (see `setup-venv.ps1`).
- Catalog stubs: `apps/web/lib/voice-catalog.ts` rows with `shipping: false` + `HELD_GPU_ENGINES` notes. Shared A/B helpers: `apps/web/lib/en-sfx-sidecar.ts`.

## Smoke / SKIP notes (DESKTOP 2026-11-02 Asia/Hong_Kong)

| Engine | Smoke | Notes |
|--------|-------|-------|
| Silencio-2 | **OK** (#85) | Prior WAVs `D:\AI app development\silencio2-out\`. Weights `BlueRoseLabs/Silencio-2` on D: HF. |
| Chatterbox-Turbo | **OK** | First load/fetch ~341s; cached load ~12s. Utterances ~16–25s CPU. Needs EN ref **>5s** (`AMOJI_CHATTERBOX_REF` → `chatterbox-turbo-out\ref_en_gt5s.wav`). Out: `D:\AI app development\chatterbox-turbo-out\`. |
| Vui Nano | **SKIP** | `vui-tts` installs, but `Engine` requires **CUDA** (or Apple MLX). DESKTOP CPU has neither. Stub + UI button remain; fail-closed to Edge. |
| Lure-TTS-0.6B | **OK** (optional shipped) | Load ~233s first fetch; utterances ~10–17s CPU via `qwen-tts` / `Tesslate/Lure-TTS-0.6B`. Out: `D:\AI app development\lure-tts-out\`. SoX warning only (non-fatal). |

Weights stay on `D:\LocalAI\cache\huggingface` — never committed. Venvs: `D:\AI app development\*-venv`.

## Related

- Prior spike: [`silencio-2-spike.md`](./silencio-2-spike.md)
- CMA Wanted reaction wire: **out of scope** for this PR