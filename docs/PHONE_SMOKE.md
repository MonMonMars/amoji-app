# Phone smoke (live Pages)

**Live:** https://monmonmars.github.io/amoji-app/  
**Tip on main:** `34ed7e0` (#418) · Pages `last-modified` 2026-11-15 12:58 UTC  
**Purpose:** Human-only checks after #406–#418. Agent Vitest already green. **Merged ≠ Done.**  
Owner: “getting worst” — **do not mark R10–R13 Done.**

Tick on a real phone (prefer iPhone Safari). Hard refresh / clear site data once so idle prefs v4 (and idle v3 scrub when merged) and voice sink land.

## Priority now — card · news · R10–R13 · nonsense · captions

### Card greet (select) — owner: no sound (fix after #406/#413 sink)

- [ ] Character / voice card tap speaks **audibly** on first tap (all langs)
- [ ] One primary voice (brief insurance overlap OK; no lasting dual talk)
- [ ] Sound comes from the same speakers as gate sample

### News chip — owner: same-old / repeat

- [ ] News chip speaks a headline when feeds work (or honest tell when feeds fail)
- [ ] Tapping news again rotates / does **not** loop the same old line forever

### R11 idle (#415 v4)

- [ ] Idle looks **upright planted calm** (RPM F/M stands — not Sassy / sky-look / arms-into-torso)
- [ ] After a chat turn ends, idle returns upright (no stuck lean / weird blend)

### R10 voice (#406 + #410 + #413 + #424 unmute + real-male + chat-mic-unmute)

- [ ] deep / mid / bright buttons are **obviously** different (same lang)
- [ ] Male button sounds male (not female pitched down slightly)
- [ ] Non-Yue (en / zh / ja) plays on **same speakers** as gate sample
- [ ] Female Cantonese still works after male / other-lang tries
- [ ] **Every** lang × gender × pitch button is audible (not Yue-F-only)
- [ ] Chat: mic default-on → off → **on again** works (Yue and other langs)
- [ ] Chat speak: en / zh / ja / male audible on default speakers (not Yue-F-only)

### R13 poke lean (#409) — do not ask agents to flip ± again

- [ ] Poke **left** side of body → character tips **screen-left** (same side)
- [ ] Poke **right** → tips screen-right
- [ ] Head / torso / arm feel consistent with poke side

### R12 lighting (#408)

- [ ] All cast members look like the **same lighting / shader style** (no one much darker / flatter)

### Nonsense (#360 + #412 + #416)

- [ ] Companion does **not** ask to continue / resume last-time talk
- [ ] Spoken replies are not filler / surreal / opaque nonsense
- [ ] No double-speak of the same line

### Captions (#393 + #414)

- [ ] Caption seals after speech idle — **no partial** line locked into history
- [ ] Full phase does **not** replay into chat history as a second caption dump

---

## Gate (`/gate/audio`)

- [ ] Sound test is loud and long
- [ ] Mic Allow works (or denied still continues)
- [ ] **Location Allow** appears on this same page
- [ ] Browser geo popup appears at most **once** here (not again at Start / chat enter)

## Select → chat

- [ ] Character / voice card tap speaks **one** voice (no dual overlap)
- [ ] Demo-phase chips include AI news / personal / secret / joke / poem / tip
- [ ] Tapping the **same** phase chip twice rotates content

## Dance / music / story (quick)

- [ ] Dance / music starts only **after** music is audible
- [ ] “Play music” without picking → random bed; ask to choose → chips
- [ ] Story Mode feels distinct from chat; fairy tale chip works

## SFX (R1/R2 — no new deletes)

- [ ] Poke zone SFX match Want list ([`SFX_WANT_LIST.md`](./SFX_WANT_LIST.md))
- [ ] Want / Skip in `/sfx-gallery` still works

## Agent pre-checks (2026-11-15 ~22:31 HKT)

| Check | Result |
| --- | --- |
| `main` tip | `34ed7e0` (#418) · Pages live 12:58 UTC |
| Outstanding (owner) | Card no sound · news repeat · **R10–R13 not Done** · nonsense · captions |
| Shipping | Idle v3 legacy wipe/scrub (`cursor/idle-v3-legacy-wipe-0340-0eac`) |
| Parallel | Card greet + news repeat owned by other agents |
| Hold spikes | #1 / #20 only |
