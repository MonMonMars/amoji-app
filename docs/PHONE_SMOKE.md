# Phone smoke (live Pages)

**Live:** https://monmonmars.github.io/amoji-app/  
**Tip on main:** `r2026-11-24.311` · https://monmonmars.github.io/amoji-app/revision.txt must match splash footer (tap amber **Refresh** if stale SW)  
**Purpose:** Human-only checks after #419–#437 + #458 + #607–#610 + r271–r311. Agent Vitest / CI green on tip. **Merged ≠ Done.**  
Owner: “getting worst” / “nothing fixed” — **do not mark R10–R13 Done** until this pass.

Tick on a real phone (prefer iPhone Safari). **Mandatory once:** hard refresh, tap **Refresh** on the “Update ready” chip if shown, or remove home-screen icon and re-add so the service worker picks up the current **`APP_REVISION`** cache (stale shells hid recent fixes). Then idle prefs **v6** (`IdleQuaterniusHuman` default — not RPM F) and voice sink land.

## Priority now — the r2026-11-24.311 landing (#607 + #608 + #609 + #610)

Landed 2026-11-26/27 (the poke fix cut last), on `main` at `r2026-11-24.311`. None of these are phone-confirmed yet — tick them on the live Pages build, never from CI green.

### 0. Change Character renders, and the gate returns to it (#608)

Owner: entering Change Character dropped back to the title screen. `RequireEntryGate` never passed `onDone`, so the in-place audio gate in `QuickSetup` fell through to the standalone funnel's `/` and threw away the guarded route. `audioGateNextPath()` now returns the guarded pathname (`/change`, `/select`, `/chat`) when the gate runs in place; `/setup` and `/gate` keep their documented `/` funnel.

- [ ] Open **`/change`** directly by URL (not by navigating from the home screen): does the character grid render, or do you land on the title / splash screen?
- [ ] If an entry or audio gate appears first, finish it: do you come back to **Change Character** (not `/`)?
- [ ] Tap a **different character**: does the selection apply, and is the page still usable afterwards (grid tappable, no bounce to `/`)?
- [ ] Open **`/select`** and **`/chat`** directly the same way: do they also return in place? (the fix is shared, not `/change`-only)
- [ ] Report: `ROW: change-page DEVICE: <model>` + renders / title-bounce / gate-returns-to-root / selection-dead / ok

### 1. Time question: local time only, with an in-app location ask (#607)

Owner: a time question toured the world (“Hong Kong … Tokyo … London … New York”), and the browser location popup fired with no warning. The Time chip now answers through `spokenWorldClock()` → `spokenLocalClock()`: part of day + time rounded to five minutes, never a city name and never an `HH:MM` colon string. Before any `navigator.geolocation`, chat shows an in-app consent card (`time-geo-ask`) with **Allow** / **Skip**. `timeLocationGate()` asks only on a fresh tab (permission `prompt` / `unknown`, no cached browser fix, not already answered or denied this tab); Skip answers from the device zone, Allow fires one coarse fix with a 1.5 s ceiling and the answer never waits longer than that.

