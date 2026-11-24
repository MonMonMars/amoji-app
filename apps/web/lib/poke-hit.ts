// Poke region and punch direction from the hit on the live VRM.
// The body recoils away from the poke (the punch continues through the
// contact). Each major part has its own impact shape; eight directions
// (front, diagonals, sides, back) change which joints take the force.

export type TalkZone =
  | 'head'
  | 'torso'
  | 'chest'
  | 'side'
  | 'back'
  | 'armL'
  | 'armR'
  | 'belly'
  | 'butt'
  | 'hand'
  | 'legL'
  | 'legR'
  | 'foot';

export const POKE_DIRECTIONS = [
  'front', 'frontLeft', 'left', 'backLeft',
  'back', 'backRight', 'right', 'frontRight',
] as const;
export type PokeDirection = (typeof POKE_DIRECTIONS)[number];

/**
 * How long one poke reaction occupies the body, milliseconds.
 * The poke SFX table is held to this budget (pinned by tests): a clip longer
 * than the recoil keeps sounding after she has settled, which reads as the
 * wrong sound — the hit landed, the body finished, and something was still
 * talking. CompanionCanvas currently carries its own `POKE_MS` literal; it
 * should import this instead so the two cannot drift.
 */
export const POKE_REACTION_MS = 1200;

export interface Vec3 { x: number; y: number; z: number }

export interface PokeHitExtra {
  /** World-space outward surface normal at the contact. */
  normal?: Vec3;
  /** World-space ray direction, camera toward the model. */
  rayDir?: Vec3;
  leftArm?: Vec3;
  rightArm?: Vec3;
  leftHand?: Vec3;
  rightHand?: Vec3;
  leftLeg?: Vec3;
  rightLeg?: Vec3;
  leftFoot?: Vec3;
  rightFoot?: Vec3;
  belly?: Vec3;
  /** Approx butt / rear-hips probe (behind hips). */
  butt?: Vec3;
}

