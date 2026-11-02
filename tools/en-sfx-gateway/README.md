# EN SFX A/B localhost gateway (DESKTOP)

Fail-closed multiplexor for `/en-sfx-ab` preview buttons.

- Bind: `127.0.0.1:8765` (override with `AMOJI_EN_SFX_GATEWAY_PORT`)
- `GET /health` → JSON engine readiness
- `POST /tts` body `{"engine":"silencio2|chatterbox-turbo|vui-nano|lure-tts","text":"..."}` → `audio/wav` or 503
- CORS open for local Next static / Pages preview
- Never zh/Yue; callers must send EN-only tagged lines

## Run

```powershell
powershell -ExecutionPolicy Bypass -File tools\en-sfx-gateway\run-gateway.ps1
```

Uses Silencio venv python by default (stdlib only). Engine smokes must already be installable; gateway shells out to each engine venv when present.
