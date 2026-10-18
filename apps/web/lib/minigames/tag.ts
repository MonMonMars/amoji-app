// 「捕まえて！」 — the player catches the VRM on an 8×8 m pad.
// Hold runs toward the pointer, tap dashes (1.2s cooldown). Distance catch.
// The VRM flees kinematically at 0.85× run speed with an occasional zig-zag.

import { TAG, clamp } from './constants';
import { nextUnit } from './rng';
import type { GamePhase, MiniEmotionEvent } from './types';

export interface TagBody {
  x: number;
  z: number;
  yaw: number;
}

export interface TagState {
  phase: GamePhase;
  countdown: number;
  t: number;
  duration: number;
  reduced: boolean;
  player: TagBody;
  vrm: TagBody;
  dashLeft: number;
  dashCd: number;
  zigT: number;
  burst: number;
  burstSign: number;
  nextBurst: number;
  zigOff: boolean;
  rng: number;
  nearLatched: boolean;
  teaseLeft: number;
  outcome?: 'catch' | 'timeout';
  endAge: number;
}

export interface TagCommand {
  hold: boolean;
  aimX: number;
  aimZ: number;
  dash: boolean;
}

export const TAG_IDLE_CMD: TagCommand = { hold: false, aimX: 0, aimZ: 0, dash: false };

export interface TagCreateOpts {
  reduced?: boolean;
  duration?: number;
  skipCountdown?: boolean;
  player?: { x: number; z: number };
  vrm?: { x: number; z: number };
  seed?: number;
  zig?: boolean;
}

function yawToward(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(toX - fromX, toZ - fromZ);
}

export function createTag(opts: TagCreateOpts = {}): TagState {
  const player = { x: opts.player?.x ?? 0, z: opts.player?.z ?? 2.2, yaw: 0 };
  const vrm = { x: opts.vrm?.x ?? 0, z: opts.vrm?.z ?? -1.4, yaw: 0 };
  player.yaw = yawToward(player.x, player.z, vrm.x, vrm.z);
  vrm.yaw = yawToward(vrm.x, vrm.z, player.x, player.z) + Math.PI;
  return {
    phase: opts.skipCountdown ? 'playing' : 'countdown',
    countdown: opts.skipCountdown ? 0 : TAG.countdownSec,
    t: 0,
    duration: opts.duration ?? TAG.roundSec,
    reduced: !!opts.reduced,
    player,
    vrm,
    dashLeft: 0,
    dashCd: 0,
    zigT: 0,
    burst: 0,
    burstSign: 1,
    nextBurst: TAG.zigEvery,
    zigOff: opts.zig === false,
    rng: opts.seed ?? 1,
    nearLatched: false,
    teaseLeft: 0,
    endAge: 0,
  };
}

