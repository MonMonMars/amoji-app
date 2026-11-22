# Amoji project status board

**Generated:** 2026-11-22 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/) · [`revision.txt`](https://monmonmars.github.io/amoji-app/revision.txt) **= r2026-11-19.280** (matches `main`)  
**Phone smoke:** [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)  
**Visual board:** [Pages](https://monmonmars.github.io/amoji-app/docs/project-status.html) · repo [`project-status.html`](./project-status.html)  
**Pixel pickers:** [Pages owner-resources](https://monmonmars.github.io/amoji-app/docs/owner-resources.html) (music · poke · **idle** · **stories** · **news** · **demo** tabs) · local: `cd docs && python3 -m http.server 8765`  
**`main` tip:** `99896449` (**r2026-11-19.280** · #553 #554 #543 #545 #548 #534 #535 #555 #530 #556 landed)  
**Handoff pack (2026-11-21):** [`HANDOFF_2026-11-21/`](./HANDOFF_2026-11-21/README.md) — state + provenance + binding constraints  
**Frozen snapshot (2026-11-19, historical):** [`HANDOFF_2026-11-19/`](./HANDOFF_2026-11-19/README_HANDOFF.md)

## Waiting on Pixel (owner)

**CI:** r271–r280 train **landed** on `main` (r280 squash). Run `cd apps/web && npm run verify:live` — must print **r2026-11-19.280**.

**Pixel（粵）:** r280 已經 live（#553–#556 全綠 squash 咗）。請喺 **第一屏 hard refresh**（見到 amber **Refresh** 就 tap），然後答一個問題：**C14 / C15 / C16 / C18 四隻 Mixamo idle 睇落係「貼地」定「浮腳」？** 浮腳就轉 Rocketbox fallback（下一個 stamp `r2026-11-19.281`）。詳情：[`HANDOFF_2026-11-21/README.md`](./HANDOFF_2026-11-21/README.md)。

> **Historical:** 2026-11-18/19 嘅 merge ladder（#528 → #543，r248–r266）**已全部 landed**，唔需要再跟。舊 ladder 文件 [`AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md`](./AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md) 只作歷史參考。

| Resource | Link |
| --- | --- |
| Handoff state (current) | [`HANDOFF_2026-11-21/STATE.md`](./HANDOFF_2026-11-21/STATE.md) |
| Binding constraints | [`HANDOFF_2026-11-21/README.md`](./HANDOFF_2026-11-21/README.md) · [`PROVENANCE.md`](./HANDOFF_2026-11-21/PROVENANCE.md) |
| **Next stamp** | **`r2026-11-19.281`** (only after Pixel reports r280 idle result) |
| Merged train (historical) | r271 #553 · r272 #554 · r273 #543 · r274 #545 · r275 #548 · r276 #534 · r277 #535 · r278 #555 · r279 #530 · r280 #556 |

**Gap vs live (r280):** none — `revision.txt`, `sw.js` `CACHE`, and `APP_REVISION` all read `r2026-11-19.280`. Product gaps that remain are **phone-verify only**, not unmerged code.

## Snapshot

| Bucket | Count |
| --- | ---: |
| **Done** — merged to `main` | 100+ stack · through **r280** / `99896449` (#553 #554 #543 #545 #548 #534 #535 #555 #530 #556) |
| **Open product PRs** | None in the r271–r280 train (all landed) · tail docs PRs listed below · spikes Hold |
| **Outstanding** — agents (no PR yet) | VRM pupil · picker polish |
| **Outstanding** — Pixel / human | **R10–R13 not Done** · **r280 idle planted-vs-floating answer** · stale SW · [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) |
| **Hold** | licensed music · Stripe · PH · Search Console · spikes #1 / #20 · NanoBanana / PSX / BreathCalm / head-body swap |

**Honesty:** Merged ≠ owner Done. **Do not mark R10–R13 Done** without owner OK on live **r2026-11-19.280** after deploy and SW hard-refresh.  
**Pages:** hard-refresh service worker after each revision bump — stale SW still a phone blocker.

### Progress by category (% merged to `main`)

| Category | Merged % |
| --- | ---: |
| Chat UX | 99% |
| Audio / TTS | 99% (TTS-001–218 keep/delete catalog **r278** / #555) |
| VRM / Idle | 99% (**r280** planted Mixamo C14/C15/C16/C18 — **phone** planted-vs-float answer still open, R11) |
| Music / perf pipeline | 99% (listen **r212** · beat **r213** · session **r214** · catalog **r215** · instant **#515** / **r220**) |
| News / TTS scrub | 99% (**#511** / **r218** — **phone** verify) |
| Docs | 99% |
| Merge to main | 99% |

---

## Done (merged to `main`)

Living tip through **#556** / **r2026-11-19.280**. Product bible: [`USER_PRODUCT_BIBLE.md`](./USER_PRODUCT_BIBLE.md).

### Nov 21 train (#553–#556 + queue, r271–r280)

| Rev | PR | Item | Notes |
| --- | --- | --- | --- |
| r280 | [#556](https://github.com/MonMonMars/amoji-app/pull/556) | Planted Mixamo C14 Idle · C15 StandingIdle · C16 BreathingIdle · C18 HappyIdle | Toe-ground hips-Z offsets 0.114 / 0.148 / 0.227 / 0.135 · **phone** planted-vs-float answer open |
| r279 | [#530](https://github.com/MonMonMars/amoji-app/pull/530) | 時間 chip — device local + HK / Tokyo / London / NYC / LA / Sydney | `apps/web/lib/world-clock.ts` |
| r278 | [#555](https://github.com/MonMonMars/amoji-app/pull/555) | Settings TTS-001–218 keep/delete catalog | `tts-app-voice-picks.json` · **not** a live speaker-row flood |
| r277 | [#535](https://github.com/MonMonMars/amoji-app/pull/535) | 睇星星 stargaze + Observing the Star BGM | demo chip |
| r276 | [#534](https://github.com/MonMonMars/amoji-app/pull/534) | Demo chips 聽音樂 / 聽歌 / 唱歌 | demo chip |
| r275 | [#548](https://github.com/MonMonMars/amoji-app/pull/548) | ROM verify tests on idle-poke blend | CI locks |
| r274 | [#545](https://github.com/MonMonMars/amoji-app/pull/545) | Idle v2 no A→B smear; same-clip bone-blend skip | — |
| r273 | [#543](https://github.com/MonMonMars/amoji-app/pull/543) | Owner **採用** runtime (idle / poke) | supersedes #524 |
| r272 | [#554](https://github.com/MonMonMars/amoji-app/pull/554) | 8-way full-body poke + gendered poke voice | — |
| r271 | [#553](https://github.com/MonMonMars/amoji-app/pull/553) | iPhone chat TTS, mic, first-phase latch | — |

Also landed in the same rollout: #546 (r266), #523 (r267), #522 (r268), #540 (r269), #541 (r270), #528 (r263), #529 (r249), #547 (r264), #549–#551 (docs/import/locks).

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

## Merged train — historical record (r248→r280)

> Everything in this table is **merged**. It is kept for audit only; do not re-merge or re-order. Handoff detail: [`AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md`](./AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md) (historical).

| Order | PR | Serial | Notes |
| ---: | --- | --- | --- |
| 1 | [#528](https://github.com/MonMonMars/amoji-app/pull/528) | **r263** | All-lang main speaker — **merged** |
| 2 | [#529](https://github.com/MonMonMars/amoji-app/pull/529) | **r249** | Card audition audible — **merged** |
| 3 | [#547](https://github.com/MonMonMars/amoji-app/pull/547) | **r264** | Card greet phrases + speaker prime — **merged** |
| 4 | [#546](https://github.com/MonMonMars/amoji-app/pull/546) | **r266** | Picker F+M per locale — **merged** |
| 5 | [#523](https://github.com/MonMonMars/amoji-app/pull/523) | **r267** | Chat interrupt + history — **merged** |
| 6 | [#522](https://github.com/MonMonMars/amoji-app/pull/522) | **r268** | Music after PerformanceSession — **merged** |
| 7 | [#540](https://github.com/MonMonMars/amoji-app/pull/540) | **r269** | CC0 beds + music allowlist — **merged** |
| 8 | [#541](https://github.com/MonMonMars/amoji-app/pull/541) | **r270** | Full owner catalog (**supersedes #536/#537/#533**) — **merged** |
| 9 | [#543](https://github.com/MonMonMars/amoji-app/pull/543) | **r273** | Idle/poke 採用 runtime (**supersedes #524**) — **merged** |
| 10 | [#545](https://github.com/MonMonMars/amoji-app/pull/545) | **r274** | Idle v2 blend smear fix — **merged** |

### Demo / docs tail (r275→r280)

| Order | PR | Serial | Notes |
| ---: | --- | --- | --- |
| 1 | [#548](https://github.com/MonMonMars/amoji-app/pull/548) | **r275** | ROM verify tests — **merged** |
| 2 | [#534](https://github.com/MonMonMars/amoji-app/pull/534) | **r276** | 聽音樂 · 聽歌 · 唱歌 chips — **merged** |
| 3 | [#535](https://github.com/MonMonMars/amoji-app/pull/535) | **r277** | 睇星星 + star BGM — **merged** |
| 4 | [#555](https://github.com/MonMonMars/amoji-app/pull/555) | **r278** | TTS-001–218 keep/delete catalog — **merged** |
| 5 | [#530](https://github.com/MonMonMars/amoji-app/pull/530) | **r279** | 時間 world clock chip — **merged** |
| 6 | [#556](https://github.com/MonMonMars/amoji-app/pull/556) | **r280** | Planted Mixamo C14/C15/C16/C18 — **merged / live** |

Still **open** (do not casually merge): #539, #538, #532, #531, #542, #537, #536, #533, #527, #526, #524, #521, #1, #20.

| — | [#512](https://github.com/MonMonMars/amoji-app/pull/512) | r218 | Chat report chip — **merged** |
| — | [#549](https://github.com/MonMonMars/amoji-app/pull/549) | — | Handoff ladder + status board (docs) — **merged** |
| — | [#550](https://github.com/MonMonMars/amoji-app/pull/550) | — | owner-picker notes v2 → selection JSON — **merged** |
| — | [#551](https://github.com/MonMonMars/amoji-app/pull/551) | — | Pixel regression locks + agent-smoke gate — **merged** |
| — | [#544](https://github.com/MonMonMars/amoji-app/pull/544) | — | Umbrella — **closed unmerged** 2026-11-21 (superseded by #549–#551) |
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

1. **Next stamp only after Pixel answers** — r280 planted-vs-floating on first screen; if floating → Rocketbox fallback (`r2026-11-19.281`). Do **not** bump `APP_REVISION` for docs.  
2. **Phone smoke** — [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) after each new revision goes live  
3. **Picker ship-set** — `node scripts/import-owner-picker-selection.mjs` after notes export (see `OWNER_RESOURCE_LIBRARY.md`)  
4. **Stale SW** — hard-refresh until `revision.txt` shows **r2026-11-19.280**  
5. **VRM pupil** — pop / size stability on surprise  
6. **Owner picks apply** — **#543** / **r273** already on `main`; phone verify 採用 rails  
7. **Duet path** — align with library performance gate ([`SING_DANCE_PIPELINE.md`](./SING_DANCE_PIPELINE.md))

Do **not:** re-merge closed #497–#511 / #515 work; mark R10–R13 Done without owner.

### Phone / human (not agent Done)

1. **Stale SW** — hard-refresh until live `revision.txt` is **r2026-11-19.280**  
2. **Card voice all langs** — **#519/#528/#547** on main (r263–r264); owner phone verify  
3. **Idle planted vs floating (r280)** — C14/C15/C16/C18; R11 not Done until phone OK  
4. **Mixkit HTML** — **#517/#541** on main; Music tab play/preview on Pages  
5. **Hip-hop ask** — `main` through r280  
6. **Pupil pops** — eye surprise on device  
7. **Owner picks** — perf MV/sing/dance rails from picker  
8. **Instant play** — **#515/#522** on `main`; **phone** verify song/dance  
9. **Listen / dance / perf** — **r212–r214 / r268** still require owner pass  
10. **R10 voice / R11 idle / R12 lighting / R13 poke** — **not Done**  
11. Full [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)

---

## Hold

Unchanged — licensed music, Stripe live, PH, Search Console, modular GLBs, spikes #1 / #20. Plus the 2026-11-21 pack HOLDs: NanoBanana, PSX, BreathCalm, CMA00350–431 Want/Skip, head/body swap, no Higgsfield without Mon, no Cursor Flash / pool / Cloud without explicit go.

---

## Documents audit

| Document | Path | Status |
| --- | --- | --- |
| Handoff state (current pack) | `docs/HANDOFF_2026-11-21/` | r280 state · provenance · binding constraints |
| Handoff (frozen 2026-11-19) | `docs/HANDOFF_2026-11-19/` | Historical snapshot only — do not read as current |
| Pixel handoff ladder | `docs/AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md` | r248–r261 ladder — **all merged**, historical reference |
| This status board | `docs/PROJECT_STATUS.md` | Refreshed **2026-11-22 HKT** · live **r280** · `99896449` |
| Agent smoke | `docs/AGENT_SMOKE.md` | `pixel-no-repeat.test.ts` demo rail + news/weather live-path guards |
| Sing/dance pipeline | `docs/SING_DANCE_PIPELINE.md` | PerformanceSession on **r214** |
| Phone smoke | `docs/PHONE_SMOKE.md` | Owner verify |