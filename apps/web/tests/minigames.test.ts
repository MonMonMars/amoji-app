import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { EMOTION_IDS } from '@amoji/emotion-core';
import { TUTORIAL_LINES } from '../lib/showcase';
import {
  CAM_LERP,
  LANE,
  TAG,
  createLane,
  createTag,
  detectActionGame,
  expressionFor,
  laneCamera,
  lineFor,
  resolveGameClip,
  stepLane,
  stepTag,
  tagCamera,
  viewOfLane,
  viewOfTag,
  LANE_IDLE_CMD,
  TAG_IDLE_CMD,
  type LaneState,
  type MiniEmotionKind,
} from '../lib/minigames';

const LANGS = ['yue', 'zh', 'ja', 'en'] as const;
const EMOTIONS: MiniEmotionKind[] = ['near_miss', 'catch', 'timeout', 'lane_near_miss', 'crash', 'survive', 'quit'];
const here = path.dirname(new URL(import.meta.url).pathname);

function frames<T>(start: T, n: number, dt: number, step: (s: T) => T): T {
  let s = start;
  for (let i = 0; i < n; i++) s = step(s);
  void dt;
  return s;
}

describe('tag + lane dodge specs', () => {
  it('locks the v1 numbers', () => {
    expect(TAG.half * 2).toBe(8);
    expect(TAG.catchRadius).toBeGreaterThanOrEqual(0.6);
    expect(TAG.catchRadius).toBeLessThanOrEqual(0.8);
    expect(TAG.nearMiss).toBeGreaterThan(TAG.catchRadius);
    expect(TAG.roundSec).toBeGreaterThanOrEqual(45);
    expect(TAG.roundSec).toBeLessThanOrEqual(60);
    expect(TAG.dashCd).toBeCloseTo(1.2);
    expect(TAG.vrmSpeedRatio).toBeCloseTo(0.85);
    expect(LANE.count).toBe(3);
    expect(LANE.roundSec).toBeGreaterThanOrEqual(45);
    expect(LANE.roundSec).toBeLessThanOrEqual(60);
    expect(CAM_LERP).toBeCloseTo(0.1);
  });

  it('counts down before anyone moves', () => {
    const s0 = createTag();
    const r = stepTag(s0, { hold: true, aimX: 3, aimZ: -3, dash: true }, 0.2);
    expect(r.state.phase).toBe('countdown');
    expect(r.state.player.x).toBe(s0.player.x);
    expect(r.state.vrm.z).toBe(s0.vrm.z);
    expect(r.state.dashLeft).toBe(0);
    const playing = frames(s0, 62, 0.05, (s) => stepTag(s, TAG_IDLE_CMD, 0.05).state);
    expect(playing.phase).toBe('playing');
  });

  it('dashes on a tap and then waits out the cooldown', () => {
    let s = createTag({ skipCountdown: true, zig: false });
    let r = stepTag(s, { hold: false, aimX: 0, aimZ: 0, dash: true }, 0.016);
    expect(r.state.dashLeft).toBeGreaterThan(0.15);
    const left = r.state.dashLeft;
    r = stepTag(r.state, { hold: false, aimX: 0, aimZ: 0, dash: true }, 0.016);
    expect(r.state.dashLeft).toBeLessThan(left);
    s = frames(r.state, 30, 0.05, (st) => stepTag(st, TAG_IDLE_CMD, 0.05).state);
    expect(s.dashCd).toBe(0);
    r = stepTag(s, { hold: false, aimX: 1, aimZ: 0, dash: true }, 0.016);
    expect(r.state.dashLeft).toBeGreaterThan(0.2);
  });

  it('clamps both bodies inside the pad', () => {
    let s = createTag({
      skipCountdown: true,
      zig: false,
      player: { x: 3.4, z: 0 },
      vrm: { x: -2, z: 0 },
    });
    s = frames(s, 24, 0.05, (st) => stepTag(st, { hold: true, aimX: 20, aimZ: 0, dash: false }, 0.05).state);
    expect(s.player.x).toBeLessThanOrEqual(TAG.inset);
    expect(s.player.x).toBeGreaterThan(3.4);
    expect(Math.abs(s.player.x)).toBeLessThanOrEqual(TAG.half);
    expect(Math.abs(s.vrm.x)).toBeLessThanOrEqual(TAG.inset);
    expect(Math.abs(s.vrm.z)).toBeLessThanOrEqual(TAG.inset);
  });

  it('flees slower than the player runs, and zig-zags', () => {
    const dt = 0.3;
    const speed = TAG.playerSpeed * TAG.vrmSpeedRatio;
    let s = createTag({ skipCountdown: true, zig: false, player: { x: 0, z: 0 }, vrm: { x: 0, z: 2 } });
    const z0 = s.vrm.z;
    s = stepTag(s, TAG_IDLE_CMD, dt).state;
    const moved = s.vrm.z - z0;
    expect(moved).toBeGreaterThan(speed * dt * 0.92);
    expect(moved).toBeLessThan(speed * dt * 1.05);
    expect(moved).toBeLessThan(TAG.playerSpeed * dt);

    let zig = createTag({ skipCountdown: true, player: { x: 0, z: 0 }, vrm: { x: 0, z: 1 } });
    let maxX = 0;
    for (let i = 0; i < 40; i++) {
      zig = stepTag(zig, TAG_IDLE_CMD, 0.05).state;
      maxX = Math.max(maxX, Math.abs(zig.vrm.x));
    }
    expect(maxX).toBeGreaterThan(0.05);
  });

  it('catches inside the radius and times out without one', () => {
    const caught = stepTag(
      createTag({ skipCountdown: true, player: { x: 0, z: 0 }, vrm: { x: 0.4, z: 0 } }),
      TAG_IDLE_CMD,
      0.01,
    );
    expect(caught.state.outcome).toBe('catch');
    expect(caught.events[0]?.kind).toBe('catch');
    expect(caught.events[0]?.hints.surprise).toBeGreaterThan(0);

    let s = createTag({
      skipCountdown: true,
      duration: 0.3,
      zig: false,
      player: { x: 0, z: 0 },
      vrm: { x: 3, z: 0 },
    });
    let timed = false;
    for (let i = 0; i < 12; i++) {
      const r = stepTag(s, TAG_IDLE_CMD, 0.05);
      s = r.state;
      if (r.events.some((e) => e.kind === 'timeout')) timed = true;
    }
    expect(s.outcome).toBe('timeout');
    expect(timed).toBe(true);
  });

  it('fires a near-miss once per approach', () => {
    let s = createTag({ skipCountdown: true, zig: false, player: { x: 0, z: 0 }, vrm: { x: 1, z: 0 } });
    let r = stepTag(s, TAG_IDLE_CMD, 0.01);
    expect(r.events.some((e) => e.kind === 'near_miss')).toBe(true);
    r = stepTag(r.state, TAG_IDLE_CMD, 0.01);
    expect(r.events.some((e) => e.kind === 'near_miss')).toBe(false);
    s = frames(r.state, 30, 0.05, (st) => stepTag(st, TAG_IDLE_CMD, 0.05).state);
    expect(s.nearLatched).toBe(false);
    s = {
      ...s,
      player: { x: 0, z: 0, yaw: 0 },
      vrm: { x: 1, z: 0, yaw: 0 },
      nearLatched: false,
    };
    r = stepTag(s, TAG_IDLE_CMD, 0.01);
    expect(r.events.some((e) => e.kind === 'near_miss')).toBe(true);
  });

  it('holds a fixed elevated camera when motion is reduced', () => {
    const a = tagCamera(createTag({ reduced: true, skipCountdown: true, player: { x: 1, z: 1 }, vrm: { x: -1, z: -1 } }));
    const b = tagCamera(createTag({ reduced: true, skipCountdown: true, player: { x: -2, z: 2 }, vrm: { x: 2, z: 0 } }));
    expect(a.follow).toBe(false);
    expect(a.cam).toEqual(b.cam);
    expect(a.cam.y).toBeGreaterThan(6);
    expect(tagCamera(createTag({ skipCountdown: true })).follow).toBe(true);
    expect(viewOfTag(createTag({ reduced: true, skipCountdown: true })).camFollow).toBe(false);
  });
});

