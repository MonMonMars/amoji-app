# Amoji project status board

**Generated:** 2026-11-18 12:30 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/)  
**Phone smoke:** [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)  
**Visual board:** [Pages](https://monmonmars.github.io/amoji-app/docs/project-status.html) · repo [`project-status.html`](./project-status.html)  
**Pixel pickers:** [Pages owner-resources](https://monmonmars.github.io/amoji-app/docs/owner-resources.html) (music · poke · **idle** · **stories** tabs) · local: `cd docs && python3 -m http.server 8765`  
**`main` tip (pre-#504):** `445b85f6` (**r2026-11-18.211** · #503 owner perf picks) · **in flight:** listen-only BGM **r212**

## Snapshot

| Bucket | Count |
| --- | ---: |
| **Done** — merged to `main` | 100+ stack · Nov 18 ship **#497–#503** + **r208–r211** vault/stories/news |
| **Open product PRs** | **#504** listen-only BGM (this turn) |
| **Outstanding** — actionable code | **P0 sing/dance** — beat-aligned VRMA · unified session state (see [`SING_DANCE_PIPELINE.md`](./SING_DANCE_PIPELINE.md)) |
| **Outstanding** — Pixel / human | **R10–R13 not Done** · [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) |
| **Hold** | licensed music · Stripe · PH · Search Console · spikes #1 / #20 |

**Honesty:** Merged ≠ owner Done. **Do not mark R10–R13 Done** without owner OK on live **r2026-11-18.212+** after deploy.  
**Pages:** refresh SW after each revision bump.

### Progress by category (% merged to `main`)

| Category | Merged % |
| --- | ---: |
| Chat UX | 99% |
| Audio / TTS | 99% |
| VRM / Idle | 99% |
| Music / perf pipeline | 98% (listen phase **r212** in PR) |
| Docs | 99% |
| Merge to main | 99% |

---

## Done (merged to `main`)

Living tip through **#503** / **r2026-11-18.211**. Product bible: [`USER_PRODUCT_BIBLE.md`](./USER_PRODUCT_BIBLE.md).

### Nov 18 ship (#497–#503, r208–r211)

| PR | Item | Notes |
| --- | --- | --- |
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
| **#504** (pending) | Listen-only BGM phase **r212** | Generic music → calm idle |
| [#20](https://github.com/MonMonMars/amoji-app/pull/20) | CosyVoice TTS spike | Draft — Hold |
| [#1](https://github.com/MonMonMars/amoji-app/pull/1) | Voice bake-off UI | Old spike — Hold |

**Stale product branches:** none blocking — only Hold spikes stay open.

---

## Outstanding (actionable)

### Code (agents)

1. **Sing/dance P0** — beat-aligned VRMA start from audio clock; unified perf session state ([`SING_DANCE_PIPELINE.md`](./SING_DANCE_PIPELINE.md))  
2. **Listen phase** — **r212** in PR (BGM + calm idle) — verify on Phone after merge  

Do **not:** re-merge closed vault/news/owner-pick work; mark R10–R13 Done without owner.

### Phone / human (not agent Done)

1. **Listen BGM** — after **r212** live: 「播音樂」→ hear bed, body stays calm idle; 「跳舞」still dances  
2. **Owner-resources** — Music / Stories tabs at **r211+**  
3. **News length** — #501 merged · **Phone** yue multi-sentence  
4. **R11 idle / R10 voice / R13 poke / R12 lighting** — **not Done**  
5. Full [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)

---

## Hold

Unchanged — licensed music, Stripe live, PH, Search Console, modular GLBs, spikes #1 / #20.

---

## Documents audit

| Document | Path | Status |
| --- | --- | --- |
| This status board | `docs/PROJECT_STATUS.md` | Refreshed **2026-11-18** post-#503 + **r212** draft |
| Sing/dance pipeline | `docs/SING_DANCE_PIPELINE.md` | Listen phase noted **r212** |
| Phone smoke | `docs/PHONE_SMOKE.md` | Owner verify |