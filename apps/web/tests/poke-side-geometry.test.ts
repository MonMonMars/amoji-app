/**
 * Owner 2026-11-24 (third report): "The side poke problem still not fixed yet."
 *
 *   "the side poke also blended to the opposite side ... the poke area of side
 *    is too small and always result in poke front and back even when I poke on
 *    the side"
 *
 * The r291 fix widened the side ratio from 0.9 to 0.55. That was the wrong
 * lever: a tap on the visible flank silhouette (x ≈ 0.16 m of a 0.17 m
 * half-width) already classified `side` at the old 0.9 ratio. The flank was
 * then re-labelled by a PROBE, not by the zone test:
 *
 *   butt probe at hips − forward·0.08, r = 0.22  →  ~0.17 m from the flank
 *   lower-arm probe, r = 0.28                   →  arms rest beside the hips
 *
 * `classifyPoke` let a `butt` probe claim `side` and let any limb probe
 * replace a side read, so the flank took the hip-tier (roll 0.14 → band 0.26)
 * or arm-tier (roll 0.28) recipe instead of the side recipe (roll 0.68 →
 * band 1.18). This file samples the torso ellipse all the way round at hip
 * and chest height with a complete rest-pose probe set and pins the zone,
 * direction and lean sign a human would call.
 *
 * Frame = the shipped seed-san bind pose used by poke-side-lean.test.ts:
 * character right = −X, forward = +Z, camera on +Z. So world +X (θ = 90°) is
 * her LEFT flank and it sits on the SCREEN RIGHT.
 */
import { describe, expect, it } from 'vitest';
import {
  classifyPoke,
  flipPokeFallToFingerSide,
  isBackPokeDirection,
  isLateralPokeDirection,
  lateralFallTowardScreenSide,
  pokeArmSideFromScreenPush,
  screenPointerSideSign,
  type PokeDirection,
  type PokeHitExtra,
} from '../lib/poke-hit';
import { pokeSectionBodyReaction, resolvePokeSection } from '../lib/poke-zones';

const HIPS = { x: 0, y: 0.796, z: -0.034 };
const HEAD = { x: 0, y: 1.332, z: -0.012 };
const CHEST = { x: 0, y: 1.056, z: -0.009 };
const LEFT_SHOULDER = { x: 0.043, y: 1.266, z: 0.019 };
const RIGHT_SHOULDER = { x: -0.043, y: 1.266, z: 0.019 };

/** Torso half-width / half-depth measured off seed-san.vrm (see poke-hit.ts). */
const HALF_WIDTH = 0.17;
const HALF_DEPTH = 0.13;
const HIP_BAND_Y = 0.86;
const CHEST_BAND_Y = 1.05;
const CAMERA = { x: 0, y: 1.05, z: CHEST.z + 2.4 };
/** A real poke can only reach her back from behind her. */
const CAMERA_BACK = { x: 0, y: 1.05, z: CHEST.z - 2.4 };
/** Camera right column, flattened (face-on home camera). */
const CAMERA_RIGHT = { x: 1, z: 0 };

/**
 * Contact on the hip-height torso ellipse. θ = 0 is her front; θ grows toward
 * her LEFT (world +X), so θ = 90° is the left flank, 180° her back.
 */
function surface(thetaDeg: number, y = HIP_BAND_Y) {
  const t = (thetaDeg * Math.PI) / 180;
  return { x: HALF_WIDTH * Math.sin(t), y, z: HIPS.z + HALF_DEPTH * Math.cos(t) };
}

function cameraRay(hit: { x: number; y: number; z: number }, camera = CAMERA) {
  const dx = hit.x - camera.x;
  const dy = hit.y - camera.y;
  const dz = hit.z - camera.z;
  const len = Math.hypot(dx, dy, dz);
  return { x: dx / len, y: dy / len, z: dz / len };
}

/**
 * Every probe CompanionCanvas supplies, in a rest pose. Arms hang beside the
 * hips (lower-arm bone ±0.20 m) — the geometry that made the r = 0.28 arm
 * sphere cover the very flank the owner taps.
 */
