import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  quatAlignHemisphere,
  quatDot,
  shortestQuatSlerp,
} from '../lib/vrm/quat-blend';
import { idleCrossfadeAdditiveScale } from '../lib/idle-crossfade';

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
    const end = 1000 + 450;
    expect(idleCrossfadeAdditiveScale(1000, end)).toBeLessThan(0.35);
    expect(idleCrossfadeAdditiveScale(end + 1, end)).toBe(1);
  });
});
