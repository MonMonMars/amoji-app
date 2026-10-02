/** per-pose bone offsets in mapped-value space, blended over time while idle */
export interface IdlePoseOffsets {
  /** added to upper-arm lowering (positive = arms hang lower) */
  upperDelta: number;
  /** added to elbow bend */
  elbowDelta: number;
  /** added to spine pitch */
  spineDelta: number;
  /** head-yaw target this pose drifts toward */
  headYaw: number;
  /** added to head roll */
  headRollDelta: number;
  /** added to leanSide (engine space -1..1) */
  leanSideDelta: number;
}

export interface IdlePoseDef extends IdlePoseOffsets {
  id: string;
}

export const IDLE_POSES: IdlePoseDef[] = [
  { id: 'stand', upperDelta: 0, elbowDelta: 0, spineDelta: 0, headYaw: 0, headRollDelta: 0, leanSideDelta: 0 },
  { id: 'headTilt', upperDelta: 0.02, elbowDelta: 0.04, spineDelta: 0.01, headYaw: 0.15, headRollDelta: 0.18, leanSideDelta: 0 },
  { id: 'crossedArms', upperDelta: -0.12, elbowDelta: 0.22, spineDelta: -0.02, headYaw: 0, headRollDelta: 0, leanSideDelta: 0 },
  { id: 'lookAround', upperDelta: 0, elbowDelta: 0.02, spineDelta: 0, headYaw: -0.35, headRollDelta: 0, leanSideDelta: 0 },
  { id: 'weightShift', upperDelta: 0.04, elbowDelta: 0.02, spineDelta: 0, headYaw: 0, headRollDelta: -0.06, leanSideDelta: 0.5 },
];

/** how long each pose is held (ms) before switching */
export const POSE_BASE_MS = 8000;
/** per-cycle jitter added to the hold (ms), deterministic from seed */
export const POSE_JITTER_MS = 4000;
/** crossfade length when switching poses (ms) */
export const POSE_BLEND_MS = 1500;

/** deterministic 32-bit hash of (seed, cycle) */
function hash2(seed: number, cycle: number): number {
  let h = (seed | 0) ^ Math.imul(cycle | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  return (h ^ (h >>> 15)) >>> 0;
}

export function cycleDuration(seed: number, cycle: number): number {
  return POSE_BASE_MS + (hash2(seed, cycle * 2 + 1) % (POSE_JITTER_MS + 1));
}

/** which pose a cycle uses, deterministic from (seed, cycle) */
export function poseIndexFor(seed: number, cycle: number): number {
  return hash2(seed, cycle * 2) % IDLE_POSES.length;
}

const smoothstep = (x: number): number => {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Sample the idle-pose offset at engine time `tMs`. Deterministic for a given
 * (tMs, seed): cycles pick a pose pseudo-randomly, hold it, then crossfade to
 * the next pose over POSE_BLEND_MS. Continuous in tMs.
 */
export function sampleIdlePose(tMs: number, seed: number): IdlePoseDef {
  const t = Math.max(0, tMs);
  // locate current cycle by walking durations (cycles are short; walk is cheap)
  let cycle = 0;
  let start = 0;
  for (;;) {
    const dur = cycleDuration(seed, cycle);
    if (t < start + dur || cycle > 100000) break;
    start += dur;
    cycle += 1;
  }
  const elapsed = t - start;
  const cur = IDLE_POSES[poseIndexFor(seed, cycle)]!;
  const blend = smoothstep(elapsed / POSE_BLEND_MS);
  if (blend >= 1 || cycle === 0) return { ...cur };
  const prev = IDLE_POSES[poseIndexFor(seed, cycle - 1)]!;
  return {
    id: cur.id,
    upperDelta: lerp(prev.upperDelta, cur.upperDelta, blend),
    elbowDelta: lerp(prev.elbowDelta, cur.elbowDelta, blend),
    spineDelta: lerp(prev.spineDelta, cur.spineDelta, blend),
    headYaw: lerp(prev.headYaw, cur.headYaw, blend),
    headRollDelta: lerp(prev.headRollDelta, cur.headRollDelta, blend),
    leanSideDelta: lerp(prev.leanSideDelta, cur.leanSideDelta, blend),
  };
}
