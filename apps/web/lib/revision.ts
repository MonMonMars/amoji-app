// Amoji revision stamp — bump on every shipped change so the splash,
// status plate and selftest all agree on what's live.
// r2026-10-05.101: upright+ready gate on model load — rotated-root (Z-up)
// VRM exports are un-tilted at calibration time (no more lying-flat
// startups, generic VRM 0.x rigs included), and the avatar stays hidden
// until textures decode + the first pose/clip frame is applied + two lit
// frames present (no more black first frames on iPhone Safari).
// r2026-10-05.102: honest loading UI (byte progress, then an indeterminate
// "preparing…" while the reveal gate waits — no more frozen 99%), compact
// opaque status pill that stays clear of her face, avatar on-screen clamp
// (hips X/Z clip clamp + per-frame root clamp), and voice/SFX disentangle
// (movement foley + ambient ticks hold during speak attempts; the
// "bell/typing" sounds were taichi chimes / twinkle pings / cricket ticks
// firing from lib/sfx.ts while every TTS tier stayed silent).
// r2026-10-05.103: relaxed hands + shoulder ROM clamp — the library idles
// animate body bones only (standard_idle.vrma maps zero finger bones;
// weightShift.vrma only thumb/index chains), so a gently curled finger
// baseline is calibrated once and re-applied every frame (fingers a clip
// actually animates stay the mixer's), and the upper arm's outward swing
// is floored at ~8.6° past plumb, gated at/below horizontal so dance
// crosses and overhead waves stay free.
// r2026-10-05.104: selection-card busts are now runtime-rendered one-frame
// thumbnails (each model loads once, renders ONE frame offscreen, caches
// the dataURL in memory + sessionStorage, lazy via IntersectionObserver, serial
// queue, full GL disposal — no more 29 live WebGL streams); ModelPreview keeps
// only the big preview chip with the base-path URL bug fixed (modelUrl in
// asset.ts). Cast grows to 33 with four genuinely free direct-URL VRMs from
// test157t/VRM-Assets-Pack-For-Silly-Tavern (Aera #30, Dhahlia #31, Onyx #32,
// Velara #33), each with poses, poke style, look, voice matrix, laugh/ouch
// archetype and full idle/poke banks.
// r2026-10-05.105: selection rows remember their scroll offset in
// sessionStorage (select ⇄ change reopens exactly where you left off) and
// open centered on the currently selected tile on a fresh entry; a new pick
// re-centers smoothly and becomes the next entry's anchor. Tile buttons now
// carry data-row-item ids so HScrollRow can find the selected one.
// r2026-10-05.106: the eat / dine move kinds get REAL one-shot clips — the
// closest hand-to-mouth performances in the verified-live 3dchat library
// (eat → smoking.vrma, repetitive pinched-finger hand-to-mouth ≈ steady
// bites; dine → blowAKiss.vrma, one graceful hand raise to lips ≈ a toast /
// sip — no literal eating clip exists in any reachable free VRMA source), and
// the idle pool grows three finger-rich 3dchat idles (plotting /
// searchingPockets / happyIdle — verified live to key every finger chain),
// placed early in the rotation. CompanionCanvas IDLE_SOURCES / PERF_SOURCES /
// MOVE_CLIP + scripts/fetch-anims.mjs mirror list.
// r2026-10-05.107: no 360° head spins — the clip-mode additive head life
// (r97) was a raw euler += that accumulated into full turns whenever the
// playing clip(s) carried no head track; it now rebuilds from an explicit
// base each frame (refreshed only when the mixer rewrote the bone) and the
// added offset is ROM-clamped to a human neck (±45° pitch / ±80° yaw /
// ±25° roll). Library clips keep full head freedom.
// r2026-10-05.108: neutral daylight lighting — the indoor rig's warm cream
// key ('#fff6ec') read as an orange cast against the warm ember/neon
// backdrops; ONE neutral rig (cool-sky hemisphere + white sun key + cool
// fill) now lights every backdrop regardless of setting, and ACES filmic
// tone mapping at exposure 1.0 pins the color pipeline. Lights are built
// once in the single canvas effect — no rig is ever stacked or duplicated.
// r2026-10-05.109: intermittent "character renders all black" hardening —
// the texture gate now sweeps every texture-typed property (MToon
// shade/rim/matcap included), a texture that errored (iPhone network
// hiccup) is neutralized after 4s (null map + lifted base color + floored
// shade color) instead of holding the gate hostage until the 25s watchdog
// revealed a black model; MToon shadeColor is floored at mount; a whisper
// of flat ambient guarantees no material state can render pure black; a
// 60-frame NaN sweep resets any corrupt quaternion/scale; and the reveal
// gate re-compiles shaders on its first passing frame.
// r2026-10-05.110: agent-zip recovery — the four other agents' handoff zips
// were extracted and inventoried (kimi/workbuddy share one project; cursor
// is code-only; spark is a 2D dating app with no 3D assets). Recovered and
// shipped: (1) the Marin Kitagawa VRM as new character "Marin K." #34
// (cast/kitagawa.vrm — stored under the kitagawa name per the marin
// copyright ban; learning-only per Master Simon, swapped before release),
// (2) 31 VRMA clips incl. five finger-rich idles (IdleNeutral / IdleChinHand
// / IdleHug / IdleSassy / Impatient — 300–800KB, every finger chain
// keyframed) now early in the idle rotation, (3) five EMOTION PERFORMANCE
// moves — cheer / clap / idea / goodbye / blush fire real keyframed clips
// (Cheer / Clapping / Idea / Goodbye / Blush) on encouraging words, praise,
// farewells and bright ideas, so her cheer-ups are body language, not just
// smile blendshapes. Cast 33 → 34.
// r2026-10-05.111: voice gesture-gate auto-replay. Live PC diagnosis (the
// voice-debug page + the amoji:voice-status bus on the real app) proved the
// chain itself is healthy — the edge socket is simply dead on this network
// (instant WS ERROR, fast-fails to tier 2) and both audible tiers speak
// through browser autoplay gates: desktop Chrome (130+) gates
// speechSynthesis and media playback on user activation, and the transient
// half expires ~5s after a click — exactly when a slow LLM reply lands, so
// every tier returns 'not-allowed' and the line is lost unheard. Now any
// gesture-gate failure (gtts NotAllowedError, synth 'not-allowed') stashes
// the line and re-speaks it on the NEXT real pointerdown (45s freshness,
// one replay, newer lines win by natural overwrite).
// r2026-10-05.113: "she still falls to a very low position when the first
// talk starts" — ROOT CAUSE FOUND in the library source: three-vrm-animation
// 3.5.5 names its humanoid tracks `J_Bip_C_Hips.position` (bare node name,
// NO leading dot), but rebaseClipHips (r79/r94/r98) looked for a dot-wrapped
// `.J_Bip_C_Hips.` tag — which matched NOTHING, so every hips rebase since
// r79 was a silent no-op and foreign-rig performance clips kept their raw
// baked hips-Y: she sank the moment a MOVE_CLIP performance (hello/sing/
// dance/cheer) fired at the first reply, then popped back when the idle
// returned. The matcher now reduces every binding path (bare / dot /
// .bones[Name] forms) to its bare node name before comparing — the r103
// bone-scan logic — so all three forms match and future clip sources are
// covered too. Hips quaternion rebasing (facing fix) now actually applies
// as well.
// r2026-10-05.115: SKELETON POKE POINTS + HAND DRAG (Master Simon). A poke
// no longer lands as one generic flinch: the raycast hit point is compared
// against the humanoid probe bones (head/neck, chest/spine, shoulders+arm
// chains, hips+upper legs) and the NEAREST one decides the zone — head pokes
// snap the head back with a barely-moving torso, arm pokes flinch only that
// arm with a lean-away twist, belly pokes double her forward with folded
// elbows, body pokes keep the classic r83 full flinch. All zones still route
// through the human joint limits. The zone also drives the voice: five new
// ouch banks (head/body/armL/armR/belly × yue/zh/ja/en, 5 lines each,
// playful and positive) are spoken as the lead cry, falling back to the
// personality cry for chibi/deform pokes. AND: either hand is grabbable —
// land a pointer within 64px of a projected hand bone and you hold that
// hand; it follows your finger on a camera-facing plane (camera rotation is
// suppressed while holding) through a two-bone reach (upper arm then
// forearm, world-space delta re-expressed per bone, influence-eased), and
// springs home over ~0.4s on release. New Avatar.getBoneNode() exposes raw
// bones for both avatar kinds; upper legs join the resolved bone table.
// r2026-10-05.116: BAKED MODEL THUMBNAILS (Master Simon: "update the images
// of the character using the screenshot of the 3D models"). The selection
// tiles no longer show raw-load-pose one-frame renders (T-pose, blank face):
// a dev-only thumb-bake studio (app/thumb-bake, localhost-only) renders every
// cast member through the real avatar pipeline — IdleNeutral mid-frame from
// the motion library, relaxed calibrated fingers, a gentle smile, neutral
// daylight — and a local save server writes 512px JPEGs to
// public/cast-thumbs/<id>.jpg (34/34 baked, zero failures). ModelThumb
// prefers the baked JPG and falls back to the runtime render → painted art →
// monogram chain on 404, so tiles now show her ACTUAL posed smiling face.
// The studio also self-heals two rig classes: T-pose detection (upper-arm
// world direction) falls back to the calibrated procedural arms-down pose
// when a clip fails to bind (alan/nova/ember), and head/hips-anchored framing
// with hat/hair margin replaced the whole-body Box3 guess that cropped
// robbie's head and zoomed through mochi's chibi face.
// r2026-10-05.117: SETTINGS SHEET IDENTITY + THEMING (r112). The gear sheet
// now opens with a companion identity card — her baked r116 portrait, name,
// gender, tagline and current scene, one tap straight to the selection board
// (closes the sheet, routes to /change) — so the page answers "who am I
// talking to" before any toggle. The whole sheet is themed by the ACTIVE
// companion's accent (toggles, active brain chip, active gender chip, test-
// voice button, card ring + glow) instead of the old hardcoded pink, and
// every section header carries an icon (mode/language/voice/brain/data/help).
// r2026-10-05.118 (Master Simon, 22:35) — roster trim to 10. Deleted old
// #5–18 (mei…cloud), #21–29 (ayane…alan) and #33 (velara); kitagawa (old
// #34) promoted to #1 and the default character. Survivors renumbered
// 1–10: kitagawa, nova, kizuna, alicia, ember, kasumi, marin, aera,
// dhahlia, onyx — all kid-safe now (Kid Mode fallback mochi → dhahlia).
// Persona/voice/laugh banks keep the deleted ids for the face-lab page;
// orphaned saved picks fall back to the roster default.
// r2026-10-05.120 (Master Simon) — two chat-room physics changes:
// · touch zoning: the chat history is display-only (pointer-events-none);
//   an invisible scroll pad over the LOWER THIRD of the screen is the only
//   place that scrolls it (touch drag + momentum + wheel). The top 2/3 of
//   the screen now belongs entirely to the character — rotate, poke and
//   hand-drag work over her whole body.
// · directional poke: at pointer-up the hit is compared against the hips
//   along the camera's right axis, so poking her screen-left side shoves
//   and tips her toward screen-left (mirror on the right) at any camera
//   angle — root slide + quaternion tip-over, human models only.
// r2026-10-05.122 (Master Simon: "AI girlfriend data-base filing standard —
// save the chat history and settings to a file… plug and go to another app or
// robot or avatar") — the COMPANION CARD (.aigf): settings → Memory & data
// gains an Export/Import pair. Export builds one JSON card (format
// "amoji-companion", version 1) carrying her identity (id/name/gender/persona),
// appearance (accent, background), voice engine config + language, your
// profile, the full chat history, the memory-v2 store and kid-mode — and
// downloads it as <characterId>.aigf.json. Import validates strictly (not
// JSON / wrong format / unsupported version / missing history), restores every
// store, falls back to the current character if the importing app doesn't
// have her body (the soul survives the body swap), then reloads so all pages
// re-hydrate. Malformed files alert with a readable reason in all 4 langs.
// r2026-10-05.123 (Master Simon: "no need to show the real 3D model — an
// image is good enough; put it on the background selected") — the selection
// board's row-0 preview now composites a baked ALPHA-PNG CUTOUT of her posed
// full body over the picked scene (she stands IN the scene, accent-tinted
// shadow), replacing the live ModelPreview stream — zero WebGL on this page.
// The thumb-bake studio gained a cutout pass: same posed frame re-rendered
// with a transparent background, full-body framing, auto-cropped to the
// character, saved to public/cast-cutout/<id>.png (10/10 baked, 0 fail). The
// save server accepts ?kind=cutout; the gateway driver now speaks `code` +
// tabId (the old expression/session protocol silently returned errors), and
// the dev server runs --webpack because Turbopack can't spawn its node pool
// in this shell ("program not found"). Falls back to the painted portrait
// chip when a cutout is missing.
// r2026-10-05.124 (Master Simon: "the character has been rotated to the
// right by around 10 degrees… all characters not standing straight") —
// RESIDUAL FACING FIX. Root cause: calibrateFacing ran ONCE at avatar
// construction against the RAW rest pose (bind/T-pose), and several rigs
// carry a shoulder line that is systematically ~10° off true forward in
// that pose. New Avatar.recalibrateFacing() re-measures the shoulder line
// and yaws the residual away; CompanionCanvas calls it once ~0.9s after the
// entry crossfade (the idle stance has settled, the correction is small and
// invisible mid-motion), and the thumb-bake studio calls it after applying
// the idle mid-frame, then re-bakes every thumb + cutout (10/10, 0 fail).
// r2026-10-05.119 (Master Simon: "no voice again" — final systematic
// fallback for every silent-TTS browser) — UNIVERSAL NO-AUDIO WATCHDOG +
// TAP-TO-REPLAY HINT. speak() now arms an 8-second watchdog after every
// speech attempt; if no audio actually started by then (browser denied the
// SpeechSynthesis engine, a slow TTS fetch stalls, a remote voice 403s),
// the watchdog re-arms the gesture-replay path AND raises a floating chip
// above the mic: "Her line went silent — tap anywhere to replay" (4 langs).
// The chip is pointer-events-none so the tap falls through to the window
// pointerdown that performs the replay; any new speak line, a voice that
// eventually starts, or a replay tap dismisses the chip. Slow fetches are
// protected by the voiceStartedSince guard — the tap can never duplicate a
// line that is merely late.
// r2026-10-06.125 (Master Simon: "long-term memory" — his chosen next feature
// from the 2/10 decisions) — RELATIONSHIP TIMELINE + TOPIC-RELEVANT RECALL.
// She now knows how long you two have been together: firstMet is stamped on
// the first visit, and the daily check-in celebrates each relationship
// milestone exactly once (day 1/3/7/14/30/60/100/200/365/500/730/1000/…,
// consumed via lastMilestone, milestone line outranks the plain visit streak).
// And the memory block no longer shows only the newest facts — ChatPanel
// passes the user's current message into buildMemoryBlock, and
// recallRelevant() token-overlap-scores every old fact/entry/diary line
// (CJK particles + latin stopwords stripped; ≥2 distinct hits = a real
// connection, one shared character is coincidence), surfacing the best ≤2
// older memories about what the user JUST said — she connects today's words
// to things told to her weeks ago. Deduped against the standard bits and
// capped short so the free-lane prompt stays lean (r97 discipline).
// r2026-10-06.126 (Master Simon: "the LLM seems loading very slow… make
// conversations reply much faster" — the LLM speed tier, last of his 2/10
// backlog decisions) — three first-token latency wins on top of the r46/r97
// race architecture: (1) the layout PRECONNECTS text.pollinations.ai and
// warmLane() pings its /models list once at chat-room mount, so DNS+TLS and
// a live connection are hot BEFORE the first message — the first turn no
// longer eats the ~1s handshake stall; (2) the static-host /api/chat probe
// is remembered in sessionStorage (in-memory fallback) after its first 404,
// so every later message goes straight to the browser lane instead of
// wasting a dead round-trip — the browser lane itself was hoisted into one
// shared browserLane() closure both paths call; (3) max_tokens 240 on every
// request caps the generation tail (her replies are 1-3 cozy sentences by
// design) without ever biting real text.
// r2026-10-06.128: single source of truth for the robot face — the v2 face
// engine (gaze, lipsync, hint blending, blinks, Http/Unitree drivers) moved
// out of the app and into @amoji/robot-face (packages/robot-face v0.2.0);
// apps/web/lib/robot-face.ts is now a re-export shim, so the B2C app and the
// B2B SDK literally cannot drift. No user-facing behavior change — same face,
// same demos (/face, /robot-demo), same exports, now with one owner.
// r2026-10-06.130: long-term memory v6 — IMPORTANT ANNUAL DATES + HER PROMISES.
// Birthday-type dates (en month names, 生日/月/日, 誕生日) extract into a
// recurring annual memory: she celebrates in the daily check-in exactly once
// per year (outranks the streak line), instead of scrolling out of the capped
// entry list. Commitments SHE makes ("I'll remind you" / 我會提醒我 /
// 明日ね、覚えておく) are remembered from her own replies and ride into her
// prompt as "promises you made" so she keeps her word. Settings shows both,
// delete-only; the .aigf card already round-trips them (full Memory object).
// r2026-10-06.131: EMOTIONAL VOICE — the free edge-tts socket accepts
// mstts:express-as styles (we only ever sent prosody). Every style-capable
// cast voice now gets a curated style whitelist; the dominant emotion picks
// the best supported style (cheerful/excited/sad/angry/tender/terrified/
// worried/shy/calm/confused/hopeful/sorry) with styledegree riding
// expressiveness (zh voices). Ja voices stay prosody-only (they ship no
// styles). Also: optional HTTP TTS proxy (setTtsProxy) — a ready-to-deploy
// free Cloudflare Worker in server/edge-proxy/ — for wss-blocked networks.
// r2026-10-06.132: the TTS proxy is now user-settable in Settings → Voice —
// a URL field with Save / Clear (4 languages). Blank = direct socket;
// filled = every neural-voice request routes through the worker in
// server/edge-proxy/README.md. Nothing else changes.
// r2026-10-06.133: the proxy block grows a ▶ Test button — it saves the
// draft, then speaks one short line through the edge tier exactly as a live
// reply would (new voice.ts testProxyVoice: bypasses the OpenAI tier, the
// neural-enabled gate and the lower fallbacks, so the verdict isolates the
// proxy/URL instead of stopping at the first tier that speaks). ✓/✗ shows
// inline under the field and on the voice-status bus.
// r2026-10-06.134: the ChatGPT-voice (OpenAI tier 0) finally gets its
// Settings UI — the r112 strings were never consumed until now. Settings →
// Voice gains: on/off toggle, API-key field, optional endpoint-proxy URL
// (blank = api.openai.com, which browsers CORS-block), cost hint, and a
// ▶ Test button (voice.ts testOpenAiVoice) that saves the drafts and speaks
// one line through gpt-4o-mini-tts — a bad key / blocked endpoint now names
// itself in one tap instead of silently falling through to the free voices.
export const APP_REVISION = 'r2026-10-06.134';

/** app identity, rendered on the splash screen and status plate */
export const APP_NAME = 'Amoji';
export const APP_TAGLINE = 'An emotional AI companion who laughs, sulks, and stays with you.';