export interface PokeClass {
  zone: TalkZone;
  /** Side the punch came from, in the character's facing frame. */
  direction: PokeDirection;
  /** Horizontal recoil (away from the poke), world XZ, unit length. */
  impulse: { x: number; z: number };
  sideSign: number;
  /** Character facing axes used to classify the punch (XZ). */
  forward: { x: number; z: number };
  right: { x: number; z: number };
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

/** True for left, right, and the four diagonal punches. */
export function isLateralPokeDirection(d: PokeDirection): boolean {
  return d === 'left' || d === 'right' || d.endsWith('Left') || d.endsWith('Right');
}

/** True for back and the two back-diagonals. */
export function isBackPokeDirection(d: PokeDirection): boolean {
  return d === 'back' || d === 'backLeft' || d === 'backRight';
}

/** Map atan2(side, -forward) in the character frame to one of eight punches. */
export function directionFromOctant(ang: number): PokeDirection {
  const twoPi = Math.PI * 2;
  let a = ang;
  while (a <= -Math.PI) a += twoPi;
  while (a > Math.PI) a -= twoPi;
  const oct = Math.round(a / (Math.PI / 4));
  switch (oct) {
    case 0: return 'front';
    case 1: return 'frontLeft';
    case 2: return 'left';
    case 3: return 'backLeft';
    case 4:
    case -4: return 'back';
    case -3: return 'backRight';
    case -2: return 'right';
    case -1: return 'frontRight';
    default: return 'front';
  }
}

/** Where the punch came from, given the recoil and the character axes. */
export function directionFromAxes(
  impulse: { x: number; z: number },
  forward: { x: number; z: number },
  right: { x: number; z: number },
): PokeDirection {
  const f = impulse.x * forward.x + impulse.z * forward.z;
  const s = impulse.x * right.x + impulse.z * right.z;
  return directionFromOctant(Math.atan2(s, -f));
}

function recoilXZ(hit: Vec3, hips: Vec3, extra?: PokeHitExtra): { x: number; z: number } {
  const away = normXZ({ x: hips.x - hit.x, z: hips.z - hit.z });
  // Prefer the poke ray: the punch continues through the contact. Mesh
  // normals are next (outward → recoil is −normal). Hips−hit is last.
  // Verified on calibrated VRMs (forward +Z toward camera): a front chest
  // hit yields impulse −Z so spine pitch leans away from the poke.
  if (extra?.rayDir && Math.hypot(extra.rayDir.x, extra.rayDir.z) >= 0.25) {
    return normXZ({ x: extra.rayDir.x, z: extra.rayDir.z });
  }
  if (extra?.normal && Math.hypot(extra.normal.x, extra.normal.z) >= 0.25) {
    return normXZ({ x: -extra.normal.x, z: -extra.normal.z });
  }
  return away;
}

interface PartHit { zone: TalkZone; d: number }

function nearestPart(hit: Vec3, hips: Vec3, extra?: PokeHitExtra): PartHit | null {
  if (!extra) return null;
  const cands: { zone: TalkZone; p: Vec3; r: number }[] = [];
  if (extra.leftHand) cands.push({ zone: 'hand', p: extra.leftHand, r: 0.16 });
  if (extra.rightHand) cands.push({ zone: 'hand', p: extra.rightHand, r: 0.16 });
  if (extra.leftArm) cands.push({ zone: 'armL', p: extra.leftArm, r: 0.28 });
  if (extra.rightArm) cands.push({ zone: 'armR', p: extra.rightArm, r: 0.28 });
  if (extra.leftFoot && hit.y < hips.y - 0.35) cands.push({ zone: 'foot', p: extra.leftFoot, r: 0.2 });
  if (extra.rightFoot && hit.y < hips.y - 0.35) cands.push({ zone: 'foot', p: extra.rightFoot, r: 0.2 });
  if (extra.leftLeg && hit.y < hips.y - 0.08) cands.push({ zone: 'legL', p: extra.leftLeg, r: 0.3 });
  if (extra.rightLeg && hit.y < hips.y - 0.08) cands.push({ zone: 'legR', p: extra.rightLeg, r: 0.3 });
  if (extra.belly) cands.push({ zone: 'belly', p: extra.belly, r: 0.18 });
  if (extra.butt) cands.push({ zone: 'butt', p: extra.butt, r: 0.22 });
  let best: PartHit | null = null;
  for (const c of cands) {
    const d = dist(hit, c.p);
    if (d > c.r) continue;
    if (!best || d < best.d) best = { zone: c.zone, d };
  }
  return best;
}

/**
 * Torso proportions measured off the shipped VRM (public/models/seed-san.vrm,
 * bind pose, vertex bands at the hips / waist / chest):
 *
 *   half-width  a ≈ 0.17 m   (lateral 98th percentile: waist 0.168, hips 0.153)
 *   half-depth  b ≈ 0.13 m   (anterior surface z +0.09…+0.10 minus the hips
 *                             bone at z −0.034)
 *
 * A point on the surface ellipse is x = a·sinθ, f = b·cosθ. The old side test
 * was |s| > 0.9|f| → tanθ > 0.9·b/a ≈ 0.69 → θ ≈ 34.5° → x ≈ 0.57a: only the
 * outer 43% of her half-width counted as "side", so a flank a human calls the
 * side came back as front/back. 0.55 gives tanθ ≈ 0.55·b/a ≈ 0.42 → θ ≈ 23°
 * → x ≈ 0.40a: the outer 60% of the half-width is lateral. ±4 cm of dead
 * centre still reads front/back (the old 3 cm guard was narrower than a
 * fingertip, so a tiny float offset could flip centre taps sideways).
 */
const SIDE_AXIAL_RATIO = 0.55;
const SIDE_LATERAL_MIN_M = 0.04;

/**
 * Probe disambiguation (owner: "the side poke also blended to the opposite
 * side … the poke area of side is too small", reported 2026-11-22 and again
 * 2026-11-24 after r291 widened the zone).
 *
 * Widening the zone was not the problem: a tap at the visible flank silhouette
 * already resolved `side` under the old 0.9 ratio. The `butt` probe sits at
 * hips − forward·0.08 with r = 0.22 m, so the same flank tap is ~0.17 m from
 * it — inside the sphere — and the override below re-labelled the whole hit
 * `butt`, i.e. rear hips with a 0.14 roll gain. The flank stopped leaning.
 *
 * Arms rest beside the hips (lower-arm bone ≈ ±0.20 m), so the r = 0.28 arm
 * probe covered the flank too and stole it as `armL`/`armR`. Both probes may
 * only win when the contact is really theirs:
 *
 *   - the torso surface is the ellipse from the note above; a contact inside
 *     it (q ≤ 1.12, 12% slack for cloth/float) is on the body, not a limb —
 *     an arm hangs outside the 0.17 m half-width, and a hand crossed in front
 *     of the belly is deeper than the 0.13 m half-depth, so both are outside.
 */
const TORSO_HALF_WIDTH_M = 0.17;
const TORSO_HALF_DEPTH_M = 0.13;
const TORSO_SURFACE_Q = 1.12;

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
  const side = Math.abs(s) > Math.abs(f) * SIDE_AXIAL_RATIO && Math.abs(s) > SIDE_LATERAL_MIN_M;
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
    // Ellipse-normalised torso radius: ≤ 1 is on/inside the torso surface.
    // Off the torso band (thighs, calves) the ellipse says nothing, so the
    // limb probe always owns the contact there.
    const torsoQ = (s / TORSO_HALF_WIDTH_M) ** 2 + (f / TORSO_HALF_DEPTH_M) ** 2;
    const inTorsoBand = hit.y > hips.y - 0.06;
    const offTorso = !inTorsoBand || torsoQ > TORSO_SURFACE_Q;
    if (part?.zone === 'belly') {
      if ((zone === 'torso' || zone === 'chest') && dist(hit, extra!.belly!) + 0.02 < dist(hit, chest)) zone = 'belly';
    } else if (part?.zone === 'butt') {
      // Rear-hips probe: REAR contact only. It used to also claim `side`
      // (owner's side tap → hip-tier rear-hip reaction) and it sits close
      // enough to the front hip band to claim a front `torso` tap as well.
      // `f` is the contact's forward offset; > 0 is in front of the hips bone.
      if (f < -0.02 && (zone === 'back' || zone === 'torso')) zone = 'butt';
    } else if (part) {
      // Arm / hand / leg / foot. A confident lateral flank read survives a
      // merely-near limb probe: arms rest beside the hips, so at the full
      // r = 0.28 the arm sphere covers the flank the owner calls "side".
      // A contact inside the torso ellipse is body, however close the bone.
      if (zone !== 'side' || offTorso) zone = part.zone;
    }
  }

  const impulse = recoilXZ(hit, hips, extra);
  // A camera ray that grazes her flank is still depth-dominated (a 2.6 m
  // camera sees the contact from the front), so its octant can read `front`
  // on a point a human calls "the side". The contact offset already knows the
  // lateral octant, so promote an axial read to the matching diagonal instead
  // of letting the lateral tap resolve as a front/back poke.
  //
  // Octant convention (directionFromOctant): a poke FROM her front-left is
  // `frontLeft`, and the contact then sits on her LEFT, i.e. s < 0 (s is the
  // offset along the character's right axis). r291 had this reversed, so a
  // left-flank tap played the front-RIGHT voice slot.
  let direction = directionFromAxes(impulse, forward, rightN);
  if (side && !isLateralPokeDirection(direction)) {
    direction = f < 0
      ? (s >= 0 ? 'backRight' : 'backLeft')
      : (s >= 0 ? 'frontRight' : 'frontLeft');
  }
  return {
    zone,
    direction,
    impulse,
    sideSign: s >= 0 ? 1 : -1,
    forward,
    right: rightN,
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
  return directionFromOctant(Math.atan2(fallX, -fallZ));
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
  const side = isLateralPokeDirection(direction);
  const fromBack = isBackPokeDirection(direction);
  switch (zone) {
    case 'head':
      return { spine: 0, chest: 0, head: 0.95, hip: 0, hipRoll: 0, roll: 0, yaw: 0, arm: 0, elbow: 0, armUp: 0, shift: 0, kind: 'head', elbowBias: 0, armUpBias: 0 };
    case 'chest':
      if (side) {
        return { spine: 0.44, chest: 0.55, head: 0.22, hip: 0.32, hipRoll: 0.4, roll: 0.62, yaw: 0.07, arm: 0.78, elbow: 0.42, armUp: 0.22, shift: 0.04, kind: 'chest', elbowBias: 0.1, armUpBias: -0.05 };
      }
      if (fromBack) {
        return { spine: 0.64, chest: 0.34, head: 0.18, hip: 0.36, hipRoll: 0.08, roll: 0.1, yaw: 0.03, arm: 0.34, elbow: 0.22, armUp: 0.2, shift: 0.036, kind: 'chest', elbowBias: 0.04, armUpBias: 0.08 };
      }
      return { spine: 0.6, chest: 0.68, head: 0.2, hip: 0.38, hipRoll: 0.08, roll: 0.12, yaw: 0.03, arm: 0.42, elbow: 0.3, armUp: 0.1, shift: 0.04, kind: 'chest', elbowBias: 0.12, armUpBias: 0 };
    case 'belly':
      // Local abdomen only (Mon t764): spine reacts, hips/feet stay, upper chest quiet.
      return { spine: 0.72, chest: 0.08, head: 0.06, hip: 0.04, hipRoll: side ? 0.08 : 0.02, roll: side ? 0.1 : 0.04, yaw: 0.02, arm: 0.12, elbow: 0.08, armUp: 0.03, shift: 0, kind: 'body', elbowBias: 0.02, armUpBias: 0.02 };
    case 'butt':
      // Local rear-hips (Mon t762): butt displaces opposite poke; feet planted; upper body counters.
      return { spine: 0.55, chest: 0.06, head: 0.04, hip: 0.72, hipRoll: side ? 0.36 : 0.08, roll: side ? 0.14 : 0.05, yaw: 0.03, arm: 0.1, elbow: 0.06, armUp: 0.02, shift: 0, kind: 'heavy', elbowBias: 0.02, armUpBias: 0 };
    case 'hand':
      return { spine: 0.12, chest: 0.1, head: 0.08, hip: 0.06, hipRoll: 0.08, roll: 0.16, yaw: 0.03, arm: 0.9, elbow: 0.55, armUp: 0.22, shift: 0, kind: 'arm', elbowBias: 0.14, armUpBias: -0.06 };
    case 'foot':
      return { spine: 0.1, chest: 0.04, head: 0.04, hip: 0.28, hipRoll: 0.22, roll: 0.1, yaw: 0.02, arm: 0.06, elbow: 0.04, armUp: 0.02, shift: 0, kind: 'heavy', elbowBias: 0.02, armUpBias: 0 };
    case 'armL':
      return { spine: 0.26, chest: 0.18, head: 0.12, hip: 0.18, hipRoll: 0.16, roll: 0.28, yaw: 0.04, arm: 0.98, elbow: 0.64, armUp: side ? 0.3 : 0.12, shift: 0.026, kind: 'arm', elbowBias: 0.18, armUpBias: -0.08 };
    case 'armR':
      return { spine: 0.2, chest: 0.24, head: 0.1, hip: 0.15, hipRoll: 0.2, roll: 0.32, yaw: 0.035, arm: 0.86, elbow: 0.38, armUp: side ? 0.4 : 0.22, shift: 0.022, kind: 'arm', elbowBias: -0.06, armUpBias: 0.16 };
    case 'legL':
      return { spine: 0.3, chest: 0.08, head: 0.08, hip: 0.52, hipRoll: 0.34, roll: 0.14, yaw: 0.03, arm: 0.16, elbow: 0.1, armUp: 0.04, shift: 0.05, kind: 'heavy', elbowBias: 0.07, armUpBias: 0 };
    case 'legR':
      return { spine: 0.22, chest: 0.12, head: 0.06, hip: 0.46, hipRoll: 0.38, roll: 0.2, yaw: 0.025, arm: 0.12, elbow: 0.08, armUp: 0.09, shift: 0.046, kind: 'heavy', elbowBias: -0.05, armUpBias: 0.06 };
    case 'side':
      // Stronger lateral lean + near-arm flinch so same-side tip reads on phone.
      return { spine: 0.42, chest: 0.38, head: 0.22, hip: 0.4, hipRoll: 0.48, roll: 0.68, yaw: 0.08, arm: 0.98, elbow: 0.55, armUp: 0.32, shift: 0.048, kind: 'body', elbowBias: 0.1, armUpBias: 0.08 };
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
  spine: 0.95,
  chest: 0.78,
  head: 1.05,
  hip: 0.62,
  hipRoll: 0.58,
  yaw: 0.18,
  /** Lateral tip must clear phone noise — was 0.46 and read as a twitch. */
  roll: 0.78,
  arm: 1.28,
  elbow: 0.72,
  armUp: 0.58,
  shift: 0.07,
} as const;

/** Extra lateral lean amp for side taps (sign from fallX: same side as the finger, R13). */
const LATERAL_LEAN_AMP = 1.38;

/**
 * Axial sign (owner 2026-11-23, R13 extended to the front/back axis).
 *
 * `fallZ` still says WHERE the punch came from: front hit → −1, back hit → +1.
 * Direction labels, zone gains and poke voices read that unchanged. What the
 * body does follows the owner rule instead of a physics recoil: she tips
 * TOWARD the poke on the axial axis too, so a front poke flexes her forward
 * (toward the finger) and a back poke arches her back. Positive spineX is a
 * forward lean (see moves.ts "lean into the run"), which is why the ─1 lives
 * here and not in the canvas.
 *
 * The owner reported this twice: "all the poke movement, just move to the
 * opposite side, just simply flip it backward to forward". Do NOT restore the
 * away-from-the-punch sign on Z — that is the inversion he keeps seeing, and
 * it is the axial twin of the lateral "recoil away" mistake in #443 / #554.
 */
const AXIAL_TOWARD_POKE = -1;

function clamp(v: number, m: number): number {
  return v < -m ? -m : v > m ? m : v;
}

/**
 * Punch reaction for one sample.
 * t is 0 at the hit and 1 at the end of the window.
 * fallX/fallZ: the poke direction vector, world XZ (front hit → fallZ −1).
 * The body tips TOWARD the poke on both axes (Owner R13, extended to Z on
 * 2026-11-23): lateral hits lean to the finger's screen side, and axial hits
 * flex toward the finger instead of recoiling away from it. `fallZ` still
 * classifies the direction (front/back gains, zone reads), so the sign flip
 * lives in AXIAL_TOWARD_POKE and never in the caller.
 * A head poke tips the head (plus soft torso follow in poke-zones).
 * A belly poke recesses the abdomen; the head counters for balance.
 * Nothing here translates the scene root.
 */
/** Incomplete cover raise for a soft breast poke (Mon t765): rise, hold mid-way, ease. */
export function breastCoverEnvelope(t: number): number {
  if (!(t > 0)) return 0;
  // Peak 0.55 = too late / incomplete cover (never reaches a full cross).
  if (t < 0.2) return (t / 0.2) * 0.55;
  if (t < 0.42) return 0.55;
  if (t < 0.92) return 0.55 * (1 - (t - 0.42) / 0.5);
  return 0;
}

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
  // Axial lean sign ONLY: `direction` above keeps reading the raw poke vector
  // so front/back labels, gains and voices do not swap with the flip.
  const az = opts.fallZ * AXIAL_TOWARD_POKE;
  if (opts.zone === 'head') {
    const amp = g.head * punch;
    return {
      ...STILL,
      headX: clamp(az * amp, CAP.head),
      headZ: clamp(-opts.fallX * amp * 0.8 + opts.twist * 0.04 * punch, CAP.head),
    };
  }
  const lateral = isLateralPokeDirection(direction) || opts.zone === 'side' || opts.zone === 'armL' || opts.zone === 'armR' || opts.zone === 'hand';
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
  // A poke that came from the SIDE pushes her across, not front-to-back, so
  // both arms have to swing AWAY from it together. `fallZ` is the right sign
  // for a front/back punch, but on a side tap it carries no poke information —
  // CompanionCanvas builds it from the camera's right vector, so it is really
  // the camera azimuth wearing a costume. Its sign therefore flipped with
  // orbit angle and the same tap swung her arms backwards at one angle and
  // forwards at another. Side taps take their swing from the camera-aware
  // sideSign the classifier already computed; front/back taps follow the
  // axial lean (az) so the arms swing with the torso.
  const fromSide = isLateralPokeDirection(direction);
  const armDir = fromSide
    ? -opts.sideSign
    : (az !== 0 ? az : (opts.fallX !== 0 ? -Math.sign(opts.fallX) : -0.35));
  // Butt: hips carry the punch; spine counters so the upper body stays roughly put.
  // Belly: abdomen/spine only — hips stay, no hip slide (feet planted).
  const localButt = opts.zone === 'butt';
  const localBelly = opts.zone === 'belly';
  // Mon t765: soft breast poke — tiny body recoil; bounce is secondary; cover arms mid-raise.
  const softBreast = opts.softChest && opts.zone === 'chest';
  if (softBreast) {
    const cover = breastCoverEnvelope(t);
    const tiny = punch * 0.22; // very little hit-back
    return {
      ...STILL,
      spinePitch: clamp(az * 0.14 * tiny, 0.1),
      chestPitch: clamp(az * 0.1 * tiny, 0.08),
      spineYaw: clamp(opts.fallX * 0.02 * tiny, CAP.yaw),
      chestRoll: clamp(-opts.fallX * 0.08 * tiny, 0.08),
      headX: clamp(az * 0.06 * tiny, 0.08),
      headZ: clamp(-opts.fallX * 0.04 * tiny + opts.twist * 0.02 * tiny, 0.08),
      hipPitch: clamp(az * 0.05 * tiny, 0.05),
      hipRoll: clamp(-opts.fallX * 0.04 * tiny, 0.05),
      hipShiftX: 0,
      hipShiftZ: 0,
      // Arms try to cover but stop mid-raise (incomplete), hold, ease via cover envelope.
      // lArmRaise = -lArmUp in CompanionCanvas, so negative Up = raise.
      lArmX: clamp(-0.32 * cover, CAP.arm),
      rArmX: clamp(-0.32 * cover, CAP.arm),
      lElbowZ: clamp(0.45 * cover, CAP.elbow),
      rElbowZ: clamp(0.45 * cover, CAP.elbow),
      lArmUp: clamp(-0.44 * cover, CAP.armUp),
      rArmUp: clamp(-0.44 * cover, CAP.armUp),
    };
  }
  let spinePitch = clamp(az * g.spine * punch, CAP.spine);
  let hipPitch = clamp(az * g.hip * punch, CAP.hip);
  if (localButt) {
    hipPitch = clamp(az * g.hip * punch, CAP.hip);
    // Counter upper body so only the poked rear-hips region reads.
    spinePitch = clamp(-hipPitch * 0.92 - az * 0.08 * punch, CAP.spine);
  } else if (localBelly) {
    // Abdomen recedes with the poke; hips stay almost planted.
    hipPitch = clamp(az * g.hip * punch, 0.06);
    spinePitch = clamp(az * g.spine * punch, CAP.spine);
  }
  const shiftGain = (localButt || localBelly || opts.zone === 'foot' || opts.zone === 'hand') ? 0 : g.shift;
  const leanAmp = fromSide ? LATERAL_LEAN_AMP : 1;
  const fx = opts.fallX * leanAmp;
  const armPunch = fromSide ? punch * 1.18 : punch;
  return {
    ...STILL,
    spinePitch,
    chestPitch: clamp(az * g.chest * punch, CAP.chest),
    spineYaw: clamp(fx * g.yaw * punch, CAP.yaw),
    // Tip follows the same-side fall: fallX < 0 (screen-left push) →
    // positive chestRoll tips screen-left. Never negate this sign to fake a
    // "recoil away" - that is the R13 regression (#443 / #554).
    chestRoll: clamp(-fx * g.roll * punch, CAP.roll),
    // Belly: head counters opposite the abdomen so the body stays balanced.
    headX: localBelly
      ? clamp(-az * 0.55 * punch, CAP.head)
      : clamp(az * g.head * punch, CAP.head),
    headZ: clamp(-fx * g.head * 0.78 * punch + opts.twist * 0.04 * punch, CAP.head),
    hipPitch,
    hipRoll: clamp(-fx * g.hipRoll * punch, CAP.hipRoll),
    hipShiftX: clamp(fx * shiftGain * punch, CAP.shift),
    hipShiftZ: clamp(az * shiftGain * punch, CAP.shift),
    lArmX: clamp(armDir * armL * armPunch, CAP.arm),
    rArmX: clamp(armDir * armR * 0.94 * armPunch, CAP.arm),
    lElbowZ: clamp((g.elbow + g.elbowBias) * armPunch, CAP.elbow),
    rElbowZ: clamp((g.elbow - g.elbowBias * 0.55) * armPunch, CAP.elbow),
    lArmUp: clamp(-Math.abs(fx) * (g.armUp + g.armUpBias) * armPunch, CAP.armUp),
    rArmUp: clamp(-Math.abs(fx) * (g.armUp - g.armUpBias * 0.5) * armPunch, CAP.armUp),
  };
}