function restProbes(hit: { x: number; y: number; z: number }, camera = CAMERA): PokeHitExtra {
  return {
    rayDir: cameraRay(hit, camera),
    leftArm: { x: 0.2, y: 0.85, z: 0.01 },
    rightArm: { x: -0.2, y: 0.85, z: 0.01 },
    leftHand: { x: 0.205, y: 0.75, z: 0.02 },
    rightHand: { x: -0.205, y: 0.75, z: 0.02 },
    leftLeg: { x: 0.09, y: 0.45, z: 0 },
    rightLeg: { x: -0.09, y: 0.45, z: 0 },
    leftFoot: { x: 0.09, y: 0.08, z: 0.02 },
    rightFoot: { x: -0.09, y: 0.08, z: 0.02 },
    belly: {
      x: HIPS.x * 0.72 + CHEST.x * 0.28,
      y: HIPS.y * 0.72 + CHEST.y * 0.28,
      z: HIPS.z * 0.72 + CHEST.z * 0.28,
    },
    butt: { x: HIPS.x, y: HIPS.y + 0.02, z: HIPS.z - 0.08 },
  };
}

function classify(
  hit: { x: number; y: number; z: number },
  withProbes = true,
  camera = CAMERA,
) {
  return classifyPoke(
    hit,
    HIPS,
    HEAD,
    CHEST,
    LEFT_SHOULDER,
    RIGHT_SHOULDER,
    withProbes ? restProbes(hit, camera) : { rayDir: cameraRay(hit, camera) },
  );
}

/** Screen side of the finger for this contact (camera at +Z, right = +X). */
function leanSideOf(hit: { x: number; z: number }) {
  // Same call the canvas makes: pointer x vs hips x in one screen axis.
  const hipsScreenX = 0;
  return screenPointerSideSign(hit.x, hipsScreenX);
}

/** Mirror of the CompanionCanvas lateral blend + finger-side anchor. */
function canvasFall(
  hit: { x: number; y: number; z: number },
  cls: ReturnType<typeof classify>,
  leanSide: number,
) {
  const lean = lateralFallTowardScreenSide(CAMERA_RIGHT, leanSide);
  const lateralOnly =
    cls.zone === 'side' || cls.zone === 'armL' || cls.zone === 'armR' || cls.zone === 'hand';
  const fingerOffCenter = Math.abs(hit.x - HIPS.x) > 0.026;
  let x: number;
  let z: number;
  if (lateralOnly) {
    x = cls.impulse.x * 0.35 + lean.x * 0.85;
    z = cls.impulse.z * 0.55 + lean.z * 0.35;
  } else if (fingerOffCenter) {
    x = cls.impulse.x * 0.7 + lean.x * 0.55;
    z = cls.impulse.z * 0.85 + lean.z * 0.3;
  } else {
    x = cls.impulse.x;
    z = cls.impulse.z;
  }
  const len = Math.hypot(x, z);
  const blended = len > 1e-6 ? { x: x / len, z: z / len } : { x: lean.x, z: lean.z };
  return flipPokeFallToFingerSide(blended, CAMERA_RIGHT, leanSide);
}

/** Exactly what the canvas hands CompanionCanvas → pokeSectionBodyReaction. */
function reaction(hit: { x: number; y: number; z: number }) {
  const cls = classify(hit);
  const leanSide = leanSideOf(hit);
  const fall = canvasFall(hit, cls, leanSide);
  // Canvas: for `side`, arm emphasis comes from the finger side, not the mesh.
  const sideSign =
    cls.zone === 'side' || cls.zone === 'hand'
      ? pokeArmSideFromScreenPush(leanSide)
      : cls.sideSign;
  const section = resolvePokeSection(cls.zone, cls.direction);
  const body = pokeSectionBodyReaction({
    t: 0.12,
    section,
    hitZone: cls.zone,
    fallX: fall.x,
    fallZ: fall.z,
    sideSign,
    softChest: false,
    twist: 0,
  });
  return { cls, fall, sideSign, section, body };
}

