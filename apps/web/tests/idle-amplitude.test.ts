import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  IDLE_BODY_AMPLITUDE,
  IDLE_HEAD_AMPLITUDE,
  IDLE_PLAYBACK_TIME_SCALE,
  calmIdleHeadPitch,
  dampenIdleClipAmplitude,
  idlePlaybackTimeScale,
} from '../lib/idle-amplitude';

function quatTrack(name: string, keys: Array<[number, number, number, number]>): THREE.QuaternionKeyframeTrack {
  const times = keys.map((_, i) => i);
  const values = keys.flat();
  return new THREE.QuaternionKeyframeTrack(name, times, values);
}

describe('idle amplitude damp', () => {
  it('pulls body quaternion keys toward the first frame', () => {
    const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0.2, 0));
    const track = quatTrack('spine.quaternion', [
      [q0.x, q0.y, q0.z, q0.w],
      [q1.x, q1.y, q1.z, q1.w],
    ]);
    const clip = new THREE.AnimationClip('IdleRpmFStanding001', -1, [track]);
    dampenIdleClipAmplitude(clip, 0.2, 0.05);
    const v = track.values;
    const out = new THREE.Quaternion(v[4]!, v[5]!, v[6]!, v[7]!);
    const expected = q0.clone().slerp(q1, 0.2);
    expect(out.angleTo(expected)).toBeLessThan(1e-3);
    expect(out.angleTo(q0)).toBeLessThan(q1.angleTo(q0) * 0.35);
  });

  it('crushes head tracks harder than body', () => {
    const q0 = new THREE.Quaternion().identity();
    const qUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0, 0));
    const head = quatTrack('head.quaternion', [
      [q0.x, q0.y, q0.z, q0.w],
      [qUp.x, qUp.y, qUp.z, qUp.w],
    ]);
    const spine = quatTrack('spine.quaternion', [
      [q0.x, q0.y, q0.z, q0.w],
      [qUp.x, qUp.y, qUp.z, qUp.w],
    ]);
    dampenIdleClipAmplitude(new THREE.AnimationClip('idle', -1, [head, spine]));
    const headOut = new THREE.Quaternion(head.values[4]!, head.values[5]!, head.values[6]!, head.values[7]!);
    const spineOut = new THREE.Quaternion(spine.values[4]!, spine.values[5]!, spine.values[6]!, spine.values[7]!);
    expect(headOut.angleTo(q0)).toBeLessThan(spineOut.angleTo(q0));
    expect(IDLE_HEAD_AMPLITUDE).toBeLessThan(IDLE_BODY_AMPLITUDE);
  });

  it('leaves hips tracks alone', () => {
    const q0 = new THREE.Quaternion().identity();
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.1, 0));
    const hips = quatTrack('hips.quaternion', [
      [q0.x, q0.y, q0.z, q0.w],
      [q1.x, q1.y, q1.z, q1.w],
    ]);
    dampenIdleClipAmplitude(new THREE.AnimationClip('idle', -1, [hips]));
    expect(hips.values[4]).toBeCloseTo(q1.x, 5);
    expect(hips.values[5]).toBeCloseTo(q1.y, 5);
  });

  it('scales playback and kills look-up head pitch', () => {
    expect(idlePlaybackTimeScale(1)).toBeCloseTo(IDLE_PLAYBACK_TIME_SCALE, 5);
    expect(idlePlaybackTimeScale(0.8)).toBeLessThan(0.8);
    expect(Math.abs(calmIdleHeadPitch(-0.3))).toBeLessThan(0.02);
    expect(calmIdleHeadPitch(0.2)).toBeLessThan(0.02);
  });

  it('v6 near-zero amp is almost still', () => {
    expect(IDLE_BODY_AMPLITUDE).toBeLessThanOrEqual(0.05);
    expect(IDLE_HEAD_AMPLITUDE).toBe(0);
    expect(IDLE_PLAYBACK_TIME_SCALE).toBeLessThanOrEqual(0.4);
  });
});
