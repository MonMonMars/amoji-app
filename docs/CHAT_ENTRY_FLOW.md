# Chat entry / conversation UX

Canonical short note for Pixel’s enter-chat talking order. Implementation lands in PR **#302** (`open-phase.ts`, `topic-suggestions.ts`, `ChatPanel`). A twin also ships under `apps/web/docs/chat-entry-flow.md` on that branch.

## Enter chat

1. Short delay (`OPEN_CHEER_MS`), then one TTS line: optional name hello + persona self-intro (`voiceOpening`) + “what should we talk about?” (`openPhaseTopicAsk`).
2. If the user stays silent past `OPEN_IDLE_BRIEF_MS`, she lists **2–3 localized topic suggestions** — not auto weather or news.
3. Idle motion on open is chit-chat / look-around style; **HelloWave is farewell-only** (PR #298).

## Normal chat

- User-driven. Weather, news, story, and fun-fact tools run only when asked or when a suggestion is picked.
- “I don’t know what to talk about” reuses the same 2–3 topic menu (no LLM required).
- Story / facts may use longer TTS; keep clauses paused per TTS notes.

## Privacy

See [`PRIVACY_MEMORY.md`](./PRIVACY_MEMORY.md). Memory blocks stay gated until explicit recall.

## Out of scope here

- Pre-chat flow order: APP OPEN → rules (`/setup`) → soft audio (`/gate/audio`) → title (`/`) → select → chat. See [`SETUP_ONBOARDING.md`](./SETUP_ONBOARDING.md).
