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

/**
 * The idle pose catalog. Each pose is a small, sustained body attitude the
 * companion drifts between while nothing else is happening — standing,
 * fidgeting, stretching, daydreaming. Values stay subtle: these are offsets on
 * top of the engine's breathing/sway, not full keyframe animation.
 *
 * r2026-10-03.04: expanded into a personality library. Pose ids mirror the
 * classic Mixamo idle family (Neutral/Happy/Sad/Sexy/ChestOut/Stretching…)
 * so a real clip library (mixamo.com / rigmodels.com/animations) can be
 * dropped in later by mapping the same ids to .vrma clips per character.
 */
export const IDLE_POSES: IdlePoseDef[] = [
  // --- baseline -----------------------------------------------------------
  { id: 'stand', upperDelta: 0, elbowDelta: 0, spineDelta: 0, headYaw: 0, headRollDelta: 0, leanSideDelta: 0 },
  { id: 'headTilt', upperDelta: 0.02, elbowDelta: 0.04, spineDelta: 0.01, headYaw: 0.15, headRollDelta: 0.18, leanSideDelta: 0 },
  { id: 'crossedArms', upperDelta: -0.12, elbowDelta: 0.22, spineDelta: -0.02, headYaw: 0, headRollDelta: 0, leanSideDelta: 0 },
  { id: 'lookAround', upperDelta: 0, elbowDelta: 0.02, spineDelta: 0, headYaw: -0.35, headRollDelta: 0, leanSideDelta: 0 },
  { id: 'weightShift', upperDelta: 0.04, elbowDelta: 0.02, spineDelta: 0, headYaw: 0, headRollDelta: -0.06, leanSideDelta: 0.5 },
  // --- expanded library (r2026-10-02.9) ------------------------------------
  { id: 'stretchUp', upperDelta: -0.06, elbowDelta: -0.05, spineDelta: -0.06, headYaw: 0, headRollDelta: 0.05, leanSideDelta: 0 },
  { id: 'handsBehind', upperDelta: 0.08, elbowDelta: -0.08, spineDelta: 0.015, headYaw: 0.1, headRollDelta: 0, leanSideDelta: 0 },
  { id: 'swaySoft', upperDelta: 0.02, elbowDelta: 0.03, spineDelta: 0, headYaw: 0, headRollDelta: 0.08, leanSideDelta: 0.3 },
  { id: 'fidget', upperDelta: 0.01, elbowDelta: 0.12, spineDelta: 0, headYaw: -0.12, headRollDelta: 0, leanSideDelta: 0 },
  { id: 'lookUp', upperDelta: -0.02, elbowDelta: 0, spineDelta: -0.03, headYaw: 0, headRollDelta: -0.04, leanSideDelta: 0 },
  { id: 'leanIn', upperDelta: -0.03, elbowDelta: 0.06, spineDelta: 0.05, headYaw: 0.05, headRollDelta: 0, leanSideDelta: 0 },
  { id: 'shoulderShrug', upperDelta: -0.1, elbowDelta: 0.05, spineDelta: 0, headYaw: 0, headRollDelta: 0, leanSideDelta: 0.15 },
  { id: 'toeShift', upperDelta: 0.03, elbowDelta: 0.01, spineDelta: 0.01, headYaw: 0.2, headRollDelta: -0.03, leanSideDelta: 0.55 },
  { id: 'daydream', upperDelta: 0.01, elbowDelta: 0.05, spineDelta: -0.015, headYaw: -0.2, headRollDelta: 0.12, leanSideDelta: -0.2 },
  // --- personality library (r2026-10-03.04) --------------------------------
  // confident / cheeky — "Idle_ChestOut" family
  { id: 'handsOnHips', upperDelta: -0.05, elbowDelta: 0.18, spineDelta: -0.02, headYaw: 0.08, headRollDelta: 0, leanSideDelta: 0.12 },
  { id: 'confidentLean', upperDelta: -0.04, elbowDelta: 0.1, spineDelta: 0.04, headYaw: 0, headRollDelta: -0.08, leanSideDelta: 0.42 },
  // thoughtful — chin resting, pondering
  { id: 'chinStroke', upperDelta: 0.06, elbowDelta: 0.3, spineDelta: 0.01, headYaw: 0.1, headRollDelta: 0.05, leanSideDelta: 0 },
  // energetic — light on the toes, ready to spring
  { id: 'bouncy', upperDelta: -0.08, elbowDelta: -0.02, spineDelta: -0.04, headYaw: 0, headRollDelta: 0.1, leanSideDelta: -0.25 },
  // soft / shy — self-hug, wrapped up cozy
  { id: 'calmHug', upperDelta: 0.1, elbowDelta: 0.35, spineDelta: 0.015, headYaw: -0.05, headRollDelta: 0.06, leanSideDelta: 0 },
  // dreamy — eyes to the sky
  { id: 'stargaze', upperDelta: -0.03, elbowDelta: 0, spineDelta: -0.05, headYaw: 0, headRollDelta: -0.05, leanSideDelta: -0.1 },
  { id: 'dreamyTilt', upperDelta: 0.01, elbowDelta: 0.06, spineDelta: -0.02, headYaw: 0.25, headRollDelta: 0.2, leanSideDelta: -0.15 },
  // cool / guarded — arms sealed, scanning
  { id: 'guardCross', upperDelta: -0.11, elbowDelta: 0.26, spineDelta: -0.015, headYaw: -0.1, headRollDelta: 0, leanSideDelta: 0 },
  // athletic — set and ready
  { id: 'readyStance', upperDelta: -0.06, elbowDelta: 0.08, spineDelta: 0.03, headYaw: 0, headRollDelta: 0, leanSideDelta: 0.2 },
  { id: 'stretchSide', upperDelta: 0.02, elbowDelta: -0.04, spineDelta: 0.02, headYaw: 0.1, headRollDelta: 0.15, leanSideDelta: 0.6 },
];

