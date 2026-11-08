# Privacy & memory UX

How Amoji treats stored memory in chat. Code lives mainly in `apps/web/lib/memory.ts`, with recall gating in `privacy-recall.ts` (PR #296 / #301 / #302).

## Storage

- Memory is **local to the browser** (prefs / memory keys). It is not uploaded as a separate “cloud diary” by the client.
- Users can browse, add, export, and forget entries from Settings (copy strings under `memory*` / `forget*` in `prefs.ts`).
- The in-chat crisis path and `/privacy` / `/terms` pages stay separate legal surfaces.

## Greeting vs recall

| Moment | Behavior |
| --- | --- |
| Fresh open / session gap | Prefer a short hello (`skipThread`, `short` / `privacyOnly`). Do **not** resume the last thread or dump diary lines. |
| Normal turns | Do not inject full memory into the LLM prompt unless the user clearly asks to recall. |
| Explicit recall | Phrases like “remember when…”, “continue last time”, 記得 / 记得 / 覚えて — see `userExplicitlyWantsRecall()`. |

`buildDailyGreeting(..., { privacyOnly: true })` (on the reply-quality branch) is equivalent to a hello-only greeting; until that lands, `short: true` is the main-compatible flag.

## Product rules

1. No unsolicited “I remember you like…” on enter.
2. Weather / news / story tools stay **on demand** (chat entry flow), not privacy leaks.
3. Forget-one and forget-everything must remain reachable without digging through code.
4. When memory *is* used on a turn, the UI may show deletable snippets (`memoryTurn*`) so the user can scrub.

## Related PRs

- #275 / #296 — no proactive recall  
- #301 — reply quality + privacy greeting opts  
- #302 — entry flow wired to privacy-recall  
