# Silencio-2 EN sidecar (spike)

Optional **English-only** CPU emotion / SFX-tag sidecar for Amoji.

- Model: [BlueRoseLabs/Silencio-2](https://huggingface.co/BlueRoseLabs/Silencio-2)
- **Beside Edge**, never instead of Edge.
- **No zh / Yue.** **No EN+Cantonese combine / code-switch pipeline.**
- App flag `NEXT_PUBLIC_AMOJI_SILENCIO2` defaults **off**. Catalog stub `shipping: false`.
- Does **not** wire CMA Wanted codes.

## Setup (DESKTOP, D: only)

```powershell
powershell -ExecutionPolicy Bypass -File tools\silencio2-sidecar\setup-venv.ps1
```

Uses `D:\AI app development\silencio2-venv` and `HF_HOME=D:\LocalAI\cache\huggingface`.

## Smoke

```powershell
$env:HF_HOME = 'D:\LocalAI\cache\huggingface'
& 'D:\AI app development\silencio2-venv\Scripts\python.exe' tools\silencio2-sidecar\smoke_silencio2.py
```

WAVs + `smoke_summary.txt` go to `D:\AI app development\silencio2-out\` (outside git).

Optional: `AMOJI_SILENCIO2_ROOT` = pre-downloaded snapshot folder.

## App integration (this PR)

- Docs: `apps/web/docs/silencio-2-spike.md`
- Catalog stub only — not in `freeVoiceHops()`.
- No live `speak()` route until Mon ships a bake or localhost sidecar.

## License

Weights CC-BY-4.0; `silencio2/core` MIT. Attribute if redistributing audio.
