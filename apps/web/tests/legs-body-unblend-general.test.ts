import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  THIGH_MAX_OUTWARD,
  THIGH_MIN_OUTWARD,
  THIGH_REF_LEN,
  applyThighUnblend,
  thighFloorFor,
} from '../lib/vrm/plant-feet';
import { FULL_UPRIGHT_IDS, UPPER_BODY_IDS } from '../lib/cast-adjust';

const ROSTER = JSON.parse(
  readFileSync(fileURLToPath(new URL('../lib/want-roster.json', import.meta.url)), 'utf8'),
) as { characters: { id: string; modelFile: string }[] };

/**
 * Thigh length measured off every roster VRM at rest with `createV1Avatar`,
 * i.e. after the same upright + facing calibration the app runs. Hip joint to
 * knee joint, in metres.
 *
 * This is DATA about the rigs, not a fix list: the correction is derived from
 * these numbers, so a rig that ships later is covered without being named.
 */
const RIG: ReadonlyMap<string, number> = new Map<string, number>([
  ['a01-shino', 0.365],
  ['a02-shibu', 0.352],
  ['a03-fumiriya', 0.526],
  ['a04-avatarsample-a', 0.363],
  ['a05-avatarsample-c', 0.392],
  ['a10-agahomei-normal', 0.341],
  ['a14-vivi', 0.298],
  ['a16-vita', 0.372],
  ['a17-victoria-rubin', 0.386],
  ['a23-hairsample-female', 0.352],
  ['a24-hairsample-male', 0.387],
  ['a61-saori-kamiya-llunne', 0.336],
  ['a63-hinoame-satuki-mei-sirayuki', 0.282],
  ['a64-lily-lily-animeit', 0.395],
  ['a70-vtuber-aihina-sample', 0.245],
  ['a71-mary-sweety', 0.352],
  ['a74-mizuka', 0.352],
  ['a75-sorano', 0.352],
  ['a77-sasha', 0.388],
  ['a79-amami-karasu', 0.387],
  ['a81-cinna', 0.352],
  ['a82-renel-bonnie', 0.301],
  ['a83-ao-witch', 0.331],
  ['a85-kara', 0.352],
  ['a89-rurina', 0.352],
  ['a93-edokko', 0.354],
  ['a94-rita', 0.134],
  ['a95-mizu', 0.320],
  ['a96-pee-aruako', 0.342],
  ['a97-pee-saaya', 0.331],
  ['a98-ethan', 0.468],
  ['a99-miyora', 0.477],
  ['a103-rockredgradientjk', 0.370],
  ['a104-simplebrownsailorjk', 0.331],
  ['a105-serizawa-aoi', 0.369],
  ['a106-auroragradhairjk', 0.351],
  ['a107-dm-office-casual', 0.398],
  ['a109-riona', 0.328],
  ['a112-mahochan-jk', 0.352],
  ['a114-sailor-cardigan-girl', 0.313],
  ['a116-haru-uniform', 0.335],
  ['a117-erigawa-risa', 0.430],
  ['a119-kanami-uniform', 0.352],
  ['a120-morikawa-yuki-summer-uniform', 0.352],
  ['a121-nagano-mami-uniform', 0.433],
  ['a122-shiratori-hikari-shifuku', 0.405],
]);

/** The six ids #233 scoped its hips leveling to. */
const PR_233_IDS = [...UPPER_BODY_IDS, ...FULL_UPRIGHT_IDS];

const rosterIds = ROSTER.characters.map((c) => c.id);

