# Lure-TTS-0.6B EN sidecar (optional test)

Optional **English-only** expressive emotion/SFX CPU sidecar for Amoji A/B.

- Model: [Tesslate/Lure-TTS-0.6B](https://huggingface.co/Tesslate/Lure-TTS-0.6B)
- Tags: `(laugh)` `(sigh)` `(gasp)` … (round brackets, not square)
- **Beside Edge**, never instead. **No zh / Yue.** **No EN+Cantonese combine.**
- App flag `NEXT_PUBLIC_AMOJI_LURE_TTS` defaults **off**. Catalog `shipping: false`.
- **Optional:** if CPU install/smoke is painful on DESKTOP, keep this stub and record SKIP — UI buttons still ship fail-closed to Edge.

## Setup (DESKTOP, D: only)

```powershell
powershell -ExecutionPolicy Bypass -File tools\lure-tts-sidecar\setup-venv.ps1
```

Uses `D:\AI app development\lure-tts-venv` and `HF_HOME=D:\LocalAI\cache\huggingface`.

## Smoke

```powershell
$env:HF_HOME = 'D:\LocalAI\cache\huggingface'
$env:AMOJI_LURE_REF = 'D:\AI app development\silencio2-out\happy_filler.wav'
$env:AMOJI_LURE_REF_TEXT = 'Nice! We can try that.'
& 'D:\AI app development\lure-tts-venv\Scripts\python.exe' tools\lure-tts-sidecar\smoke_lure_tts.py
```

Exit 2 = SKIP.

## License

Apache-2.0.