/**
 * Which screen side the hit sits on, relative to the camera.
 * cameraRightXZ = camera world +X column flattened to XZ (orbit-safe).
 * +1 = toward camera-right (screen right), -1 = screen left.
 * Use this for lateral poke lean so orbit does not mirror L/R.
 */
export function screenSideSign(
  hit: Vec3,
  hips: Vec3,
  cameraRightXZ: { x: number; z: number },
): number {
  const len = Math.hypot(cameraRightXZ.x, cameraRightXZ.z);
  if (len < 1e-6) return 1;
  const nx = cameraRightXZ.x / len;
  const nz = cameraRightXZ.z / len;
  const s = (hit.x - hips.x) * nx + (hit.z - hips.z) * nz;
  return s >= 0 ? 1 : -1;
}

/**
 * Finger side vs hips in a shared screen/NDC axis (Pixel lean rule).
 * +1 = finger right of hips, -1 = left.
 * Pass both in the SAME space: clientX vs hips client-X, or pointer NDC.x
 * vs projected hips NDC.x (preferred after orientation / CSS size changes).
 * Prefer this over mesh-hit screenSideSign when the ray grazes a round limb
 * and the contact point drifts across the midline.
 */
export function screenPointerSideSign(pointerX: number, hipsScreenX: number): number {
  return pointerX >= hipsScreenX ? 1 : -1;
}

