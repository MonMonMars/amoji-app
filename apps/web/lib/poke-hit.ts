// Poke region and punch direction from the hit on the live VRM.
// The body recoils away from the poke (the punch continues through the
// contact). Each major part has its own impact shape; front/back/left/right
// change which joints take the force so it is not one clip mirrored.

export type TalkZone =
  | 'head'
  | 'torso'
  | 'chest'
  | 'side'
  | 'back'
  | 'armL'
  | 'armR'
  | 'belly'
  | 'legL'
  | 'legR';

export type PokeDirection = 'front' | 'back' | 'left' | 'right';

export interface Vec3 { x: number; y: number; z: number }

export interface PokeHitExtra {
  /** World-space outward surface normal at the contact. */
  normal?: Vec3;
  /** World-space ray direction, camera toward the model. */
  rayDir?: Vec3;
  leftArm?: Vec3;
  rightArm?: Vec3;
  leftLeg?: Vec3;
  rightLeg?: Vec3;
  belly?: Vec3;
}

export interface PokeClass {
  zone: TalkZone;
  /** Side the punch came from, in the character's facing frame. */
  direction: PokeDirection;
  /** Horizontal recoil (away from the poke), world XZ, unit length. */
  impulse: { x: number; z: number };
  sideSign: number;
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function normXZ(v: { x: number; z: number }): { x: number; z: number } {
  const l = Math.hypot(v.x, v.z);
  if (l < 1e-6) return { x: 0, z: -1 };
  return { x: v.x / l, z: v.z / l };
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Where the punch came from, given the recoil and the character axes. */
export function directionFromAxes(
  impulse: { x: number; z: number },
  forward: { x: number; z: number },
  right: { x: number; z: number },
): PokeDirection {
  const f = impulse.x * forward.x + impulse.z * forward.z;
  const s = impulse.x * right.x + impulse.z * right.z;
  if (Math.abs(s) > Math.abs(f)) return s < 0 ? 'right' : 'left';
  return f < 0 ? 'front' : 'back';
}

function recoilXZ(hit: Vec3, hips: Vec3, extra?: PokeHitExtra): { x: number; z: number } {
  const away = normXZ({ x: hips.x - hit.x, z: hips.z - hit.z });
  let x = 0;
  let z = 0;
  if (extra?.normal) {
    x = -extra.normal.x;
    z = -extra.normal.z;
  }
  if (Math.hypot(x, z) < 0.25 && extra?.rayDir) {
    x = extra.rayDir.x;
    z = extra.rayDir.z;
  }
  if (Math.hypot(x, z) < 0.25) return away;
  return normXZ({ x, z });
}

function nearestPart(hit: Vec3, hips: Vec3, extra?: PokeHitExtra): TalkZone | null {
  if (!extra) return null;
  const cands: { zone: TalkZone; p: Vec3; r: number }[] = [];
  if (extra.leftArm) cands.push({ zone: 'armL', p: extra.leftArm, r: 0.28 });
  if (extra.rightArm) cands.push({ zone: 'armR', p: extra.rightArm, r: 0.28 });
  if (extra.leftLeg && hit.y < hips.y - 0.08) cands.push({ zone: 'legL', p: extra.leftLeg, r: 0.3 });
  if (extra.rightLeg && hit.y < hips.y - 0.08) cands.push({ zone: 'legR', p: extra.rightLeg, r: 0.3 });
  if (extra.belly) cands.push({ zone: 'belly', p: extra.belly, r: 0.18 });
  let best: { zone: TalkZone; d: number } | null = null;
  for (const c of cands) {
    const d = dist(hit, c.p);
    if (d > c.r) continue;
    if (!best || d < best.d) best = { zone: c.zone, d };
  }
  return best?.zone ?? null;
}

export function classifyPoke(
  hit: Vec3,
  hips: Vec3,
  head: Vec3,
  chest: Vec3,
  leftShoulder: Vec3,
  rightShoulder: Vec3,
  extra?: PokeHitExtra,
): PokeClass {
  const right = sub(rightShoulder, leftShoulder);
  right.y = 0;
  const rightN = normXZ(right);
  // cross(up, right) on XZ — character forward
  const forward = normXZ({ x: right.z, z: -right.x });
  const rel = sub(hit, hips);
  const f = rel.x * forward.x + rel.z * forward.z;
  const s = rel.x * rightN.x + rel.z * rightN.z;
  const side = Math.abs(s) > Math.abs(f) * 0.9 && Math.abs(s) > 0.03;
  const back = !side && f < -0.02;
  const mid = (chest.y + head.y) * 0.5;
  let zone: TalkZone;
  if (side) zone = 'side';
  else if (back) zone = 'back';
  else if (hit.y >= mid - 0.02) zone = 'head';
  else if (hit.y >= chest.y - 0.06) zone = 'chest';
  else zone = 'torso';

  if (zone !== 'head') {
    const part = nearestPart(hit, hips, extra);
    if (part === 'belly') {
      if (zone === 'torso' && dist(hit, extra!.belly!) + 0.02 < dist(hit, chest)) zone = 'belly';
    } else if (part === 'armL' || part === 'armR' || part === 'legL' || part === 'legR') {
      zone = part;
    }
  }

  const impulse = recoilXZ(hit, hips, extra);
  return {
    zone,
    direction: directionFromAxes(impulse, forward, rightN),
    impulse,
    sideSign: s >= 0 ? 1 : -1,
  };
}

export interface PokeBody {
  /** Root translation and tilt stay at 0 — the wrapper is not shoved. */
  rootX: number;
  rootY: number;
  rootZ: number;
  spinePitch: number;
  chestPitch: number;
  spineYaw: number;
  chestRoll: number;
  headX: number;
  headZ: number;
  hipPitch: number;
  hipRoll: number;
  /** Small hip slide in world XZ. Feet stay on the captured contact. */
  hipShiftX: number;
  hipShiftZ: number;
  lArmX: number;
  rArmX: number;
  lElbowZ: number;
  rElbowZ: number;
  lArmUp: number;
  rArmUp: number;
}

const STILL: PokeBody = {
  rootX: 0, rootY: 0, rootZ: 0,
  spinePitch: 0, chestPitch: 0, spineYaw: 0, chestRoll: 0,
  headX: 0, headZ: 0,
  hipPitch: 0, hipRoll: 0, hipShiftX: 0, hipShiftZ: 0,
  lArmX: 0, rArmX: 0, lElbowZ: 0, rElbowZ: 0, lArmUp: 0, rArmUp: 0,
};

type SpringKind = 'head' | 'chest' | 'body' | 'arm' | 'heavy';

/**
 * Underdamped punch. t is 0..1 across the reaction window.
 * Impact rises fast, one opposite rebound is the recovery, then it settles.
 * The first half-cycle stays positive through t=0.2 so a sampled hit still
 * leans with the impulse.
 */
export function pokePunch(t: number, kind: SpringKind = 'body'): number {
  if (!(t > 0) || t > 1.2) return 0;
  const spec = {
    head: { attack: 0.05, decay: 3.4, omega: 5.6 },
    chest: { attack: 0.055, decay: 2.7, omega: 5.8 },
    body: { attack: 0.07, decay: 2.15, omega: 4.3 },
    arm: { attack: 0.05, decay: 2.9, omega: 5.2 },
    heavy: { attack: 0.08, decay: 1.85, omega: 3.6 },
  }[kind];
  const attack = Math.min(1, t / spec.attack);
  const shifted = Math.max(0, t - spec.attack * 0.4);
  return attack * Math.exp(-shifted * spec.decay) * Math.cos(shifted * spec.omega);
}

/** Infer punch origin from the recoil vector when the caller has no hit frame. */
export function inferPokeDirection(fallX: number, fallZ: number): PokeDirection {
  if (Math.abs(fallX) > Math.abs(fallZ) * 0.9) return fallX > 0 ? 'left' : 'right';
  return fallZ < 0 ? 'front' : 'back';
}

interface Gains {
  spine: number;
  chest: number;
  head: number;
  hip: number;
  hipRoll: number;
  roll: number;
  yaw: number;
  arm: number;
  elbow: number;
  armUp: number;
  shift: number;
  kind: SpringKind;
  elbowBias: number;
  armUpBias: number;
}

function gainsFor(zone: TalkZone, direction: PokeDirection): Gains {
  const side = direction === 'left' || direction === 'right';
  const fromBack = direction === 'back';
  switch (zone) {
    case 'head':
      return { spine: 0, chest: 0, head: 0.95, hip: 0, hipRoll: 0, roll: 0, yaw: 0, arm: 0, elbow: 0, armUp: 0, shift: 0, kind: 'head', elbowBias: 0, armUpBias: 0 };
    case 'chest':
      if (side) {
        return { spine: 0.36, chest: 0.42, head: 0.16, hip: 0.24, hipRoll: 0.28, roll: 0.4, yaw: 0.05, arm: 0.58, elbow: 0.32, armUp: 0.14, shift: 0.03, kind: 'chest', elbowBias: 0.08, armUpBias: -0.04 };
      }
      if (fromBack) {
        return { spine: 0.64, chest: 0.34, head: 0.18, hip: 0.36, hipRoll: 0.08, roll: 0.1, yaw: 0.03, arm: 0.34, elbow: 0.22, armUp: 0.2, shift: 0.036, kind: 'chest', elbowBias: 0.04, armUpBias: 0.08 };
      }
      return { spine: 0.6, chest: 0.68, head: 0.2, hip: 0.38, hipRoll: 0.08, roll: 0.12, yaw: 0.03, arm: 0.42, elbow: 0.3, armUp: 0.1, shift: 0.04, kind: 'chest', elbowBias: 0.12, armUpBias: 0 };
    case 'belly':
      return { spine: 0.44, chest: 0.14, head: 0.1, hip: 0.55, hipRoll: side ? 0.32 : 0.1, roll: side ? 0.2 : 0.08, yaw: 0.04, arm: 0.26, elbow: 0.18, armUp: 0.05, shift: 0.05, kind: 'heavy', elbowBias: 0.03, armUpBias: 0.05 };
    case 'armL':
      return { spine: 0.26, chest: 0.18, head: 0.12, hip: 0.18, hipRoll: 0.16, roll: 0.28, yaw: 0.04, arm: 0.98, elbow: 0.64, armUp: side ? 0.3 : 0.12, shift: 0.026, kind: 'arm', elbowBias: 0.18, armUpBias: -0.08 };
    case 'armR':
      return { spine: 0.2, chest: 0.24, head: 0.1, hip: 0.15, hipRoll: 0.2, roll: 0.32, yaw: 0.035, arm: 0.86, elbow: 0.38, armUp: side ? 0.4 : 0.22, shift: 0.022, kind: 'arm', elbowBias: -0.06, armUpBias: 0.16 };
    case 'legL':
      return { spine: 0.3, chest: 0.08, head: 0.08, hip: 0.52, hipRoll: 0.34, roll: 0.14, yaw: 0.03, arm: 0.16, elbow: 0.1, armUp: 0.04, shift: 0.05, kind: 'heavy', elbowBias: 0.07, armUpBias: 0 };
    case 'legR':
      return { spine: 0.22, chest: 0.12, head: 0.06, hip: 0.46, hipRoll: 0.38, roll: 0.2, yaw: 0.025, arm: 0.12, elbow: 0.08, armUp: 0.09, shift: 0.046, kind: 'heavy', elbowBias: -0.05, armUpBias: 0.06 };
    case 'side':
      return { spine: 0.34, chest: 0.26, head: 0.14, hip: 0.32, hipRoll: 0.36, roll: 0.48, yaw: 0.06, arm: 0.72, elbow: 0.42, armUp: 0.22, shift: 0.036, kind: 'body', elbowBias: 0.08, armUpBias: 0.06 };
    case 'back':
      return { spine: 0.72, chest: 0.4, head: 0.16, hip: 0.42, hipRoll: 0.08, roll: 0.1, yaw: 0.03, arm: 0.38, elbow: 0.24, armUp: 0.18, shift: 0.042, kind: 'body', elbowBias: 0.03, armUpBias: 0.09 };
    default: {
      if (side) {
        return { spine: 0.38, chest: 0.28, head: 0.14, hip: 0.36, hipRoll: 0.32, roll: 0.4, yaw: 0.06, arm: 0.62, elbow: 0.36, armUp: 0.16, shift: 0.04, kind: 'body', elbowBias: 0.1, armUpBias: 0.04 };
      }
      if (fromBack) {
        return { spine: 0.76, chest: 0.4, head: 0.16, hip: 0.46, hipRoll: 0.06, roll: 0.08, yaw: 0.03, arm: 0.4, elbow: 0.26, armUp: 0.16, shift: 0.046, kind: 'heavy', elbowBias: 0.02, armUpBias: 0.08 };
      }
      return { spine: 0.8, chest: 0.5, head: 0.22, hip: 0.48, hipRoll: 0.08, roll: 0.12, yaw: 0.035, arm: 0.6, elbow: 0.38, armUp: 0.12, shift: 0.05, kind: 'body', elbowBias: 0.12, armUpBias: 0.02 };
    }
  }
}

const CAP = {
  spine: 0.82,
  chest: 0.62,
  head: 0.9,
  hip: 0.5,
  hipRoll: 0.38,
  yaw: 0.14,
  roll: 0.46,
  arm: 1.05,
  elbow: 0.58,
  armUp: 0.48,
  shift: 0.055,
} as const;

function clamp(v: number, m: number): number {
  return v < -m ? -m : v > m ? m : v;
}

/**
 * Punch recoil for one sample of the reaction.
 * t is 0 at the hit and 1 at the end of the window.
 * fallX/fallZ are the horizontal recoil (away from the poke).
 * A head poke tips only the head. Every other part bends hips, spine,
 * shoulders and arms together. Nothing here translates the scene root.
 */
export function pokeBodyReaction(opts: {
  t: number;
  zone: TalkZone;
  fallX: number;
  fallZ: number;
  sideSign: number;
  softChest: boolean;
  twist: number;
  direction?: PokeDirection;
}): PokeBody {
  const t = Math.min(1.2, Math.max(0, opts.t));
  const direction = opts.direction ?? inferPokeDirection(opts.fallX, opts.fallZ);
  const g = gainsFor(opts.zone, direction);
  const punch = pokePunch(t, g.kind);
  if (opts.zone === 'head') {
    const amp = g.head * punch;
    return {
      ...STILL,
      headX: clamp(opts.fallZ * amp, CAP.head),
      headZ: clamp(-opts.fallX * amp * 0.8 + opts.twist * 0.04 * punch, CAP.head),
    };
  }
  const lateral = direction === 'left' || direction === 'right' || opts.zone === 'side' || opts.zone === 'armL' || opts.zone === 'armR';
  let armL = g.arm;
  let armR = g.arm;
  if (opts.zone === 'armL') {
    armL = g.arm;
    armR = g.arm * 0.12;
  } else if (opts.zone === 'armR') {
    armL = g.arm * 0.14;
    armR = g.arm;
  } else if (lateral && opts.sideSign > 0) {
    armR = g.arm;
    armL = g.arm * 0.18;
  } else if (lateral && opts.sideSign < 0) {
    armL = g.arm;
    armR = g.arm * 0.18;
  }
  const armDir = opts.fallZ !== 0
    ? opts.fallZ
    : (lateral ? -opts.sideSign : (opts.fallX !== 0 ? -Math.sign(opts.fallX) : -0.35));
  return {
    ...STILL,
    spinePitch: clamp(opts.fallZ * g.spine * punch, CAP.spine),
    chestPitch: clamp(opts.fallZ * g.chest * punch * (opts.softChest && opts.zone === 'chest' ? 1.12 : 1), CAP.chest),
    spineYaw: clamp(opts.fallX * g.yaw * punch, CAP.yaw),
    chestRoll: clamp(-opts.fallX * g.roll * punch, CAP.roll),
    headX: clamp(opts.fallZ * g.head * punch, CAP.head),
    headZ: clamp(-opts.fallX * g.head * 0.7 * punch + opts.twist * 0.04 * punch, CAP.head),
    hipPitch: clamp(opts.fallZ * g.hip * punch, CAP.hip),
    hipRoll: clamp(-opts.fallX * g.hipRoll * punch, CAP.hipRoll),
    hipShiftX: clamp(opts.fallX * g.shift * punch, CAP.shift),
    hipShiftZ: clamp(opts.fallZ * g.shift * punch, CAP.shift),
    lArmX: clamp(armDir * armL * punch, CAP.arm),
    rArmX: clamp(armDir * armR * 0.94 * punch, CAP.arm),
    lElbowZ: clamp((g.elbow + g.elbowBias) * punch, CAP.elbow),
    rElbowZ: clamp((g.elbow - g.elbowBias * 0.55) * punch, CAP.elbow),
    lArmUp: clamp(-Math.abs(opts.fallX) * (g.armUp + g.armUpBias) * punch, CAP.armUp),
    rArmUp: clamp(-Math.abs(opts.fallX) * (g.armUp - g.armUpBias * 0.5) * punch, CAP.armUp),
  };
}