const lateralLeft: PokeDirection[] = ['frontLeft', 'left', 'backLeft'];
const lateralRight: PokeDirection[] = ['frontRight', 'right', 'backRight'];

describe('hip-height torso ring: every angle a human can name', () => {
  // θ from her front toward her left flank and around her back. 22.8° is the
  // measured side boundary (tanθ = 0.55·b/a), so 15° is front and 30° is side.
  const RING: {
    deg: number;
    label: string;
    side: boolean;
    back: boolean;
    lateral: 'left' | 'right' | null;
    cam?: 'front' | 'back';
  }[] = [
    { deg: 0, label: 'front centre', side: false, back: false, lateral: null },
    { deg: 15, label: 'front centre edge', side: false, back: false, lateral: null },
    { deg: 30, label: 'front-left flank', side: true, back: false, lateral: 'left' },
    { deg: 60, label: 'left flank', side: true, back: false, lateral: 'left' },
    { deg: 75, label: 'left flank silhouette', side: true, back: false, lateral: 'left' },
    { deg: 90, label: 'leftmost point', side: true, back: false, lateral: 'left' },
    { deg: 105, label: 'left flank, slightly behind', side: true, back: false, lateral: 'left' },
    { deg: 135, label: 'back-left flank', side: true, back: true, lateral: 'left', cam: 'back' },
    { deg: 150, label: 'back-left edge', side: true, back: true, lateral: 'left', cam: 'back' },
    { deg: 165, label: 'back edge', side: false, back: true, lateral: null, cam: 'back' },
    { deg: 180, label: 'back centre (butt)', side: false, back: true, lateral: null, cam: 'back' },
    // Mirror across her midline.
    { deg: 195, label: 'back edge (right)', side: false, back: true, lateral: null, cam: 'back' },
    { deg: 210, label: 'back-right edge', side: true, back: true, lateral: 'right', cam: 'back' },
    { deg: 225, label: 'back-right flank', side: true, back: true, lateral: 'right', cam: 'back' },
    { deg: 255, label: 'right flank, slightly behind', side: true, back: false, lateral: 'right' },
    { deg: 270, label: 'rightmost point', side: true, back: false, lateral: 'right' },
    { deg: 285, label: 'right flank silhouette', side: true, back: false, lateral: 'right' },
    { deg: 300, label: 'right flank', side: true, back: false, lateral: 'right' },
    { deg: 330, label: 'front-right flank', side: true, back: false, lateral: 'right' },
    { deg: 345, label: 'front centre edge (right)', side: false, back: false, lateral: null },
  ];

  for (const row of RING) {
    it(`${row.deg}° — ${row.label}`, () => {
      const hit = surface(row.deg);
      const camera = row.cam === 'back' ? CAMERA_BACK : CAMERA;
      const cls = classify(hit, true, camera);

      if (row.side) {
        expect(cls.zone, `${row.deg}° zone`).toBe('side');
      } else {
        expect(cls.zone, `${row.deg}° zone`).not.toBe('side');
      }

      if (row.back && !row.side) {
        // A genuine rear tap still reaches the rear-hips recipe.
        expect(['back', 'butt'], `${row.deg}° rear zone`).toContain(cls.zone);
        expect(isBackPokeDirection(cls.direction), `${row.deg}° rear dir`).toBe(true);
      }
      if (!row.back && !row.side) {
        expect(['chest', 'torso', 'belly'], `${row.deg}° front zone`).toContain(cls.zone);
        expect(cls.direction, `${row.deg}° front dir`).toBe('front');
      }

      if (row.lateral === 'left') {
        expect(isLateralPokeDirection(cls.direction), `${row.deg}° dir lateral`).toBe(true);
        expect(lateralLeft, `${row.deg}° dir side`).toContain(cls.direction);
        expect(cls.sideSign, `${row.deg}° sideSign`).toBe(-1);
      }
      if (row.lateral === 'right') {
        expect(isLateralPokeDirection(cls.direction), `${row.deg}° dir lateral`).toBe(true);
        expect(lateralRight, `${row.deg}° dir side`).toContain(cls.direction);
        expect(cls.sideSign, `${row.deg}° sideSign`).toBe(1);
      }
    });
  }

  it('the probes never change a flank/flank-adjacent answer', () => {
    // Same ring with no limb/butt/belly probes at all: r291's geometry-only
    // test. If a probe re-labels a flank, this fails.
    for (const deg of [30, 60, 75, 90, 105, 210, 270, 300, 330]) {
      const hit = surface(deg);
      expect(classify(hit).zone, `${deg}° with probes`).toBe(classify(hit, false).zone);
      expect(classify(hit).direction, `${deg}° dir`).toBe(classify(hit, false).direction);
    }
  });

  it('chest height behaves the same as the hip band', () => {
    for (const deg of [60, 75, 90, 105, 270, 285, 300]) {
      expect(classify(surface(deg, CHEST_BAND_Y)).zone, `${deg}° chest band`).toBe('side');
    }
    expect(classify(surface(0, CHEST_BAND_Y)).zone).toBe('chest');
    expect(classify(surface(180, CHEST_BAND_Y)).zone).not.toBe('side');
  });
});