/**
 * Near-arm flinch from where the finger pushed on screen (+1 right / −1 left).
 * Face-on, screen lateral opposes the character's left/right, so the poked
 * near arm is the opposite character side — not the mesh-hit classifier sign.
 */
export function pokeArmSideFromScreenPush(pushSide: number): number {
  return pushSide >= 0 ? -1 : 1;
}

/**
 * Map a viewport client point into the element's layout-local CSS pixels
 * (0..clientWidth × 0..clientHeight). Uses getBoundingClientRect for the
 * visual box, then scales into clientWidth/Height so the result shares the
 * same aspect as PerspectiveCamera (aspect = clientW/clientH) after
 * portrait↔landscape rotation — not the raw AABB alone.
 */
export function clientPointInElementLocal(
  clientX: number,
  clientY: number,
  layoutW: number,
  layoutH: number,
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  const w = layoutW > 0 ? layoutW : rect.width || 1;
  const h = layoutH > 0 ? layoutH : rect.height || 1;
  const rw = rect.width > 0 ? rect.width : w;
  const rh = rect.height > 0 ? rect.height : h;
  return {
    x: ((clientX - rect.left) / rw) * w,
    y: ((clientY - rect.top) / rh) * h,
  };
}

/**
 * Projected NDC → same layout-local CSS pixels as {@link clientPointInElementLocal}.
 * ndcY is Three.js clip Y (+up); local Y grows downward like CSS.
 */
