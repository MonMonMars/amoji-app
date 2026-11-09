# Setup / onboarding flow

Canonical first-run order (Pixel):

```
APP OPEN (/)
   │  first-run auto → rules; loading ends by title
   ▼
/setup  (rules confirm — legal scroll + START)
   │
   ▼
/gate/audio  (speaker + mic soft-gate — Continue always works)
   │
   ▼
/  (TITLE PAGE — bootstrap already finished)
   │  START
   ▼
/select  (character / scene)
   │
   ▼
/chat
```

## Soft audio gate

- `/gate/audio` auto-prompts mic/speaker (best effort) and never hard-blocks Continue.
- `/chat` keeps a soft `RequireChatAudio` marker only — no stuck redirect loop.
- After character select, navigate straight to `/chat`.

## START rules

- Setup START stays disabled until the user scrolls / accepts the legal block.
- Do not mount the chat room (VRM load, greeting TTS, poke SFX) until the entry gate record exists (`hasPassedEntryGate`).
- Prefer render-swap gate over a redirect that paints `/chat` first.

## Related surfaces

- `/terms`, `/privacy`, `/safety` — same one-scroll QuickSetup as `/setup`.
- `/mode`, `/play`, `/change` — mode and re-select after first run.
- GitHub Pages: `.github/workflows/pages.yml` deploys `main` → `https://monmonmars.github.io/amoji-app/`.