export function stepTag(
  state: TagState,
  cmd: TagCommand,
  dt: number,
): { state: TagState; events: MiniEmotionEvent[] } {
  const events: MiniEmotionEvent[] = [];
  const step = dt > 0 ? dt : 0;
  const s: TagState = {
    ...state,
    player: { ...state.player },
    vrm: { ...state.vrm },
  };

  if (s.phase === 'countdown') {
    s.countdown -= step;
    if (s.countdown <= 0) {
      s.phase = 'playing';
      s.countdown = 0;
      s.t = 0;
    }
    return { state: s, events };
  }

  if (s.phase === 'result') {
    s.endAge += step;
    return { state: s, events };
  }

  s.t += step;
  s.dashLeft = Math.max(0, s.dashLeft - step);
  s.dashCd = Math.max(0, s.dashCd - step);
  s.teaseLeft = Math.max(0, s.teaseLeft - step);

  if (cmd.dash && s.dashCd <= 0 && s.dashLeft <= 0) {
    const dx = cmd.aimX - s.player.x;
    const dz = cmd.aimZ - s.player.z;
    if (Math.hypot(dx, dz) > 0.2) s.player.yaw = Math.atan2(dx, dz);
    s.dashLeft = TAG.dashSec;
    s.dashCd = TAG.dashCd;
  }

  const dashing = s.dashLeft > 0;
  if (cmd.hold || dashing) {
    let dx = Math.sin(s.player.yaw);
    let dz = Math.cos(s.player.yaw);
    if (cmd.hold) {
      dx = cmd.aimX - s.player.x;
      dz = cmd.aimZ - s.player.z;
    }
    const mag = Math.hypot(dx, dz);
    const faceAim = cmd.hold ? mag > 0.12 : true;
    if (faceAim && mag > 1e-4) {
      dx /= mag;
      dz /= mag;
      s.player.yaw = Math.atan2(dx, dz);
      const spd = dashing ? TAG.dashSpeed : TAG.playerSpeed;
      s.player.x += dx * spd * step;
      s.player.z += dz * spd * step;
    } else if (dashing) {
      const spd = TAG.dashSpeed;
      s.player.x += Math.sin(s.player.yaw) * spd * step;
      s.player.z += Math.cos(s.player.yaw) * spd * step;
    }
  }
  s.player.x = clamp(s.player.x, -TAG.inset, TAG.inset);
  s.player.z = clamp(s.player.z, -TAG.inset, TAG.inset);

  s.zigT += step;
  s.nextBurst -= step;
  if (!s.zigOff && s.nextBurst <= 0) {
    const roll = nextUnit(s.rng);
    s.rng = roll.seed;
    s.burst = TAG.zigDur;
    s.burstSign = roll.value < 0.5 ? -1 : 1;
    s.nextBurst = TAG.zigEvery * (0.75 + roll.value * 0.5);
  }
  if (s.burst > 0) s.burst = Math.max(0, s.burst - step);

  let fx = s.vrm.x - s.player.x;
  let fz = s.vrm.z - s.player.z;
  const fl = Math.hypot(fx, fz) || 1;
  fx /= fl;
  fz /= fl;
  const edge = TAG.half - 0.95;
  if (s.vrm.x > edge) fx -= (s.vrm.x - edge) * 2.4;
  if (s.vrm.x < -edge) fx += (-edge - s.vrm.x) * 2.4;
  if (s.vrm.z > edge) fz -= (s.vrm.z - edge) * 2.4;
  if (s.vrm.z < -edge) fz += (-edge - s.vrm.z) * 2.4;
  const zig = s.zigOff ? 0 : Math.sin(s.zigT * 3.1) * 0.35 + (s.burst > 0 ? s.burstSign * 0.9 : 0);
  let mx = fx - fz * zig;
  let mz = fz + fx * zig;
  const ml = Math.hypot(mx, mz) || 1;
  mx /= ml;
  mz /= ml;
  const vrmSpeed = TAG.playerSpeed * TAG.vrmSpeedRatio;
  s.vrm.x += mx * vrmSpeed * step;
  s.vrm.z += mz * vrmSpeed * step;
  s.vrm.x = clamp(s.vrm.x, -TAG.inset, TAG.inset);
  s.vrm.z = clamp(s.vrm.z, -TAG.inset, TAG.inset);
  s.vrm.yaw = Math.atan2(mx, mz);

  const dist = Math.hypot(s.player.x - s.vrm.x, s.player.z - s.vrm.z);
  if (dist < TAG.catchRadius) {
    s.phase = 'result';
    s.outcome = 'catch';
    s.endAge = 0;
    events.push({ kind: 'catch', hints: { surprise: 0.88, joy: 0.35 }, anim: 'caught' });
    return { state: s, events };
  }
  if (dist < TAG.nearMiss && !s.nearLatched) {
    s.nearLatched = true;
    s.teaseLeft = 1.15;
    events.push({ kind: 'near_miss', hints: { pride: 0.7, joy: 0.48 }, anim: 'tease' });
  } else if (dist > TAG.nearMissClear) {
    s.nearLatched = false;
  }

  if (s.t >= s.duration) {
    s.phase = 'result';
    s.outcome = 'timeout';
    s.endAge = 0;
    events.push({ kind: 'timeout', hints: { sadness: 0.62, contempt: 0.22 }, anim: 'pout' });
  }
  return { state: s, events };
}
