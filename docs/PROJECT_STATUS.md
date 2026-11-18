# Amoji project status board

**Generated:** 2026-11-18 21:35 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/)  
**Phone smoke:** [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)  
**Visual board:** [Pages](https://monmonmars.github.io/amoji-app/docs/project-status.html) · repo [`project-status.html`](./project-status.html)  
**Pixel pickers:** [Pages owner-resources](https://monmonmars.github.io/amoji-app/docs/owner-resources.html) (music · poke · **idle** · **stories** · **news** · **demo** tabs) · local: `cd docs && python3 -m http.server 8765`  
**`main` tip:** `8c7bec89` (**r2026-11-18.228** · #518 idle + #519 card voice merged; **#520** demo + **#517** owner queued)

## Snapshot

| Bucket | Count |
| --- | ---: |
| **Done** — merged to `main` | 100+ stack · through **#511** + **#515** · **r220** (incl. #497–#507 vault/perf) |
| **Open product PRs** | **#520** demo r230 · **#517** owner r231 · #512 |
| **Outstanding** — agents (no PR yet) | VRM pupil · picker polish |
| **Outstanding** — Pixel / human | **R10–R13 not Done** · stale SW · [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) |
| **Hold** | licensed music · Stripe · PH · Search Console · spikes #1 / #20 |

**Honesty:** Merged ≠ owner Done. **Do not mark R10–R13 Done** without owner OK on live **r2026-11-18.220+** after deploy and SW hard-refresh.  
**Pages:** hard-refresh service worker after each revision bump — stale SW still a phone blocker.

### Progress by category (% merged to `main`)

| Category | Merged % |
| --- | ---: |
| Chat UX | 99% |
| Audio / TTS | 99% |
| VRM / Idle | 99% (**r217** visible calm VRMA on v6 stands — **phone** still R11) |
| Music / perf pipeline | 99% (listen **r212** · beat **r213** · session **r214** · catalog **r215** · instant **#515** / **r220**) |
| News / TTS scrub | 99% (**#511** / **r218** — **phone** verify) |
| Docs | 99% |
| Merge to main | 99% |

---

## Done (merged to `main`)

Living tip through **#515** / **r2026-11-18.220** (news scrub **#511** at **r218**). Product bible: [`USER_PRODUCT_BIBLE.md`](./USER_PRODUCT_BIBLE.md).

### Nov 18 evening (#508–#511, #515, r216–r220)

| PR | Item | Notes |
| --- | --- | --- |
| [#515](https://github.com/MonMonMars/amoji-app/pull/515) | Instant music/song play — no fades **r220** | **Phone** verify dance/song beds |
| [#511](https://github.com/MonMonMars/amoji-app/pull/511) | News + TTS scrub (RSS tags, stream lead repeats) **r218** | **Phone** 今日有咩新聞 — not owner Done until live OK |
| [#510](https://github.com/MonMonMars/amoji-app/pull/510) | Poke same-side lean regression tests | Locks #443-era drift · **Phone** R13 still open |
| — | Visible idle VRMA on v6 stands **r217** | Merged with idle amp fix (`c6119d48`) |
| [#508](https://github.com/MonMonMars/amoji-app/pull/508) | Per-row owner picker notes export **r216** | owner-resources |

### Nov 18 ship (#497–#507, r208–r215)

| PR | Item | Notes |
| --- | --- | --- |
| [#507](https://github.com/MonMonMars/amoji-app/pull/507) | Unified CD catalog + News/Demo tabs **r215** | owner-resources manifest |
| [#506](https://github.com/MonMonMars/amoji-app/pull/506) | PerformanceSession gate + BGM fade **r214** | listen / sing / dance / end |
| [#505](https://github.com/MonMonMars/amoji-app/pull/505) | Beat-aligned VRMA **r213** | Body phase from library bed clock |
| [#504](https://github.com/MonMonMars/amoji-app/pull/504) | Listen-only BGM phase **r212** | Generic 「播音樂」→ calm idle |
| [#503](https://github.com/MonMonMars/amoji-app/pull/503) | Owner perf picks — listen MV + sing audio/VRMA | **Phone** honor `ownerPerfPicks` / idle rails |
| [#502](https://github.com/MonMonMars/amoji-app/pull/502) | MV069–MV098 JP+US Mixkit vault | owner-resources Music tab |
| [#501](https://github.com/MonMonMars/amoji-app/pull/501) | News long body + boilerplate scrub | **Phone** yue multi-sentence |
| [#500](https://github.com/MonMonMars/amoji-app/pull/500) | ST001–ST038 fairy-tale vault + Stories tab | owner-resources |
| [#499](https://github.com/MonMonMars/amoji-app/pull/499) | MV039–MV068 J-pop Mixkit vault | owner-resources |
| [#498](https://github.com/MonMonMars/amoji-app/pull/498) | owner-resources play URL verify | Pages `../audio` paths |
| [#497](https://github.com/MonMonMars/amoji-app/pull/497) | Docs Pages copy + symlink trim | deploy hygiene |

### Nov 17 afternoon ship (#489–#496)

Dance LoopRepeat, card greet, poke 我鍾意信 skip, news long read, unified owner-resources.

---

## Open PRs

| PR | Title | Notes |
| --- | --- | --- |
| [#520](https://github.com/MonMonMars/amoji-app/pull/520) | Demo weather+news left + audible chip taps **r230** | `sayLocal` + live facts on Pages |
| [#517](https://github.com/MonMonMars/amoji-app/pull/517) | Owner-resources Mixkit + row audio scrub **r231** | Merge after **#520** if train conflicts |
| [#512](https://github.com/MonMonMars/amoji-app/pull/512) | Remove ⚑ 舉報 from chat bubbles **r218** | Chat UX |
| [#20](https://github.com/MonMonMars/amoji-app/pull/20) | CosyVoice TTS spike | Draft — **Hold** |
| [#1](https://github.com/MonMonMars/amoji-app/pull/1) | Voice bake-off UI | Old spike — **Hold** |

### Shipped this session (merged to `main`)

| PR | Item |
| --- | --- |
| [#518](https://github.com/MonMonMars/amoji-app/pull/518) | Idle v2 visible default **r227** |
| [#519](https://github.com/MonMonMars/amoji-app/pull/519) | Card voice audition all langs **r228** |

### Agent branches (in flight)

| Workstream | Branch hint | Notes |
| --- | --- | --- |
| VRM pupil pops | `cursor/vrm-pupil-*` | Surprise / jaw-drop polish |

---

## Outstanding (actionable)

### Code (agents)

1. **#520 → #517** — merge when CI green; hard-refresh SW on phone  
2. **#512** — chat report chip removal  
3. **Demo smoke** — weather/news chips left + speak on live **r230**  
4. **Owner-resources** — Mixkit preview audio after **#517**  
5. **Hip-hop / idle / card** — phone pass **r228** post-merge  
6. **VRM pupil** — pop / size stability on surprise  
7. **Owner picks apply** — listen/sing/dance honor picker on device  
8. **Duet path** — align with library performance gate ([`SING_DANCE_PIPELINE.md`](./SING_DANCE_PIPELINE.md))

Do **not:** re-merge closed #497–#511 / #515 work; mark R10–R13 Done without owner.

### Phone / human (not agent Done)

1. **Stale SW** — hard-refresh or clear site data after **r230** deploy (expect `revision.txt` **r2026-11-18.230** on demo tip)  
2. **Card voice all langs** — **#519** merged (**r228**); owner phone verify  
3. **Idle quality** — **#518** merged (**r227**); R11 not Done until phone OK  
4. **Mixkit HTML** — **#517** pending; Music tab play/preview on Pages  
5. **Hip-hop ask** — after **#514** merge on live  
6. **Pupil pops** — eye surprise on device  
7. **Owner picks** — perf MV/sing/dance rails from picker  
8. **Instant play** — **#515** on tip; **phone** verify song/dance  
9. **Listen / dance / perf** — **r212–r214** still require owner pass  
10. **R10 voice / R11 idle / R12 lighting / R13 poke** — **not Done**  
11. Full [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)

---

## Hold

Unchanged — licensed music, Stripe live, PH, Search Console, modular GLBs, spikes #1 / #20.

---

## Documents audit

| Document | Path | Status |
| --- | --- | --- |
| This status board | `docs/PROJECT_STATUS.md` | Refreshed **2026-11-18 21:35 HKT** post-**#518/#519** · **#520/#517** open |
| Sing/dance pipeline | `docs/SING_DANCE_PIPELINE.md` | PerformanceSession on **r214** |
| Phone smoke | `docs/PHONE_SMOKE.md` | Owner verify |