# Vui Nano EN sidecar (test)

Optional **English-only** conversational emotion/SFX CPU sidecar for Amoji A/B.

- Model: [fluxions/vui](https://huggingface.co/fluxions/vui) via `vui-tts` (`from vui.engine import Engine`)
- Tags: `[laugh]` `[sigh]` `[breath]` …
- **Beside Edge**, never instead. **No zh / Yue.** **No EN+Cantonese combine.**
- App flag `NEXT_PUBLIC_AMOJI_VUI_NANO` defaults **off**. Catalog `shipping: false`.
- Does **not** wire CMA Wanted codes.

## Setup (DESKTOP, D: only)

```powershell
powershell -ExecutionPolicy Bypass -File tools\vui-nano-sidecar\setup-venv.ps1
```

Uses `D:\AI app development\vui-nano-venv` and `HF_HOME=D:\LocalAI\cache\huggingface`.

If `pip install vui-tts` fails on this PC (GPU/ffmpeg/torchcodec pain), leave the stub and record SKIP in `D:\AI app development\vui-nano-out\smoke_summary.txt`. UI buttons still ship fail-closed to Edge.

## Smoke

```powershell
$env:HF_HOME = 'D:\LocalAI\cache\huggingface'
& 'D:\AI app development\vui-nano-venv\Scripts\python.exe' tools\vui-nano-sidecar\smoke_vui_nano.py
```

## License

Apache-2.0 (fluxions Vui / Vui Nano). Codec attributions per upstream README.

## DESKTOP smoke (2026-11-02)

**SKIP on CPU DESKTOP:** `Engine` requires CUDA graphs (or MLX on Apple). Install still succeeds; smoke exits 2. UI keeps the **Vui Nano (test)** button and fail-closes to Edge.
