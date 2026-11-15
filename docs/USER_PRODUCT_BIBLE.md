# Amoji — User Product Bible

**Purpose:** Living checklist of product rules from the product owner. Agents must read this before chat/voice/pose/permission work and update it when rules change.

**Last reviewed:** 2026-11-15 16:50 (Asia/Hong_Kong)  
**Demo:** https://monmonmars.github.io/amoji-app/  
**Request log:** `/cursor/stores/self/OWNER_REQUEST_LOG.md` — every owner ask, same turn. Overlapping messages still count; never drop one.

**Standing:** Merged ≠ Done on live Pages until owner phone-smoke OK. Owner asked: push + merge without waiting for approval.

---

## Standing rules (always)

1. Record every owner message in `OWNER_REQUEST_LOG.md` the same turn.  
2. Refresh **Done** + **Outstanding** every turn.  
3. Do not mark Pages Done without owner OK.  
4. Prefer fixing old outstanding before new polish.

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
| Card greet audible (code) | #370 |
| One-voice card greet (code) | #375 |
| CMA poke SFX + zone-stable SFX | #348+ |
| No spoken UM; thinking bar | on `main` |
| Music ask random vs select | #364 |
| Voice gender options (code) | #363 |
| Statement SCENE_LINES / topic-ask scrub | on `main` |
| Mic Start re-probe / default-open (code) | on `main` |
| Stop double-speak / news once (code) | #386 |
| News tell when feeds/LLM fail (code) | #385 |
| Gate voice test stable + audible (code) | #387 |
| Story Mode distinct from chat (code) | #388 |
| Poke lean toward poked side (code) | #390 |
| Sing ask no Soave+月光光 nonsense (code) | #391 |
| Idle pose Pixel-OK calm stands (code) | #392 |
| Caption then whole phase again in history (code) | #393 |
| Blend-to-back / lean forward weird (code) | #394 |
| All langs/genders speak — not Yue-female-only (code) | #395 |
| Talk leftover repeats / history dup | #399 |
| Reply-mode length + emotion chart | #401 |
| Classic fairy tales + Story chip predownload | #402 |
| Story Mode quality + UX polish | branch `cursor/story-quality-ux-9684` (awaiting PR) |
| Docs board #393–#395 Done / Outstanding honesty | #396 |
| Docs tip + Pages honesty after #396; agent scrub green | #397 |
| No history-resume ask (code) | #331 / #366 |

---

## Outstanding

| Item | Notes |
|------|--------|
| Talking nonsense / silly LLM | **Owner live OK** still required — code scrub on `main` (#360); agent Vitest scrub suites **78/78 pass**; no agent-fixable bug found this turn |
| Phone smoke on live demo | **Human** — checklist [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) — do **not** mark Done without owner |
| Pages rebuild | **Live** after #397 push (`last-modified` 2026-11-15 07:29 UTC · `pages.yml` `43689990439` success on `a50695b`). Agent `workflow_dispatch` is 403. |

### Hold

| Spike #1 Voice bake-off | Hold |
| Spike #20 CosyVoice | Hold |

---

## Change log

| Date (HKT) | Change |
|------------|--------|
| 2026-11-15 ~16:40 | Owner ask: lang F+M = Yes (#363/#395); pitch buttons were Partial (#374 auto-only) → shipping selectable deep/mid/bright on `cursor/voice-lang-gender-pitch-0340-0eac` |
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
