# Amoji project status board

**Generated:** 2026-11-09 11:30 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/setup)  
**Visual board:** open [`project-status.html`](./project-status.html) in a browser.  
**`main` tip:** `2fd56c8` (includes #294 soft idle arms)

## Snapshot

| Bucket | Count |
| --- | ---: |
| Merged / Done (priority Pixel stack) | 40+ |
| Remaining open PRs (spikes / polish / duplicates triage) | ~6 |
| Outstanding / Blocked | 2 |
| Docs missing | 0 |

**Overall feature stack (approx.):** 92% merged · 5% open polish · 3% future (licensed music stream)

### Progress by category (% merged)

| Category | Merged % |
| --- | ---: |
| Chat UX | 95% |
| Audio / TTS | 90% |
| VRM / Idle | 95% |
| Privacy | 95% |
| Setup / Gate | 98% |
| Docs | 98% |
| Merge to main | 95% |

## Merged today (2026-11-09) — continue finish pass

| PR | Item | Merge |
| --- | --- | --- |
| [#305](https://github.com/MonMonMars/amoji-app/pull/305) | Soft audio gate after rules, before title | `d8850db` |
| [#286](https://github.com/MonMonMars/amoji-app/pull/286) | Singing mic forward + two karaoke ditties | `c344234` |
| [#250](https://github.com/MonMonMars/amoji-app/pull/250) | Cast legs unblend floor | `c552e94` |
| [#289](https://github.com/MonMonMars/amoji-app/pull/289) | TTS clause pauses (gTTS / Edge / Web Speech) | `2105a62` |
| [#295](https://github.com/MonMonMars/amoji-app/pull/295) | Stable volume + tab mute | `2d5f4c9` |
| [#287](https://github.com/MonMonMars/amoji-app/pull/287) | Content-driven idle; dance only on request | `19202ec` |
| [#288](https://github.com/MonMonMars/amoji-app/pull/288) | No forced backdrop LLM lines; curated scene idle | `fe2bb6e` |
| [#290](https://github.com/MonMonMars/amoji-app/pull/290) | Long story / narrative replies (1024 tokens) | `08c4f03` |
| [#294](https://github.com/MonMonMars/amoji-app/pull/294) | Softer idle arms + elbow floor | `2fd56c8` |

Earlier priority stack (#285→#304) already merged earlier the same day.

## Feature status (priority items)

| Area | Item | Status | PR / note |
| --- | --- | --- | --- |
| Setup | Flow: APP → rules → mic/speaker → title → select → chat | **Done** | #305 |
| Audio | Soft Continue always works; auto-attempt mic/speaker | **Done** | #305 |
| Audio | TTS clause pauses | **Done** | #289 |
| Audio | Tab volume stable / cap | **Done** | #295 |
| Audio | Singing mic + songs | **Done** | #286 |
| Audio | Music streaming / embed playlist | **Stub** | `resolveStreamPlaylist` |
| Chat UX | Story long replies | **Done** | #290 |
| Chat UX | Scene lines curated (no forced backdrop) | **Done** | #288 |
| Chat UX | Entry flow + privacy recall | **Done** | #301 / #302 |
| VRM / Idle | Dance only on request | **Done** | #287 |
| VRM / Idle | Soft idle arms | **Done** | #294 |
| Verify | Post-merge live check on Pages | **Outstanding** | After Pages rebuild |

## Outstanding work (short list)

1. Live verify https://monmonmars.github.io/amoji-app/setup after Pages deploy
2. Wire a **licensed** stream/embed catalog into `resolveStreamPlaylist` when available
3. Optional leftover open PRs: #252 poke sync, #253 OS voices, #240/#154 a11y polish, #20/#1 spikes — triage or close if superseded

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
| This status board | `docs/project-status.html` + this file | Needs HTML twin refresh (MD updated) |
