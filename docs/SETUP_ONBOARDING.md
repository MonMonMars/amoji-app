# Setup / onboarding flow

Route sketch for first-run → chat. Several steps are still in open PRs; merge order is in [`MERGE_CHECKLIST.md`](./MERGE_CHECKLIST.md).

```
/setup  (legal scroll + consent)
   │
   │  PR #285 — one-page setup, single START CTA
   │  (legal scroll-to-enable already merged as #282)
   ▼
/gate or /gate/audio
   │  PR #292 — adult + hear-audio checkpoint before chat chrome
   ▼
/select  (pick companion / scene)
   │  back button context: #283
   ▼
/chat
   │  entry talking order: CHAT_ENTRY_FLOW.md (#302)
   │  after #301 privacy / reply quality
```

## START rules

- START stays disabled until the user scrolls / accepts the legal block (#282 / #285).
- Do not mount the chat room (VRM load, greeting TTS, poke SFX) until the entry gate is satisfied (#292).
- Prefer render-swap gate over a redirect that paints `/chat` first.

## Related surfaces

- `/terms`, `/privacy`, `/safety` — static policy pages.
- `/mode`, `/play`, `/change` — mode and re-select after first run.
- GitHub Pages: `.github/workflows/pages.yml` deploys `main` → `https://monmonmars.github.io/amoji-app/`.
