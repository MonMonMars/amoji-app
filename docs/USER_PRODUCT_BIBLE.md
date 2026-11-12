# Amoji — User Product Bible

**Purpose:** Living checklist of product rules from the product owner. Agents must read this before chat/voice/pose/permission work and update it when rules change.

**Last reviewed:** 2026-11-12 (Asia/Hong_Kong) — late night  
**Branch for current pack:** `cursor/no-history-resume-ask-0340` · PR [#366](https://github.com/MonMonMars/amoji-app/pull/366)  
**Agent copy:** `/cursor/stores/self/USER_PRODUCT_BIBLE.md`  
**Request log:** `/cursor/stores/self/OWNER_REQUEST_LOG.md` — every owner ask, same turn.

---

## Standing rules (do not regress)

### Permissions & entrance
1. **All-in-one confirm page** — Mic, location, and sound check belong on the beginning confirm page (`/gate/audio` / PreChatAudioGate), not surprise prompts mid-chat.
2. **Mic default OPEN at chat start** — After enter, voice mode must arm immediately (Grok-style). Do not wait for open cheer. Gate Enter must re-probe mic in the same gesture and set session preflight when granted.
3. **Speaker test must be hearable** — “Test my sound” must be **loud, clear, and long** (full volume force, playback session, multi-sentence `GATE_TEST_LINES`).

### Talking style
4. **Answer first** — When the user asks something, answer with information first. Do **not** interview them. Zero questions back when they asked; otherwise at most one soft check-in; never stack questions.
5. **Startup greet = statements** — Enter-chat cheer must not pile questions (“what should we talk about?”). Warm info / presence only.
6. **Never stack topic-menu asks** — Ban lines like「我哋傾咩好呀？」「今日想傾咩呀？」(even once). Scrub in TTS + LLM post-process.
7. **Deliver, don’t tease** — Recipes, how-tos, explanations: give the content in that turn. Never stop at “I can tell you… want it?”
8. **Continue the topic until stop** — Keep talking / elaborating on the same topic until the user says stop / 停 / 夠喇 / enough (etc.).
9. **Prefer output over input** — She should give information; extracting answers from the user is secondary.
10. **Ambient lines stay sensible** — Scene/idle flavour can be poetic, not silly/stupid (“pick a cloud to sit on”, bounce-on-mist). Grounded atmosphere only.

### News & live facts
11. **News button = fresh online** — Each news tap fetches latest feeds (cache bust), rotates headlines, analyzes via model, reads aloud. No stuck same-old headline.

### Voice / TTS
12. **Male Cantonese must not crawl** — Male Yue pace floor / Edge offsets stay at conversational speed (not slowed by pitch bias alone).
13. **No loading “UM” sound** — Thinking wait uses a **loading bar / status UI**, not spoken um filler or thinking.wav.
14. **Character / voice card tap speaks** — Select board auditions must be audible inside the tap (same-origin gesture clip + play before setSinkId).

### Character / body
15. **Only Pixel-OK poses** — Calm idle/talk: `#3 #34 #42 #53 #94 #95`. Perf moves only when asked: `#20 #22 #41 #101–103 #108 #109 #113 #114`. Retired / “not OK” poses stay unreachable.
16. **No blend-to-the-back** — Idle A→B must not axial-spin; hips yaw clamped; new idle starts near `t≈0`.
17. **Talking body stays calm** — While speaking: calm stands only (e.g. IdleRpmFStanding001 / IdleSassy). No LookAround mid-sentence; no arguing/chatting gesture clips.
18. **Pupils stay visible** — No off-center / vanished / white-empty pupils (look-at pin + eye material stabilize). Image look fixes use the image loop below.

### Product hygiene
19. **Demo** — Production demo is GitHub Pages `main`: https://monmonmars.github.io/amoji-app/ (no per-PR preview unless added later).
20. **Update Done + Outstanding every turn** — When the owner speaks a new ask, or work ships / stalls: refresh **Done** and **Outstanding** the same turn. Never leave the lists stale.
21. **Log every owner request** — Same turn, append `/cursor/stores/self/OWNER_REQUEST_LOG.md`. Never drop an ask.
22. **Image / pupil look loop** — Owner states image problem → change prompt → generate → show image here → ask one new advice. **No busy tests** unless asked.

---

## Done (as of 2026-11-13 early morning HKT)

| Item | Notes / evidence |
|------|------------------|
| gTTS bright/mid/deep pitch tiers per character | #374 |
| One voice on card greets (stop insurance when gTTS starts) | #375 |
| Demo-phase rotate + AI news / personal / secret / joke / poem / tip | #373 |
| Dance starts only when music bed is playing | #362 |
| Male/female voices per lang + Add test pool | #363 |
| Music ask: random play; select chips only when asked | #364 |
| Calm vs perf pose gating + retire bad poses | on main (superseded open #365 closed) |
| Hips / idle A→B no spin-to-back (code) | Re-ported onto this branch `afe36c0` |
| Talk calm clips only while speaking | chat-auto-idle / CompanionCanvas |
| Gate: mic + location one page (code) | entry gate v2 / PreChatAudioGate |
| Male Yue TTS speed-up | gTTS floor, Edge offsets, synth base |
| Statement-only enter greet | personality-voice / open-phase |
| Answer-first + question cap | prompts + `capSpokenQuestions` |
| Fresh news fetch + rotate + LLM read | invalidateNewsFeedCache / selectNewsLead |
| Recipe deliver (咕嚕肉 etc.) | recipe planning + anti-teaser |
| Topic continue until stop | content-continuation session |
| Remove loading UM; thinking bar UI | no-loading-um / thinking-status |
| Pupil / look-at stabilize (app code) | vrm/eyes pin + materials `9a60c69` |
| Gate speaker test loud/long | `GATE_TEST_LINES` + `forcePlaybackVolume(1)` |
| Mic default-open at chat start (code) | gate Enter re-probe + chat micDelay 0/120 + retry |
| Ban topic-menu double asks | scrubTopicMenuAsks + bank scrub |
| Cloudsea ambient grounded | SCENE_LINES — no “sit on a cloud” |
| Topic-menu ask scrub + bank harden | scrubTopicMenuAsks + statement-only residual banks |
| Spin-to-back code fix | hips clamp + idle t≈0 + IdleHug retired |
| Character / voice card tap greets (code) | gesture clip `b7848bc` on PR #366 · merged |
| CMA poke SFX #1–23 Want / archive / delete + zone wire | 13 keepers (10 active + 3 archive); male → CMA00318; deleted 10 reject mp3s |
| Poke SFX zone-stable (same location = same sound) | `recordedPokeClip` pinned to RECORDED_POKE_ZONE; no Wanted rotation |
| Card greet audible (sink-race + insurance hold) | `playGestureClipSync` pin-after-play + retry; delay stop for gTTS · #370 |
| Idle A→B body/arms freeze procedural writers | Soften/hang/shoulder ROM + cast clavicle gated during glide; no same-clip t≈0 snap · #371 |
| All SCENE_LINES statement-only (no soft invites) | Every backdrop bank rewritten; tests ban `?` / 想傾 |
| Start re-probes mic; chat ignores stale denied | `beginMicPreflightFromGesture` on Start; micDelay 0 |

---

## Outstanding

| Item | Status |
|------|--------|
| Eyeball live Pages after this merge wave deploys | dance sync, phase chips, pitch tiers, one-voice card, music ask, voice gender |
| Location is Start-only today (not gate+Start) | One popup — confirm no double ask on device |
| White pupil image loop | Awaiting owner advice |

---

## Change log

| Date (HKT) | Change |
|------------|--------|
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