export function ndcPointInElementLocal(
  ndcX: number,
  ndcY: number,
  layoutW: number,
  layoutH: number,
): { x: number; y: number } {
  const w = layoutW > 0 ? layoutW : 1;
  const h = layoutH > 0 ? layoutH : 1;
  return {
    x: ((ndcX + 1) / 2) * w,
    y: ((-ndcY + 1) / 2) * h,
  };
}

/**
 * Lateral fall toward the poked side (Owner R13, #409 + #434):
 * finger on screen-left → body tips screen-left; finger on screen-right →
 * body tips screen-right. This is a lean, not a physics recoil: the Owner
 * asked for the same side as the finger, and #443/#554 broke it by flipping
 * the sign to "fall away".
 *
 * `pushSide` is screen-relative (+1 finger right / −1 finger left), and
 * `cameraRightXZ` is the camera world +X column flattened to XZ, so orbiting
 * or a mirrored front camera cannot swap the side.
 */
export function lateralFallTowardScreenSide(
  cameraRightXZ: { x: number; z: number },
  pushSide: number,
): { x: number; z: number } {
  const len = Math.hypot(cameraRightXZ.x, cameraRightXZ.z);
  const side = pushSide >= 0 ? 1 : -1;
  if (len < 1e-6) return { x: side, z: 0 };
  return { x: (cameraRightXZ.x / len) * side, z: (cameraRightXZ.z / len) * side };
}

