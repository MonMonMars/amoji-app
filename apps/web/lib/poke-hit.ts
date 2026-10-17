// Poke region from the hit relative to the character's facing.
// Impulse is the horizontal push away from the contact (front → back, side → across, back → forward).

export type TalkZone = 'head' | 'torso' | 'chest' | 'side' | 'back';

export interface Vec3 { x: number; y: number; z: number }

export interface PokeClass {
  zone: TalkZone;
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

export function classifyPoke(hit: Vec3, hips: Vec3, head: Vec3, chest: Vec3, leftShoulder: Vec3, rightShoulder: Vec3): PokeClass {
  const right = sub(rightShoulder, leftShoulder);
  right.y = 0;
  const rightN = normXZ(right);
  // cross(up, right) = (right.z, -right.x) on XZ — character forward
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
  const away = normXZ({ x: -rel.x, z: -rel.z });
  return { zone, impulse: away, sideSign: s >= 0 ? 1 : -1 };
}

export interface PokeBody {
  /** Root translation and tilt stay at 0 — feet are not shoved or tipped. */
  rootX: number;
  rootY: number;
  rootZ: number;
  spinePitch: number;
  chestPitch: number;
  spineYaw: number;
  chestRoll: number;
  headX: number;
  headZ: number;
  lArmX: number;
  rArmX: number;
  lElbowZ: number;
  rElbowZ: number;
  lArmUp: number;
  rArmUp: number;
}

const POKE_ZONE_WEIGHT = {
  torso: { head: 0.55, spine: 1.15, chest: 1.05, armL: 0.85, armR: 0.85, elb: 0.7, up: 0.45, twist: 0.55 },
  chest: { head: 0.35, spine: 0.5, chest: 0.62, armL: 0.35, armR: 0.35, elb: 0.28, up: 0.2, twist: 0.4 },
  side:  { head: 0.45, spine: 0.7, chest: 0.5, armL: 0.15, armR: 0.15, elb: 0.85, up: 0.55, twist: 0.9 },
  back:  { head: 0.4, spine: 0.95, chest: 0.7, armL: 0.4, armR: 0.4, elb: 0.45, up: 0.28, twist: 0.3 },
} as const;

const STILL: PokeBody = {
  rootX: 0, rootY: 0, rootZ: 0,
  spinePitch: 0, chestPitch: 0, spineYaw: 0, chestRoll: 0,
  headX: 0, headZ: 0,
  lArmX: 0, rArmX: 0, lElbowZ: 0, rElbowZ: 0, lArmUp: 0, rArmUp: 0,
};

/**
 * Upper-body flinch for a poke. The root never translates or tips: hips and
 * feet stay planted. The lean follows the impulse (away from the contact):
 * fallZ pitches, fallX rolls. A head poke tips the head only.
 * Character faces +Z, so fallZ < 0 (pushed back) pitches backward.
 */
export function pokeBodyReaction(opts: {
  t: number;
  zone: TalkZone;
  fallX: number;
  fallZ: number;
  sideSign: number;
  softChest: boolean;
  twist: number;
}): PokeBody {
  const t = Math.min(1, Math.max(0, opts.t));
  const press = Math.min(t / 0.07, 1) * Math.exp(-Math.max(0, t - 0.07) * 4);
  const press2 = Math.min(Math.max(t - 0.05, 0) / 0.08, 1) * Math.exp(-Math.max(0, t - 0.13) * 3.6);
  if (opts.zone === 'head') {
    const amp = 0.62 * press;
    return {
      ...STILL,
      headX: opts.fallZ * amp,
      headZ: -opts.fallX * amp * 0.85,
    };
  }
  const base = POKE_ZONE_WEIGHT[opts.zone];
  const armL = opts.zone === 'side' ? (opts.sideSign < 0 ? 1.45 : 0.15) : base.armL;
  const armR = opts.zone === 'side' ? (opts.sideSign > 0 ? 1.45 : 0.15) : base.armR;
  const dir = (opts.softChest ? 0.2 : 0.4) * press;
  const armDir = opts.fallZ !== 0 ? opts.fallZ : (opts.zone === 'side' ? -opts.sideSign : -0.35);
  const sway = opts.softChest ? opts.sideSign * 0.1 * press * base.twist : 0;
  return {
    ...STILL,
    spinePitch: opts.fallZ * dir * base.spine,
    chestPitch: opts.fallZ * (opts.softChest ? 0.16 : 0.32) * press2 * base.chest,
    spineYaw: opts.fallX * dir * 0.4 * base.twist + sway,
    chestRoll: -opts.fallX * dir * base.chest,
    headX: opts.fallZ * dir * 0.85 * base.head,
    headZ: -opts.fallX * dir * 0.65 * base.head + opts.twist * 0.6 * press * base.twist,
    lArmX: armDir * 0.5 * press * armL,
    rArmX: armDir * 0.45 * press * armR,
    lElbowZ: 0.35 * press * base.elb,
    rElbowZ: 0.32 * press * base.elb,
    lArmUp: -Math.abs(opts.fallX) * 0.2 * press * base.up,
    rArmUp: -Math.abs(opts.fallX) * 0.2 * press * base.up,
  };
}