describe('measured zone width (reported, not guessed)', () => {
  it('the side band starts at ~23° / 40% of the half-width', () => {
    // Sweep the hip ring and find the first lateral angle from the front.
    let firstSide = 0;
    for (let deg = 1; deg <= 90; deg += 0.5) {
      if (classify(surface(deg), false).zone === 'side') { firstSide = deg; break; }
    }
    // tanθ = 0.55·(0.13/0.17) = 0.4206 → θ = 22.8°, x = a·sin θ = 0.066 m.
    expect(firstSide).toBeGreaterThan(21);
    expect(firstSide).toBeLessThan(25);
    const xAtBoundary = HALF_WIDTH * Math.sin((firstSide * Math.PI) / 180);
    expect(xAtBoundary).toBeGreaterThan(0.06);
    expect(xAtBoundary).toBeLessThan(0.075);
  });

  it('the flank the owner taps was already lateral before r291 widened it', () => {
    // Silhouette contact θ = 75°: |s| = 0.164 m, |f| = 0.034 m.
    // Old test |s| > 0.9|f| → 0.164 > 0.030 — already true. The width was
    // never the reason a flank tap read front/back; the butt probe was.
    const hit = surface(75);
    const s = Math.abs(hit.x - HIPS.x);
    const f = Math.abs(hit.z - HIPS.z);
    expect(s).toBeGreaterThan(0.9 * f);
    expect(s).toBeGreaterThan(0.55 * f);
    // …and the old classifier would have said side there too.
    expect(s).toBeGreaterThan(0.04);
  });
});

describe('limb pokes still work when the finger is really on the limb', () => {
  it('an arm/hand/leg/foot contact outside the torso surface wins', () => {
    // Outside the 0.17 m half-width: unambiguously the arm.
    expect(classify({ x: 0.235, y: 0.85, z: 0.0 }).zone).toBe('armL');
    expect(classify({ x: -0.235, y: 0.85, z: 0.0 }).zone).toBe('armR');
    // Below the hip band the leg probes are gated by height.
    expect(classify({ x: 0.09, y: 0.45, z: 0.0 }).zone).toBe('legL');
    expect(classify({ x: -0.09, y: 0.45, z: 0.0 }).zone).toBe('legR');
    expect(classify({ x: 0.09, y: 0.07, z: 0.02 }).zone).toBe('foot');
    // A hand resting against the flank still wins when the contact is within
    // 40% of the hand radius.
    expect(classify({ x: 0.2, y: 0.75, z: 0.02 }).zone).toBe('hand');
  });

  it('a flank contact inside the torso surface stays side even with arms down', () => {
    for (const deg of [90, 105, 270, 285]) {
      const hit = surface(deg);
      // sanity: the contact really is ~5 cm from the rest lower-arm probe
      expect(Math.hypot(hit.x - Math.sign(hit.x) * 0.2, hit.y - 0.85, hit.z - 0.01))
        .toBeLessThan(0.28);
      expect(classify(hit).zone).toBe('side');
    }
  });
});