/**
 * Anchor the LATERAL half of a poke fall to the finger's screen side.
 *
 * The fall vector mixes two axes with opposite provenance: its axial part is
 * the camera ray (a punch into the body, which AXIAL_TOWARD_POKE flips), while
 * its lateral part is the same-side lean (toward the finger). A grazing mesh
 * ray that is nearly depth-parallel, `-normal` / hips−hit fallbacks, or a rig
 * whose shoulder bones are mirrored can hand the lateral component the
 * opposite sign — and then a side poke blends away from the finger, which the
 * owner reported (2026-11-22, second occurrence after #443/#554).
 *
 * Only the component along the camera's right axis is reflected. The
 * camera-forward component — everything that classifies front/back and drives
 * the r290 axial lean — is bit-for-bit preserved, so a front poke produces the
 * same spinePitch / headX it did before. When the sign is already correct
 * (the normal case) this returns the input unchanged.
 */
export function flipPokeFallToFingerSide(
  fall: { x: number; z: number },
  cameraRightXZ: { x: number; z: number },
  leanSide: number,
): { x: number; z: number } {
  const len = Math.hypot(cameraRightXZ.x, cameraRightXZ.z);
  if (len < 1e-6) return { x: fall.x, z: fall.z };
  const rx = cameraRightXZ.x / len;
  const rz = cameraRightXZ.z / len;
  const lateral = fall.x * rx + fall.z * rz;
  const want = leanSide >= 0 ? 1 : -1;
  if (Math.abs(lateral) < 1e-6 || lateral * want > 0) return { x: fall.x, z: fall.z };
  // Reflect across the plane perpendicular to camera-right: axial preserved.
  return { x: fall.x - 2 * lateral * rx, z: fall.z - 2 * lateral * rz };
}

/**
 * Pick armL/armR from screen proximity when both arms are valid candidates.
 * Prefers the arm whose projected screen point is closer to the tap.
 * Falls back to null when neither arm has a screen position.
 */
export function armZoneFromScreen(
  tapX: number,
  tapY: number,
  left: { x: number; y: number } | null | undefined,
  right: { x: number; y: number } | null | undefined,
): 'armL' | 'armR' | null {
  const dL = left ? Math.hypot(tapX - left.x, tapY - left.y) : Infinity;
  const dR = right ? Math.hypot(tapX - right.x, tapY - right.y) : Infinity;
  if (!(dL < Infinity) && !(dR < Infinity)) return null;
  return dL <= dR ? 'armL' : 'armR';
}
