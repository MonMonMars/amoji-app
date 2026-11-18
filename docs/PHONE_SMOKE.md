# Phone smoke (live Pages)

**Live:** https://monmonmars.github.io/amoji-app/  
**Tip on main:** `r2026-11-16.166` (#461 splash live vs baked + #458–#460 delivery) · https://monmonmars.github.io/amoji-app/revision.txt must match splash footer (tap amber **Refresh** if shown)  
**Purpose:** Human-only checks after #419–#437 + #458. Agent Vitest / CI green on tip. **Merged ≠ Done.**  
Owner: “getting worst” / “nothing fixed” — **do not mark R10–R13 Done** until this pass.

Tick on a real phone (prefer iPhone Safari). **Mandatory once:** hard refresh, tap **Refresh** on the “Update ready” chip if shown, or remove home-screen icon and re-add so the service worker picks up the current **`APP_REVISION`** cache (stale shells hid recent fixes). Then idle prefs **v6** (`IdleQuaterniusHuman` default — not RPM F) and voice sink land.

## Priority now — card · news · R10–R13 · nonsense · captions

### Card greet (select) — owner: no sound / robot double (fix after #420/#431)

- [ ] Character / voice card tap speaks **audibly** on first tap (all langs)
- [ ] One primary neural voice only — **no** robot+female double, **no** robot-only forever
- [ ] Sound comes from the same speakers as gate sample

### News chip — owner: same-old / repeat (fix after #421/#428)

- [ ] News chip speaks a headline when feeds work (or honest tell when feeds fail)
- [ ] Tapping news again rotates / does **not** loop the same old line forever
- [ ] Longer tell feels fresh (widen on exhaust)

### R11 idle (#415 v4 / #419 wipe / #422 v5 / #430 v6 / #432 honor picks + owner-picks-win)

- [ ] Fresh install / cleared site data → idle is **`IdleQuaterniusHuman`** (near-still)
- [ ] If you previously Want-enabled / pinned RPM F/M (or other honorable stands), those **still play** after refresh — Quaternius must not remap them away
- [ ] Prefs stay on `amoji.idle*.v6` (no wipe churn to a new version)
- [ ] Poke SFX Want list from `docs/SFX_WANT_LIST.md` still drives reactions
- [ ] After a chat turn ends, idle returns upright (no stuck lean / weird blend)

### R10 voice (#406 + #410 + #413 + #424 unmute + #425 real-male + #437 huge-gap + #429 chat-mic)

- [ ] deep / mid / bright buttons are **VERY** different (same lang — not subtle)
- [ ] Male button sounds male (not female pitched down slightly)
- [ ] Non-Yue (en / zh / ja) plays on **same speakers** as gate sample
- [ ] Female Cantonese still works after male / other-lang tries
- [ ] **Every** lang × gender × pitch button is audible (not Yue-F-only)
- [ ] Chat: mic default-on → off → **on again** works (Yue and other langs)
- [ ] Chat speak: en / zh / ja / male audible on default speakers (not Yue-F-only)
- [ ] After mic on (play-and-record), **card/preview** greet still routes to default speakers (P1 sink latch — not communications headset)

### R13 poke lean (#409 + #434) — do not ask agents to flip ± again

- [ ] Poke **left** side of body → character tips **screen-left** (same side)
- [ ] Poke **right** → tips screen-right
- [ ] Head / torso / arm feel consistent with poke side (finger vs hips)

### R12 lighting (#408)

- [ ] All cast members look like the **same lighting / shader style** (no one much darker / flatter)

### Nonsense (#360 + #412 + #416 + #426 delete-UM)

- [ ] Companion does **not** ask to continue / resume last-time talk
- [ ] Spoken replies are not filler / surreal / opaque nonsense
- [ ] No spoken loading **UM** / thinking filler voice
- [ ] No double-speak of the same line

### Captions (#393 + #414 + #427 scroll-follow)

- [ ] Caption seals after speech idle — **no partial** line locked into history
- [ ] Full phase does **not** replay into chat history as a second caption dump
- [ ] Chat scrolls to live caption / newest talk

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

- [ ] Dance / music starts only **after** music is audible (#435)
- [ ] Sing/dance moves gated on audible bed (#435)
- [ ] “Play music” without picking → random bed; ask to choose → chips
- [ ] Story Mode feels distinct from chat; fairy tale chip works; longer/slower emotional tell (#436)

## Eyes (#433)

- [ ] Cast eye size looks stable (no huge/tiny flip across expressions)

## SFX (R1/R2 — no new deletes)

- [ ] Poke zone SFX match Want list ([`SFX_WANT_LIST.md`](./SFX_WANT_LIST.md))
- [ ] Want / Skip in `/sfx-gallery` still works

## Post–r254 Pixel train (after merge **#528→#543** to `main`)

Hard-refresh until live **`revision.txt`** ≥ **r2026-11-18.254** (one bump per merged PR). Use [`AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md`](./AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md) merge order.

### After voice stack (#528 + #529)

- [ ] Card grid **▶** speaks on **yue / zh / ja / en**; male row sounds male on **default speakers**
- [ ] No robot+female double on first card tap

### After chat + music (#523 + #522)

- [ ] Interrupt mid-reply → TTS stops; **new topic** does not false-wipe unrelated memory
- [ ] End a sing/dance/listen session → ask for generic 「播音樂」→ bed plays (mixer not dead)

### After music allowlist + catalog (#540 + #541)

- [ ] Owner-resources **Music** tab: **MV069+** rows preview/play (Mixkit CDN or shipped mp3)
- [ ] Performance listen uses **allowlisted MV** only — ad-hoc Mixkit genre rows do not hijack 「播爵士」
- [ ] Hash routes work: `#performance` · `#mixkit-streams` · `#voice-catalog` · `#idle`
- [ ] CC0 / bed mp3 rows under `amoji-public-serve/audio/` audibly scrub in picker

### After idle/poke 採用 (#543)

- [ ] Export **採用** on idle rail #5 / #10 in picker → same rails enabled in chat idle rotation
- [ ] Poke CMA **Want** rows still match `SFX_WANT_LIST.md` on device
- [ ] `ownerCalmIdleClip` honors pin without Quaternius remap on refresh

### Optional docs tail (#531)

- [ ] [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md) claims match live Pages URLs (no 404 stub)

---

## Agent pre-checks (2026-11-18 ~17:42 UTC)

| Check | Result |
| --- | --- |
| `main` tip | **`r2026-11-18.237`** (#517–#520 on tip; deploy may lag) |
| Pixel train CI | **#540** 🟢 after `f6cc0df2` · **#541** 🟢 · **#543** 🟢 |
| Outstanding (owner) | Card · news · **R10–R13 not Done** until post-r254 pass above |
| Superseded PRs | **#536 #537 #533** → #541 · **#524** → #543 (status only — do not merge dupes) |
| Hold spikes | #1 / #20 only (do not merge) |
