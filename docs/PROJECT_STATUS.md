# Amoji project status board

**Generated:** 2026-11-09 05:05 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/setup)  
**Visual board:** open [`project-status.html`](./project-status.html) in a browser.

## Snapshot

| Bucket | Count |
| --- | ---: |
| Merged / Done (representative recent stack) | 30 |
| In PR (remaining open work) | ~20 |
| Outstanding / Blocked | 4 |
| Docs missing | 0 |
| Docs needs update | 0 |

**Overall feature stack (approx.):** 70% merged · 20% in PR · 10% outstanding

### Progress by category (% merged)

| Category | Merged % |
| --- | ---: |
| Chat UX | 85% |
| Audio / TTS | 55% |
| VRM / Idle | 70% |
| Privacy | 90% |
| Setup / Gate | 95% |
| Docs | 95% |
| Merge to main | 95% |

## Recommended merge stack — **COMPLETED** 2026-11-09

1. [#285](https://github.com/MonMonMars/amoji-app/pull/285) — one-page setup — **merged** `6f7724b`
2. [#292](https://github.com/MonMonMars/amoji-app/pull/292) — pre-chat audio gate — **merged** `00ff173`
3. [#291](https://github.com/MonMonMars/amoji-app/pull/291) — selectable chat history — **merged** `961a4f9`
4. [#301](https://github.com/MonMonMars/amoji-app/pull/301) — reply quality + privacy — **merged** `c063148`
5. [#302](https://github.com/MonMonMars/amoji-app/pull/302) — chat entry flow — **merged** `fc88cd2` (rebased after #301)
6. [#297](https://github.com/MonMonMars/amoji-app/pull/297) hide poke — **merged** `8cbbd79`
7. [#298](https://github.com/MonMonMars/amoji-app/pull/298) HelloWave bye-only — **merged** `605e8ef`
8. [#299](https://github.com/MonMonMars/amoji-app/pull/299) lighting — **merged** `9441dea`
9. [#300](https://github.com/MonMonMars/amoji-app/pull/300) mood orb — **merged** `b53e0df`
10. [#283](https://github.com/MonMonMars/amoji-app/pull/283) select back — **merged** `4e2103f`
11. [#303](https://github.com/MonMonMars/amoji-app/pull/303) status board — **merged** `c640793`
12. [#304](https://github.com/MonMonMars/amoji-app/pull/304) docs-music-status — **this PR**

## Feature status (priority items)

| Area | Item | Status | PR / note |
| --- | --- | --- | --- |
| Setup | One-page setup / single START CTA | **Done** | #285 |
| Setup | Select page context-aware back button | **Done** | #283 |
| Audio | Pre-chat audio gate | **Done** | #292 |
| Audio | Music streaming / embed playlist | **Stub Done** | `resolveStreamPlaylist` null + `docs/MUSIC_STREAMING.md` |
| Chat UX | Selectable chat history | **Done** | #291 |
| Chat UX | Reply quality sanity gate | **Done** | #301 |
| Chat UX | Chat entry flow | **Done** | #302 |
| Chat UX | Hide poke from history | **Done** | #297 |
| Privacy | No proactive memory recall | **Done** | shipped via #301 |
| VRM / Idle | Lighting allowlist | **Done** | #299 |
| VRM / Idle | Mood talking-ball colors | **Done** | #300 |
| VRM / Idle | Wave for bye only | **Done** | #298 |
| Docs | Status board + gap pack | **Done** | #303 + #304 |
| Merge | Recommended stack into `main` | **Done** | agent merge 2026-11-09 |
| Verify | Post-merge live check on Pages | **Outstanding** | After Pages rebuild |
| Audio | TTS clause pauses / singing / volume | **In PR** | #289 / #286 / #295 |
| Chat UX | Story replies / scene lines | **In PR** | #290 / #288 |
| VRM / Idle | Soft arms / dance-on-request | **In PR** | #294 / #287 |

## Documents audit

| Document | Path | Status |
| --- | --- | --- |
| Docs index | `docs/README.md` | Complete |
| Privacy / memory | `docs/PRIVACY_MEMORY.md` | Complete |
| Chat entry flow | `docs/CHAT_ENTRY_FLOW.md` | Complete |
| TTS pipeline | `docs/TTS_PIPELINE.md` | Complete |
| Cast lighting | `docs/CAST_LIGHTING.md` | Complete |
| Setup onboarding | `docs/SETUP_ONBOARDING.md` | Complete |
| Merge checklist | `docs/MERGE_CHECKLIST.md` | Complete |
| Music streaming | `docs/MUSIC_STREAMING.md` | Complete |
| This status board | `docs/project-status.html` + this file | Complete |

## Outstanding work (short list)

1. Post-merge verify on https://monmonmars.github.io/amoji-app/setup
2. Triage remaining open PRs (#250–#257, #286–#296 siblings, spikes)
3. Wire a **licensed** stream/embed catalog into `resolveStreamPlaylist` when available (stub is ready)
4. Continue polish: soft idle arms, dance-on-request, TTS pauses, singing mic
