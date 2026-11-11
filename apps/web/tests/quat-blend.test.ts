import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  lerpAngleShortest,
  quatAlignHemisphere,
  quatDot,
  shortestAngleDelta,
  shortestEulerYXZSlerp,
  shortestQuatSlerp,
  wrapAngleToPi,
} from '../lib/vrm/quat-blend';
import {
  BONE_BLEND_LIMITS,
  clampAxialNoFlipBones,
  clampBoneByName,
  resolveBoneLimitKey,
} from '../lib/vrm/bone-joint-limits';
import { IDLE_SWAP_LEG_BLEND_S, idleCrossfadeAdditiveScale } from '../lib/idle-crossfade';

describe('shortestQuatSlerp + idle crossfade damp', () => {
  it('aligns opposing hemispheres before slerp', () => {
    const ref = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.2);
    const opp = ref.clone();
    opp.x = -opp.x;
    opp.y = -opp.y;
    opp.z = -opp.z;
    opp.w = -opp.w;
    expect(quatDot(ref, opp)).toBeLessThan(0);
    const aligned = quatAlignHemisphere(ref, opp, new THREE.Quaternion());
    expect(quatDot(ref, aligned)).toBeGreaterThan(0.99);
  });

  it('keeps blended head near rest when mixer flips target sign (q ↔ −q)', () => {
    const from = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.35);
    const flip = from.clone();
    flip.x = -flip.x;
    flip.y = -flip.y;
    flip.z = -flip.z;
    flip.w = -flip.w;
    const mid = shortestQuatSlerp(new THREE.Quaternion(), from, flip, 0.45);
    const ang = 2 * Math.acos(Math.min(1, Math.abs(mid.dot(from))));
    expect(ang).toBeLessThan(0.08);
  });

  it('dampens poke additives at start of idle swap crossfade', () => {
    const end = 1000 + Math.round(IDLE_SWAP_LEG_BLEND_S * 1000);
    expect(idleCrossfadeAdditiveScale(1000, end)).toBeLessThan(0.35);
    expect(idleCrossfadeAdditiveScale(end + 1, end)).toBe(1);
  });
});

function deg(d: number): number {
  return (d * Math.PI) / 180;
}

describe('shortest-path angle wrap (no 360° spin)', () => {
  it('wraps +170°→−170° as a 20° short turn, not 340°', () => {
    const from = deg(170);
    const to = deg(-170);
    const delta = shortestAngleDelta(from, to);
    expect(Math.abs(delta)).toBeCloseTo(deg(20), 5);
    expect(Math.abs(delta)).toBeLessThan(deg(30));
    // Short arc is ±20°; naive subtraction is 340°.
    expect(Math.abs(to - from)).toBeGreaterThan(deg(300));
  });

  it('lerps +170°→−170° to ~±180° at midpoint (20° path)', () => {
    const mid = lerpAngleShortest(deg(170), deg(-170), 0.5);
    expect(Math.abs(Math.abs(mid) - Math.PI)).toBeLessThan(deg(2));
    expect(Math.abs(mid)).toBeGreaterThan(deg(170));
  });

  it('wrapAngleToPi keeps values in (−π, π]', () => {
    expect(wrapAngleToPi(deg(370))).toBeCloseTo(deg(10), 5);
    expect(wrapAngleToPi(deg(-190))).toBeCloseTo(deg(170), 5);
  });

  it('shortestEulerYXZSlerp yaw does not spin the long way', () => {
    const from = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, deg(170), 0, 'YXZ'));
    const to = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, deg(-170), 0, 'YXZ'));
    const mid = shortestEulerYXZSlerp(new THREE.Quaternion(), from, to, 0.5);
    const e = new THREE.Euler().setFromQuaternion(mid, 'YXZ');
    // Midpoint of the 20° arc sits near ±180°, never near 0° (the long-way midpoint).
    expect(Math.abs(e.y)).toBeGreaterThan(deg(160));
    const ang = 2 * Math.acos(Math.min(1, Math.abs(mid.dot(from))));
    expect(ang).toBeLessThan(deg(25));
  });
});

