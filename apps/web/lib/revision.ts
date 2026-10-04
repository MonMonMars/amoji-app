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
export const APP_REVISION = 'r2026-10-05.103';

/** app identity, rendered on the splash screen and status plate */
export const APP_NAME = 'Amoji';
export const APP_TAGLINE = 'An emotional AI companion who laughs, sulks, and stays with you.';
