# Phone smoke (live Pages)

**Live:** https://monmonmars.github.io/amoji-app/  
**Tip on main:** `r2026-11-19.284` (= live · `9cda0774`) · https://monmonmars.github.io/amoji-app/revision.txt must match splash footer (tap amber **Refresh** if stale SW)  
**Purpose:** Human-only checks after #419–#437 + #458 + r271–r280. Agent Vitest / CI green on tip. **Merged ≠ Done.**  
Owner: “getting worst” / “nothing fixed” — **do not mark R10–R13 Done** until this pass.

Tick on a real phone (prefer iPhone Safari). **Mandatory once:** hard refresh, tap **Refresh** on the “Update ready” chip if shown, or remove home-screen icon and re-add so the service worker picks up the current **`APP_REVISION`** cache (stale shells hid recent fixes). Then idle prefs **v6** (`IdleQuaterniusHuman` default — not RPM F) and voice sink land.

## Priority now — r280 idle · card · news · R10–R13 · nonsense · captions

### Idle picker + C164/C165 feet (r282, merged — live on r284)

- [ ] On a Pixel/iPhone, is the small idle button beside her easy to reach with a thumb, and does it stay clear of the chat controls?
- [ ] Open it: do the C-code rows (`C14`, `C15`, `C16`, `C18`, `C156`…) fit without horizontal scroll or clipped labels?
- [ ] Tap down the list — does the avatar switch immediately each time, with the selected row clearly marked?
- [ ] Pin one idle, reload the page: does the same idle come back? Tap **Auto rotation**: does normal rotation resume?
- [ ] Judge **C164 / C165** feet: are they planted where Mixamo **C16 / C18** floated? Report `ROW: idle-c164-c165 DEVICE: <model>` planted / floating.

### Idle planted vs floating (r280 — blocking question)

- [ ] After a **first-screen** hard refresh on r280, do **C14 / C15 / C16 / C18** (IdleMixamoIdle · IdleMixamoStanding · IdleMixamoBreathing · IdleMixamoHappy) look **planted** (feet on floor) or **floating**?
- [ ] Report literally: `ROW: idle-r280 DEVICE: <model>` + planted / floating, so the next unused stamp (`r2026-11-19.285`) can switch to the Rocketbox fallback if needed
- [ ] 採用 rails stay `[4, 5, 10]` — clip 採用 must **not** promote curated rails (C16 must not steal calm, C18 must not steal sing)

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

## Post–r254 Pixel train (historical — all merged, r263–r280)

Hard-refresh until live **`revision.txt`** ≥ **r2026-11-19.280**. Every PR in this section is already on `main`; tick these rows as phone verification of landed code, not as a merge queue. Old ladder: [`AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md`](./AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md) (historical).

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

## Agent pre-checks (2026-11-22 HKT)

| Check | Result |
| --- | --- |
| `main` tip | **`9cda0774`** = **r2026-11-19.284** (`verify:live` must match) |
| Landed train | r271 #553 · r272 #554 · r273 #543 · r274 #545 · r275 #548 · r276 #534 · r277 #535 · r278 #555 · r279 #530 · r280 #556 |
| Outstanding (owner) | r280 idle planted-vs-float · card · news · **R10–R13 not Done** |
| Superseded PRs | **#536 #537 #533** → #541 · **#524** → #543 · **#544 closed unmerged** (do not merge) |
| Hold spikes | #1 / #20 only (do not merge) |
