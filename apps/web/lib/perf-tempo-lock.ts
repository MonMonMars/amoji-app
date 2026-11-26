// Live-tempo steering for a looping dance/sing VRMA.
//
// WHY (owner report 2026-11-25: "the dance ... very strange stop motion dance")
// `CompanionCanvas` used to rewrite the playback rate the instant the live beat
// tracker reported a new BPM:
//
//     const ratio = Math.max(0.85, Math.min(1.18, beatNow.bpm / perfTrackBpm));
//     perfAction.timeScale = perfBaseTimeScale * ratio;
//
// `bpm` comes from an onset histogram that keeps refining itself, so on a real
// (analysable) stream the value moves between neighbouring frames — often by
// the full ±15-18% clamp. The clip therefore lurches faster/slower mid-move:
// the body speeds through a phrase and then drags, which reads as a jerky,
// uneven dance even though the mixer is being updated smoothly.
//
// Fix: steer the rate toward the estimate with a bounded slew rate instead of
// teleporting to it. A tempo correction becomes a ~1 s glide, and the pose
// clock (`mixer.update(dt / 1000)` scaled by `timeScale`) stays continuous.
// Pure math, no window/three import — unit testable in node.

/** Never correct the authored tempo by more than ±15-18% (unchanged policy). */
export const DANCE_TEMPO_MIN_RATIO = 0.85;
export const DANCE_TEMPO_MAX_RATIO = 1.18;

/** Max rate change per second, as a fraction of the authored rate. */
export const DANCE_TEMPO_SLEW_PER_SEC = 0.08;

/** A frame gap this long means the tab was backgrounded — snap, don't glide. */
export const DANCE_TEMPO_SNAP_MS = 250;

export function clampTempoRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  return Math.max(DANCE_TEMPO_MIN_RATIO, Math.min(DANCE_TEMPO_MAX_RATIO, ratio));
}

/**
 * One frame of tempo steering.
 *
 * @param baseTimeScale authored `action.timeScale` (personality / profile)
 * @param tempoRatio    live `bpm / trackBpm`
 * @param dtMs          the same frame delta the mixer used
 * @param previous      the rate last written; `<= 0` / non-finite = nothing yet
 * @returns the rate to write into `action.timeScale` this frame
 */
export function steerDanceTimeScale(
  baseTimeScale: number,
  tempoRatio: number,
  dtMs: number,
  previous: number,
): number {
  const base = Number.isFinite(baseTimeScale) && baseTimeScale > 0 ? baseTimeScale : 1;
  const target = base * clampTempoRatio(tempoRatio);
  // First frame of a clip, or a resumed tab: start AT the tempo, no glide in.
  if (!Number.isFinite(previous) || previous <= 0) return target;
  if (!Number.isFinite(dtMs) || dtMs >= DANCE_TEMPO_SNAP_MS) return target;
  const step = base * DANCE_TEMPO_SLEW_PER_SEC * (Math.max(0, dtMs) / 1000);
  const delta = target - previous;
  if (Math.abs(delta) <= step) return target;
  return previous + Math.sign(delta) * step;
}