- [ ] Tap the **Time** chip (「而家幾點？」): does an in-app card with **Allow** / **Skip** appear **before** any browser location popup?
- [ ] Ask it in **English** (“what time is it right now?”): same card, same order (card first, browser popup only after Allow)?
- [ ] Tap **Allow**: does she speak **only the local time** — no Hong Kong / Tokyo / London / New York list?
- [ ] Tap **Skip**: does she still answer from the device time zone, with no error and no second ask?
- [ ] Does the browser's own geolocation popup appear **at most once** — not again on the next Time tap in the same tab, or after Skip?
- [ ] Does the spoken time sound natural (「你而家大約夜晚十一點半。」 / “Where you are it's about half past eleven at night.”), not raw digits like “00 31”?
- [ ] Report: `ROW: time-local DEVICE: <model>` + city-tour / digits / no-card / popup-twice / silent-on-skip / ok

## Priority now — the r305–r310 landing (owner reports of 2026-11-25/26)

Verified on the local build (`http://127.0.0.1:4173` → `revision.txt` = `r2026-11-24.310`) with the rig readout at `/chat?bones=1`. None of these are phone-confirmed yet.

### 0. Left arm no longer blends into the body (r2026-11-24.310)

Owner: “the left hand of the character always blended into the body … left arm always blended”. The every-frame adduction guard floored **both** upper arms against the `right − left` shoulder line, which is outward only for the **right** arm. The left arm's outward is the mirrored vector, so its outward component read negative and the guard never engaged — the right arm held a clean hang while the left folded into the torso. The guard is now side-aware, and the load-time natural hang abducts each arm toward its own side.

Desktop proof (idle, `/chat?bones=1`): left upper arm `x=+0.256`, hand `x=+0.229`; right `x=−0.269`, hand `x=−0.236` — mirror-symmetric, both hands clear of the torso.

- [ ] Idle 30 s: is the **left hand outside the hip/thigh**, mirroring the right, or still inside the body?
- [ ] Walk her through an idle A→B transition — does the left arm **stay out** the whole way, or sink in mid-blend?
- [ ] Poke the left arm and the torso: does she still read as natural (no collapsed shoulder), and is the left arm still open afterwards?
- [ ] Song + dance: does the left arm behave like the right (no sleeve/forearm through the ribs)?
- [ ] Report: `ROW: left-arm DEVICE: <model>` + still-blended / sinks-mid-blend / ok

### 1. Song and dance are smooth, not stop-motion (r306 + dance driver)

Owner: “the song move is like stop motion, not smooth” / same for dance. Three separate causes were removed: `playPerf()` used to `action.reset()` a loop that was already running (teleporting the playhead to frame 0 mid-song), the dance playback rate was teleported to a wobbling live-BPM estimate every frame, and every eye material was re-initialised 60×/s.

- [ ] Play a song: does the body move **continuously** for the whole track, or restart/jerk partway through?
- [ ] Dance bed: does the tempo look steady (no speed-up/slow-down lurch)?
- [ ] Is it smooth on the **phone** specifically (this was a frame-rate-sensitive complaint)?
- [ ] Report: `ROW: perf-smooth DEVICE: <model>` + restarts / lurch / steppy / smooth

### 2. She does not talk over her own song (r307 + r308)

Owner: “please dont talk while singing or music time” then “stop the music or song if need to talk”. A line that must be heard (a real reply, a poke reaction) now **ends the bed** first; background lines (idle chatter, fillers, replay taps) are dropped instead.

- [ ] Start a song, then poke her: does the music **stop** before she reacts (not both at once)?
- [ ] Start a song and wait: does she stay quiet over it (no idle chatter layered on top)?
- [ ] Send a chat message during a song: does the bed yield so the reply is audible?
- [ ] Report: `ROW: music-vs-voice DEVICE: <model>` + both-at-once / never-yields / ok

### 3. No lone 「呀」 opener, no split 「好！」 (r305 + r309)

Owner: “Please don't say ‘呀’ very strange to start with a single word like this”. Single-syllable CJK particles are stripped from both the bubble text and the spoken audio, and the song intro no longer splits into its own 「好！」 bubble.

- [ ] Ask for a song several times: does any reply open on a bare 呀 / 啊 / 嗯?
- [ ] Does the song intro arrive as **one** clause (“好，呢首叫…”) rather than a separate “好！” bubble first?
- [ ] Report: `ROW: lone-particle DEVICE: <model>` + still-seen / fixed

### 4. Male voice is audible, never a woman, never silence

Owner: “still no male voice. the button is here, but no voice out”. Male lines previously skipped the device voice under the chat mic latch, leaving only Google-Translate's single female speaker (Referer-blocked on desktop Chrome) — total silence. Male choices now reach a real male voice or report themselves unavailable, and gTTS is never used for male.

- [ ] Pick a **male** voice, send five messages: does every line speak in a male voice?
- [ ] Does any male line come out **female**, or go silent?
- [ ] If a male source is genuinely unavailable, does the button disable itself with a reason instead of doing nothing?
- [ ] Report: `ROW: voice-male-310 DEVICE: <model>` + silent / female / dead-button / ok

### 5. News reads the story, says the day, does not repeat

Owner: “the news now still too short … say the day of the news rather than say 最近 … read the detail”. The Google News `<description>` is a redirect anchor wrapping the title (no lede at all), so a thin row now pulls a real body from Bing News RSS with a same-story check; the day word comes from `publishedAt` in HK time; the duplicate headline beat and the UTF-16 1-character tail chunk are gone.

- [ ] Ask 「今日有咩新聞？」: is it **several sentences**, not just the headline?
- [ ] Does it say a **day** (今日 / 琴日 / 禮拜二 / a date) rather than 最近?
- [ ] Is anything said **twice**, or is there a lone 1-character fragment?
- [ ] Does unrelated chatter (the flower line) follow the news read?
- [ ] Report: `ROW: news-311 DEVICE: <model>` + title-only / 最近 / repeated / lone-char / chatter / ok

### 6. Music press plays a real track, and the gate sample can be stopped

Owner: “I pressed the music button, first the music won't play, it play some do do strange sound”. Mixkit previews return **403**, and the old fallback played a synthetic oscillator melody while the UI announced a real song. It now falls back to real audio only (curated Jamendo → bundled CC0 → honest stop). Separately the speaker test gained a **Stop** control: `testVoiceChain()` treats a cancel as “that tier didn't speak” and falls through to the next hop, so one `stopSpeaking()` let the browser-synth hop restart the same line.

- [ ] Press music: is a **real track** audible (not a beeping/tone melody)?
- [ ] On the `/gate/audio` speaker test, does the button become **Stop** while it plays, and does Stop actually silence it (nothing restarts a second later)?
- [ ] After pressing Stop, does the yes/no pair stay disabled (a cut sample must not count as “heard”)?
- [ ] Report: `ROW: music-real DEVICE: <model>` + tones / silent / no-stop / restarts / ok

## Priority now — the r294 combined landing (#579 + #581 + #580)

Three separately-claimed branches landed together as one stamp, **`r2026-11-19.294`**. Do not tick these from CI; only a real phone decides.

### 0. Chat history stays legible over the animated backdrop (#579)

Owner: the words “seem stick to the background”. One continuous bottom-strong grey plate now sits behind the whole log (24% at the newest line → 12% at the top, inside the owner's 10–25% band) with a 6 px blur. It feathers to nothing toward the top, so the boxless history never turns into a card, and the plate lives on a wrapper above the scroll box's own word-fade mask.

- [ ] On a **pale** backdrop (cloudsea / sunset / meadow), scroll an old line down into the bright bottom zone: are the **words crisp** against the backdrop?
- [ ] Is the grey **one continuous plate**, not a stripe behind each bubble?
- [ ] Does the **top** of the log still fade out — no grey rectangle edge or hard seam against the backdrop?
- [ ] Does the Ken-Burns backdrop / scrolling still feel **smooth** (no jank from the blur)?
- [ ] Report: `ROW: chat-scrim DEVICE: <model>` + readable / striped / hard-edge / jank

### 1. One reply spoken exactly once — no question read-back (#581)

Three owner voice bugs on .290: the same answer spoken twice, her reading the question back before answering, and the voice hopping speakers mid-reply. The fixes: `speak()` refuses a line that is still queued (the tap-to-replay can no longer stack a second copy), the diverged-lead branch now cuts the lead and speaks only the unheard tail (`speechTailAfterLead`), prompts answer first and `stripQuestionReadBack` scrubs any leading read-back, and the browser-synth tail is skipped while the chat mic holds play-and-record (one line, one sink).

- [ ] Send **five** chat messages that each ask a question: does every reply speak the answer **exactly once** (no repeat of the same answer)?
- [ ] Does she **answer first**, without reading your question back (“你問我…？” / “So you're asking…”)? An ordinary warm ack is fine; a verbatim echo is not.
- [ ] During a **long** reply, does the voice stay on **one speaker** end to end (no mid-line hop to a headset / communications device)?
- [ ] Tap the **same line twice** in quick succession (the silent-line replay tap): does it play **once**, not twice?
- [ ] Report: `ROW: voice-once DEVICE: <model>` + repeated-twice / read-back / speaker-hop / replay-double

### 2. Background sound mutes, her voice does not (#580)

New **Settings → 🔊 Background sound** switch (`amoji.bgm-mute.v1`). It hard-mutes the procedural band + piano, the song-bed / stream loops and the ambient scene beds (rain, fire, wind, crickets…). Her spoken voice is a different audio system and is deliberately untouched — that is what **Mute all** is for. One-shot foley (poke, giggle, UI tick) and the volume steps stay.

- [ ] Turn **Background sound** on while music is playing: does the music **stop inside the same tap** (not on the next track)?
- [ ] With it on, send a chat message: does **her voice still speak** normally?
- [ ] Play a **song / dance bed**, then toggle it: does the bed go silent and come back **without restarting** or re-buffering?
- [ ] Enter a **scene with ambience** (rain / fire / crickets) and toggle it: does the ambience duck and return?
- [ ] Turn **Mute all** on and off while Background sound is on: does the song bed stay **muted** (not resurrected by the blanket unmute)?
- [ ] Reload the page: does the switch come back **on**?
- [ ] Report: `ROW: bg-sound DEVICE: <model>` + music-not-muted / voice-muted-too / bed-restarts / forgotten-on-reload

### Every line actually speaks — the dB volume fix (#585 #586)

The owner-reported "sometimes has voice, but mostly has no voice" was one SSML attribute. `edge-tts.ts` rendered prosody volume as `volume='±N.NdB'`, and the readaloud endpoint **refuses** that unit (`1007 SSML parsing error: 0x80045003`), dropping the whole utterance. Every spoken clause carried it, so every line was silent; two refusals then trip the client's `EDGE_FAILURE_LIMIT = 2` breaker, which parks the Edge tier for five minutes — the "mostly no voice" pattern. Two independent fixes now ship: the app emits a percentage (`.296`), and the `amoji-voice` worker repairs dB server-side if an old client sends it. The relay is also **on by default** now, so no Settings setup is needed.

- [ ] Fresh install, **no Settings changes**: send five chat messages in 粵語 — does **every** line speak, with **no silent messages** between them?
- [ ] Set the character to a **male** voice in Settings: is it a **real male voice** (雲龍 / 雲健 / Keita / Guy), not a female voice pitched down?
- [ ] Wait **five minutes** after a silent line, then send another message: does audio come back (the old bug parked the tier for 5 min)?
- [ ] Does volume still **rise and fall** with emotion (angry louder, shy quieter) rather than sitting flat? This is the check that the dB→% conversion preserved the contour, not just the unit.
- [ ] Report: `ROW: voice-male DEVICE: <model>` + silent-lines / female-pitched-down / 5min-recovery / flat-volume

### Admin search control — inert on Pages by design (#583)

The owner-requested admin control shipped as an **optional** lane. The server half (`server/backend`) owns the breaker, the per-window cap and the soft-delay; the client half (`lib/search-gate.ts`) is gated on `NEXT_PUBLIC_AMOJI_API`, which the Pages build never sets.

**Proven inert, three ways** (2026-11-24, `.297`): `beginSearch` returns an `off` verdict before any budget read, `fetch` or timer when the API base is empty; `pages.yml` sets no `NEXT_PUBLIC_AMOJI_API`, and it is build-time inlined; and all 18 shipped bundles contain **zero** occurrences of `/api/search` or `/api/search/quota` — the module was dead-code-eliminated, not merely disabled. The gate also sits only in the music/song/dance branch, never on an ordinary chat reply.

So: **music requests on Pages never touch a search API, never wait, and never show a search error.** If music does not play, that is the library, not this lane.

- [ ] Ask 「播首歌」 / 「跳舞」 three times: does the clip start **immediately** (no ~2.5 s stall before it begins)?
- [ ] Does any music reply show a **search error**, a spinner, or go silent where it used to play?
- [ ] Send a normal chat message: does the reply start exactly as before (this lane must not touch chat at all)?
- [ ] Report: `ROW: search-gate DEVICE: <model>` + stall / search-error / silent-music / chat-affected

## Priority now — the two r290 owner regressions

Both were reported on live **r289** on 2026-11-23 and are **not** phone-verified yet.

### 0. Poke SIDE zone + same-side lean (r291)

Owner on live r290, 2026-11-23: "the side poke also blended to the opposite side" and "the poke area of side is too small and always result in poke front and back even I poke on the side". The front/back fix above was **correct and stays**. r291 changes only the lateral half: the side boundary is now taken from the shipped torso width/depth (roughly the outer 60% of her half-width, up from the outer 43%), and a flank hit whose camera ray is depth-dominated is promoted to `frontLeft`/`frontRight`/`backLeft`/`backRight` instead of falling back to `front`. The lateral lean component is mirrored onto the finger's screen side; the camera-forward component is untouched, so a front poke still produces the same backward lean.

- [ ] Poke her **screen-left** on the visible side of her torso (not dead centre): does her upper body **lean screen-left**, the same side as your finger?
- [ ] Poke **screen-right** the same way: does it **mirror** (lean screen-right)?
- [ ] Poke **dead centre** of her chest: is it still a **front** poke (axial, not a sideways twitch)?
- [ ] Poke the **side of an arm / hand / leg / foot**, and her **butt** from behind: does the correct part react (not `front`)?
- [ ] Poke her **mid-reply**: speech still **cuts** instantly, and after the reaction she **continues** the interrupted reply (r289/r290 must not regress)
- [ ] Report: `ROW: poke-side DEVICE: <model>` + wrong-side / still-front-or-back / dead-centre-flipped / part-wrong

### 1. Poke front/back lean (r290)

The axial lean was inverted: a poke from the **front** made her recoil **backwards**, away from the finger, and the same held for a poke from behind. Lateral (screen-left/right) pokes were already correct. The lean now tips **toward the poked side** on all four directions.

- [ ] Poke her from the **front** (finger toward her chest/face): does her upper body tip **toward you / toward the finger**, not away?
- [ ] Poke her from **behind** (finger on the far side of her back): does she lean **backward, into that side**?
- [ ] Poke **screen-left**, then **screen-right** — those must be unchanged (she still leans to that same side)
- [ ] Does the **impact sound** still land the same instant as the recoil?
- [ ] Report: `ROW: poke-frontback DEVICE: <model>` + toward / away, and which of the four directions is wrong

#### Poke front/back mirror + reaction always audible (r2026-11-24.311)

The r290 rows above still hold (which way she tips). Two things changed on top of them. **(a)** Front and back used to be two different recipes — separate `fromBack` gains (chest spine 0.64 vs 0.6, chest 0.34 vs 0.68, arm 0.34 vs 0.42) and its own spring kind for `back` — so the same tap from behind was quieter and stiffer. They now share one recipe (`back` is the `chest` twin) and differ only in the sign decided once in `axialRecoilFall()`, which is what makes them true mirrors. **(b)** The performance-bed gate in `speak()` dropped any line that was not `resumable`, and a poke reaction is a hard cut (never resumable) — so a poke while the bed flag was set could be swallowed; and `loadingFillerKind()` dropped bare interjections (呵 / ふっ / “Heh”), which left some poke banks silent. Poke reactions now carry `mustBeHeard` (the bed ends first), and `pokeBurstSpokenLine()` steps past filler entries to a line TTS actually speaks.

- [ ] Poke her **front** on the chest, then the **same band from behind**: is the lean the **same size in opposite directions** (mirror), rather than one much stronger or stiffer than the other?
- [ ] Does the back poke flinch the **arms and hips** like the front one (same recipe, mirrored sign), not a smaller, differently-shaped move?
- [ ] Is the poke reaction **audible on every poke** — she actually says something, not silence?
- [ ] Pick a character whose poke bank is a bare interjection (呵 / ふっ / “Heh”) and poke it: does she step to a line she can speak, instead of going silent?
- [ ] Start a **song**, then poke: is the reaction **heard** — bed ends first, impact then words (not swallowed by the music)?
- [ ] Poke **repeatedly**: one impact at a time, no stacked reactions or double sound over the bed?
- [ ] Report: `ROW: poke-mirror-sound DEVICE: <model>` + front-stronger / back-stiffer / silent-poke / filler-character-silent / swallowed-by-bed / ok

### 2. Chat voice — intermittent silence (r290)

Owner: “sometimes has voice, but mostly has no voice.” The speaker is a serial queue, and a reply whose TTS tier neither started audio nor failed left the queue latched **forever**, so every later reply queued behind a dead line and only a reload brought her voice back. A line with no audio-START of its own is now cut after 12 s and released to the next one; a backgrounded `<audio>` also resumes on tab show instead of staying paused.

- [ ] Send **five** chat messages in a row, waiting for each reply to finish: does **every** reply speak, not just the first one or two?
- [ ] Lock the phone (or switch apps) **mid-reply**, wait 5 s, come back: does she **resume / finish** the reply rather than staying silent?
- [ ] Poke her, then immediately **send a new message** while her reaction/continuation is pending: does the new reply **speak**?
- [ ] After one silent reply, send another: does voice **come back on its own** (no reload)?
- [ ] Report: `ROW: chat-voice-serial DEVICE: <model>` + which reply went silent (1st / 2nd / after background / after poke)

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

Poke resume (r289): the cut stays; she now picks the previous talk back up.

- [ ] Poke her **mid-reply**, then wait through the reaction: does she **say a short phrase and continue the reply** in the same language? She restarts the interrupted sentence from its beginning (line-level resume), which is expected.
- [ ] Poke her mid-reply, then **send a new message** instead of waiting: does she **stay quiet** (no stale continuation talking over your new turn)?
- [ ] Report: `ROW: poke-resume DEVICE: <model>` + continued / silent / talked-over-new-turn

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

### Streamed music bed (#574 · r298 — **pending merge**, not on Pages yet)

The curated Jamendo catalog is now wired into playback instead of shipping dark.
It is local data, so the bed needs no key and no pre-downloaded file — but it is
still **streamed**, which is exactly where mobile autoplay policy differs from desktop.

- [ ] `ROW: music-stream DEVICE: <model>` — ask 「播音樂」 on the phone. A catalog track starts
      and keeps playing; it does **not** silently fail or fall back to a dead mixer
- [ ] If the browser blocks autoplay, the **first tap** on the page is enough to start the bed;
      a second request must not require a *third* tap
- [ ] Settings → background-sound mute (`amoji.bgm-mute.v1`) silences the streamed bed, and the
      character's spoken lines stay audible (music off, voice on)
- [ ] Ask for a specific style (e.g. 「播爵士」) — the curated track for that style plays, and the
      artist credit is visible rather than blank
- [ ] Background the tab mid-track, return after ~30s → bed resumes instead of dying silently
- [ ] Airplane mode → request music: it fails visibly/degrades, it does not hang the chat

### Optional docs tail (#531)

- [ ] [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md) claims match live Pages URLs (no 404 stub)

---

## Agent pre-checks (2026-11-22 HKT)

| Check | Result |
| --- | --- |
| `main` tip | **r2026-11-24.297** (`verify:live` must match) |
| Landed train | r281 #557 · r282 #560 · r283 #558 · r284 #561 · r285 #564 #563 #565 · r286 #562 · r287 #568 #569 #570 #566 #567 · r288 #571 · r291 #582 · r294 #579 #581 #580 |
| Closed in r285–r288 | all-language voice buttons · card greet on tap · poke lean/sound/interrupt · singing mouth + dancing beat · dance bounce sign |
| Outstanding (owner) | the five new rows above · r280 idle planted-vs-float · news · **R10–R13 not Done** |
| Open PRs | **#571 merged** · **#20 CosyVoice on Hold** (do not merge) |
| Superseded PRs | **#536 #537 #533** → #541 · **#524** → #543 · **#531** → #568 · **#539** → #569 · **#527** → #566 · **#526** → #567 |
