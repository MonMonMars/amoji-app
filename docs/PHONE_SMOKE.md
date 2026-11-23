# Phone smoke (live Pages)

**Live:** https://monmonmars.github.io/amoji-app/  
**Tip on main:** `r2026-11-19.288` (= live · `b053ccd2`) · https://monmonmars.github.io/amoji-app/revision.txt must match splash footer (tap amber **Refresh** if stale SW)  
**Purpose:** Human-only checks after #419–#437 + #458 + r271–r280. Agent Vitest / CI green on tip. **Merged ≠ Done.**  
Owner: “getting worst” / “nothing fixed” — **do not mark R10–R13 Done** until this pass.

Tick on a real phone (prefer iPhone Safari). **Mandatory once:** hard refresh, tap **Refresh** on the “Update ready” chip if shown, or remove home-screen icon and re-add so the service worker picks up the current **`APP_REVISION`** cache (stale shells hid recent fixes). Then idle prefs **v6** (`IdleQuaterniusHuman` default — not RPM F) and voice sink land.

## Priority now — the four long-standing bugs (r285–r288)

These four were reported repeatedly and survived several attempts. Each one had a wrong diagnosis in the repo history. They are on `main` and live; **none is phone-verified.**

### 1. Voice buttons — every language, not just Cantonese (r285, #564)

The chain used to end by refusing device voice, so a language whose network tier failed was silent. It now ends gTTS → Edge → device `speechSynthesis`, and the fallback pool can no longer hand Japanese text an English voice.

- [ ] Tap the **▶** on a `yue` card, then `zh`, then `ja`, then `en`. Does each one speak **audibly**?
- [ ] Does each speak in **its own language**? (Cantonese for yue, Mandarin for zh, Japanese for ja, English for en)
- [ ] Pick a **male** card in each language — does it sound male, not a female voice?
- [ ] Does any button come back as a **robot** on the first tap? (Device synth is now the last resort, so a robot means both network tiers failed — that is a real finding, not expected)
- [ ] Report: `ROW: voice-lang DEVICE: <model>` + which language(s) failed and how (silent / wrong language / robot)

### 2. Cards speak a greeting on tap (r285 + r286, #564 + #562)

Google `translate_tts` answers **404** to any request carrying a `Referer`, and browsers attach one to cross-origin `<audio>`. The fix strips it document-wide; per-element `referrerPolicy` is not reliable on media.

- [ ] Tap a **character** card (not the ▶) — does it greet audibly?
- [ ] Tap a **voice** card — does it greet audibly?
- [ ] Do it on the **first** tap after a fresh load, iPhone Safari (the strictest autoplay stance)
- [ ] Report: `ROW: card-greet DEVICE: <model>` + which card type was silent

### 3. Poke — direction, sound, and interruption (r286, #562)

Three separate fixes:

- [ ] Poke **screen-left**: does the body lean/fall **screen-left** (same side as your finger)? Then poke screen-right.
- [ ] Is the **impact sound immediate** — same instant as the recoil, not after she finishes talking?
- [ ] Poke her **mid-sentence**: does the speech **cut** so you hear the impact at once? `POKE INTERRUPTS SPEECH` was the owner's explicit decision on 2026-11-23 — **she stopping mid-word is correct, not a bug.** Do not report that as a defect.
- [ ] Poke front and back — those use a punch impulse, they are not meant to lean sideways
- [ ] Report: `ROW: poke DEVICE: <model>` + wrong-side / late-sound / no-interrupt

### 4. Singing and dancing follow the audio (r285, #563)

Visemes now come from the real audio envelope (RMS for jaw, spectral balance for vowels), and dance timeScale comes from detected beat onsets, not a wall clock.

- [ ] Play a **song**: does her mouth move **with the vocal** (open on loud, close on quiet), not a fixed loop?
- [ ] Play **music**: does the dance **hit the beat** rather than drifting?
- [ ] Does the motion stay smooth, or does it stutter/jump as the tempo estimate settles?
- [ ] Say「淨係聽」/ "just listen" — does she **stay still**? Then「聽歌」— does she perform again?
- [ ] Report: `ROW: sing-dance DEVICE: <model>` + mouth-detached / off-beat / stutter / still-moves-on-listen

### 5. Dance bounce — the sinking clips (r288, #571)

Seven freed dance clips carried a **negative** rest-hips Y, so the loader's scale went negative and their hips travel played inverted: hips rose as the knees bent, which lifted both soles off the floor. Dance bobbed 26.5 cm instead of 9.1 cm; lib_C62 slid ~1 m sideways.

- [ ] Play **Dance** and **lib_C61** (the default dance path): does she **bounce up** on the beat instead of sinking?
- [ ] Play **salsa / samba / rumba** (lib_C62/C110/C127) and **twist / breakdance** (lib_C125/C126): does she stay in one place instead of sliding sideways?
- [ ] Compare against **lib_C112 / lib_C03 / Jump** — those were already healthy and must be **unchanged**
- [ ] Report: `ROW: dance-bounce DEVICE: <model>` + clip id + better / worse / same
- [ ] This does **not** address the R11 floating-idle question below — the idle clips are pinned before playback, so this never reached them

## Priority now — r280 idle · card · news · R10–R13 · nonsense · captions

### Idle picker + C164/C165 feet (r282, merged — live on r284)

- [ ] On a Pixel/iPhone, is the small idle button beside her easy to reach with a thumb, and does it stay clear of the chat controls?
- [ ] Open it: do the C-code rows (`C14`, `C15`, `C16`, `C18`, `C156`…) fit without horizontal scroll or clipped labels?
- [ ] Tap down the list — does the avatar switch immediately each time, with the selected row clearly marked?
- [ ] Pin one idle, reload the page: does the same idle come back? Tap **Auto rotation**: does normal rotation resume?
- [ ] Judge **C164 / C165** feet: are they planted where Mixamo **C16 / C18** floated? Report `ROW: idle-c164-c165 DEVICE: <model>` planted / floating.

### Idle planted vs floating (r280 — blocking question)

- [ ] After a **first-screen** hard refresh on r280, do **C14 / C15 / C16 / C18** (IdleMixamoIdle · IdleMixamoStanding · IdleMixamoBreathing · IdleMixamoHappy) look **planted** (feet on floor) or **floating**?
- [ ] Report literally: `ROW: idle-r280 DEVICE: <model>` + planted / floating, so a future stamp can switch to the Rocketbox fallback if needed
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
| `main` tip | **`b053ccd2`** = **r2026-11-19.288** (`verify:live` must match) |
| Landed train | r281 #557 · r282 #560 · r283 #558 · r284 #561 · r285 #564 #563 #565 · r286 #562 · r287 #568 #569 #570 #566 #567 · r288 #571 |
| Closed in r285–r288 | all-language voice buttons · card greet on tap · poke lean/sound/interrupt · singing mouth + dancing beat · dance bounce sign |
| Outstanding (owner) | the five new rows above · r280 idle planted-vs-float · news · **R10–R13 not Done** |
| Open PRs | **#571 merged** · **#20 CosyVoice on Hold** (do not merge) |
| Superseded PRs | **#536 #537 #533** → #541 · **#524** → #543 · **#531** → #568 · **#539** → #569 · **#527** → #566 · **#526** → #567 |