describe('axial bone clamps (spine/back/head)', () => {
  it('resolves Normalized_J_Bip_* and raw VRoid names to limit keys', () => {
    expect(resolveBoneLimitKey('spine')).toBe('spine');
    expect(resolveBoneLimitKey('J_Bip_C_Spine')).toBe('spine');
    expect(resolveBoneLimitKey('Normalized_J_Bip_C_Spine')).toBe('spine');
    expect(resolveBoneLimitKey('Normalized_J_Bip_C_Head')).toBe('head');
    expect(resolveBoneLimitKey('J_Bip_C_UpperChest')).toBe('upperChest');
  });

  it('clamps a full-turn spine yaw back into human ROM', () => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, deg(350), 0, 'YXZ'));
    expect(clampBoneByName(q, 'Normalized_J_Bip_C_Spine')).toBe(true);
    const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    const lim = BONE_BLEND_LIMITS.spine.y;
    expect(e.y).toBeGreaterThanOrEqual(lim[0]);
    expect(e.y).toBeLessThanOrEqual(lim[1]);
    expect(Math.abs(e.y)).toBeLessThan(Math.PI / 2);
  });

  it('clampAxialNoFlipBones stops a head that spun past ±π', () => {
    const head = new THREE.Object3D();
    head.name = 'Normalized_J_Bip_C_Head';
    head.quaternion.setFromEuler(new THREE.Euler(deg(400), deg(200), 0, 'YXZ'));
    const spine = new THREE.Object3D();
    spine.name = 'J_Bip_C_Spine';
    spine.quaternion.setFromEuler(new THREE.Euler(0, deg(-300), deg(90), 'YXZ'));
    const bones: Record<string, THREE.Object3D> = { head, spine };
    clampAxialNoFlipBones((name) => bones[name] ?? null);
    const he = new THREE.Euler().setFromQuaternion(head.quaternion, 'YXZ');
    const se = new THREE.Euler().setFromQuaternion(spine.quaternion, 'YXZ');
    expect(he.x).toBeGreaterThanOrEqual(BONE_BLEND_LIMITS.head.x[0] - 1e-9);
    expect(he.x).toBeLessThanOrEqual(BONE_BLEND_LIMITS.head.x[1] + 1e-9);
    expect(he.y).toBeGreaterThanOrEqual(BONE_BLEND_LIMITS.head.y[0] - 1e-9);
    expect(he.y).toBeLessThanOrEqual(BONE_BLEND_LIMITS.head.y[1] + 1e-9);
    expect(se.y).toBeGreaterThanOrEqual(BONE_BLEND_LIMITS.spine.y[0] - 1e-9);
    expect(se.y).toBeLessThanOrEqual(BONE_BLEND_LIMITS.spine.y[1] + 1e-9);
    expect(se.z).toBeGreaterThanOrEqual(BONE_BLEND_LIMITS.spine.z[0] - 1e-9);
    expect(se.z).toBeLessThanOrEqual(BONE_BLEND_LIMITS.spine.z[1] + 1e-9);
  });

  it('clampAxialNoFlipBones stops upper-arm full turns (scary 360 sleeves)', () => {
    const left = new THREE.Object3D();
    left.name = 'Normalized_J_Bip_L_UpperArm';
    left.quaternion.setFromEuler(new THREE.Euler(deg(20), deg(350), deg(-300), 'YXZ'));
    const right = new THREE.Object3D();
    right.name = 'J_Bip_R_UpperArm';
    right.quaternion.setFromEuler(new THREE.Euler(deg(-40), deg(-340), deg(310), 'YXZ'));
    const bones: Record<string, THREE.Object3D> = {
      leftUpperArm: left,
      rightUpperArm: right,
    };
    clampAxialNoFlipBones((name) => bones[name] ?? null);
    const le = new THREE.Euler().setFromQuaternion(left.quaternion, 'YXZ');
    const re = new THREE.Euler().setFromQuaternion(right.quaternion, 'YXZ');
    const ll = BONE_BLEND_LIMITS.leftUpperArm;
    const rl = BONE_BLEND_LIMITS.rightUpperArm;
    expect(le.y).toBeGreaterThanOrEqual(ll.y[0] - 1e-9);
    expect(le.y).toBeLessThanOrEqual(ll.y[1] + 1e-9);
    expect(le.z).toBeGreaterThanOrEqual(ll.z[0] - 1e-9);
    expect(le.z).toBeLessThanOrEqual(ll.z[1] + 1e-9);
    expect(re.y).toBeGreaterThanOrEqual(rl.y[0] - 1e-9);
    expect(re.y).toBeLessThanOrEqual(rl.y[1] + 1e-9);
    expect(re.z).toBeGreaterThanOrEqual(rl.z[0] - 1e-9);
    expect(re.z).toBeLessThanOrEqual(rl.z[1] + 1e-9);
    expect(Math.abs(le.z)).toBeLessThan(Math.PI);
    expect(Math.abs(re.z)).toBeLessThan(Math.PI);
  });
});
