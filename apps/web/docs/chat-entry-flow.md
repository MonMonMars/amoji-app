# Chat room entry talking order (Pixel)

## Enter chat

1. Short delay (`OPEN_CHEER_MS`) then one TTS line: optional name hello + **statement-only persona self-intro** (`voiceOpening`) — no stacked topic ask.
2. If the user stays silent, after `OPEN_IDLE_BRIEF_MS` she lists **2–3 topic suggestions** (`topic-suggestions.ts`) — not auto weather/news.

## Normal chat

- User-driven. Weather/news/story/fun facts run only when the user asks or picks a suggestion (live-tools on demand).
- Story, science/fun facts, and simple how-to / problem-help unlock longer reply budgets; idle chitchat stays short.
- If the user says they do not know what to talk about, she offers the same style of **2–3 topic menu** (no LLM required).

## Privacy (#296 / #301)

- `buildMemoryBlock` + `privacy-recall.ts`: no proactive memory; full recall only after an explicit request.

## Sing / dance

- Moves and procedural / library clips today (`music.ts`, `performance-clips`).
- **Follow-up:** legal streaming or embed URLs via `resolveStreamPlaylist()` — prefer over bundling audio in the app.
