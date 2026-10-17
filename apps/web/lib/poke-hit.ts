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