/** fast id → pose lookup for per-character subsets */
const POSE_INDEX = new Map(IDLE_POSES.map((p) => [p.id, p]));

/** resolve a list of pose ids to defs; unknown ids are skipped, empty input → full catalog */
export function posesByIds(ids: string[]): IdlePoseDef[] {
  const list = ids.map((id) => POSE_INDEX.get(id)).filter((p): p is IdlePoseDef => !!p);
  return list.length ? list : IDLE_POSES;
}

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

function blendPoses(cur: IdlePoseDef, prev: IdlePoseDef, blend: number): IdlePoseDef {
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

/** locate the cycle containing tMs and its start time */
function locateCycle(tMs: number, seed: number): { cycle: number; start: number } {
  let cycle = 0;
  let start = 0;
  for (;;) {
    const dur = cycleDuration(seed, cycle);
    if (tMs < start + dur || cycle > 100000) break;
    start += dur;
    cycle += 1;
  }
  return { cycle, start };
}

/**
 * Sample a pose from a per-character subset. Deterministic for (tMs, seed):
 * cycles pick pseudo-randomly inside the subset, hold, then crossfade.
 * Continuous in tMs. An empty subset falls back to the full catalog.
 */
export function sampleIdlePoseFrom(tMs: number, seed: number, poses: IdlePoseDef[]): IdlePoseDef {
  const list = poses.length ? poses : IDLE_POSES;
  const t = Math.max(0, tMs);
  const { cycle, start } = locateCycle(t, seed);
  const elapsed = t - start;
  const cur = list[hash2(seed, cycle * 2) % list.length]!;
  const blend = smoothstep(elapsed / POSE_BLEND_MS);
  if (blend >= 1 || cycle === 0) return { ...cur };
  const prev = list[hash2(seed, (cycle - 1) * 2) % list.length]!;
  return blendPoses(cur, prev, blend);
}

/**
 * Sample the idle-pose offset at engine time `tMs`. Deterministic for a given
 * (tMs, seed): cycles pick a pose pseudo-randomly, hold it, then crossfade to
 * the next pose over POSE_BLEND_MS. Continuous in tMs.
 * Equivalent to sampleIdlePoseFrom over the full catalog.
 */
export function sampleIdlePose(tMs: number, seed: number): IdlePoseDef {
  return sampleIdlePoseFrom(tMs, seed, IDLE_POSES);
}
