# Amoji project status board

**Generated:** 2026-11-19 02:12 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/)  
**Phone smoke:** [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)  
**Visual board:** [Pages](https://monmonmars.github.io/amoji-app/docs/project-status.html) · repo [`project-status.html`](./project-status.html)  
**Pixel pickers:** [Pages owner-resources](https://monmonmars.github.io/amoji-app/docs/owner-resources.html) (music · poke · **idle** · **stories** · **news** · **demo** tabs) · local: `cd docs && python3 -m http.server 8765`  
**`main` tip:** `91a857e3` (**r2026-11-18.237** · #518–#520 + #517 merged; live deploy pending)

## Snapshot

| Bucket | Count |
| --- | ---: |
| **Done** — merged to `main` | 100+ stack · through **#511** + **#515** · **r220** (incl. #497–#507 vault/perf) |
| **Open product PRs** | #512 chat UX · spikes Hold |
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

## Open PRs — Pixel merge-ready stack (r248→r254)

Handoff detail: [`AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md`](./AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md)

| Order | PR | Serial | Notes |
| ---: | --- | --- | --- |
| 1 | [#528](https://github.com/MonMonMars/amoji-app/pull/528) | **r248** | All-lang main speaker |
| 2 | [#529](https://github.com/MonMonMars/amoji-app/pull/529) | **r249** | Card audition audible |
| 3 | [#523](https://github.com/MonMonMars/amoji-app/pull/523) | **r250** | Chat interrupt + history |
| 4 | [#522](https://github.com/MonMonMars/amoji-app/pull/522) | **r251** | Music after PerformanceSession |
| 5 | [#540](https://github.com/MonMonMars/amoji-app/pull/540) | **r252** | CC0 beds + music allowlist |
| 6 | [#541](https://github.com/MonMonMars/amoji-app/pull/541) | **r253** | Full owner catalog (**supersedes #536/#537/#533**) |
| 7 | [#543](https://github.com/MonMonMars/amoji-app/pull/543) | **r254** | Idle/poke 採用 runtime (**supersedes #524**) |
| — | [#531](https://github.com/MonMonMars/amoji-app/pull/531) | **r255** | Docs claims (optional tail) |

### Open PRs — demo / docs tail (r256→r261, after live **r254**)

| Order | PR | Serial | Notes |
| ---: | --- | --- | --- |
| 1 | [#534](https://github.com/MonMonMars/amoji-app/pull/534) | **r256** | 聽音樂 · 聽歌 · 唱歌 chips |
| 2 | [#535](https://github.com/MonMonMars/amoji-app/pull/535) | **r257** | 睇星星 + star BGM |
| 3 | [#530](https://github.com/MonMonMars/amoji-app/pull/530) | **r258** | 時間 world clock chip |
| 4 | [#532](https://github.com/MonMonMars/amoji-app/pull/532) | **r259** | docs status + crisis-guard (no product) |
| 5 | [#539](https://github.com/MonMonMars/amoji-app/pull/539) | **r260** | `RESOURCE_LIBRARY_INDEX.md` |
| 6 | [#538](https://github.com/MonMonMars/amoji-app/pull/538) | **r261** | Motion thumb GIFs — merge **after #541** regen |

| — | [#512](https://github.com/MonMonMars/amoji-app/pull/512) | r218 | Chat UX (parallel) |
| Hold | [#20](https://github.com/MonMonMars/amoji-app/pull/20) / [#1](https://github.com/MonMonMars/amoji-app/pull/1) | — | Spikes |

**No history-resume ask:** shipped on `main` via [#331](https://github.com/MonMonMars/amoji-app/pull/331) / [#366](https://github.com/MonMonMars/amoji-app/pull/366) / [#412](https://github.com/MonMonMars/amoji-app/pull/412) / [#470](https://github.com/MonMonMars/amoji-app/pull/470) — branch `cursor/no-history-resume-ask-0340` reconciled; no second product PR.

### Shipped this session (merged to `main`)

| PR | Item |
| --- | --- |
| [#518](https://github.com/MonMonMars/amoji-app/pull/518) | Idle v2 visible default **r227** |
| [#519](https://github.com/MonMonMars/amoji-app/pull/519) | Card voice audition all langs **r228** |
| [#520](https://github.com/MonMonMars/amoji-app/pull/520) | Demo weather+news left + audible chip taps **r230** |
| [#517](https://github.com/MonMonMars/amoji-app/pull/517) | Owner-resources Mixkit scrub + motion previews **r237** |

### Stale / superseded (close when convenient — no merge)

| PR | Superseded by | Note |
| --- | --- | --- |
| [#536](https://github.com/MonMonMars/amoji-app/pull/536) · [#537](https://github.com/MonMonMars/amoji-app/pull/537) · [#533](https://github.com/MonMonMars/amoji-app/pull/533) · [#538](https://github.com/MonMonMars/amoji-app/pull/538) | **#541** | Picker hash / inventory / GIF / motion HTML → full catalog |
| [#524](https://github.com/MonMonMars/amoji-app/pull/524) | **#543** | Honor motion picks → idle/poke 採用 runtime |

### Agent branches (in flight)

| Workstream | Branch hint | Notes |
| --- | --- | --- |
| VRM pupil pops | `cursor/vrm-pupil-*` | Surprise / jaw-drop polish |

---

## Outstanding (actionable)

### Code (agents)

1. **Pixel train** — merge **#528→#543** per handoff; one revision bump per merge on `main`  
2. **Phone smoke** — after each merge until live **r254**  
3. **#512** — chat report chip removal  
4. **Stale SW** — hard-refresh until `revision.txt` shows post-train serial  
5. **VRM pupil** — pop / size stability on surprise  
6. **Owner picks apply** — **#543** on phone after merge  
7. **Duet path** — align with library performance gate ([`SING_DANCE_PIPELINE.md`](./SING_DANCE_PIPELINE.md))

Do **not:** re-merge closed #497–#511 / #515 work; mark R10–R13 Done without owner.

### Phone / human (not agent Done)

1. **Stale SW** — hard-refresh until live `revision.txt` is **r2026-11-18.237** (not r220)  
2. **Card voice all langs** — **#519** on main; owner phone verify  
3. **Idle quality** — **#518** on main; R11 not Done until phone OK  
4. **Mixkit HTML** — **#517** on main; Music tab play/preview on Pages  
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
| Pixel handoff | `docs/AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md` | r248–r261 ladder · one-click merge script · **#540/#541 beds verified** |
| This status board | `docs/PROJECT_STATUS.md` | Refreshed **2026-11-19 02:12 HKT** · critical **#528–#543** green · tail **#530–#539** fixed/rebased |
| Sing/dance pipeline | `docs/SING_DANCE_PIPELINE.md` | PerformanceSession on **r214** |
| Phone smoke | `docs/PHONE_SMOKE.md` | Owner verify |