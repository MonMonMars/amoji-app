# Amoji project status board

**Generated:** 2026-11-14 14:30 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/)  
**Visual board:** open [`project-status.html`](./project-status.html) in a browser.  
**`main` tip:** `082f693` (#379 gate location · prior wave #362–#364 / #373–#375)

## Snapshot

| Bucket | Count |
| --- | ---: |
| **Done** — merged to `main` | 80+ stack · Nov 13 wave #362–#364 / #373–#375 / #379 |
| **Open product PRs** | **0** (Hold spikes only: #1 / #20 / #154 / #240) |
| **Outstanding** — actionable code left for agents | **0** |
| **Outstanding** — Pixel / human actions | Device listen (dance/one-voice/music) · gate location one-popup confirm · white-pupil image advice |
| **Hold** | licensed music · Stripe live keys · Product Hunt · Search Console · stale spikes #1 / #20 / #154 / #240 |
| Docs missing | 0 |

**Overall feature stack (approx.):** ~99% merged to `main` · ~0% open product PRs · ~1% Hold / human eyeball

### Progress by category (% merged to `main`)

| Category | Merged % |
| --- | ---: |
| Chat UX | 99% |
| Audio / TTS | 97% |
| VRM / Idle | 98% |
| Privacy / legal | 99% |
| Setup / Gate | 99% |
| Systems (pay / email / security / storage) | 99% (#335 + #354–#356) |
| SEO / marketing surface | 99% (#357) |
| Docs | 99% (#353 in flight) |
| Merge to main | 98% |

---

## Done (merged to `main`)

Living tip: `082f693`. Product bible: [`USER_PRODUCT_BIBLE.md`](./USER_PRODUCT_BIBLE.md).

### Nov 13–14 wave

| PR | Item | Notes |
| --- | --- | --- |
| [#379](https://github.com/MonMonMars/amoji-app/pull/379) | Location Allow on gate page; once-per-tab geo prime | Pages live `/gate/audio` |
| [#375](https://github.com/MonMonMars/amoji-app/pull/375) | One voice on character card greets | |
| [#374](https://github.com/MonMonMars/amoji-app/pull/374) | gTTS bright/mid/deep pitch tiers | |
| [#373](https://github.com/MonMonMars/amoji-app/pull/373) | Phase rotate + AI news / personal / secret chips | |
| [#364](https://github.com/MonMonMars/amoji-app/pull/364) | Music ask: random play; select only when asked | |
| [#363](https://github.com/MonMonMars/amoji-app/pull/363) | Male/female voices per lang + Add pool | |
| [#362](https://github.com/MonMonMars/amoji-app/pull/362) | Dance starts only when music bed plays | |

### Mass merge (2026-11-11)

| PR | Item | Notes |
| --- | --- | --- |
| [#360](https://github.com/MonMonMars/amoji-app/pull/360) | Smoother companion talk — scrub idle/LLM nonsense | talk-sense on `main` |
| [#359](https://github.com/MonMonMars/amoji-app/pull/359) | Longer story, science, and simple-help conversations | |
| [#358](https://github.com/MonMonMars/amoji-app/pull/358) | Poke SFX list + Want/Skip select pool | |
| [#357](https://github.com/MonMonMars/amoji-app/pull/357) | SEO metadata, sitemap, robots, JSON-LD | |
| [#356](https://github.com/MonMonMars/amoji-app/pull/356) | Finish security, legal, and storage systems | |
| [#355](https://github.com/MonMonMars/amoji-app/pull/355) | Finish support email contact + wipe product data | |
| [#354](https://github.com/MonMonMars/amoji-app/pull/354) | Finish payment system, payment rules, charging rules | |
| [#352](https://github.com/MonMonMars/amoji-app/pull/352) | Longer 開聲傾偈 gate voice sample | |
| [#351](https://github.com/MonMonMars/amoji-app/pull/351) | Every-frame arm ROM clamp | |
| [#350](https://github.com/MonMonMars/amoji-app/pull/350) | Settings/setup LangChips audition | |
| [#348](https://github.com/MonMonMars/amoji-app/pull/348) | Cull CMA emotion clips; expand poke SFX pack | |
| [#345](https://github.com/MonMonMars/amoji-app/pull/345) | Poke opposite-side lean + head tier falloff | |
| [#344](https://github.com/MonMonMars/amoji-app/pull/344) | Wire content/topic to motion maps | |
| [#343](https://github.com/MonMonMars/amoji-app/pull/343) | Dance leg VRMAs + free feet with music beat | |
| [#342](https://github.com/MonMonMars/amoji-app/pull/342) | Replace Hello There with CC0 Silent Night vocal | |
| [#340](https://github.com/MonMonMars/amoji-app/pull/340) | Audible card greets via same-origin gesture clip | tip `2fec7d3` |
| [#339](https://github.com/MonMonMars/amoji-app/pull/339) | Weather/news reports; read news without follow-up asks | |
| [#338](https://github.com/MonMonMars/amoji-app/pull/338) | Scrub idle nonsense, cant-hear, phase chips; drop um filler | |
| [#336](https://github.com/MonMonMars/amoji-app/pull/336) | Self-host fonts so CI build does not need Google | |

### Earlier on `main`

| PR | Item | Notes |
| --- | --- | --- |
| [#335](https://github.com/MonMonMars/amoji-app/pull/335) | Settings / payment / email / security / storage / legal systems pack (v1) | finish slices #354–#356 also merged |
| [#334](https://github.com/MonMonMars/amoji-app/pull/334) | Sing mic farther out + clear sticky move when bed stops | |
| [#333](https://github.com/MonMonMars/amoji-app/pull/333) | Weather without GPS talk; keep music up under TTS | |
| [#332](https://github.com/MonMonMars/amoji-app/pull/332) | Silent music, calmer idle, motion≠talk, pose blend | |
| [#331](https://github.com/MonMonMars/amoji-app/pull/331) | Never ask to continue last-time talk (no-history resume) | |
| [#330](https://github.com/MonMonMars/amoji-app/pull/330) | Caption ladder — no overlap with chat history | |
| [#329](https://github.com/MonMonMars/amoji-app/pull/329) | Demo-phase UX batch (weather, volume, mic, tai chi, sticky sing, …) | Pixel NEW 1–8 |
| [#327](https://github.com/MonMonMars/amoji-app/pull/327) | Actually light VRoid chars 1–3 (matcap + shade floor) | |
| [#320](https://github.com/MonMonMars/amoji-app/pull/320) | View-only rules + geo helplines + crisis popup | |

Earlier finish pass still on `main`: #306–#325 and #280–#305 era.

### Closed without merge (do not reopen)

| PR | Notes |
| --- | --- |
| [#337](https://github.com/MonMonMars/amoji-app/pull/337) | Mega music-beat-body / chat UX pack — superseded by slices; **closed** |
| [#347](https://github.com/MonMonMars/amoji-app/pull/347) | LangChips + arm ROM + gate + status docs leftover bundle — superseded by #350–#353; **closed** |

---

## Open PRs

| PR | Title | Notes |
| --- | --- | --- |
| [#353](https://github.com/MonMonMars/amoji-app/pull/353) | Status docs refresh (this board) | Docs only — post-mass-merge cleanup |

### Hold / stale (do not touch unless Pixel asks)

| PR | Title | Notes |
| --- | --- | --- |
| [#240](https://github.com/MonMonMars/amoji-app/pull/240) | SettingsSheet memory-add + yourName a11y | CONFLICTING — mostly folded into #335 |
| [#154](https://github.com/MonMonMars/amoji-app/pull/154) | robot-demo speak field aria-label | CONFLICTING polish leftover |
| [#20](https://github.com/MonMonMars/amoji-app/pull/20) | CosyVoice TTS spike | Draft spike |
| [#1](https://github.com/MonMonMars/amoji-app/pull/1) | Voice bake-off UI | Old spike |

---

## Outstanding (actionable)

### Code (agents)

**None.** Audit 2026-11-11 post-mass-merge: product slices #336–#360 (except docs #353) are on `main`. No remaining product bugs/gaps listed on the board that agents can code without inventing scope.

### Human / Pixel

1. **Merge #353** (this docs refresh) after CI green.
2. **Live Pages verify** after mass merge (setup → select → gate → chat; poke lean + SFX; news without fishing asks; story/science longer replies; systems/payment when env present).
3. **Optional triage** of stale spikes #1 / #20 / #154 / #240 — only if Pixel asks.
4. Hold items below (env / marketing / licensed catalog).

---

## Hold

| Item | Why |
| --- | --- |
| Licensed music catalog / stream embed | Needs licensed catalog; do not scrape Spotify/YouTube — `docs/MUSIC_STREAMING.md` |
| Stripe live keys / Payment Link | Env only (`STRIPE_*`, `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`) — code on `main` via #354 |
| Product Hunt shoot / demo video | Marketing human work |
| Google Search Console sitemap submit | Human; #357 ships `sitemap.xml` / `robots.txt` under `/amoji-app` |
| Live github.io product eyeball | Pages rebuild after merge; curl smoke only proves shell is up |
| Modular GLBs / CosyVoice refs / GPU TTS hosts | Asset / infra Holds — not blocking Pages |
| Stale spikes #1 / #20 / #154 / #240 | Do not touch unless Pixel asks |

---

## Pixel merge order (post-mass-merge)

Mass merge complete. Remaining:

1. **#353** status docs (this PR) → merge when CI green.
2. **Pages eyeball** on live `/setup`.
3. **Holds** stay Hold; stale spikes stay untouched unless Pixel asks.

### Do not

- Scrape commercial streaming platforms for music.
- Invent new product scope when the Outstanding code list is empty.
- Touch Hold PRs #1 / #20 / #154 / #240 unless Pixel asks.
- Treat Pages as verified until a human eyeballs the live site.

---

## Feature status (priority)

| Area | Item | Status | PR / note |
| --- | --- | --- | --- |
| Setup | Flow: APP → rules → mic/speaker → title → select → chat | **Done** | #305 / #285 / #292 |
| Audio | Soft Continue; mic/speaker gate | **Done** | #305 / #314 |
| Audio | TTS clause + phrase pauses | **Done** | #289 / #324 |
| Audio | Weather no GPS talk + volume under TTS | **Done** | #333 / #329 |
| Audio | Sing mic clear of body + sticky clear | **Done** | #334 |
| Audio | Settings LangChips voice audition | **Done** | #350 |
| Audio | Longer 開聲傾偈 gate sample | **Done** | #352 |
| Chat UX | Idle nonsense / cant-hear / phase chips / um filler | **Done** | #338 / #360 |
| Chat UX | News/weather read without fishing asks | **Done** | #339 |
| Chat UX | Card greets audible (gesture clip) | **Done** | #340 |
| Chat UX | Longer story / science / simple-help | **Done** | #359 |
| Chat UX | No history-resume ask | **Done** | #331 |
| VRM / Idle | Dance legs free feet + music beat | **Done** | #343 |
| VRM / Idle | Content/topic → motion maps | **Done** | #344 |
| VRM / Poke | Opposite-side lean + CMA poke SFX + Want/Skip | **Done** | #345 → #348 → #358 |
| VRM / ROM | Body–arm–neck every-frame clamp | **Done** | #351 |
| Music | Silent Night CC0 vocal | **Done** | #342 |
| Systems | Payment / charging rules finish | **Done** | #354 |
| Systems | Support email + wipe | **Done** | #355 |
| Systems | Security / legal / storage finish (+ fonts) | **Done** | #356 / #336 |
| Marketing | SEO metadata / sitemap / robots / JSON-LD | **Done** | #357 |
| Docs | Status board post-merge refresh | **Open (docs)** | #353 |
| Music | Licensed stream/embed beyond Mixkit | **Hold** | `docs/MUSIC_STREAMING.md` |
| Verify | Post-merge live check on Pages | **Hold** | Needs Pages rebuild + human eyeball |

---

## Documents audit

| Document | Path | Status |
| --- | --- | --- |
| Docs index | `docs/README.md` | Complete |
| Privacy / memory | `docs/PRIVACY_MEMORY.md` | Complete |
| Chat entry flow | `docs/CHAT_ENTRY_FLOW.md` | Complete |
| TTS pipeline | `docs/TTS_PIPELINE.md` | Complete |
| Cast lighting | `docs/CAST_LIGHTING.md` | Complete |
| Setup onboarding | `docs/SETUP_ONBOARDING.md` | Complete |
| Systems map | `docs/SYSTEMS.md` | Complete (#354–#356 on main) |
| Merge checklist | `docs/MERGE_CHECKLIST.md` | Refreshed — post-mass-merge |
| Music streaming | `docs/MUSIC_STREAMING.md` | Complete (licensed Hold noted) |
| Job / voice checklist | `AMOJI_JOB_CHECKLIST.md` | Refreshed — prefer this board for open PR truth |
| This status board | `docs/project-status.html` + this file | Refreshed 2026-11-11 18:06 HKT |
