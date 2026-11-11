# Amoji project status board

**Generated:** 2026-11-11 15:51 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/setup)  
**Visual board:** open [`project-status.html`](./project-status.html) in a browser.  
**`main` tip:** `dd90e87` (includes #335 systems pack; open green PRs below are **not** on `main` yet)

## Snapshot

| Bucket | Count |
| --- | ---: |
| **Done** — merged to `main` (#320 / #327 / #329–#335 + earlier finish pass) | 9+ recent · 40+ stack |
| **Open PRs ready** (CI green, mergeable) — systems / SEO / motion / chat / poke / long-talk | 21 product + 4 stale spikes |
| **Outstanding** — actionable code left for agents | **0** |
| **Outstanding** — Pixel / human actions | merge order · env · eyeball |
| **Hold** | licensed music · Stripe live keys · Product Hunt · Search Console · Pages eyeball |
| Docs missing | 0 |

**Overall feature stack (approx.):** ~93% merged to `main` · ~5% open green PRs · ~2% Hold / human

### Progress by category (% merged to `main`)

| Category | Merged % |
| --- | ---: |
| Chat UX | 96% |
| Audio / TTS | 90% |
| VRM / Idle | 92% |
| Privacy / legal | 98% |
| Setup / Gate | 98% |
| Systems (pay / email / security / storage) | 85% (#335 on main; finish PRs #354–#356 open) |
| SEO / marketing surface | 0% on main (#357 open green) |
| Docs | 99% |
| Merge to main | 93% (many green PRs waiting on Pixel) |

---

## Done (merged to `main`)

Do not treat open green PRs as Done. Only commits on `main` tip `dd90e87` count here.

| PR | Item | Notes |
| --- | --- | --- |
| [#335](https://github.com/MonMonMars/amoji-app/pull/335) | Settings / payment / email / security / storage / legal systems pack (v1) | `dd90e87` — finish slices still open as #354–#356 |
| [#334](https://github.com/MonMonMars/amoji-app/pull/334) | Sing mic farther out + clear sticky move when bed stops | |
| [#333](https://github.com/MonMonMars/amoji-app/pull/333) | Weather without GPS talk; keep music up under TTS | |
| [#332](https://github.com/MonMonMars/amoji-app/pull/332) | Silent music, calmer idle, motion≠talk, pose blend | |
| [#331](https://github.com/MonMonMars/amoji-app/pull/331) | Never ask to continue last-time talk (no-history resume) | |
| [#330](https://github.com/MonMonMars/amoji-app/pull/330) | Caption ladder — no overlap with chat history | |
| [#329](https://github.com/MonMonMars/amoji-app/pull/329) | Demo-phase UX batch (weather, volume, mic, tai chi, sticky sing, …) | Pixel NEW 1–8 landed |
| [#327](https://github.com/MonMonMars/amoji-app/pull/327) | Actually light VRoid chars 1–3 (matcap + shade floor) | |
| [#320](https://github.com/MonMonMars/amoji-app/pull/320) | View-only rules + geo helplines + crisis popup | |

Earlier finish pass still on `main`: #306–#325 (idle nonsense gate, phrase pauses, axial 360 stop, demo chips, OVH sticky, Mixkit music, …) and #280–#305 era (setup, audio gate, entry flow, reply quality, cast lighting, poke hide, …).

---

## Open PRs ready (CI green — not merged)

Verified via `gh pr list` 2026-11-11. Prefer slices over mega when merging. **Do not close #337 or #347** unless Pixel says so.

### Systems / SEO / long-talk (base `main`)

| PR | Title | Notes |
| --- | --- | --- |
| [#354](https://github.com/MonMonMars/amoji-app/pull/354) | Finish payment system, payment rules, charging rules | Extends #335 |
| [#355](https://github.com/MonMonMars/amoji-app/pull/355) | Finish support email contact + wipe product data | Extends #335 |
| [#356](https://github.com/MonMonMars/amoji-app/pull/356) | Finish security, legal, and storage systems | Extends #335; also carries #336 font self-host cherry-pick |
| [#357](https://github.com/MonMonMars/amoji-app/pull/357) | SEO metadata, sitemap, robots, JSON-LD | Marketing surface |
| [#359](https://github.com/MonMonMars/amoji-app/pull/359) | Longer story, science, and simple-help conversations | Reply-budget modes |
| [#336](https://github.com/MonMonMars/amoji-app/pull/336) | Self-host fonts so CI build does not need Google | Optional if #356 lands first (same font fix) |

### Motion / chat slices

| PR | Title | Base / stack |
| --- | --- | --- |
| [#338](https://github.com/MonMonMars/amoji-app/pull/338) | Scrub idle nonsense, cant-hear, phase chips; drop um filler | `main` |
| [#339](https://github.com/MonMonMars/amoji-app/pull/339) | Weather/news reports; read news without follow-up asks | stacks on #338 |
| [#340](https://github.com/MonMonMars/amoji-app/pull/340) | Audible card greets via same-origin gesture clip | stacks on #338 |
| [#342](https://github.com/MonMonMars/amoji-app/pull/342) | Replace Hello There with CC0 Silent Night vocal | `main` |
| [#343](https://github.com/MonMonMars/amoji-app/pull/343) | Dance leg VRMAs + free feet with music beat | `main` |
| [#344](https://github.com/MonMonMars/amoji-app/pull/344) | Wire content/topic to motion maps | stacks on #343 |
| [#345](https://github.com/MonMonMars/amoji-app/pull/345) | Poke opposite-side lean + head tier falloff | `main` |
| [#348](https://github.com/MonMonMars/amoji-app/pull/348) | Cull CMA emotion clips; expand poke SFX pack | stacks on #345 |
| [#358](https://github.com/MonMonMars/amoji-app/pull/358) | Poke SFX list + Want/Skip select pool | stacks on #348 |
| [#350](https://github.com/MonMonMars/amoji-app/pull/350) | Settings/setup LangChips audition via `playVoiceGreeting` | `main` (split from #347) |
| [#351](https://github.com/MonMonMars/amoji-app/pull/351) | Every-frame arm ROM clamp (no scary 360 sleeve spins) | `main` (split from #347) |
| [#352](https://github.com/MonMonMars/amoji-app/pull/352) | Longer 開聲傾偈 gate voice sample | `main` (split from #347) |
| [#353](https://github.com/MonMonMars/amoji-app/pull/353) | Status docs refresh (this board) | `main` — docs only |

### Mega / leftover (keep open)

| PR | Title | Notes |
| --- | --- | --- |
| [#337](https://github.com/MonMonMars/amoji-app/pull/337) | Mega music-beat-body / chat UX pack | Prefer merge slices #338–#348 / #350–#352; **do not close without Pixel ask** |
| [#347](https://github.com/MonMonMars/amoji-app/pull/347) | LangChips audition + arm ROM + longer gate + status docs | **Superseded by #350–#353**; keep open until Pixel says close |

### Stale / conflicting (triage only if Pixel asks)

| PR | Title | Notes |
| --- | --- | --- |
| [#240](https://github.com/MonMonMars/amoji-app/pull/240) | SettingsSheet memory-add + yourName a11y | CONFLICTING — mostly folded into #335 |
| [#154](https://github.com/MonMonMars/amoji-app/pull/154) | robot-demo speak field aria-label | CONFLICTING polish leftover |
| [#20](https://github.com/MonMonMars/amoji-app/pull/20) | CosyVoice TTS spike | Draft spike |
| [#1](https://github.com/MonMonMars/amoji-app/pull/1) | Voice bake-off UI | Old spike |

---

## Outstanding (actionable)

### Code (agents)

**None.** Audit 2026-11-11: systems finish (#354–#356), SEO (#357), poke SFX select (#358), long-talk (#359), and motion/chat slices (#338–#348, #350–#352) are already PR’d and CI green. No remaining product bugs/gaps listed on the board that agents can code without inventing scope.

### Human / Pixel

1. **Merge open green PRs** using the Pixel merge order below (agents cannot merge without write auth).
2. **Decide fate of mega #337 and leftover #347** — leave open until Pixel explicitly says close (they are superseded by slices; do not auto-close).
3. **Eyeball poke lean + SFX** after #345 → #348 → #358 land.
4. **Live Pages verify** after merges hit `main` (see Hold).
5. **Optional triage** of stale spikes #1 / #20 / #154 / #240.

---

## Hold

| Item | Why |
| --- | --- |
| Licensed music catalog / stream embed | Needs licensed catalog; do not scrape Spotify/YouTube — `docs/MUSIC_STREAMING.md` |
| Stripe live keys / Payment Link | Env only (`STRIPE_*`, `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`) — code is in #354 |
| Product Hunt shoot / demo video | Marketing human work |
| Google Search Console sitemap submit | Human; #357 ships `sitemap.xml` / `robots.txt` under `/amoji-app` |
| Live github.io product eyeball | Pages rebuild after merge; curl smoke only proves shell is up |
| Modular GLBs / CosyVoice refs / GPU TTS hosts | Asset / infra Holds — not blocking Pages |

---

## Pixel merge order (suggested)

Agents cannot merge. Prefer CI-green, mergeable PRs; rebase if `main` moves.

1. **Fonts / systems finish (independent of motion)**  
   `#336` fonts **or** land fonts via `#356` → then `#354` payment → `#355` support email → `#356` security/legal/storage (if fonts already via #336, still merge #356 for systems).
2. **SEO / long-talk (independent)**  
   `#357` SEO · `#359` story/science/help long talk — any time after or beside systems.
3. **Chat UX stack**  
   `#338` → `#339` news · `#340` card greets.
4. **Music / dance / content motion**  
   `#342` Silent Night · `#343` dance legs → `#344` content-motion wire.
5. **Poke stack**  
   `#345` lean → `#348` CMA SFX pack → `#358` Want/Skip SFX select.
6. **Leftover Pixel splits (if not already covered)**  
   `#350` LangChips audition · `#351` arm ROM clamp · `#352` longer gate sample · `#353` status docs.
7. **Mega / leftover cleanup (Pixel only)**  
   After slices land, Pixel may close or supersede `#337` and `#347` — **do not close without explicit ask**.

### Do not

- Scrape commercial streaming platforms for music.
- Invent new product scope when the Outstanding code list is empty.
- Close #337 / #347 without Pixel saying so.
- Treat open green PRs as shipped on Pages until they merge to `main`.

---

## Feature status (priority)

| Area | Item | Status | PR / note |
| --- | --- | --- | --- |
| Setup | Flow: APP → rules → mic/speaker → title → select → chat | **Done** | #305 / #285 / #292 |
| Audio | Soft Continue; mic/speaker gate | **Done** | #305 / #314 |
| Audio | TTS clause + phrase pauses | **Done** | #289 / #324 |
| Audio | Weather no GPS talk + volume under TTS | **Done** | #333 / #329 |
| Audio | Sing mic clear of body + sticky clear | **Done** | #334 |
| Audio | Settings LangChips voice audition | **Open PR ready** | #350 |
| Audio | Longer 開聲傾偈 gate sample | **Open PR ready** | #352 |
| Chat UX | Idle nonsense / cant-hear / phase chips / um filler | **Open PR ready** | #338 (+ mega #337) |
| Chat UX | News/weather read without fishing asks | **Open PR ready** | #339 |
| Chat UX | Card greets audible (gesture clip) | **Open PR ready** | #340 |
| Chat UX | Longer story / science / simple-help | **Open PR ready** | #359 |
| VRM / Idle | Dance legs free feet + music beat | **Open PR ready** | #343 |
| VRM / Idle | Content/topic → motion maps | **Open PR ready** | #344 |
| VRM / Poke | Opposite-side lean + CMA poke SFX + Want/Skip | **Open PR ready** | #345 → #348 → #358 |
| VRM / ROM | Body–arm–neck every-frame clamp | **Open PR ready** | #351 |
| Music | Silent Night CC0 vocal | **Open PR ready** | #342 |
| Systems | Payment / charging rules finish | **Open PR ready** | #354 |
| Systems | Support email + wipe | **Open PR ready** | #355 |
| Systems | Security / legal / storage finish (+ fonts) | **Open PR ready** | #356 (+ #336) |
| Marketing | SEO metadata / sitemap / robots / JSON-LD | **Open PR ready** | #357 |
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
| Systems map | `docs/SYSTEMS.md` | Complete (finish detail lands with #354–#356) |
| Merge checklist | `docs/MERGE_CHECKLIST.md` | Refreshed — Pixel merge order |
| Music streaming | `docs/MUSIC_STREAMING.md` | Complete (licensed Hold noted) |
| Job / voice checklist | `AMOJI_JOB_CHECKLIST.md` | Refreshed — prefer this board for open PR truth |
| This status board | `docs/project-status.html` + this file | Refreshed 2026-11-11 15:51 HKT |
