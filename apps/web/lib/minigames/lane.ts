// 「逃げて！」 — 3-lane auto-forward dodge. Swipe, A/D, arrows, or a lane pick.
// Obstacles are AABBs on a lane index + z. One VRM, the runner.

import { LANE, clampLane, laneX } from './constants';
import { nextUnit } from './rng';
import type { GamePhase, MiniEmotionEvent } from './types';

export interface LaneObstacle {
  id: number;
  lane: 0 | 1 | 2;
  z: number;
  passed: boolean;
  missed: boolean;
}

export interface LaneState {
  phase: GamePhase;
  countdown: number;
  t: number;
  duration: number;
  reduced: boolean;
  lane: 0 | 1 | 2;
  x: number;
  z: number;
  obstacles: LaneObstacle[];
  spawn: boolean;
  nextId: number;
  nextSpawnZ: number;
  rng: number;
  teaseLeft: number;
  outcome?: 'crash' | 'survive';
  endAge: number;
}

export interface LaneCommand {
  swipe: -1 | 0 | 1;
  pick: 0 | 1 | 2 | null;
}

export const LANE_IDLE_CMD: LaneCommand = { swipe: 0, pick: null };

export interface LaneCreateOpts {
  reduced?: boolean;
  duration?: number;
  skipCountdown?: boolean;
  lane?: 0 | 1 | 2;
  obstacles?: Array<{ id?: number; lane: 0 | 1 | 2; z: number }>;
  spawn?: boolean;
  seed?: number;
}

export function createLane(opts: LaneCreateOpts = {}): LaneState {
  const lane = opts.lane ?? 1;
  const obstacles: LaneObstacle[] = (opts.obstacles ?? []).map((o, i) => ({
    id: o.id ?? i + 1,
    lane: o.lane,
    z: o.z,
    passed: false,
    missed: false,
  }));
  const nextId = obstacles.reduce((m, o) => Math.max(m, o.id), 0) + 1;
  return {
    phase: opts.skipCountdown ? 'playing' : 'countdown',
    countdown: opts.skipCountdown ? 0 : LANE.countdownSec,
    t: 0,
    duration: opts.duration ?? LANE.roundSec,
    reduced: !!opts.reduced,
    lane,
    x: laneX(lane),
    z: 0,
    obstacles,
    spawn: opts.spawn ?? true,
    nextId,
    nextSpawnZ: 14,
    rng: opts.seed ?? 1,
    teaseLeft: 0,
    endAge: 0,
  };
}

function spawnRow(s: LaneState): void {
  const z = s.nextSpawnZ;
  const a = nextUnit(s.rng);
  s.rng = a.seed;
  const laneA = clampLane(Math.floor(a.value * 3));
  s.obstacles.push({ id: s.nextId++, lane: laneA, z, passed: false, missed: false });
  const b = nextUnit(s.rng);
  s.rng = b.seed;
  if (b.value < 0.4) {
    const c = nextUnit(s.rng);
    s.rng = c.seed;
    let laneB = clampLane(Math.floor(c.value * 3));
    if (laneB === laneA) laneB = clampLane(laneA + 1);
    s.obstacles.push({ id: s.nextId++, lane: laneB, z, passed: false, missed: false });
  }
  s.nextSpawnZ = z + LANE.spacing;
}

export function stepLane(
  state: LaneState,
  cmd: LaneCommand,
  dt: number,
): { state: LaneState; events: MiniEmotionEvent[] } {
  const events: MiniEmotionEvent[] = [];
  const step = dt > 0 ? dt : 0;
  const s: LaneState = {
    ...state,
    obstacles: state.obstacles.map((o) => ({ ...o })),
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

  if (cmd.pick != null) s.lane = cmd.pick;
  else if (cmd.swipe) s.lane = clampLane(s.lane + cmd.swipe);

  s.t += step;
  s.teaseLeft = Math.max(0, s.teaseLeft - step);
  const speed = LANE.baseSpeed + LANE.speedRamp * s.t;
  s.z += speed * step;
  const targetX = laneX(s.lane);
  const k = Math.min(1, step * LANE.laneLerp);
  s.x += (targetX - s.x) * k;

  if (s.spawn) {
    while (s.nextSpawnZ < s.z + LANE.spawnAhead) spawnRow(s);
  }

  for (const o of s.obstacles) {
    if (o.passed) continue;
    const dz = Math.abs(o.z - s.z);
    if (o.lane === s.lane && dz < LANE.hitHalf) {
      s.phase = 'result';
      s.outcome = 'crash';
      s.endAge = 0;
      events.push({ kind: 'crash', hints: { sadness: 0.66, surprise: 0.4 }, anim: 'crash' });
      return { state: s, events };
    }
    if (Math.abs(o.lane - s.lane) === 1 && dz < LANE.hitHalf && !o.missed) {
      o.missed = true;
      s.teaseLeft = 0.9;
      events.push({ kind: 'lane_near_miss', hints: { joy: 0.46, pride: 0.55 }, anim: 'tease' });
    }
    if (o.z < s.z - LANE.hitHalf) o.passed = true;
  }

  s.obstacles = s.obstacles.filter((o) => o.z > s.z - 12);

  if (s.t >= s.duration) {
    s.phase = 'result';
    s.outcome = 'survive';
    s.endAge = 0;
    events.push({ kind: 'survive', hints: { joy: 0.9, pride: 0.5 }, anim: 'win_pose' });
  }
  return { state: s, events };
}
