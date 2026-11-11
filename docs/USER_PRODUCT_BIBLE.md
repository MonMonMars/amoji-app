# Amoji — User Product Bible

**Purpose:** Living checklist of product rules from the product owner. Agents must read this before chat/voice/pose/permission work and update it when rules change.

**Last reviewed:** 2026-11-12 (Asia/Hong_Kong)  
**Branch for current pack:** `cursor/no-history-resume-ask-0340` · PR [#366](https://github.com/MonMonMars/amoji-app/pull/366)  
**Agent copy:** also mirrored under the agent store as `USER_PRODUCT_BIBLE.md` when present.

---

## Standing rules (do not regress)

### Permissions & entrance
1. **All-in-one confirm page** — Mic, location, and sound check belong on the beginning confirm page (`/gate/audio` / PreChatAudioGate), not surprise prompts mid-chat.
2. **Mic default OPEN at chat start** — After enter, voice mode must arm immediately (Grok-style). Do not wait for open cheer. Gate Enter must re-probe mic in the same gesture and set session preflight when granted.
3. **Speaker test must be hearable** — “Test my sound” must be **loud, clear, and long** (full volume force, playback session, multi-sentence `GATE_TEST_LINES`).

### Talking style
4. **Answer first** — When the user asks something, answer with information first. Do **not** interview them. Zero questions back when they asked; otherwise at most one soft check-in; never stack questions.
5. **Startup greet = statements** — Enter-chat cheer must not pile questions (“what should we talk about?”). Warm info / presence only.
6. **Deliver, don’t tease** — Recipes, how-tos, explanations: give the content in that turn. Never stop at “I can tell you… want it?”
7. **Continue the topic until stop** — Keep talking / elaborating on the same topic until the user says stop / 停 / 夠喇 / enough (etc.).
8. **Prefer output over input** — She should give information; extracting answers from the user is secondary.

### News & live facts
9. **News button = fresh online** — Each news tap fetches latest feeds (cache bust), rotates headlines, analyzes via model, reads aloud. No stuck same-old headline.

### Voice / TTS
10. **Male Cantonese must not crawl** — Male Yue pace floor / Edge offsets stay at conversational speed (not slowed by pitch bias alone).
11. **No loading “UM” sound** — Thinking wait uses a **loading bar / status UI**, not spoken um filler or thinking.wav.

### Character / body
12. **Only Pixel-OK poses** — Calm idle/talk: `#3 #34 #42 #53 #94 #95`. Perf moves only when asked: `#20 #22 #41 #101–103 #108 #109 #113 #114`. Retired / “not OK” poses stay unreachable.
13. **No blend-to-the-back** — Idle A→B must not axial-spin; hips yaw clamped; new idle starts near `t≈0`.
14. **Talking body stays calm** — While speaking: calm stands only (e.g. IdleRpmFStanding001 / IdleSassy). No LookAround mid-sentence; no arguing/chatting gesture clips.
15. **Pupils stay visible** — No off-center / vanished pupils (look-at pin + eye material stabilize).

### Product hygiene
16. **Demo** — Production demo is GitHub Pages `main`: https://monmonmars.github.io/amoji-app/ (no per-PR preview unless added later).
17. **Update this bible** — When the owner adds a rule, edit this file the same day: rules + Done + Outstanding. Agents: check this before claiming “done.”

---

## Done (as of 2026-11-12 HKT)

| Item | Notes / evidence |
|------|------------------|
| Calm vs perf pose gating + retire bad poses | PR #365 / related pose commits |
| Hips / idle A→B no spin-to-back | bone limits + idle start near 0 |
| Talk calm clips only while speaking | chat-auto-idle / CompanionCanvas |
| Gate: mic + location one page (where landed) | entry gate v2 / PreChatAudioGate (verify on branch) |
| Male Yue TTS speed-up | gTTS floor, Edge offsets, synth base |
| Statement-only enter greet | personality-voice / open-phase |
| Answer-first + question cap | prompts + `capSpokenQuestions` |
| Fresh news fetch + rotate + LLM read | invalidateNewsFeedCache / selectNewsLead |
| Recipe deliver (咕嚕肉 etc.) | recipe planning + anti-teaser |
| Topic continue until stop | content-continuation session |
| Remove loading UM; thinking bar UI | no-loading-um / thinking-status |
| Pupil / look-at stabilize | vrm/eyes pin + materials |
| Gate speaker test loud/long | `GATE_TEST_LINES` + `forcePlaybackVolume(1)` |
| Mic default-open at chat start (this turn) | gate Enter re-probe + chat micDelay 0/120 + retry |

---

## Outstanding

| Item | Status |
|------|--------|
| Confirm mic stays open on real device after gate → select → chat | **Verify after deploy** |
| Location still asked only on gate (no second popup at Start) | Confirm on device |
| Production Pages update after merge to `main` | Waiting merge |
| Keep bible current daily when owner gives new rules | Ongoing |

---

## Change log

| Date (HKT) | Change |
|------------|--------|
| 2026-11-12 | Bible created; mic default-open fix; rolled in prior PR #366 rules |
| 2026-11-11 | Rules collected from owner: poses, gate confirm, Yue pace, ask policy, news, UM→bar, pupils, recipe/continue, loud sound test |

---

## Agent checklist (every turn that touches product)

1. Read **Standing rules** above for the area you touch.  
2. Prefer fixing regressions over new features if they conflict.  
3. Update **Done / Outstanding / Change log** when you ship or when the owner adds a rule.  
4. Do not mark Outstanding done without a commit or explicit owner confirmation.
