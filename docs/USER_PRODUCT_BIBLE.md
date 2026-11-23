# Amoji — User Product Bible

**Purpose:** Living checklist of product rules from the product owner. Agents must read this before chat/voice/pose/permission work and update it when rules change.

**Last reviewed:** 2026-11-22 (Asia/Hong_Kong)  
**Demo:** https://monmonmars.github.io/amoji-app/  
**`main` tip:** `b50ac7d9` · **`APP_REVISION` `r2026-11-19.290`** · `npm run verify:live` in `apps/web` = OK  
**Current handoff pack:** [`HANDOFF_2026-11-21/`](./HANDOFF_2026-11-21/README.md) (state + binding constraints; 2026-11-19 folder is frozen history)
**Request log:** [`../OWNER_REQUEST_LOG.md`](../OWNER_REQUEST_LOG.md) + `/cursor/stores/self/OWNER_REQUEST_LOG.md` — every owner ask, same turn.  
**Resource library:** [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md) + `apps/web/lib/owner-resource-manifest.ts` + [`MISTAKE_LIBRARY.md`](./MISTAKE_LIBRARY.md) + [`DATA_ORGANIZATION.md`](./DATA_ORGANIZATION.md).  
**Agents:** [`AGENT_SMOKE.md`](./AGENT_SMOKE.md) · [`PROGRAMMING_PLAN.md`](./PROGRAMMING_PLAN.md)

**Standing:** Merged ≠ Done on live Pages until owner phone-smoke OK. Owner: “getting worst” / errors still the same — **do not mark R10–R13 Done.** Push + merge without waiting for approval when CI green.

---

## Standing rules (always)

1. Record every owner message in `OWNER_REQUEST_LOG.md` + agent store the same turn.  
2. Refresh **Done** + **Outstanding** every turn.  
3. Do not mark Pages Done without owner OK.  
4. Prefer fixing old outstanding before new polish.  
5. Before swapping idle, poke SFX, cast, TTS, or music defaults — read `OWNER_RESOURCE_LIBRARY.md`, `MISTAKE_LIBRARY.md`, `DATA_ORGANIZATION.md`, and `owner-resource-manifest.ts` / `docs/owner-resource-manifest.json`.

---

## Done (on `main` — verify on Pages)