describe('thighFloorFor', () => {
  it('keeps the tuned base on the thigh length it was tuned against', () => {
    expect(thighFloorFor(THIGH_REF_LEN)).toBeCloseTo(THIGH_MIN_OUTWARD, 6);
    // Longer thighs already read open at the base floor — never reduced below it.
    expect(thighFloorFor(0.526)).toBeCloseTo(THIGH_MIN_OUTWARD, 6);
    expect(thighFloorFor(1.2)).toBeCloseTo(THIGH_MIN_OUTWARD, 6);
  });

  it('raises the floor on short thighs so the notch stays comparable', () => {
    // A chibi's 0.134 m thigh got ~8 mm of opening at the fixed 0.06 floor.
    // The floor now asks for the same absolute notch as a reference rig.
    const chibi = thighFloorFor(0.134);
    expect(chibi).toBeGreaterThan(THIGH_MIN_OUTWARD);
    expect(chibi * 0.134).toBeCloseTo(THIGH_MIN_OUTWARD * THIGH_REF_LEN, 3);

    const shortish = thighFloorFor(0.245);
    expect(shortish).toBeGreaterThan(THIGH_MIN_OUTWARD);
    expect(shortish * 0.245).toBeCloseTo(THIGH_MIN_OUTWARD * THIGH_REF_LEN, 3);
  });

  it('is monotone: a shorter thigh never asks for less opening', () => {
    const lens = [0.10, 0.134, 0.20, 0.245, 0.30, 0.352, 0.40, 0.477, 0.526, 0.70];
    let prev = Infinity;
    for (const len of lens) {
      const floor = thighFloorFor(len);
      expect(floor).toBeLessThanOrEqual(prev + 1e-9);
      prev = floor;
    }
  });

  it('never exceeds the natural-stance ceiling, and degrades safely', () => {
    // A missing or nonsense length must not ask for a bigger stance.
    expect(thighFloorFor(0)).toBe(THIGH_MIN_OUTWARD);
    expect(thighFloorFor(Number.NaN)).toBe(THIGH_MIN_OUTWARD);
    expect(thighFloorFor(Number.POSITIVE_INFINITY)).toBe(THIGH_MIN_OUTWARD);
    expect(thighFloorFor(-1)).toBe(THIGH_MIN_OUTWARD);
    // A tiny-but-valid length saturates at the ceiling rather than exploding.
    expect(thighFloorFor(1e-4 + 1e-9)).toBe(THIGH_MAX_OUTWARD);
    expect(thighFloorFor(0.05)).toBeLessThanOrEqual(THIGH_MAX_OUTWARD);
  });
});

describe('correction covers more than the ids #233 listed', () => {
  it('#233 covered six ids; the roster is much larger', () => {
    expect(PR_233_IDS).toHaveLength(6);
    expect(rosterIds.length).toBeGreaterThan(40);
  });

  it('raises the floor on far more than the six listed ids', () => {
    // The clamp always ran on every cast; what was never generalised was the
    // FLOOR. Count the ids whose floor is now above the old fixed constant.
    const raised = rosterIds.filter((id) => {
      const len = RIG.get(id);
      expect(len, `no measured rig for ${id}`).toBeTruthy();
      return thighFloorFor(len!) > THIGH_MIN_OUTWARD + 1e-9;
    });
    expect(raised.length).toBeGreaterThan(PR_233_IDS.length * 4);
    // and it is not the same six: these blend for reasons #233 never touched
    expect(raised).toEqual(expect.arrayContaining([
      'a94-rita',
      'a70-vtuber-aihina-sample',
      'a63-hinoame-satuki-mei-sirayuki',
    ]));
    // the six #233 did list are all covered too
    for (const id of PR_233_IDS) {
      expect(thighFloorFor(RIG.get(id)!), id).toBeGreaterThanOrEqual(THIGH_MIN_OUTWARD);
    }
  });

  it('leaves long-thighed rigs on exactly the old constant', () => {
    // Conservative: casts that already read correct keep the shipped stance.
    const untouched = rosterIds.filter((id) => thighFloorFor(RIG.get(id)!) === THIGH_MIN_OUTWARD);
    expect(untouched).toEqual(expect.arrayContaining([
      'a01-shino',
      'a03-fumiriya',
      'a98-ethan',
      'a99-miyora',
      'a117-erigawa-risa',
    ]));
  });

  it('keeps every rig inside the natural-stance bounds', () => {
    for (const id of rosterIds) {
      const floor = thighFloorFor(RIG.get(id)!);
      expect(floor, id).toBeGreaterThanOrEqual(THIGH_MIN_OUTWARD - 1e-9);
      expect(floor, id).toBeLessThanOrEqual(THIGH_MAX_OUTWARD + 1e-9);
    }
  });
});

// ---------------------------------------------------------------------------
// behaviour on a synthetic rig
// ---------------------------------------------------------------------------

/**
 * A rig with a configurable thigh length. Hip joints sit `hipHalf` either side
 * of centre and each thigh is authored leaning TOWARD the midline — the
 * "blended" pose the clamp exists to open.
 */
function rig(thighLen: number, hipHalf = 0.077): { bones: Record<string, THREE.Object3D>; root: THREE.Object3D } {
  const root = new THREE.Group();
  const hips = new THREE.Object3D();
  hips.name = 'hips';
  hips.position.y = 0.9;
  root.add(hips);
  const bones: Record<string, THREE.Object3D> = { hips };
  const LEAN = 0.5; // inward, i.e. toward x = 0
  for (const side of ['left', 'right'] as const) {
    const sign = side === 'left' ? 1 : -1;
    const upper = new THREE.Object3D();
    upper.name = `${side}UpperLeg`;
    upper.position.set(hipHalf * sign, -0.04, 0);
    const lower = new THREE.Object3D();
    lower.name = `${side}LowerLeg`;
    // inward lean: the left (+X) leg travels toward -X
    lower.position.set(-LEAN * sign, -1, 0).normalize().multiplyScalar(thighLen);
    upper.add(lower);
    hips.add(upper);
    bones[upper.name] = upper;
    bones[lower.name] = lower;
  }
  root.updateMatrixWorld(true);
  return { bones, root };
}

