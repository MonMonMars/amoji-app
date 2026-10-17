import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PHI_HOME, PHI_MAX, PHI_MIN } from '../lib/orbit-limits';

/** Clamp on main before this change. */
const PHI_MIN_PREV = 1.08;
const PHI_MAX_PREV = 2.55;

const EYE = Math.PI / 2;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

describe('chat VRM polar orbit', () => {
  it('opens further toward the crown and further toward the feet than the previous clamp', () => {
    expect(PHI_MIN).toBeLessThan(PHI_MIN_PREV);
    expect(PHI_MAX).toBeGreaterThan(PHI_MAX_PREV);
    expect(PHI_MAX - PHI_MIN).toBeGreaterThan(PHI_MAX_PREV - PHI_MIN_PREV);

    // ~28° above → ~76° above; ~56° below → ~76° below.
    expect(toDeg(EYE - PHI_MIN)).toBeGreaterThan(toDeg(EYE - PHI_MIN_PREV) + 40);
    expect(toDeg(PHI_MAX - EYE)).toBeGreaterThan(toDeg(PHI_MAX_PREV - EYE) + 15);
  });

  it('stays off both poles so lookAt does not roll the camera upside-down', () => {
    const clearance = 0.2;
    expect(PHI_MIN).toBeGreaterThanOrEqual(clearance);
    expect(PHI_MAX).toBeLessThanOrEqual(Math.PI - clearance);
    // Same placement as CompanionCanvas applyCamera. Screen-up must keep a
    // positive world-Y at both stops (the roll flips only at the poles).
    const camera = new THREE.PerspectiveCamera();
    const target = new THREE.Vector3(0, 1.05, 0);
    const dist = 2.6;
    for (const phi of [PHI_MIN, PHI_MAX]) {
      camera.up.set(0, 1, 0);
      camera.position.set(
        target.x + dist * Math.sin(phi) * Math.sin(0),
        target.y + dist * Math.cos(phi),
        target.z + dist * Math.sin(phi) * Math.cos(0),
      );
      camera.lookAt(target);
      const screenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      expect(screenUp.y).toBeGreaterThan(0.2);
    }
  });

  it('keeps the resting view and a level horizon inside the window', () => {
    expect(PHI_HOME).toBeGreaterThan(PHI_MIN);
    expect(PHI_HOME).toBeLessThan(PHI_MAX);
    expect(EYE).toBeGreaterThan(PHI_MIN);
    expect(EYE).toBeLessThan(PHI_MAX);
  });
});
