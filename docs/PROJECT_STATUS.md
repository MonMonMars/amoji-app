# Amoji project status board

**Generated:** 2026-11-18 18:17 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/)  
**Phone smoke:** [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)  
**Visual board:** [Pages](https://monmonmars.github.io/amoji-app/docs/project-status.html) · repo [`project-status.html`](./project-status.html)  
**Pixel pickers:** [Pages owner-resources](https://monmonmars.github.io/amoji-app/docs/owner-resources.html) (music · poke · **idle** · **stories** · **news** · **demo** tabs) · local: `cd docs && python3 -m http.server 8765`  
**`main` tip:** `3cb507c6` (**r2026-11-18.215** · #507 unified CD catalog)

## Snapshot

| Bucket | Count |
| --- | ---: |
| **Done** — merged to `main` | 100+ stack · Nov 18 ship **#497–#507** + **r208–r215** |
| **Open product PRs** | **0** (Hold spikes only) |
| **Outstanding** — actionable code | Duet path aligned with library gate · stale branch rebases |
| **Outstanding** — Pixel / human | **R10–R13 not Done** · [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) |
| **Hold** | licensed music · Stripe · PH · Search Console · spikes #1 / #20 |

**Honesty:** Merged ≠ owner Done. **Do not mark R10–R13 Done** without owner OK on live **r2026-11-18.215+** after deploy.  
**Pages:** refresh SW after each revision bump.

### Progress by category (% merged to `main`)

| Category | Merged % |
| --- | ---: |
| Chat UX | 99% |
| Audio / TTS | 99% |
| VRM / Idle | 99% |
| Music / perf pipeline | 99% (listen **r212** · beat **r213** · session **r214** · catalog **r215**) |
| Docs | 99% |
| Merge to main | 99% |

---

## Done (merged to `main`)

Living tip through **#507** / **r2026-11-18.215**. Product bible: [`USER_PRODUCT_BIBLE.md`](./USER_PRODUCT_BIBLE.md).

### Nov 18 ship (#497–#507, r208–r215)

| PR | Item | Notes |
| --- | --- | --- |
| [#507](https://github.com/MonMonMars/amoji-app/pull/507) | Unified CD catalog + News/Demo tabs **r215** | owner-resources manifest |
| [#506](https://github.com/MonMonMars/amoji-app/pull/506) | PerformanceSession gate + BGM fade **r214** | listen / sing / dance / end |
| [#505](https://github.com/MonMonMars/amoji-app/pull/505) | Beat-aligned VRMA **r213** | Body phase from library bed clock |
| [#504](https://github.com/MonMonMars/amoji-app/pull/504) | Listen-only BGM phase **r212** | Generic 「播音樂」→ calm idle |
| [#503](https://github.com/MonMonMars/amoji-app/pull/503) | Owner perf picks — listen MV + sing audio/VRMA | **Phone** honor `ownerPerfPicks` / idle rails |
| [#502](https://github.com/MonMonMars/amoji-app/pull/502) | MV069–MV098 JP+US Mixkit vault | owner-resources Music tab |
| [#501](https://github.com/MonMonMars/amoji-app/pull/501) | News long body + boilerplate scrub | **Phone** 今日有咩新聞 length |
| [#500](https://github.com/MonMonMars/amoji-app/pull/500) | ST001–ST038 fairy-tale vault + Stories tab | owner-resources |
| [#499](https://github.com/MonMonMars/amoji-app/pull/499) | MV039–MV068 J-pop Mixkit vault | owner-resources |
| [#498](https://github.com/MonMonMars/amoji-app/pull/498) | owner-resources play URL verify | Pages `../audio` paths |
| [#497](https://github.com/MonMonMars/amoji-app/pull/497) | Docs Pages copy + symlink trim | deploy hygiene |

### Nov 17 afternoon ship (#489–#496)

See prior rows — dance LoopRepeat, card greet, poke 我鍾意信 skip, news long read, unified owner-resources.

---

## Open PRs

| PR | Title | Notes |
| --- | --- | --- |
| [#20](https://github.com/MonMonMars/amoji-app/pull/20) | CosyVoice TTS spike | Draft — Hold |
| [#1](https://github.com/MonMonMars/amoji-app/pull/1) | Voice bake-off UI | Old spike — Hold |

**Stale product branches:** `cursor/no-history-resume-ask-0340` · `cursor/motion-music-idle-batch-0340` — need rebase (conflicts with **r215** tip).

---

## Outstanding (actionable)

### Code (agents)

1. **Duet path** — align with library performance gate ([`SING_DANCE_PIPELINE.md`](./SING_DANCE_PIPELINE.md))  
2. **Branch hygiene** — rebase stale `cursor/*` tips onto `3cb507c6` before new PRs (219 remote tips still diverge; most are post-merge doc drift)

Do **not:** re-merge closed vault/news/listen/beat/catalog work; mark R10–R13 Done without owner.

### Phone / human (not agent Done)

1. **Listen BGM** — **r212** live: 「播音樂」→ hear bed, calm idle; 「跳舞」still dances  
2. **Dance beat** — **r213** live: late VRMA load should track bed clock (**Phone**)  
3. **Perf end fade** — **r214** live: show end should not hard-cut BGM  
4. **Owner-resources** — Music / Stories / News / Demo at **r215**  
5. **News length** — #501 merged · **Phone** yue multi-sentence  
6. **R11 idle / R10 voice / R13 poke / R12 lighting** — **not Done**  
7. Full [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)

---

## Hold

Unchanged — licensed music, Stripe live, PH, Search Console, modular GLBs, spikes #1 / #20.

---

## Documents audit

| Document | Path | Status |
| --- | --- | --- |
| This status board | `docs/PROJECT_STATUS.md` | Refreshed **2026-11-18** post-#507 · **r215** |
| Sing/dance pipeline | `docs/SING_DANCE_PIPELINE.md` | PerformanceSession on **r214** |
| Phone smoke | `docs/PHONE_SMOKE.md` | Owner verify |