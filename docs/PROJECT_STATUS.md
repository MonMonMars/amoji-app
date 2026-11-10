# Amoji project status board

**Generated:** 2026-11-09 23:45 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/setup)  
**Visual board:** open [`project-status.html`](./project-status.html) in a browser.  
**`main` tip:** `daf9582` (includes #325 idle nonsense gate)

## Snapshot

| Bucket | Count |
| --- | ---: |
| Merged recently (#280–#325 finish / Pixel stack) | 40+ |
| Open PRs (verified via GitHub API) | 8 |
| Pixel NEW asks still outstanding | 9 (8 in #329 · 1 in #327) |
| Other outstanding / verify | 2 |
| Docs missing | 0 |

**Overall feature stack (approx.):** ~90% merged · ~8% in-progress PRs · ~2% other outstanding

### Progress by category (% merged)

| Category | Merged % |
| --- | ---: |
| Chat UX | 95% |
| Audio / TTS | 85% |
| VRM / Idle | 90% |
| Privacy | 95% |
| Setup / Gate | 98% |
| Docs | 98% |
| Merge to main | 98% |

## Verified open PRs (2026-11-09)

| PR | Title | Notes |
| --- | --- | --- |
| [#329](https://github.com/MonMonMars/amoji-app/pull/329) | Demo-phase UX batch (weather, volume, mic, tai chi, sticky sing, …) | **In progress** — owns Pixel NEW asks 1–8 · `cursor/demo-phase-ux-batch-0340` |
| [#328](https://github.com/MonMonMars/amoji-app/pull/328) | Refresh done vs outstanding checklist | This status board |
| [#327](https://github.com/MonMonMars/amoji-app/pull/327) | Actually light VRoid chars 1–3 (matcap + shade floor) | **Pixel lighting** (may be merging) — `cursor/vrm-char-lighting-fix-0340` |
| [#320](https://github.com/MonMonMars/amoji-app/pull/320) | View-only rules + geo helplines + crisis popup | In progress (supersedes closed #315) |
| [#240](https://github.com/MonMonMars/amoji-app/pull/240) | SettingsSheet memory-add + yourName a11y | Polish leftover |
| [#154](https://github.com/MonMonMars/amoji-app/pull/154) | robot-demo speak field aria-label | Polish leftover |
| [#20](https://github.com/MonMonMars/amoji-app/pull/20) | CosyVoice TTS spike | Draft spike |
| [#1](https://github.com/MonMonMars/amoji-app/pull/1) | Voice bake-off UI | Old spike |

Closed **without** merge (do not treat as shipped): #252 poke sync, #253 OS voices, #293 open-greet (superseded by #302), #296 privacy (landed via #301/#302), #315 rules view-only (→ #320), #318 TTS echo, #326 idle thinking asks (overlap with #325).

## Merged today / recent finish pass (#306–#325)

| PR | Item | Merge |
| --- | --- | --- |
| [#325](https://github.com/MonMonMars/amoji-app/pull/325) | Idle talk sanity — stop map/remind nonsense | `daf9582` |
| [#324](https://github.com/MonMonMars/amoji-app/pull/324) | Natural pauses between spoken phrases/paragraphs | `e93721b` |
| [#323](https://github.com/MonMonMars/amoji-app/pull/323) | Stop spine/back/head 360° flips | `dcde54e` |
| [#322](https://github.com/MonMonMars/amoji-app/pull/322) | One-topic default; multi-beat only story/BYOK | `3ef69b3` |
| [#321](https://github.com/MonMonMars/amoji-app/pull/321) | Remove useless mic-optional textbox | `f901a4b` |
| [#319](https://github.com/MonMonMars/amoji-app/pull/319) | Background BGM bed gain → 30% | `0bcb95c` |
| [#317](https://github.com/MonMonMars/amoji-app/pull/317) | Rotate short greetings on card presses | `6f95198` |
| [#316](https://github.com/MonMonMars/amoji-app/pull/316) | More demo phase tutorial chips | `e7d3a78` |
| [#314](https://github.com/MonMonMars/amoji-app/pull/314) | Mic test hear / cannot-hear confirm | `c839f3d` |
| [#313](https://github.com/MonMonMars/amoji-app/pull/313) | One-tap demo chips above chat input | `1b690b7` |
| [#312](https://github.com/MonMonMars/amoji-app/pull/312) | Sticky OVH brain + situation switch | `2a4a774` |
| [#311](https://github.com/MonMonMars/amoji-app/pull/311) | Lock OVH primary to Qwen (multi-lang A/B) | `d7fa63d` |
| [#310](https://github.com/MonMonMars/amoji-app/pull/310) | TTS lab click-to-test engines | `8972bde` |
| [#309](https://github.com/MonMonMars/amoji-app/pull/309) | Free LLM A/B winner lock (OVH) | `b159aab` |
| [#308](https://github.com/MonMonMars/amoji-app/pull/308) | Idle relax/stretch loop + ability reminders | `56faf78` |
| [#307](https://github.com/MonMonMars/amoji-app/pull/307) | More songs + Mixkit royalty-free streams | `3bf751d` |
| [#306](https://github.com/MonMonMars/amoji-app/pull/306) | Docs status refresh | `617e11e` |

Earlier same-day / prior stack also on `main`: #305 audio-gate order, #304/#303 status+music docs, #302 entry flow, #301 reply quality, #300 mood orb, #299 cast lighting, #298 HelloWave bye-only, #297 hide poke history, #295 stable volume, #294 soft idle arms, #292 audio gate, #291 selectable history, #290 story replies, #289 TTS clause pauses, #288 curated scene idle, #287 content idle / stop sticky dance defaults, #286 sing mic + ditties, #285 one-page setup, #283 select back, #282 setup scroll, #281 pose limits, #280 weather/news TTS.

## Feature status (priority + Pixel NEW)

| Area | Item | Status | PR / note |
| --- | --- | --- | --- |
| Setup | Flow: APP → rules → mic/speaker → title → select → chat | **Done** | #305 / #285 / #292 |
| Audio | Soft Continue always works; auto-attempt mic/speaker | **Done** | #305 |
| Audio | TTS clause + phrase pauses | **Done** | #289 / #324 |
| Audio | Tab volume stable / master cap | **Done** (partial) | #295 — no-duck follow-up **#329** |
| Audio | BGM bed quieter (30%) | **Done** | #319 |
| Audio | Singing mic pull-forward + karaoke ditties | **Done** (v1) | #286 — mouth-align follow-up **#329** |
| Audio | Mixkit / more RF music | **Done** (v1) | #307 — better RF catalog **#329** |
| Chat UX | Story long replies | **Done** | #290 |
| Chat UX | Scene lines curated (no forced backdrop) | **Done** | #288 |
| Chat UX | Entry flow + privacy recall (no auto weather) | **Done** | #301 / #302 |
| Chat UX | Demo phase chips | **Done** | #313 / #316 |
| Chat UX | Free LLM / OVH situation sticky | **Done** | #309–#312 |
| VRM / Idle | Dance only on request / content idle | **Done** (v1) | #287 — post-sing sticky follow-up **#329** |
| VRM / Idle | Soft idle arms | **Done** | #294 |
| VRM / Idle | Cast lighting allowlist #1–3 / #13 | **Done** (v1) | #299 — follow-up **#327** |
| VRM / Idle | Idle nonsense / map-remind gate | **Done** | #325 |
| Crisis / rules | View-only rules + geo helplines | **In progress** | **#320** |
| Demo UX | Pixel NEW asks 1–8 (weather/volume/mic/taichi/…) | **In progress** | **[#329](https://github.com/MonMonMars/amoji-app/pull/329)** |
| VRM / Light | Character 1–3 lighting (real matcap/shade) | **In PR** | **[#327](https://github.com/MonMonMars/amoji-app/pull/327)** |
| Verify | Post-merge live check on Pages | **Outstanding** | After Pages rebuild |
| Music | Licensed stream/embed beyond Mixkit stub | **Outstanding** | `docs/MUSIC_STREAMING.md` |
| Payment | Charging + payment rules (free 40 turns, Plus, Stripe/demo) | **Done** (this stack) | `docs/SYSTEMS.md` · `lib/charging-rules.ts` · `lib/payment-rules.ts` |

## Outstanding — Pixel NEW asks (this turn)

Keep these open until fixed/merged, even where a related v1 PR already merged.  
**Ownership:** items 1–8 → **In progress** [#329](https://github.com/MonMonMars/amoji-app/pull/329) (`cursor/demo-phase-ux-batch-0340`). Item 9 → lighting PR **#327** (may be merging).

1. **Weather no GPS talk** — entry no longer auto-plays weather (#302), but spoken weather must not sound like GPS / newsreader. → **In progress** [#329](https://github.com/MonMonMars/amoji-app/pull/329)
2. **Consistent voice volume (no duck)** — #295/#319 landed; `duckLibraryBed` / `duckExternalAudioForCompanion` still duck dialogue vs beds. → **In progress** [#329](https://github.com/MonMonMars/amoji-app/pull/329)
3. **Sing mic from top dust / mouth align** — refine beyond #286 `MIC_MOUTH_POS`. → **In progress** [#329](https://github.com/MonMonMars/amoji-app/pull/329)
4. **Simple tai chi library move** — procedural `taichi` pose exists; **no VRMA library clip** yet (`CompanionCanvas`: taichi/jog/yoga/stretch stay on idle). → **In progress** [#329](https://github.com/MonMonMars/amoji-app/pull/329)
5. **Stop sticky dance after sing** — #287 fixed default sticky dance; confirm/fix residual after sing performance ends. → **In progress** [#329](https://github.com/MonMonMars/amoji-app/pull/329)
6. **Demo rail drag-scroll** — `#313` rail is `overflow-x-auto` only; no desktop click-drag scroll yet. → **In progress** [#329](https://github.com/MonMonMars/amoji-app/pull/329)
7. **“um…” after 3s only** — `WARMUP_FIRST_MS` / `THINKING_SOUND_DELAY_MS` is still **1000 ms**, not 3000. → **In progress** [#329](https://github.com/MonMonMars/amoji-app/pull/329)
8. **Better royalty-free music / sing songs** — improve beyond #307 Mixkit + ditties. → **In progress** [#329](https://github.com/MonMonMars/amoji-app/pull/329)
9. **Character 1–3 lighting** — **In PR** [#327](https://github.com/MonMonMars/amoji-app/pull/327) (`cursor/vrm-char-lighting-fix-0340`); may be merging — do not duplicate.

## Outstanding work (other)

1. Live verify https://monmonmars.github.io/amoji-app/setup after Pages deploy
2. Wire a stronger **licensed** stream/embed catalog when available (beyond Mixkit previews)
3. Triage or close leftover open spikes: #1, #20 (draft), #154, #240 — or land #320

## Documents audit

| Document | Path | Status |
| --- | --- | --- |
| Docs index | `docs/README.md` | Complete |
| Privacy / memory | `docs/PRIVACY_MEMORY.md` | Complete |
| Chat entry flow | `docs/CHAT_ENTRY_FLOW.md` | Complete |
| TTS pipeline | `docs/TTS_PIPELINE.md` | Complete |
| Cast lighting | `docs/CAST_LIGHTING.md` | Complete |
| Setup onboarding | `docs/SETUP_ONBOARDING.md` | Complete |
| Merge checklist | `docs/MERGE_CHECKLIST.md` | Complete (historical merge order; stack already on main) |
| Music streaming | `docs/MUSIC_STREAMING.md` | Complete |
| Job / voice checklist | `AMOJI_JOB_CHECKLIST.md` | Complete (may lag this board) |
| This status board | `docs/project-status.html` + this file | Refreshed 2026-11-09 23:45 HKT |