/** outward component of a thigh direction, in the same cos-space the clamp uses */
function outwardOf(bones: Record<string, THREE.Object3D>, side: 'left' | 'right'): number {
  const up = bones[`${side}UpperLeg`]!.getWorldPosition(new THREE.Vector3());
  const lo = bones[`${side}LowerLeg`]!.getWorldPosition(new THREE.Vector3());
  const dir = lo.clone().sub(up).normalize();
  const axis = bones.rightUpperLeg!.getWorldPosition(new THREE.Vector3())
    .sub(bones.leftUpperLeg!.getWorldPosition(new THREE.Vector3()));
  axis.y = 0;
  axis.normalize();
  return side === 'left' ? -dir.dot(axis) : dir.dot(axis);
}

const getter = (bones: Record<string, THREE.Object3D>) => (n: string) => bones[n] ?? null;

describe('applyThighUnblend scales with the rig', () => {
  it('opens each side to the rig-derived floor, not the fixed constant', () => {
    for (const thighLen of [0.134, 0.18, 0.245, 0.352, 0.50]) {
      const fixture = rig(thighLen);
      const floor = thighFloorFor(thighLen);
      for (const side of ['left', 'right'] as const) {
        expect(outwardOf(fixture.bones, side), `${thighLen} ${side} before`).toBeLessThan(0);
      }
      const before = outwardOf(fixture.bones, 'left');
      expect(applyThighUnblend(getter(fixture.bones)), `${thighLen}`).toBe(2);
      fixture.root.updateMatrixWorld(true);
      // it actually opened the thigh it found folded inward
      expect(outwardOf(fixture.bones, 'left'), `${thighLen} moved out`).toBeGreaterThan(before);
      // and it reached the floor this rig's proportions call for
      for (const side of ['left', 'right'] as const) {
        expect(outwardOf(fixture.bones, side), `${thighLen} ${side} after`)
          .toBeGreaterThanOrEqual(floor - 1e-3);
      }
    }
  });

  it('asks a short thigh for a bigger angle than a long one', () => {
    // Same absolute notch budget => the shorter limb needs the larger cosine
    // floor. Exactly what the fixed 0.06 could not express.
    const shortFloor = thighFloorFor(0.134);
    const longFloor = thighFloorFor(0.50);
    expect(shortFloor).toBeGreaterThan(longFloor);
    // and the resulting notches are comparable instead of 8 mm vs 30 mm
    const shortNotch = shortFloor * 0.134;
    const longNotch = longFloor * 0.50;
    expect(shortNotch).toBeGreaterThan(longNotch * 0.5);
    expect(shortNotch).toBeLessThan(longNotch * 1.6);
  });

  it('opens the chibi rig the fixed floor barely moved', () => {
    const chibi = rig(0.134, 0.057);
    const hipX = chibi.bones.leftUpperLeg!.getWorldPosition(new THREE.Vector3()).x;
    const before = chibi.bones.leftLowerLeg!.getWorldPosition(new THREE.Vector3()).x - hipX;
    expect(before).toBeLessThan(0); // folded inward, past its own hip
    expect(applyThighUnblend(getter(chibi.bones))).toBe(2);
    chibi.root.updateMatrixWorld(true);
    const after = chibi.bones.leftLowerLeg!.getWorldPosition(new THREE.Vector3()).x - hipX;
    expect(after).toBeGreaterThan(before);
    // a real opening, not a rounding error (fixed floor gave <1 cm here)
    expect(after - before).toBeGreaterThan(0.01);
  });

  it('leaves raised thighs and an incomplete rig untouched', () => {
    const raised = rig(0.35);
    for (const side of ['left', 'right'] as const) {
      // knee above the hip joint: a folded / raised leg keeps full freedom
      raised.bones[`${side}LowerLeg`]!.position.set(0, 0.35, 0.1);
    }
    raised.root.updateMatrixWorld(true);
    expect(applyThighUnblend(getter(raised.bones))).toBe(0);

    expect(applyThighUnblend(() => null)).toBe(0);
    const partial: Record<string, THREE.Object3D> = { leftUpperLeg: new THREE.Object3D() };
    expect(applyThighUnblend((n) => partial[n] ?? null)).toBe(0);
  });
});
