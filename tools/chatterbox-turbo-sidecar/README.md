# Chatterbox-Turbo EN sidecar (test)

Optional **English-only** paralinguistic-tag CPU sidecar for Amoji A/B.

- Model: [ResembleAI/chatterbox-turbo](https://huggingface.co/ResembleAI/chatterbox-turbo) via `chatterbox-tts`
- Tags: `[laugh]` `[chuckle]` `[cough]` …
- **Beside Edge**, never instead. **No zh / Yue.** **No EN+Cantonese combine.**
- App flag `NEXT_PUBLIC_AMOJI_CHATTERBOX_TURBO` defaults **off**. Catalog `shipping: false`.
- Does **not** wire CMA Wanted codes.

## Setup (DESKTOP, D: only)

```powershell
powershell -ExecutionPolicy Bypass -File tools\chatterbox-turbo-sidecar\setup-venv.ps1
```

Uses `D:\AI app development\chatterbox-turbo-venv` and `HF_HOME=D:\LocalAI\cache\huggingface`.

## Smoke

```powershell
$env:HF_HOME = 'D:\LocalAI\cache\huggingface'
# Optional voice prompt (10s-ish EN wav). Defaults to Silencio smoke happy_filler if present.
$env:AMOJI_CHATTERBOX_REF = 'D:\AI app development\silencio2-out\happy_filler.wav'
& 'D:\AI app development\chatterbox-turbo-venv\Scripts\python.exe' tools\chatterbox-turbo-sidecar\smoke_chatterbox_turbo.py
```

WAVs + `smoke_summary.txt` → `D:\AI app development\chatterbox-turbo-out\` (outside git).

## License

MIT (Resemble AI Chatterbox).

## Voice prompt

Chatterbox-Turbo requires an EN reference wav **longer than 5 seconds** (AMOJI_CHATTERBOX_REF). Build one on D: (e.g. concatenate Silencio smoke WAVs into `D:\AI app development\chatterbox-turbo-out\ref_en_gt5s.wav`). Do not commit WAVs.
