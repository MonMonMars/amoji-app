// Idle VRMA motion damp — even "good" catalog stands thrash when full
// amplitude + A→B blend + head additives stack. Pull body tracks toward the
// clip's first keyframe; crush head/neck motion so sky-look never returns.
// v6: near-zero amp → almost still (near bind / first-key freeze).

import * as THREE from 'three';

/** Keep this fraction of body quaternion motion (rest → key). Near-still. */
export const IDLE_BODY_AMPLITUDE = 0.03;

/** Head / neck keep none — kills baked sky-look / look-around. */
export const IDLE_HEAD_AMPLITUDE = 0;

/** Slow calm playback so residual motion reads as breath, not thrash. */
export const IDLE_PLAYBACK_TIME_SCALE = 0.35;

const HEADISH_RE = /(head|neck|eye)/i;

const _q0 = new THREE.Quaternion();
const _q = new THREE.Quaternion();
const _out = new THREE.Quaternion();

function trackBoneName(trackName: string): string {
  const path = trackName.endsWith('.quaternion')
    ? trackName.slice(0, -'.quaternion'.length)
    : trackName.endsWith('.position')
      ? trackName.slice(0, -'.position'.length)
      : trackName;
  if (path.includes('[') && path.endsWith(']')) {
    return path.slice(path.lastIndexOf('[') + 1, -1);
  }
  return path.slice(path.lastIndexOf('.') + 1);
}

function isHeadishTrack(trackName: string): boolean {
  return HEADISH_RE.test(trackBoneName(trackName));
}

/**
 * In-place: slerp every quaternion key toward the clip's first key.
 * Hips stay untouched (rebaseClipHips / plant already own them).
 */
export function dampenIdleClipAmplitude(
  clip: THREE.AnimationClip,
  bodyAmp = IDLE_BODY_AMPLITUDE,
  headAmp = IDLE_HEAD_AMPLITUDE,
): void {
  const body = Math.min(1, Math.max(0, bodyAmp));
  const head = Math.min(1, Math.max(0, headAmp));
  for (const track of clip.tracks) {
    if (!track.name.endsWith('.quaternion')) continue;
    const bone = trackBoneName(track.name);
    if (/^hips$/i.test(bone)) continue;
    const v = track.values;
    if (v.length < 8) continue;
    _q0.set(v[0]!, v[1]!, v[2]!, v[3]!).normalize();
    const amp = isHeadishTrack(track.name) ? head : body;
    if (amp >= 0.999) continue;
    for (let i = 4; i + 3 < v.length; i += 4) {
      _q.set(v[i]!, v[i + 1]!, v[i + 2]!, v[i + 3]!).normalize();
      if (_q0.dot(_q) < 0) {
        _q.x = -_q.x;
        _q.y = -_q.y;
        _q.z = -_q.z;
        _q.w = -_q.w;
      }
      _out.copy(_q0).slerp(_q, amp);
      v[i] = _out.x;
      v[i + 1] = _out.y;
      v[i + 2] = _out.z;
      v[i + 3] = _out.w;
    }
  }
}

/** Scale personality idle timeScale down for calm static stands. */
export function idlePlaybackTimeScale(personalityScale: number): number {
  const p = Number.isFinite(personalityScale) ? personalityScale : 1;
  return Math.max(0.22, Math.min(1.1, p * IDLE_PLAYBACK_TIME_SCALE));
}

/**
 * Kill upward head pitch from engine gaze while a calm idle clip drives the
 * body (look-at sky). Downward glances stay tiny.
 */
export function calmIdleHeadPitch(rawPitch: number): number {
  if (!Number.isFinite(rawPitch)) return 0;
  // Negative pitch = look up on our mapped axis — clamp hard.
  if (rawPitch < 0) return rawPitch * 0.04;
  return Math.min(rawPitch, 0.03) * 0.2;
}
