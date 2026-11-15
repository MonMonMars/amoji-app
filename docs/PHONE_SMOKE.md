# Phone smoke (live Pages)

**Live:** https://monmonmars.github.io/amoji-app/  
**Tip on main:** `a9f7436` (#417) · Pages `last-modified` 2026-11-15 12:21 UTC  
**Purpose:** Human-only checks after #406–#417. Agent Vitest already green. Merged ≠ Done.

Tick on a real phone (prefer iPhone Safari). Hard refresh / clear site data once so idle prefs v4 and voice sink land.

## Priority now — R10–R13 + nonsense + captions

### R11 idle (#415 v4)

- [ ] Idle looks **upright planted calm** (RPM F/M stands — not Sassy / sky-look / arms-into-torso)
- [ ] After a chat turn ends, idle returns upright (no stuck lean / weird blend)

### R10 voice (#406 + #410 + #413)

- [ ] deep / mid / bright buttons are **obviously** different (same lang)
- [ ] Male button sounds male (not female pitched down slightly)
- [ ] Non-Yue (en / zh / ja) plays on **same speakers** as gate sample
- [ ] Female Cantonese still works after male / other-lang tries

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

## Agent pre-checks (2026-11-15)

| Check | Result |
| --- | --- |
| `main` tip | `a9f7436` (#417) · CI + pages success |
| Pages product app | HTTP 200 · `last-modified` 12:21 UTC |
| Open product PRs | 0 (Hold #1 / #20 only) |
| Outstanding code | **0** — phone-only |