describe('the lean tips toward the finger, hips and chest together', () => {
  for (const deg of [45, 75, 90, 105, 135, 225, 270, 300]) {
    it(`${deg}° — same side, same sign, readable`, () => {
      const hit = surface(deg);
      const { cls, fall, body } = reaction(hit);
      expect(cls.zone).toBe('side');

      // Screen side of the finger: world +X is screen-right (camera on +Z).
      const fingerSide = hit.x >= 0 ? 1 : -1;
      expect(leanSideOf(hit)).toBe(fingerSide);

      // The fall keeps the finger's lateral sign…
      expect(Math.sign(fall.x)).toBe(fingerSide);
      // …and the section recipe is the side/shoulder-chest one, not hip/arm.
      expect(resolvePokeSection(cls.zone, cls.direction).tier).toBe('shoulder_chest');

      // Screen-right tap → negative roll tips screen-right; mirror positive.
      // These gains are the readable side lean (chest roll 0.68 × band 1.18);
      // the buggy butt/arm tiers gave 0.036 / 0.345 rad here.
      expect(Math.sign(body.chestRoll)).toBe(-fingerSide);
      expect(Math.abs(body.chestRoll)).toBeGreaterThan(0.5);
      // Hips agree with the chest instead of counter-rotating.
      expect(Math.sign(body.hipRoll)).toBe(-fingerSide);
      expect(body.hipRoll * body.chestRoll).toBeGreaterThan(0);
      // Head follows the same side.
      expect(Math.sign(body.headZ)).toBe(-fingerSide);
    });
  }

  it('the side recipe beats the rear-hip and arm recipes it used to fall into', () => {
    const hit = surface(90);
    const { body } = reaction(hit);
    // What the butt override produced for the same tap (gains butt, hip tier:
    // roll 0.14, band chest 0.26) — ~2° of chest roll, i.e. invisible.
    const asButt = pokeSectionBodyReaction({
      t: 0.12,
      section: resolvePokeSection('butt', 'backRight'),
      hitZone: 'butt',
      fallX: 1,
      fallZ: -0.55,
      sideSign: 1,
      softChest: false,
      twist: 0,
    });
    // What the canvas screen-arm override produced (armL gains, roll 0.28).
    const asArm = pokeSectionBodyReaction({
      t: 0.12,
      section: resolvePokeSection('armL', 'frontRight'),
      hitZone: 'armL',
      fallX: 1,
      fallZ: -0.55,
      sideSign: -1,
      softChest: false,
      twist: 0,
    });
    expect(Math.abs(body.chestRoll)).toBeGreaterThan(Math.abs(asButt.chestRoll) * 10);
    expect(Math.abs(body.chestRoll)).toBeGreaterThan(Math.abs(asArm.chestRoll) * 2);
    // Rear-hips barely move on a flank tap (it is not a butt poke).
    expect(Math.abs(body.hipPitch)).toBeLessThan(Math.abs(asButt.hipPitch));
  });
});

describe('direction promotion agrees with directionFromOctant', () => {
  it('a depth-dominated left-flank ray promotes to the LEFT diagonal', () => {
    // The classifier promotes an axial camera octant from the contact offset.
    // Octant convention: a poke FROM her front-left is `frontLeft`, and that
    // contact sits on her left, where s (offset along her right) is negative.
    const cls = classify(surface(75));
    expect(cls.sideSign).toBe(-1);
    expect(cls.direction).toBe('frontLeft');
    // A genuine ray from her left reads `left` in the same convention.
    expect(classify(surface(90), false).direction).toBe('frontLeft');

    const right = classify(surface(285));
    expect(right.sideSign).toBe(1);
    expect(right.direction).toBe('frontRight');
  });

  it('behind the hips plane the promotion flips to the back diagonal', () => {
    const backLeft = classify(surface(135));
    expect(backLeft.sideSign).toBe(-1);
    expect(backLeft.direction).toBe('backLeft');
    const backRight = classify(surface(225));
    expect(backRight.sideSign).toBe(1);
    expect(backRight.direction).toBe('backRight');
  });
});
