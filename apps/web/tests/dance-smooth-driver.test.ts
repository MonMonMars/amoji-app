import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  DANCE_TEMPO_MAX_RATIO,
  DANCE_TEMPO_MIN_RATIO,
  DANCE_TEMPO_SLEW_PER_SEC,
  steerDanceTimeScale,
} from '../lib/perf-tempo-lock';
import { stabilizeEyeMaterials } from '../lib/vrm/eyes';

/**
 * Owner report 2026-11-25: "the dance is not smooth, very strange stop motion
 * dance".
 *
 * The driver is a continuous rAF clock: `mixer.update(dt / 1000)` with the real
 * frame delta. Two things in it could still step:
 *   1. the playback rate was rewritten from the live BPM estimate every frame,
 *      so a wobbling estimate lurched the clip's speed ±18% between frames;
 *   2. the per-frame eye pin re-initialised every eye material (material.version
 *      bump) 60×/s, a real per-frame cost.
 * Both are bounded/removed here.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANVAS = fs.readFileSync(path.join(ROOT, 'components/CompanionCanvas.tsx'), 'utf8');

describe('dance driver is continuous', () => {
  it('the mixer advances with the real frame delta inside the rAF loop', () => {
    expect(CANVAS).toMatch(/const dt = Math\.min\(100, now - last\)/);
    expect(CANVAS).toContain('mixer?.update(dt / 1000)');
    expect(CANVAS).toContain('avatar.update(dt / 1000)');
    // No timer may drive the pose track.
    expect(CANVAS).not.toMatch(/setInterval\(/);
  });

  it('live tempo is steered, never teleported', () => {
    expect(CANVAS).toContain('steerDanceTimeScale(');
    expect(CANVAS).not.toMatch(/perfAction\.timeScale = perfBaseTimeScale \* ratio/);
  });

  it('steering snaps on the first frame then moves at a bounded rate', () => {
    const base = 1.1;
    // First frame: start AT the target (no glide in from a stale rate).
    const first = steerDanceTimeScale(base, 1.18, 16.7, 0);
    expect(first).toBeCloseTo(base * 1.18, 6);
    // Then a 5-point tempo correction cannot land in one frame.
    const next = steerDanceTimeScale(base, 0.9, 16.7, first);
    const maxStep = base * DANCE_TEMPO_SLEW_PER_SEC * (16.7 / 1000);
    expect(Math.abs(next - first)).toBeLessThanOrEqual(maxStep + 1e-9);
    expect(next).toBeGreaterThan(base * 0.9);
  });

  it('converges to the target and holds it', () => {
    const base = 1;
    const target = base * 0.9;
    let rate = steerDanceTimeScale(base, 0.9, 16.7, 0);
    // Force a stale previous value, then run 4 s of frames (8 %/s slew).
    rate = 1.18;
    for (let i = 0; i < 240; i += 1) rate = steerDanceTimeScale(base, 0.9, 16.7, rate);
    expect(rate).toBeCloseTo(target, 6);
    expect(steerDanceTimeScale(base, 0.9, 16.7, rate)).toBeCloseTo(target, 6);
  });

  it('clamps the correction to ±18% and snaps after a hidden-tab gap', () => {
    expect(steerDanceTimeScale(1, 99, 16.7, 0)).toBeCloseTo(DANCE_TEMPO_MAX_RATIO, 6);
    expect(steerDanceTimeScale(1, 0.01, 16.7, 0)).toBeCloseTo(DANCE_TEMPO_MIN_RATIO, 6);
    // Backgrounded tab: the next frame must not glide from a stale rate.
    expect(steerDanceTimeScale(1, 0.9, 4000, 1.18)).toBeCloseTo(0.9, 6);
  });
});

describe('per-frame eye pin is idempotent', () => {
  const build = () => {
    const white = new THREE.MeshBasicMaterial({ name: 'F00_EyeWhite_00_EYE' });
    const iris = new THREE.MeshBasicMaterial({ name: 'F00_EyeIris_00_EYE', alphaTest: 0.8 });
    const hi = new THREE.MeshBasicMaterial({ name: 'F00_EyeHighlight_00_EYE' });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), white));
    const irisMesh = new THREE.Mesh(new THREE.BoxGeometry(), iris);
    root.add(irisMesh);
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), hi));
    return { root, white, iris, hi, irisMesh };
  };

  it('does not re-initialise materials on later frames', () => {
    const { root, white, iris, hi } = build();
    stabilizeEyeMaterials(root);
    const v1 = [white.version, iris.version, hi.version];
    stabilizeEyeMaterials(root);
    stabilizeEyeMaterials(root);
    // material.version only moves on `needsUpdate` — no per-frame re-init.
    expect([white.version, iris.version, hi.version]).toEqual(v1);
  });

  it('still re-pins a value that drifts back (late texture / hidden mesh)', () => {
    const { root, iris } = build();
    stabilizeEyeMaterials(root);
    const pinned = iris.version;
    // A late expression/texture pass flips what we pinned.
    iris.depthWrite = false;
    iris.polygonOffsetFactor = 0;
    stabilizeEyeMaterials(root);
    expect(iris.depthWrite).toBe(true);
    expect(iris.polygonOffsetFactor).toBe(-3);
    expect(iris.version).toBeGreaterThan(pinned);
  });
});
