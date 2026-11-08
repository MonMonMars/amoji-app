# Amoji project status board

**Generated:** 2026-11-09 03:15 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/setup)  
**Visual board:** open [`project-status.html`](./project-status.html) in a browser.

## Snapshot

| Bucket | Count |
| --- | ---: |
| Merged / Done (representative recent stack) | 18 |
| In PR (priority Pixel stack) | 20 |
| Outstanding / Blocked | 7 |
| Docs missing | 6 |
| Docs needs update | 1 |
| Total open GitHub PRs | 31 |

**Overall feature stack (approx.):** 40% merged · 44% in PR · 16% outstanding

### Progress by category (% merged)

| Category | Merged % |
| --- | ---: |
| Chat UX | 25% |
| Audio / TTS | 33% |
| VRM / Idle | 40% |
| Privacy | 50% |
| Setup / Gate | 50% |
| Docs | 45% |
| Merge to main | 10% |

## Recommended merge stack (CI green → order)

1. [#285](https://github.com/MonMonMars/amoji-app/pull/285) — one-page setup / legal scroll / single START (`cursor/one-click-bootstrap-0340`)
2. [#292](https://github.com/MonMonMars/amoji-app/pull/292) — pre-chat audio gate `/gate/audio` (`cursor/pre-chat-audio-gate-5ad3`)
3. [#291](https://github.com/MonMonMars/amoji-app/pull/291) — selectable chat history (`cursor/chat-history-selectable-0340`)
4. [#301](https://github.com/MonMonMars/amoji-app/pull/301) — reply quality + privacy (`cursor/chat-reply-quality-c904`) — **before #302**
5. [#302](https://github.com/MonMonMars/amoji-app/pull/302) — chat entry flow (`cursor/chat-entry-flow-0340`)

### Polish PRs

- [#297](https://github.com/MonMonMars/amoji-app/pull/297) hide poke
- [#298](https://github.com/MonMonMars/amoji-app/pull/298) HelloWave for bye only
- [#299](https://github.com/MonMonMars/amoji-app/pull/299) lighting #1–3 & #13
- [#300](https://github.com/MonMonMars/amoji-app/pull/300) mood talking ball
- [#283](https://github.com/MonMonMars/amoji-app/pull/283) select back button

## Feature status

| Area | Item | Status | PR / note |
| --- | --- | --- | --- |
| Setup | Setup full legal scroll + scroll-to-enable START | **Done** | [#282](https://github.com/MonMonMars/amoji-app/pull/282) merged |
| Setup | One-page setup / single START CTA | **In PR** | [#285](https://github.com/MonMonMars/amoji-app/pull/285) |
| Setup | Select page context-aware back button | **In PR** | [#283](https://github.com/MonMonMars/amoji-app/pull/283) |
| Setup | Back buttons on setup / terms | **Done** | [#266](https://github.com/MonMonMars/amoji-app/pull/266) merged |
| Audio | Pre-chat audio gate | **In PR** | [#292](https://github.com/MonMonMars/amoji-app/pull/292) |
| Audio | TTS clause pauses | **In PR** | [#289](https://github.com/MonMonMars/amoji-app/pull/289) |
| Audio | Weather / news TTS routing | **Done** | [#280](https://github.com/MonMonMars/amoji-app/pull/280) merged |
| Audio | Stable volume on tab focus | **In PR** | [#295](https://github.com/MonMonMars/amoji-app/pull/295) |
| Audio | Singing mic + new songs | **In PR** | [#286](https://github.com/MonMonMars/amoji-app/pull/286) |
| Audio | Music streaming / embed playlist | **Outstanding** | No `resolveStreamPlaylist` in tree — procedural WebAudio only |
| Chat UX | Selectable chat history | **In PR** | [#291](https://github.com/MonMonMars/amoji-app/pull/291) |
| Chat UX | Reply quality sanity gate | **In PR** | [#301](https://github.com/MonMonMars/amoji-app/pull/301) |
| Chat UX | Chat entry 7-step flow | **In PR** | [#302](https://github.com/MonMonMars/amoji-app/pull/302) |
| Chat UX | Open greeting (no auto weather) | **In PR** | [#293](https://github.com/MonMonMars/amoji-app/pull/293) |
| Chat UX | Long story-mode replies | **In PR** | [#290](https://github.com/MonMonMars/amoji-app/pull/290) |
| Chat UX | Scene lines vs LLM backdrop nonsense | **In PR** | [#288](https://github.com/MonMonMars/amoji-app/pull/288) |
| Chat UX | Hide poke from history | **In PR** | [#297](https://github.com/MonMonMars/amoji-app/pull/297) |
| Privacy | No proactive memory recall | **In PR** | [#296](https://github.com/MonMonMars/amoji-app/pull/296) (earlier [#275](https://github.com/MonMonMars/amoji-app/pull/275) merged) |
| VRM / Idle | Lighting allowlist #1–3, #13 | **In PR** | [#299](https://github.com/MonMonMars/amoji-app/pull/299) |
| VRM / Idle | Mood talking-ball colors | **In PR** | [#300](https://github.com/MonMonMars/amoji-app/pull/300) |
| VRM / Idle | Soft idle arms | **In PR** | [#294](https://github.com/MonMonMars/amoji-app/pull/294) |
| VRM / Idle | Wave not idle (bye only) | **In PR** | [#298](https://github.com/MonMonMars/amoji-app/pull/298) |
| VRM / Idle | Dance only on request | **In PR** | [#287](https://github.com/MonMonMars/amoji-app/pull/287) (base [#278](https://github.com/MonMonMars/amoji-app/pull/278) merged) |
| VRM / Idle | Pose ROM + short-path blends | **Done** | [#281](https://github.com/MonMonMars/amoji-app/pull/281) merged |
| i18n | Hardcoded aria / attrs | **Done** | [#276](https://github.com/MonMonMars/amoji-app/pull/276) merged |
| Docs | Strategy off public repo | **Done** | [#274](https://github.com/MonMonMars/amoji-app/pull/274) |
| Merge | Merge recommended stack into `main` | **Blocked** | Awaiting human merge |
| Verify | Post-merge live check on Pages | **Outstanding** | After merges |

## Other open PRs (not in priority stack)

Also open at audit time: #286–#296 siblings listed above, plus older #250–#257 (cast legs, OS voices, BYOK, safety disclosure, LLM host race, …), #1 voice bake-off, #20 CosyVoice spike, #154 / #240 a11y leftovers.

## Documents audit

| Document | Path | Status |
| --- | --- | --- |
| Docs index / strategy policy | `docs/README.md` | Complete |
| Asset / license pipeline | `docs/ASSETS.md` | Complete |
| Model shortlist | `docs/MODELS.md` | Complete |
| Robot face integration | `docs/ROBOT-FACE.md` | Complete |
| Job / voice checklist | `AMOJI_JOB_CHECKLIST.md` | **Needs update** |
| Idle Pixel review / catalog | `apps/web/docs/*` | Complete |
| Package / tool READMEs | `packages/*`, `tools/*` | Complete |
| Public strategy docs | intentionally off-repo | Complete (keep private) |
| User-facing privacy / memory policy | — | **Missing** |
| Chat entry / conversation UX spec | — | **Missing** |
| Voice / TTS pipeline (dedicated) | partial in checklist + #277 | **Missing** |
| Cast lighting profile notes | — | **Missing** (pairs with #299) |
| Setup / onboarding flow diagram | — | **Missing** |
| Contributor merge checklist | — | **Missing** |
| This status board | `docs/project-status.html` + this file | Complete |

## Outstanding work (short list)

1. Human merge of the recommended stack (+ polish PRs) into `main`
2. Music streaming / embed playlist (not started in `apps/web/lib/music.ts`)
3. Post-merge verify on https://monmonmars.github.io/amoji-app/setup
4. Triage remaining open PRs (#250–#257, spikes)
5. Author the six missing docs above; refresh `AMOJI_JOB_CHECKLIST.md`