| Item | Evidence |
|------|----------|
| Dance wait for music (not too soon) | #384 |
| Phase chips rotate + AI news / personal / secret / … | #373 |
| Per-character TTS pitch tiers (auto, not buttons) | #374 |
| Selectable pitch buttons (same voice → deep/mid/bright) | #400 |
| Gate location Allow + Enter prime | #379 |
| White-pupil image loop | owner OK |
| Card greet audible (code) | #370 + #420 card-greet-sound-fix (sink race) — **Outstanding phone** until hear |
| One-voice card greet (code) | #375 + #431 no-robot-double (no insurance; no synth robot) — **Outstanding phone** |
| CMA poke SFX + zone-stable SFX | #348+ |
| No spoken UM; thinking bar | on `main` |
| Music ask random vs select | #364 |
| Voice gender options (code) | #363 |
| Statement SCENE_LINES / topic-ask scrub | on `main` |
| Mic Start re-probe / default-open (code) | on `main` |
| Stop double-speak / news once (code) | #386 + #421 freshness — **Outstanding phone** (news repeat) |
| News tell when feeds/LLM fail (code) | #385 + #428 always-fresh longer — **Outstanding phone** (same-old / repeat) |
| Gate voice test stable + audible (code) | #387 |
| Story Mode distinct from chat (code) | #388 |
| Poke lean toward poked side (code) | #390 + #409 + #434 same-side (finger vs hips) — **phone Outstanding** |
| Sing ask no Soave+月光光 nonsense (code) | #391 |
| Idle pose upright planted calm stands (code) | #392 + #407 v3 + #415 v4 + #430 v6 Quaternius + #432 honor picks — **phone Outstanding** (R11) |
| Caption then whole phase again in history (code) | #393 |
| Blend-to-back / idle forward lean (code) | #394 |
| All langs/genders speak — not Yue-female-only (code) | #395 + #424 + #429 chat-mic-unmute — **Outstanding phone** until hear |
| Chat mic off→on + non-Yue chat TTS (code) | #429 — reacquire getUserMedia + leave session on off; chat `pinSinkBeforePlay` — **Outstanding phone** |
| Audible pitch tiers + male delivery + sink route (code) | #406 + #410 + #413 + #424 + #425 + #437 huge-gap — **phone Outstanding** (R10) |
| Unify cast lighting / MToon path (code) | #408 — **phone Outstanding** |
| Scrub history-resume asks from chat replies (code) | #412 |
| Harden spoken nonsense scrub (code) | #416 — **owner live OK** still required |
| Hard-delete spoken loading UM / thinking filler | #426 |
| Seal captions after speech idle (code) | #414 |
| Always scroll chat to live caption | #427 |
| Stabilize cast eye size | #433 |
| Sing/dance moves gated on audible bed | #435 |
| Longer emotional story + slower story TTS | #436 |
| Honor owner idle pins + poke Want across pref bumps | #432 |
| Idle v3 wipe + v5 calm + v6 Quaternius force | #419 + #422 + #430 |
| Docs honesty after #406–#409 (code) | #411 |
| SFX Want list + outstanding tip after #410–#414 | #417 |
| Docs tip honesty through #417 | #418 |
| Docs tip honesty through #437 / tip `9292e81` | this refresh |
| Talk leftover repeats / history dup | #399 |
| Reply-mode length + emotion chart | #401 |
| Classic fairy tales + Story chip predownload | #402 |
| Story Mode quality + UX polish | #403 |
| Docs board #393–#395 Done / Outstanding honesty | #396 |
| Docs tip + Pages honesty after #396; agent scrub green | #397 |
| Docs tip after #397; Outstanding stays human-only | #398 |
| Docs tip after #399–#403 product ship | #404 |
| Docs tip / Pages after #399–#404 | #405 |
| No history-resume ask (code) | #331 / #366 / #412 |
| In-chat idle picker with C-codes (code) | **r282** merged (#560) on `main` — button beside canvas, C14/C15/C16/C18 + C156–C165, tap = pin, Auto rotation unpins. **Phone picker smoke Outstanding.** |
| iPhone chat TTS + mic + first-phase latch (code) | #553 / **r271** |
| 8-way full-body poke + gendered poke voice (code) | #554 / **r272** |
| Owner **採用** runtime for idle/poke (code) | #543 / **r273** (supersedes #524) |
| Idle v2 no A→B smear / same-clip blend skip (code) | #545 / **r274** |
| ROM verify tests on idle-poke blend | #548 / **r275** |
| Demo chips 聽音樂 · 聽歌 · 唱歌 | #534 / **r276** |
| 睇星星 stargaze + star BGM | #535 / **r277** |
| Settings TTS-001–218 keep/delete catalog | #555 / **r278** |
| 時間 chip — device local + world cities | #530 / **r279** |
| Planted Mixamo C14/C15/C16/C18 idle VRMAs (code) | #556 / **r280** — **phone planted-vs-float answer open** |

---

## Outstanding

| Item | Notes |
|------|--------|
| Card greet — no sound / robot | #420+#431 on `main`; **phone** until audible one neural voice (no insurance reintroduce). **Not Done.** |
| News same-old / repeat | #421+#428 on `main`; **phone** until rotates / fresh longer tell. **Not Done.** |
| Voice pitch/male/sink (R10) | #406+#410+#413+#424+#425+#437+#429. **Still Outstanding until phone** — Edge may 403 without proxy. **Not Done.** |
| Cantonese 3-voice pool | `cursor/yue-three-voice-0340-0eac` / **r2026-11-19.284**, merged into `main` at `9cda0774` (#561) — Edge `yue` limited to WanLung (M) / HiuMaan (F, calmer) / HiuGaai (F, brighter); OS fallback Sin-ji / Sin-ju + Android `zh-HK` intact; no paid TTS APIs. Guard `yue-three-voice.test.ts`. **Phone** until hear. **Not Done.** |
| Idle pose still bad (R11) | #415+#419+#422+#430+#432+#543+#545+#548+**#556 / r280 planted Mixamo C14/C15/C16/C18** on `main` — **phone smoke**: planted or floating? **Not Done.** |
| Lighting unify (R12) | #408 on `main` — **phone smoke**. **Not Done.** |
| Poke lean direction (R13) | #409+#434 on `main` — **phone verify**; do not flip ±leanSide without device evidence. **Not Done.** |
| Talking nonsense / silly LLM | #360+#412+#416+#426 on `main` — **owner live OK** still required |
| Captions race / history lock | #393+#414+#427 on `main` — **phone** (seal + scroll-follow) |
| Talk repeats / double-speak residual | #399 / #386 — **phone** |
| Phone smoke on live demo | **Human** — [`PHONE_SMOKE.md`](./PHONE_SMOKE.md). Match footer to [`revision.txt`](https://monmonmars.github.io/amoji-app/revision.txt); tap amber **Refresh** if shown. **Not Done** until owner ticks. |
| SFX #1–23 Want/archive/delete (R1/R2) | Map documented in [`SFX_WANT_LIST.md`](./SFX_WANT_LIST.md) — no new deletes without owner map |
| Stale “nothing fixed” on phone | Delivery #458–#462 + r271–r284 on `main` — owner must refresh once to **`r2026-11-19.284`** before judging card/voice/poke/idle code. |

### Hold

| Spike #1 Voice bake-off | Hold |
| Spike #20 CosyVoice | Hold |
| NanoBanana · PSX · BreathCalm | Hold (2026-11-21 pack) |
| CMA00350–431 Want/Skip | Hold — repo truth `cmaWant` = 10 ids (350, 351, 354, 359, 360, 363, 364, 365, 366, 318); “–431” is an external gallery range, not repo truth |
| Head / body swap | Hold |
| Kokoro / Piper / Cosy bundling | Not bundled — Cosy / JyutVoice listing-only, skip NC |
| Higgsfield generations | Hold unless Mon says go |
| Cursor Flash / pool Flash / Cloud | No use without explicit Mon go (Path B = desktop DeepSeek Flash) |

---

## Delivery layer (merged — product smoke still Outstanding)

| Item | Ref |
|------|-----|
| SW cache = revision | #458 |
| Refresh chip + `revision.txt` canary | #459–#460 |
| Live revision UI + `verify:live` | #461–#462 |

---

## Change log

| Date (HKT) | Change |
|------------|--------|
| 2026-11-22 r282 | Owner idle picker: small button beside the companion in `/chat` → C-coded list (owner 採用 C14/C15/C16/C18 + new Shapeweld C156–C160/C164/C165), tap = pin + live swap, Auto rotation unpins, pin persists (`amoji.idlePick.v6`). 7 Shapeweld VRMAs picker-only (curated rail stays 39); 11 universal CMA reaction SFX appended. **Merged:** r281 #557 → r282 #560 into `main` at `9cda0774`. Phone picker smoke Outstanding. |
| 2026-11-22 | **Cantonese 3-voice decision** (owner): Edge `yue` = WanLung / HiuMaan / HiuGaai only; Apple Sin-ji / Sin-ju + Android `zh-HK` stay as the fallback tier; paid TTS APIs declined. Code + tests + catalogue annotations merged into `main` at `9cda0774` (**r284, #561**); voice Quality still phone Outstanding. |
| 2026-11-22 | Docs sync to **r280** / `99896449`: header, Done r271–r280, R11 row now names planted Mixamo; folded 2026-11-21 handoff pack into `docs/HANDOFF_2026-11-21/` (docs-only, no revision bump). |
| 2026-11-16 ~14:05 | Tip `4463e647` / **r167**; delivery #458–#462 live; `verify:live` OK; **Phase B frozen** until owner smoke failures |
| 2026-11-16 ~08:35 | **Frozen order pack:** `07dd76e3` card + P1 voice sink pin + P4 R12 cast shader + P3 poke #455 arm + P5 resource/mistake/data libs — **phone Outstanding unchanged** |
| 2026-11-16 ~01:12 | Continue audit: tip `9292e81` (#432) · product #426–#437 on main · Pages == tip (16:19 UTC); agent code Outstanding = 0; phone Outstanding unchanged (card · news · R10–R13 · nonsense · captions) |
| 2026-11-15 ~23:50 | CRITICAL chat: mic off→on stuck + non-Yue chat mute — reacquire mic + chat pin-before-play (no onplay setSinkId) — **Outstanding until phone OK** |
| 2026-11-15 ~23:00 | R10 #425 rebase onto #424: keep no-onplay setSinkId + real male Edge/synth hops / tier voices — **R10 still Outstanding phone** |
| 2026-11-15 ~22:45 | CRITICAL: only Yue-F audible — stop onplay `setSinkId` kill; keep #420 play-first; all lang×gender×pitch (`voice-unmute-all-langs`) — **Outstanding phone** |
| 2026-11-15 ~22:34 | URGENT card greet silence: fix gTTS/Edge play-before-pin + default-only sink cache + insurance hold (`card-greet-sound-fix`) |
| 2026-11-15 ~22:31 | Owner “getting worst”: keep card no-sound + news repeat + R10–R13 Outstanding; ship idle v3 legacy wipe/scrub; tip `34ed7e0` (#418) |
| 2026-11-15 ~20:48 | Honesty tip `a9f7436` (#417): #415 idle v4 + #416 nonsense scrub Done on main; Outstanding = phone-only R10–R13 + nonsense + captions |
| 2026-11-15 ~20:10 | After #410–#414: document SFX Want list; idle v4 + nonsense scrub harden shipping; R10–R13 stay phone Outstanding |
| 2026-11-15 ~18:30 | Honest audit: #406–#409 on main + Pages; R10–R13 stay Outstanding (phone). Voice v2 branch widens pitch/male further. Stale “In PR” boards cleared. |
| 2026-11-15 ~18:08 | #409 poke lean finger-vs-hips merged |
| 2026-11-15 ~18:03 | #408 unify cast lighting merged |
| 2026-11-15 ~17:55 | #407 idle upright planted v3 merged |
| 2026-11-15 ~17:44 | #406 audible pitch/male/sink merged (R10 phone still open) |
| 2026-11-15 ~17:36 | Owner R10: pitch variants inaudible + only Yue-F works / wrong speakers + male sounds female → shipped as #406 |
| 2026-11-15 ~17:02 | Continue audit: tip `1417198` (#399–#404 on main); Pages live (`last-modified` 08:58 UTC · run `43696764165`); board was stale at `a50695b` — docs honesty refresh; Outstanding still human-only |
| 2026-11-15 ~16:52 | #403 Story quality on main; bible tip after product ship (#404) |
| 2026-11-15 ~16:40 | Owner ask: lang F+M = Yes (#363/#395); pitch buttons were Partial (#374 auto-only) → shipped selectable deep/mid/bright as #400 |
| 2026-11-15 ~15:52 | Post-#397: Pages confirmed live (`last-modified` 07:29 UTC · run `43689990439`); tip `a50695b`; resume/history/nonsense themes already shipped — Outstanding still human-only |
| 2026-11-15 ~15:21 | Post-#396: Pages confirmed live (`last-modified` 05:04 UTC); agent nonsense Vitest 78/78; Outstanding stays human-only (phone smoke + owner nonsense OK); board tip → `e52ff02` |
| 2026-11-15 ~12:53 | #393/#394/#395 → Done on main; Pages already rebuilt from #395; Outstanding = nonsense verify + phone smoke; no-history-resume already shipped (#331/#366) |
| 2026-11-15 ~01:56 | Status board: #385/#386/#387/#388/#390/#391/#392 → Done; Outstanding = caption de-dupe / blend-back / Yue-only voice / Pages+phone smoke |
| 2026-11-15 ~01:43 | Merged #387 gate; #390 poke; #391 sing; #388/#392 next |
| 2026-11-15 ~01:32 | Rebase #385/#387/#388 onto main after #386; keep combined Outstanding board |
| 2026-11-15 ~01:30 | Full ask board; #386 merged; merge #385/#387/#388; ship poke/sing/idle |
| 2026-11-15 ~00:42 | Story select: large cast + small scene inset; story room badge + opening line (not chat hello) |
| 2026-11-15 ~00:38 | Gate Test my sound: no label flip; reserve hear/mic/geo; same-tap pre-open speakers+mic+location |
| 2026-11-15 ~00:32 | News one-speak harden merged #386 (facts-only + one headline sheet) |
| 2026-11-14 ~22:50 | Fix dance-too-soon on typed/chip/showcase paths; preview synth no-stack over insurance clip |
| 2026-11-14 ~22:15 | Live Pages smoke OK; closed superseded #154/#240; added `PHONE_SMOKE.md` |
| 2026-11-14 ~17:55 | Continue audit: regression Vitest 46 pass (dance/music/gate/card/pitch); no new code scope |
| 2026-11-14 ~14:57 | Owner approved white-pupil image v1 — loop Done |
| 2026-11-14 ~14:30 | Pages verify #379 gate location strings live; white-pupil v1 re-surfaced for owner advice |
| 2026-11-13 ~08:35 | Location Allow on PreChatAudioGate + once-per-tab prime (`amoji.geo.primed`); Start skips after gate · #379 |
| 2026-11-13 ~05:50 | Merged #374 pitch tiers, #375 one-voice card, #373 phase chips, #362 dance gate, #363 voice gender, #364 music ask; closed superseded #361/#365 |
| 2026-11-12 23:29 | Demo-phase adds AI news / personal / secret / joke / poem / tip (+ rotate facets) · #373 |
| 2026-11-12 evening | Outstanding pack: statement SCENE_LINES + Start mic preflight + merge #371 |
| 2026-11-12 evening | Freeze hang/soften/shoulder mid idle A→B; skip same-clip t≈0 refresh snap |
| 2026-11-12 evening | Harden card-greet insurance clip (no pre-play sink pin; hold until gTTS sticks) |
| 2026-11-12 evening | Pin poke SFX to zone map — same location always same clip |
| 2026-11-12 morning | SFX #1–23 wired: keep/archive/delete + RECORDED_POKE_ZONE; push/merge poke-sfx |
| 2026-11-12 late night | Harden leftover 想傾/想聊 banks; owner re-reported cloudsea/asks/spin — still not on live Pages until PR #366 merges |
| 2026-11-12 late night | Card-greet gesture clip `b7848bc`; fonts CI flake cherry-pick |
| 2026-11-12 night | Re-port spin-to-back fix; SFX #1–23 notes received (still Outstanding) |
| 2026-11-12 evening | Ban topic-menu asks; fix silly cloudsea ambient |
| 2026-11-12 | Bible created; mic default-open; rolled in prior PR #366 rules |
| 2026-11-11 | Rules: poses, gate, Yue pace, ask policy, news, UM→bar, pupils, recipe/continue, loud sound test |

---

## Agent checklist (every turn that touches product)

1. Read **Standing rules** for the area you touch.  
2. Log the owner ask in `OWNER_REQUEST_LOG.md` the same turn.  
3. Update **Done / Outstanding / Change log** the same turn — always.  
4. Prefer fixing regressions over new features if they conflict.  
5. Image look issues: prompt → generate → show → one question. No busy tests unless asked.  
6. Do not mark Outstanding done without a commit **or** explicit owner confirmation (device verify stays Outstanding until they say OK).
