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
export const APP_REVISION = 'r2026-10-05.115';

/** app identity, rendered on the splash screen and status plate */
export const APP_NAME = 'Amoji';
export const APP_TAGLINE = 'An emotional AI companion who laughs, sulks, and stays with you.';
