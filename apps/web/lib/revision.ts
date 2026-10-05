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
export const APP_REVISION = 'r2026-10-05.108';

/** app identity, rendered on the splash screen and status plate */
export const APP_NAME = 'Amoji';
export const APP_TAGLINE = 'An emotional AI companion who laughs, sulks, and stays with you.';
