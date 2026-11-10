# Amoji project status board

**Generated:** 2026-11-10 21:30 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/setup)  
**Visual board:** open [`project-status.html`](./project-status.html) in a browser.  
**`main` tip:** `dd90e87` (includes #335 systems pack)

## Snapshot

| Bucket | Count |
| --- | ---: |
| Merged recently (#320 / #327 / #329–#335) | 9+ |
| Open slice PRs (chat-ux / news / card-greet / Silent Night / dance / mega) | 6+ |
| Branches ready, PR not opened yet (worker lacked ManagePullRequest) | 3 |
| Pixel leftover product gaps (this leftover branch) | in progress |
| Holds (licensed music · live Pages verify) | 2 |
| Docs missing | 0 |

**Overall feature stack (approx.):** ~93% merged · ~5% open slices · ~2% Hold / Pixel confirm

### Progress by category (% merged)

| Category | Merged % |
| --- | ---: |
| Chat UX | 96% |
| Audio / TTS | 90% |
| VRM / Idle | 92% |
| Privacy | 98% |
| Setup / Gate | 98% |
| Docs | 99% |
| Merge to main | 98% |

## Verified open PRs (2026-11-10)

| PR | Title | Notes |
| --- | --- | --- |
| [#343](https://github.com/MonMonMars/amoji-app/pull/343) | Dance leg VRMAs + free feet with music beat | Independent dance/body slice from #337 |
| [#342](https://github.com/MonMonMars/amoji-app/pull/342) | Replace Hello There with CC0 Silent Night vocal | Music library fix |
| [#340](https://github.com/MonMonMars/amoji-app/pull/340) | Audible card greets via same-origin gesture clip | Stacked on #338 |
| [#339](https://github.com/MonMonMars/amoji-app/pull/339) | Weather/news reports; read news without follow-up asks | Stacked on #338 |
| [#338](https://github.com/MonMonMars/amoji-app/pull/338) | Scrub idle nonsense, cant-hear, phase chips; drop um filler | Chat UX scrub from #337 |
| [#337](https://github.com/MonMonMars/amoji-app/pull/337) | Mega music-beat-body / chat UX pack | Mega tip — prefer merge slices when possible |
| [#336](https://github.com/MonMonMars/amoji-app/pull/336) | Self-host fonts so CI build does not need Google | CI flake |
| [#240](https://github.com/MonMonMars/amoji-app/pull/240) | SettingsSheet memory-add + yourName a11y | Polish leftover (mostly folded into #335) |
| [#154](https://github.com/MonMonMars/amoji-app/pull/154) | robot-demo speak field aria-label | Polish leftover |
| [#20](https://github.com/MonMonMars/amoji-app/pull/20) | CosyVoice TTS spike | Draft spike |
| [#1](https://github.com/MonMonMars/amoji-app/pull/1) | Voice bake-off UI | Old spike |

### Branches pushed — need ManagePullRequest open

| Branch | Suggested base | Suggested title |
| --- | --- | --- |
| `cursor/content-motion-wire-0340-0eac` | `cursor/dance-legs-music-0340-0eac` (#343) | feat(web): wire content/topic to motion maps |
| `cursor/poke-body-lean-0340-0eac` | `main` | feat(web): poke opposite-side lean + head tier falloff |
| `cursor/cma-poke-sfx-pack-0340-0eac` | poke lean branch | feat(web): cull CMA emotion clips; expand poke SFX pack |

Payload file: `/opt/cursor/artifacts/open-prs-payload.json` (agent run artifact).

## Merged recently (#320 / #327 / #329–#335)

| PR | Item | Notes |
| --- | --- | --- |
| [#335](https://github.com/MonMonMars/amoji-app/pull/335) | Settings / payment / email / security / storage / legal systems pack | `dd90e87` |
| [#334](https://github.com/MonMonMars/amoji-app/pull/334) | Sing mic farther out + clear sticky move when bed stops | |
| [#333](https://github.com/MonMonMars/amoji-app/pull/333) | Weather without GPS talk; keep music up under TTS | |
| [#332](https://github.com/MonMonMars/amoji-app/pull/332) | Silent music, calmer idle, motion≠talk, pose blend | |
| [#331](https://github.com/MonMonMars/amoji-app/pull/331) | Never ask to continue last-time talk | |
| [#330](https://github.com/MonMonMars/amoji-app/pull/330) | Caption ladder — no overlap with chat history | |
| [#329](https://github.com/MonMonMars/amoji-app/pull/329) | Demo-phase UX batch (weather, volume, mic, tai chi, sticky sing, …) | Pixel NEW 1–8 landed |
| [#327](https://github.com/MonMonMars/amoji-app/pull/327) | Actually light VRoid chars 1–3 (matcap + shade floor) | |
| [#320](https://github.com/MonMonMars/amoji-app/pull/320) | View-only rules + geo helplines + crisis popup | |

Earlier finish pass still on `main`: #306–#325 (idle nonsense gate, phrase pauses, axial 360 stop, demo chips, OVH sticky, Mixkit music, …).

## Feature status (priority)

| Area | Item | Status | PR / note |
| --- | --- | --- | --- |
| Setup | Flow: APP → rules → mic/speaker → title → select → chat | **Done** | #305 / #285 / #292 |
| Audio | Soft Continue; mic/speaker gate | **Done** | #305 / #314 |
| Audio | TTS clause + phrase pauses | **Done** | #289 / #324 |
| Audio | Weather no GPS talk + volume under TTS | **Done** | #333 / #329 |
| Audio | Sing mic clear of body + sticky clear | **Done** | #334 |
| Audio | Settings LangChips voice audition | **In leftover PR** | `cursor/leftover-pixel-fixes-0340-0eac` |
| Audio | Longer 開聲傾偈 gate sample | **In leftover PR** | recovered from local stash |
| Chat UX | Idle nonsense / cant-hear / phase chips / um filler | **In PR** | #338 (+ mega #337) |
| Chat UX | News/weather read without fishing asks | **In PR** | #339 |
| Chat UX | Card greets audible (gesture clip) | **In PR** | #340 |
| VRM / Idle | Dance legs free feet + music beat | **In PR** | #343 |
| VRM / Idle | Content/topic → motion maps | **Branch ready** | content-motion-wire (open PR) |
| VRM / Poke | Opposite-side lean + CMA poke SFX pack | **Branches ready** | poke-body-lean → cma-poke-sfx |
| VRM / ROM | Body–arm–neck every-frame clamp (no scary 360) | **In leftover PR** | extends #323 |
| Music | Silent Night CC0 vocal | **In PR** | #342 |
| Music | Licensed stream/embed beyond Mixkit | **Hold** | `docs/MUSIC_STREAMING.md` |
| Verify | Post-merge live check on Pages | **Hold** | Needs Pages access / human |

## Outstanding / Hold (Pixel confirm)

1. **Open the 3 missing slice PRs** via ManagePullRequest (content-motion, poke-lean, cma-sfx) — branches already on origin.
2. **Poke correctness** — opposite lean + SFX pack need Pixel eyes after #poke PRs merge.
3. **More / better poke SFX** — pack expanded; Pixel may still want more clips.
4. **Live github.io verify** — **Hold** unless Pages access is available in the environment.
5. **Licensed music catalog** — **Hold** (do not scrape commercial streams).

## Documents audit

| Document | Path | Status |
| --- | --- | --- |
| Docs index | `docs/README.md` | Complete |
| Privacy / memory | `docs/PRIVACY_MEMORY.md` | Complete |
| Chat entry flow | `docs/CHAT_ENTRY_FLOW.md` | Complete |
| TTS pipeline | `docs/TTS_PIPELINE.md` | Complete |
| Cast lighting | `docs/CAST_LIGHTING.md` | Complete |
| Setup onboarding | `docs/SETUP_ONBOARDING.md` | Complete |
| Merge checklist | `docs/MERGE_CHECKLIST.md` | Historical (stack already on main; see open slices above) |
| Music streaming | `docs/MUSIC_STREAMING.md` | Complete (licensed Hold noted) |
| Job / voice checklist | `AMOJI_JOB_CHECKLIST.md` | May lag — prefer this board for open PR truth |
| This status board | `docs/project-status.html` + this file | Refreshed 2026-11-10 (md); html may lag |
