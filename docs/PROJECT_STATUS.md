# Amoji project status board

**Generated:** 2026-11-17 21:15 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/)  
**Phone smoke:** [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)  
**Visual board:** open [`project-status.html`](./project-status.html) in a browser (repo file — not a Pages route).  
**Pixel pickers:** [`owner-music-picker.html`](./owner-music-picker.html) · [`owner-poke-reactions.html`](./owner-poke-reactions.html) · [`owner-idle-poses.html`](./owner-idle-poses.html) — `cd docs && python3 -m http.server 8765` (symlink `amoji-public-serve` → `apps/web/public` for music SFX).  
**`main` tip:** `2c1eee79` (#493 · **r2026-11-17.202** · afternoon ship **#489–#493** + **#490–#492** · **#494–#495**)

## Snapshot

| Bucket | Count |
| --- | ---: |
| **Done** — merged to `main` | 95+ stack · Nov 17 afternoon **#489–#493** landed |
| **Open product PRs** | Hold spikes #1 / #20 only |
| **Outstanding** — actionable code | **0** — queue from **#489–#493** cleared |
| **Outstanding** — Pixel / human | **R10–R13 not Done** · card · news · nonsense · captions · SFX Want · [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) |
| **Hold** | licensed music · Stripe live keys · Product Hunt · Search Console · spikes #1 / #20 |
| Docs missing | 0 |

**Honesty:** Merged ≠ owner Done. **Do not mark R10–R13 Done** without owner OK on live **r2026-11-17.202+**.  
**Pages:** product app live; refresh SW after each revision bump.

### Progress by category (% merged to `main`)

| Category | Merged % |
| --- | ---: |
| Chat UX | 99% |
| Audio / TTS | 99% |
| VRM / Idle | 99% |
| Privacy / legal | 99% |
| Setup / Gate | 99% |
| Systems | 99% |
| SEO / marketing surface | 99% |
| Docs | 99% (#389 merged; this tip refresh r202) |
| Merge to main | 99% |

---

## Done (merged to `main`)

Living tip: `2c1eee79` (**r2026-11-17.202**). Product bible: [`USER_PRODUCT_BIBLE.md`](./USER_PRODUCT_BIBLE.md).

### Nov 17 afternoon ship (#489–#493, #490–#492, #494–#495)

| PR | Item | Notes |
| --- | --- | --- |
| [#493](https://github.com/MonMonMars/amoji-app/pull/493) | Dance **LoopRepeat** + owner dance rail/pin picks | **Phone** dance motion with bed |
| [#492](https://github.com/MonMonMars/amoji-app/pull/492) | Selection card greet audible | EarlyAudioUnlock click; **Phone** /select |
| [#491](https://github.com/MonMonMars/amoji-app/pull/491) | TTS hyphenated names (G-DRAGON) | Vitest speak-text |
| [#490](https://github.com/MonMonMars/amoji-app/pull/490) | Long news read · 今日有咩新聞 | **Phone** yue news length |
| [#489](https://github.com/MonMonMars/amoji-app/pull/489) | Poke/chat skip yue **我鍾意信** TTS loop | `pokeLineForSpeech` + speech-queue |
| [#495](https://github.com/MonMonMars/amoji-app/pull/495) | Demo-phase chip scroll + shuffle | **Phone** chip row |
| [#494](https://github.com/MonMonMars/amoji-app/pull/494) | Owner music + poke reaction HTML pickers | docs pickers |

### Nov 17 backlog wave (#478–#486)

| PR | Item | Notes |
| --- | --- | --- |
| [#486](https://github.com/MonMonMars/amoji-app/pull/486) | SettingsSheet master mute external store | Compiler slice R10 settings |
| [#484](https://github.com/MonMonMars/amoji-app/pull/484) | PreChatAudioGate boot state init | Compiler slice soft audio gate |
| [#483](https://github.com/MonMonMars/amoji-app/pull/483) | RequireEntryGate `useSyncExternalStore` | Entry guard Compiler slice |
| [#482](https://github.com/MonMonMars/amoji-app/pull/482) | React Compiler eslint slice + status refresh | Mute/legal/soft-land; docs tip |
| [#481](https://github.com/MonMonMars/amoji-app/pull/481) | TtsVoiceRow **All** — per-locale pin highlight | **Phone** R10 audit |
| [#480](https://github.com/MonMonMars/amoji-app/pull/480) | Calm idle torso upright after poke/chat | **Phone** R11 |
| [#479](https://github.com/MonMonMars/amoji-app/pull/479) | Caption history punct-only dedupe | **Phone** captions |
| [#478](https://github.com/MonMonMars/amoji-app/pull/478) | Weather GPS deny IP prime + settings hint; news told 24h TTL + widen | **Phone** weather + news |
| [#477](https://github.com/MonMonMars/amoji-app/pull/477) | Dance audible catch-up + mic `busyRef` | **Phone** dance/mic |
| [#476](https://github.com/MonMonMars/amoji-app/pull/476) | Topical AI news honest miss (no junk substitute) | **Phone** news |
| [#475](https://github.com/MonMonMars/amoji-app/pull/475) | Junk headline scrub (funds/ISIN) | News integrity |
| [#474](https://github.com/MonMonMars/amoji-app/pull/474) | ESLint hygiene batch | CI |
| [#472](https://github.com/MonMonMars/amoji-app/pull/472) | Card greet audible all langs (gesture tap) | **Phone** card |
| [#471](https://github.com/MonMonMars/amoji-app/pull/471) | Owner idle picks, topical news 今日, poke lean | **Phone** |

### Nov 15 late wave (#419–#437)

See prior rows in git history — tip was `9292e81` before Nov 17 wave.

---

## Open PRs

**None product** (Hold spikes only).

| PR | Title | Notes |
| --- | --- | --- |
| [#20](https://github.com/MonMonMars/amoji-app/pull/20) | CosyVoice TTS spike | Draft — Hold |
| [#1](https://github.com/MonMonMars/amoji-app/pull/1) | Voice bake-off UI | Old spike — Hold |

**Closed this turn:** [#469](https://github.com/MonMonMars/amoji-app/pull/469) weather search → Open-Meteo — already on `main` (`live-tools.ts`).

**In flight:** none — agent queue clear on tip **#493** (**r202**).

---

## Outstanding (actionable)

### Code (agents)

**0** on tip after **#493**. No queued owner blocker in the **#489–#493** batch.

Do **not:** re-flip poke lean; wipe owner idle/poke/dance picks; mark R10–R13 Done; merge Hold spikes.

### Phone / human (not agent Done)

1. **News length** — #490 — yue「今日有咩新聞」multi-sentence read (**merged · Phone**)  
2. **Card greet** — #492 — /select audible preview (**merged · Phone**)  
3. **Poke voice** — #489 — no 我鍾意信 loop on poke (**merged · Phone**)  
4. **Dance** — #493 — looping perf with music; owner dance picks (**merged · Phone**)  
5. **Weather deny** — #478 — Settings amber hint + IP city after GPS deny  
6. **Captions** — #479 — punct-only dupes  
7. **R11 idle** — #480+#430+#432 — upright after poke; honor picks (**not Done**)  
8. **R10 voice** — #481+#424+#429 — All-row pins; male delivery (**not Done**)  
9. **R13 poke** — #409+#434 — same-side lean (**not Done**)  
10. **R12 lighting** — #408 — cast shader (**not Done**)  
11. **Nonsense** — #412+#416+#426 — owner live OK  
12. **SFX Want** — [`SFX_WANT_LIST.md`](./SFX_WANT_LIST.md)  
13. Full [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)

### Human / Pixel

1. Phone smoke on Pages at **r202+** after #493 dance LoopRepeat + owner dance picks.  
2. Talking-nonsense verify — owner OK still required.  
3. Holds unchanged (#1 / #20 unless Pixel asks).

---

## Hold

Unchanged — licensed music, Stripe live, PH, Search Console, modular GLBs, spikes #1 / #20.

---

## Feature status (priority)

Prior table through #437 remains on `main`; Nov 17 PRs above supersede phone notes for weather, news, captions, idle, voice row, dance. **Verify:** post-merge live check = **Human**.

---

## Documents audit

| Document | Path | Status |
| --- | --- | --- |
| This status board | `docs/PROJECT_STATUS.md` + `project-status.html` | Refreshed **2026-11-17** post-#493 |
| Phone smoke | `docs/PHONE_SMOKE.md` | Agent pre-check updated |
| Job checklist | `AMOJI_JOB_CHECKLIST.md` | Refreshed tip |