describe('lane dodge', () => {
  it('changes lanes by swipe or an absolute pick, and stays inside 0..2', () => {
    let s = createLane({ skipCountdown: true, spawn: false });
    s = stepLane(s, { swipe: 0, pick: 2 }, 0.016).state;
    expect(s.lane).toBe(2);
    s = stepLane(s, { swipe: 1, pick: null }, 0.016).state;
    expect(s.lane).toBe(2);
    s = stepLane(s, { swipe: -1, pick: null }, 0.016).state;
    expect(s.lane).toBe(1);
    s = stepLane(s, { swipe: -1, pick: null }, 0.016).state;
    s = stepLane(s, { swipe: -1, pick: null }, 0.016).state;
    expect(s.lane).toBe(0);
  });

  it('crashes on the same lane and survives a side step', () => {
    const hit = stepLane(
      createLane({ skipCountdown: true, spawn: false, lane: 1, obstacles: [{ lane: 1, z: 0.3 }] }),
      LANE_IDLE_CMD,
      0.05,
    );
    expect(hit.state.outcome).toBe('crash');
    expect(hit.events[0]?.anim).toBe('crash');

    let s = createLane({ skipCountdown: true, spawn: false, lane: 1, obstacles: [{ lane: 1, z: 2 }] });
    const r = stepLane(s, { swipe: -1, pick: null }, 0.05);
    expect(r.state.lane).toBe(0);
    s = r.state;
    for (let i = 0; i < 20; i++) s = stepLane(s, LANE_IDLE_CMD, 0.05).state;
    expect(s.outcome).not.toBe('crash');
  });

  it('winks a near-miss on the neighbouring lane and survives a clear road', () => {
    let s = createLane({
      skipCountdown: true,
      spawn: false,
      lane: 0,
      obstacles: [{ lane: 1, z: 1.2 }],
    });
    let saw = false;
    for (let i = 0; i < 20 && s.phase === 'playing'; i++) {
      const r = stepLane(s, LANE_IDLE_CMD, 0.05);
      s = r.state;
      if (r.events.some((e) => e.kind === 'lane_near_miss')) saw = true;
    }
    expect(saw).toBe(true);
    expect(s.outcome).not.toBe('crash');

    s = createLane({ skipCountdown: true, duration: 0.2, spawn: false, obstacles: [] });
    for (let i = 0; i < 8; i++) s = stepLane(s, LANE_IDLE_CMD, 0.05).state;
    expect(s.outcome).toBe('survive');
  });

  it('never blocks all three lanes in one row', () => {
    const safeLane = (s: LaneState): 0 | 1 | 2 => {
      const blocked = new Set(
        s.obstacles.filter((o) => Math.abs(o.z - s.z) < 2.4).map((o) => o.lane),
      );
      for (const lane of [0, 1, 2] as const) if (!blocked.has(lane)) return lane;
      return 1;
    };
    let s = createLane({ skipCountdown: true, duration: 2, seed: 4 });
    const seen = new Map<number, Set<number>>();
    for (let i = 0; i < 50 && s.phase === 'playing'; i++) {
      const r = stepLane(s, { swipe: 0, pick: safeLane(s) }, 0.05);
      s = r.state;
      for (const o of s.obstacles) {
        const set = seen.get(o.z) ?? new Set<number>();
        set.add(o.lane);
        seen.set(o.z, set);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
    for (const set of seen.values()) expect(set.size).toBeLessThan(3);
    expect(s.outcome).not.toBe('crash');
  });

  it('locks the camera behind center lane when motion is reduced', () => {
    let s = createLane({ reduced: true, skipCountdown: true, lane: 2, spawn: false });
    s = stepLane(s, LANE_IDLE_CMD, 0.2).state;
    const cam = laneCamera(s);
    expect(cam.follow).toBe(false);
    expect(cam.cam.x).toBe(0);
    expect(cam.cam.z).toBeLessThan(s.z);
    expect(viewOfLane(s).camFollow).toBe(false);
    expect(laneCamera(createLane({ skipCountdown: true, spawn: false })).follow).toBe(true);
  });
});

describe('clips, lines, and chat entry', () => {
  it('maps anim states onto loaded clips and falls back', () => {
    const have = new Set(['StandardIdle', 'Jump', 'Cheer', 'Bow', 'Blush', 'LookAround']);
    expect(resolveGameClip('dash', have)).toEqual({ id: 'Jump', loop: true });
    expect(resolveGameClip('run', have)?.id).toBe('StandardIdle');
    expect(resolveGameClip('idle', have)?.id).toBe('StandardIdle');
    expect(resolveGameClip('idle', new Set(['IdleNeutral', 'IdleBreathCalm']))?.id).toBe('IdleBreathCalm');
    expect(resolveGameClip('caught', have)?.id).toBe('Cheer');
    expect(resolveGameClip('pout', new Set(['Relax']))?.id).toBe('Relax');
    expect(resolveGameClip('win_pose', new Set())).toBeNull();
    expect(expressionFor('tease').blinkLeft).toBeGreaterThan(0.5);
    expect(expressionFor('pout').sad).toBeGreaterThan(0.5);
    expect(expressionFor('win_pose').happy).toBeGreaterThan(0.5);
  });

  it('has a canned line per outcome in every language', () => {
    const ids = new Set<string>(EMOTION_IDS);
    for (const kind of EMOTIONS) {
      for (const lang of LANGS) {
        expect(lineFor(kind, lang).length).toBeGreaterThan(1);
      }
    }
    const sample = stepTag(
      createTag({ skipCountdown: true, player: { x: 0, z: 0 }, vrm: { x: 0.3, z: 0 } }),
      TAG_IDLE_CMD,
      0.01,
    ).events[0]!;
    for (const key of Object.keys(sample.hints)) expect(ids.has(key)).toBe(true);
  });

  it('opens from the phrases the showcase teaches', () => {
    expect(detectActionGame('捕まえて')).toBe('tag');
    expect(detectActionGame('玩捉人')).toBe('tag');
    expect(detectActionGame('play tag')).toBe('tag');
    expect(detectActionGame('逃げて')).toBe('lane');
    expect(detectActionGame('lane dodge')).toBe('lane');
    expect(detectActionGame('三線躲避')).toBe('lane');
    expect(detectActionGame('guess the number')).toBeUndefined();
    expect(detectActionGame('唱首歌俾我')).toBeUndefined();
    expect(detectActionGame(`逃げて${'あ'.repeat(80)}`)).toBeUndefined();
  });

  it('teaches both real games from the showcase tutorial', () => {
    for (const lang of LANGS) {
      const blob = TUTORIAL_LINES[lang].join('\n');
      expect(blob).toContain('捕まえて');
      expect(blob).toContain('逃げて');
    }
    expect(TUTORIAL_LINES.en.join(' ').toLowerCase()).not.toContain('rock-paper-scissors');
    expect(TUTORIAL_LINES.en.join(' ').toLowerCase()).toContain('game');
  });

  it('stays on the existing canvas, kinematic, and pauses while hidden', () => {
    const root = path.resolve(here, '..');
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    const overlay = fs.readFileSync(path.join(root, 'components/MiniGameOverlay.tsx'), 'utf8');
    const chat = fs.readFileSync(path.join(root, 'components/ChatPanel.tsx'), 'utf8');
    expect(canvas).toContain('getMiniGameView');
    expect(canvas).toContain('CAM_LERP');
    expect(canvas).toContain('visibilitychange');
    expect(overlay).toContain('visibilitychange');
    expect(chat).toContain('MiniGameOverlay');
    expect(chat).toContain('detectActionGame');
    const dir = path.join(root, 'lib/minigames');
    for (const file of fs.readdirSync(dir)) {
      const src = fs.readFileSync(path.join(dir, file), 'utf8');
      expect(src.toLowerCase()).not.toMatch(/rapier|cannon/);
    }
  });
});
