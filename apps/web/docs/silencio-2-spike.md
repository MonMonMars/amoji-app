# Silencio-2 EN emotion/SFX-tag sidecar (spike)

**Status:** spike / pre-wire. **Default OFF.** Not in the free Edge path.
**Date:** 2026-11-02 (HKT)
**Model:** [BlueRoseLabs/Silencio-2](https://huggingface.co/BlueRoseLabs/Silencio-2)
**Base:** Kyutai Pocket TTS 18M FT — ~27.9M params — one `model.safetensors` (~112 MB) — 24 kHz mono

## Goal

Optional **English-only** CPU sidecar for reaction-ish sound tags and emotion delivery:

| Sounds (inline) | Emotions (apply after tag) |
|---|---|
| `[laugh]` `[sigh]` `[gasp]` `[cough]` `[clear_throat]` | `<happy>` `<sad>` `<angry>` `<fear>` `<surprised>` `<whisper>` |

Use **beside** Edge for short EN filler / emotion takes — **not** a zh/Yue/Edge replacement.

## Hard constraints (Mon 2026-11-02)

- **EN-only.** Silencio-2 never sees Cantonese / Mandarin / Japanese chat lines.
- **No EN+Cantonese combine / code-switch pipeline.** Do not build mixed-language TTS routing.
- **Edge stays unchanged** for chat / Yue / zh (and ja). Fail-closed: if Silencio is unhealthy, stay on Edge / synth.
- **Not** CMA Wanted wire. Gallery Want/Skip remains Mon-gated.

## Feasibility: YES (sidecar), with constraints

| Question | Answer |
|---|---|
| Self-host / call without blocking Edge zh? | **Yes.** Keep Silencio off the browser TTS chain. Run as a local Python process (or later a tiny localhost HTTP sidecar). Edge / `speechSynthesis` / zh-HK / yue paths stay untouched. |
| Browser ONNX/WASM? | **No for v1.** Weights are PyTorch safetensors + Mimi codec (~112 MB + torch). Not suitable for shipping in the Next/GitHub Pages bundle. |
| License | Weights **CC-BY-4.0** (attribution OK for Amoji). `silencio2/core` **MIT**. Compatible with the free path *if* we attribute (see NOTICE). Not NC. |
| Language | **EN only.** No zh / Yue. Do not route Cantonese or Mandarin lines here. |
| CMA gallery | **Not wired.** CMA00304–349 Want/Skip stays Mon-gated. Silencio may later *bake* EN filler takes offline; it does not replace CMA clips. |

## Architecture (flagged stub)

```
Chat EN short filler / tagged line
        |
        |- flag OFF (default) -> Edge neural / synth (unchanged)
        |- flag ON + sidecar healthy -> optional Silencio-2 CPU generate/stream
                                         (EN tags only; fail -> Edge)
Yue / zh / ja chat  ------------------> Edge / synth only (never Silencio)
```

- **Env flag:** `NEXT_PUBLIC_AMOJI_SILENCIO2=0` (default). Set `1` only on a desktop that has the sidecar.
- **Helper:** `apps/web/lib/silencio2-flag.ts` (`isSilencio2Enabled()`).
- **Catalog:** `VoiceEngine` includes non-shipping `'silencio2'` (`shipping: false`). Never selected by `freeVoiceHops()`.
- **Runtime:** `tools/silencio2-sidecar/` — download weights to **D:** HF cache, smoke generate WAV. No weights in git.

## Size / latency (card + desktop notes)

| Item | Claim / finding |
|---|---|
| Weights | ~112 MB single safetensors (HF snapshot ~115+ MB incl. voices/samples/code) |
| Card RT | ~20x real-time on 4 CPU threads (Apple M4 quoted) |
| Windows DESKTOP | Torch via D: venv + CPU wheel. First-load (download + load) can be multi-minute; subsequent short `[laugh]` / filler likely sub-second to a few seconds with `quantize=True` — verify with `smoke_silencio2.py` |
| HF cache (this PC) | `HF_HOME` / `HUGGINGFACE_HUB_CACHE` on **D:** (`D:\LocalAI\cache\huggingface`). Never download to C:. |

## How to run the sidecar smoke (DESKTOP)

```powershell
# From repo root. Creates D:\AI app development\silencio2-venv if missing.
powershell -ExecutionPolicy Bypass -File tools\silencio2-sidecar\setup-venv.ps1
# Then:
$env:HF_HOME = 'D:\LocalAI\cache\huggingface'
& "D:\AI app development\silencio2-venv\Scripts\python.exe" tools\silencio2-sidecar\smoke_silencio2.py
```

Outputs land under `D:\AI app development\silencio2-out\` (outside the repo).

Optional: set `AMOJI_SILENCIO2_ROOT` to a pre-downloaded snapshot folder to skip Hub.

## Explicit non-goals (this PR)

- Does **not** replace Edge TTS.
- Does **not** touch zh / Yue / ja Edge casting.
- Does **not** build EN+Yue code-switch / mixed TTS routing.
- Does **not** wire CMA Wanted codes.
- Does **not** commit `_*.py` junk or model weights.
- HOLDs unchanged: NanoBanana, CosyVoice, PSX, Kokoro/Piper stacks, IdleBreathCalm rebake.

## Ship gate (Mon)

1. Run smoke on DESKTOP; listen to `[laugh]` / sigh / short happy filler.
2. If quality OK -> keep flag default off; consider offline bake of EN burst WAVs into `public/voice-clips/en/` later.
3. If blocked (torch install, RAM, quality) -> leave stub + this doc; no live wire.

## Attribution (CC-BY-4.0)

When any Silencio-2 audio ships or is redistributed:

> Speech synthesized with Silencio-2 (BlueRose Labs), fine-tune of Kyutai Pocket TTS. Weights CC-BY-4.0.

## DESKTOP smoke (2026-11-02 HKT, Path B)

Ran `tools/silencio2-sidecar/smoke_silencio2.py` with CPU torch + `quantize=True` on this PC.

| Step | Result |
|---|---|
| HF snapshot resolve/download | ~11.7 s (cached under `D:\LocalAI\cache\huggingface\hub\models--BlueRoseLabs--Silencio-2\...`) |
| Model load (int8) | ~0.80 s |
| `[sigh]` line | ~2.36 s → WAV |
| `[laugh]` line | ~0.54 s |
| `[gasp]` line | ~1.20 s |
| happy filler | ~0.75 s |
| whisper | ~0.62 s |

WAVs kept local only: `D:\AI app development\silencio2-out\` (not committed). Feasibility confirmed for offline EN bake / optional localhost sidecar. Still **not** wired into `speak()` / Edge / Yue.
