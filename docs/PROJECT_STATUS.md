# Amoji project status board

**Generated:** 2026-11-18 14:20 HKT (Asia/Hong_Kong)  
**Repo:** [MonMonMars/amoji-app](https://github.com/MonMonMars/amoji-app)  
**Live:** [github.io/amoji-app](https://monmonmars.github.io/amoji-app/)  
**Phone smoke:** [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)  
**Visual board:** [Pages](https://monmonmars.github.io/amoji-app/docs/project-status.html) · repo [`project-status.html`](./project-status.html)  
**Pixel pickers:** [Pages owner-resources](https://monmonmars.github.io/amoji-app/docs/owner-resources.html) (music · poke · **idle** · **stories** tabs) · local: `cd docs && python3 -m http.server 8765`  
**`main` tip:** `5547e815` (**r2026-11-18.212** · #504 listen-only BGM) · **in flight:** beat-aligned VRMA **r213** (this turn)

## Snapshot

| Bucket | Count |
| --- | ---: |
| **Done** — merged to `main` | 100+ stack · Nov 18 ship **#497–#504** + **r208–r212** |
| **Open product PRs** | **r213** beat body sync (pending) |
| **Outstanding** — actionable code | **P0 sing/dance** — unified perf session state (see [`SING_DANCE_PIPELINE.md`](./SING_DANCE_PIPELINE.md)) |
| **Outstanding** — Pixel / human | **R10–R13 not Done** · [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) |
| **Hold** | licensed music · Stripe · PH · Search Console · spikes #1 / #20 |

**Honesty:** Merged ≠ owner Done. **Do not mark R10–R13 Done** without owner OK on live **r2026-11-18.213+** after deploy.  
**Pages:** refresh SW after each revision bump.

### Progress by category (% merged to `main`)

| Category | Merged % |
| --- | ---: |
| Chat UX | 99% |
| Audio / TTS | 99% |
| VRM / Idle | 99% |
| Music / perf pipeline | 99% (listen **r212** merged; beat sync **r213** in PR) |
| Docs | 99% |
| Merge to main | 99% |

---

## Done (merged to `main`)

Living tip through **#504** / **r2026-11-18.212**. Product bible: [`USER_PRODUCT_BIBLE.md`](./USER_PRODUCT_BIBLE.md).

### Nov 18 ship (#497–#504, r208–r212)

| PR | Item | Notes |
| --- | --- | --- |
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
| *(pending)* | Beat-aligned VRMA **r213** | This turn — body phase from bed clock |
| [#20](https://github.com/MonMonMars/amoji-app/pull/20) | CosyVoice TTS spike | Draft — Hold |
| [#1](https://github.com/MonMonMars/amoji-app/pull/1) | Voice bake-off UI | Old spike — Hold |

**Stale product branches:** none blocking — only Hold spikes stay open.

---

## Outstanding (actionable)

### Code (agents)

1. **Sing/dance P0** — unified perf session state ([`SING_DANCE_PIPELINE.md`](./SING_DANCE_PIPELINE.md))  
2. **Beat sync** — **r213** in PR — **Phone** dance after late VRMA load stays on beat  

Do **not:** re-merge closed vault/news/listen work; mark R10–R13 Done without owner.

### Phone / human (not agent Done)

1. **Listen BGM** — **r212** live: 「播音樂」→ hear bed, calm idle; 「跳舞」still dances  
2. **Dance beat** — after **r213**: ask 「跳舞」→ body not a full bar behind bed when clip loads slowly  
3. **Owner-resources** — Music / Stories tabs at **r211+**  
4. **News length** — #501 merged · **Phone** yue multi-sentence  
5. **R11 idle / R10 voice / R13 poke / R12 lighting** — **not Done**  
6. Full [`PHONE_SMOKE.md`](./PHONE_SMOKE.md)

---

## Hold

Unchanged — licensed music, Stripe live, PH, Search Console, modular GLBs, spikes #1 / #20.

---

## Documents audit

| Document | Path | Status |
| --- | --- | --- |
| This status board | `docs/PROJECT_STATUS.md` | Refreshed **2026-11-18** post-#504 + **r213** draft |
| Sing/dance pipeline | `docs/SING_DANCE_PIPELINE.md` | Beat sync noted **r213** |
| Phone smoke | `docs/PHONE_SMOKE.md` | Owner verify |