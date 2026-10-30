import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MiniGameOverlay from '../components/MiniGameOverlay';
import { EMOTION_IDS } from '@amoji/emotion-core';
import { arcPose } from '../components/ArcFan';
import { TUTORIAL_LINES } from '../lib/showcase';
import {
  CAM_LERP,
  LANE,
  TAG,
  classifyHostPlatform,
  controlHint,
  controlSchemeFor,
  createLane,
  createTag,
  desktopTagAim,
  detectActionGame,
  GAME_CARDS,
  gameCardCopy,
  miniGameModelCandidates,
  resolveMiniGameCompanion,
  expressionFor,
  laneCamera,
  laneSwipeThreshold,
  lineFor,
  resolveGameClip,
  stepLane,
  stepTag,
  tagCamera,
  tagKeysFromEvent,
  viewOfLane,
  viewOfTag,
  LANE_IDLE_CMD,
  TAG_IDLE_CMD,
  type LaneState,
  type MiniEmotionKind,
  type PlatformProbe,
} from '../lib/minigames';

const LANGS = ['yue', 'zh', 'ja', 'en'] as const;
const EMOTIONS: MiniEmotionKind[] = ['near_miss', 'catch', 'timeout', 'lane_near_miss', 'crash', 'survive', 'quit'];
const here = path.dirname(fileURLToPath(import.meta.url));

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

  it('plays the selected female library companion, never a retired demo mesh', () => {
    expect(resolveMiniGameCompanion('a01-shino').id).toBe('a01-shino');
    expect(resolveMiniGameCompanion('a04-avatarsample-a').id).toBe('a04-avatarsample-a');
    expect(resolveMiniGameCompanion('a98-ethan', 'a02-shibu').id).toBe('a02-shibu');
    expect(resolveMiniGameCompanion('a98-ethan').id).toBe('a01-shino');
    expect(resolveMiniGameCompanion('a24-hairsample-male', 'juno').id).toBe('a01-shino');
    expect(resolveMiniGameCompanion('juno').id).toBe('a01-shino');
    expect(resolveMiniGameCompanion('avatarsample-a', 'a10-agahomei-normal').id).toBe('a10-agahomei-normal');
    expect(miniGameModelCandidates(resolveMiniGameCompanion('a98-ethan', 'a02-shibu').model)).toEqual([
      'want/a02-shibu.vrm',
    ]);
    expect(miniGameModelCandidates('seed-san.vrm')).toEqual([]);
    expect(miniGameModelCandidates('cast/juno.vrm')).toEqual([]);
    expect(resolveMiniGameCompanion('a01-shino').gender).toBe('female');
    expect(resolveMiniGameCompanion('a98-ethan', 'a02-shibu').gender).toBe('female');
  });

  it('offers Tag and Lane Dodge on the character-select card fan', () => {
    expect(GAME_CARDS.map((card) => card.id)).toEqual(['tag', 'lane']);
    expect(gameCardCopy('tag', 'ja').title).toBe('捕まえて！');
    expect(gameCardCopy('lane', 'en').title).toBe('逃げて！');
    const center = arcPose(0, 76);
    const side = arcPose(1, 76);
    expect(center.z).toBeGreaterThan(side.z);
    expect(center.scale).toBeGreaterThan(side.scale);
    const root = path.resolve(here, '..');
    const page = fs.readFileSync(path.join(root, 'app/chat/page.tsx'), 'utf8');
    const picker = fs.readFileSync(path.join(root, 'components/MiniGamePicker.tsx'), 'utf8');
    const fan = fs.readFileSync(path.join(root, 'components/ArcFan.tsx'), 'utf8');
    expect(page).toContain('MiniGameMenuButton');
    expect(picker).toContain('minigame-menu');
    expect(page).toContain('MiniGamePicker');
    expect(picker).toContain('ArcFan');
    expect(picker).toContain('onConfirm');
    expect(fan).toContain('onConfirm');
  });

  it('stays on the existing canvas, kinematic, and pauses while hidden', () => {
    const root = path.resolve(here, '..');
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    const overlay = fs.readFileSync(path.join(root, 'components/MiniGameOverlay.tsx'), 'utf8');
    const chat = fs.readFileSync(path.join(root, 'components/ChatPanel.tsx'), 'utf8');
    expect(canvas).toContain('getMiniGameView');
    expect(canvas).toContain('libraryOnly');
    expect(canvas).toContain('miniGameModelCandidates');
    const page = fs.readFileSync(path.join(root, 'app/chat/page.tsx'), 'utf8');
    expect(page).toContain('resolveMiniGameCompanion');
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

function probe(partial: Partial<PlatformProbe> & Pick<PlatformProbe, 'userAgent'>): PlatformProbe {
  return {
    maxTouchPoints: 0,
    pointerFine: false,
    hoverHover: false,
    capacitorPlatform: null,
    ...partial,
  };
}

describe('mini-game host controls', () => {
  it('treats a fine hovering browser as desktop, even with a touchscreen', () => {
    const desktop = probe({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      maxTouchPoints: 10,
      pointerFine: true,
      hoverHover: true,
    });
    expect(classifyHostPlatform(desktop)).toBe('desktop');
    expect(controlSchemeFor('desktop')).toBe('keyboard');
  });

  it('classifies iPhone, iPadOS, and Capacitor iOS as touch', () => {
    expect(classifyHostPlatform(probe({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1',
      maxTouchPoints: 5,
    }))).toBe('ios');
    expect(classifyHostPlatform(probe({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15',
      maxTouchPoints: 5,
      pointerFine: true,
      hoverHover: true,
    }))).toBe('ios');
    expect(classifyHostPlatform(probe({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      pointerFine: true,
      hoverHover: true,
      capacitorPlatform: 'ios',
    }))).toBe('ios');
    expect(controlSchemeFor('ios')).toBe('touch');
  });

  it('classifies Android Chrome, PWA, and Capacitor as touch', () => {
    expect(classifyHostPlatform(probe({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
      maxTouchPoints: 5,
    }))).toBe('android');
    expect(classifyHostPlatform(probe({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      pointerFine: true,
      hoverHover: true,
      capacitorPlatform: 'android',
    }))).toBe('android');
    expect(classifyHostPlatform(probe({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      pointerFine: true,
      hoverHover: true,
      maxTouchPoints: 5,
    }))).toBe('android');
    expect(controlSchemeFor('android')).toBe('touch');
  });

  it('lets Capacitor web fall through to the browser pointer', () => {
    expect(classifyHostPlatform(probe({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      pointerFine: true,
      hoverHover: true,
      capacitorPlatform: 'web',
    }))).toBe('desktop');
  });

  it('uses a shorter lane swipe on Android and the same touch copy as iOS', () => {
    expect(laneSwipeThreshold('android')).toBeLessThan(laneSwipeThreshold('ios'));
    expect(laneSwipeThreshold('desktop')).toBe(laneSwipeThreshold('ios'));
    for (const lang of LANGS) {
      expect(controlHint('lane', 'ios', lang)).toBe(controlHint('lane', 'android', lang));
      expect(controlHint('tag', 'ios', lang)).toBe(controlHint('tag', 'android', lang));
      expect(controlHint('lane', 'desktop', lang)).not.toBe(controlHint('lane', 'ios', lang));
    }
    expect(controlHint('lane', 'desktop', 'en')).toContain('A/D');
    expect(controlHint('lane', 'desktop', 'en')).toMatch(/arrow/i);
    expect(controlHint('lane', 'ios', 'en')).toBe('Swipe left/right');
    expect(controlHint('tag', 'desktop', 'en')).toContain('WASD');
    expect(controlHint('tag', 'ios', 'en')).not.toMatch(/A\/D|WASD/);
  });

  it('aims Tag with camera-relative WASD and ignores keys that are up', () => {
    const none = desktopTagAim(
      { w: false, a: false, s: false, d: false },
      { x: 0, z: 0 },
      { x: 0, z: 5 },
      { x: 0, z: 0 },
    );
    expect(none.hold).toBe(false);
    const w = desktopTagAim(
      { w: true, a: false, s: false, d: false },
      { x: 1, z: 2 },
      { x: 1, z: 6 },
      { x: 1, z: 2 },
    );
    expect(w.hold).toBe(true);
    expect(w.aimZ).toBeLessThan(2);
    expect(w.aimX).toBeCloseTo(1);
    const d = desktopTagAim(
      { w: false, a: false, s: false, d: true },
      { x: 0, z: 0 },
      { x: 0, z: 5 },
      { x: 0, z: 0 },
    );
    expect(d.aimX).toBeLessThan(0);
    const a = desktopTagAim(
      { w: false, a: true, s: false, d: false },
      { x: 0, z: 0 },
      { x: 0, z: 5 },
      { x: 0, z: 0 },
    );
    expect(a.aimX).toBeGreaterThan(0);
    expect(tagKeysFromEvent('ArrowLeft', true, { w: false, a: false, s: false, d: false }).a).toBe(true);
    expect(tagKeysFromEvent('D', false, { w: false, a: false, s: false, d: true }).d).toBe(false);
  });

  it('opens a title screen, then a corner HUD, and hides chat chrome', () => {
    const root = path.resolve(here, '..');
    const overlay = fs.readFileSync(path.join(root, 'components/MiniGameOverlay.tsx'), 'utf8');
    const chat = fs.readFileSync(path.join(root, 'components/ChatPanel.tsx'), 'utf8');
    const page = fs.readFileSync(path.join(root, 'app/chat/page.tsx'), 'utf8');
    const platform = fs.readFileSync(path.join(root, 'lib/minigames/platform.ts'), 'utf8');
    expect(fs.existsSync(path.join(root, 'public/minigames/howto-tag.jpg'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'public/minigames/howto-lane-dodge.jpg'))).toBe(true);
    expect(overlay).toContain('data-phase="title"');
    expect(overlay).toContain('minigame-start');
    expect(overlay).toContain('minigame-howto');
    expect(overlay).toContain('aspect-square');
    expect(overlay).toContain('minigame-howto-frame');
    expect(overlay).toContain('max-w-[min(100%,22rem)]');
    expect(overlay).toContain('HOWTO_SRC');
    expect(platform).toContain('/minigames/howto-tag.jpg');
    expect(platform).toContain('/minigames/howto-lane-dodge.jpg');
    expect(overlay).toContain('minigame-back');
    expect(overlay).toContain('minigame-score');
    expect(overlay).toContain('safe-area-inset-top');
    expect(overlay).toContain('controlSchemeFor');
    expect(overlay).toContain('laneSwipeThreshold');
    expect(overlay).toContain("scheme !== 'keyboard'");
    expect(overlay.indexOf('left-[max(1rem,env(safe-area-inset-left))]')).toBeGreaterThan(0);
    expect(overlay.indexOf('right-[max(1rem,env(safe-area-inset-right))]')).toBeGreaterThan(0);
    const gate = chat.indexOf('if (actionGame)');
    const history = chat.indexOf("maxHeight: '17vh'");
    expect(gate).toBeGreaterThan(0);
    expect(gate).toBeLessThan(history);
    expect(chat).toContain('setMiniGameChromeHidden');
    expect(chat).toContain('subscribeMiniGameOpen');
    expect(page).toContain('MiniGamePicker');
    expect(page).toContain('requestOpenMiniGame');
    expect(page).not.toContain('components/MiniGameMenu');
    expect(page).toContain('subscribeMiniGameChrome');
    expect(page).toContain('gameChromeHidden');
  });

  it('renders the title screen with START, the howto graphic, and a desktop control line', () => {
    const html = renderToStaticMarkup(
      React.createElement(MiniGameOverlay, {
        kind: 'lane',
        lang: 'en',
        onEmotion: () => {},
        onExit: () => {},
      }),
    );
    expect(html).toContain('data-phase="title"');
    expect(html).toContain('data-scheme="keyboard"');
    expect(html).toContain('>START<');
    expect(html).toContain('howto-lane-dodge.jpg');
    expect(html).toContain('PC: A/D or arrow keys');
    expect(html).toContain('data-testid="minigame-back"');
    expect(html).not.toContain('data-testid="minigame-score"');
    const tag = renderToStaticMarkup(
      React.createElement(MiniGameOverlay, {
        kind: 'tag',
        lang: 'en',
        onEmotion: () => {},
        onExit: () => {},
      }),
    );
    expect(tag).toContain('howto-tag.jpg');
    expect(tag).toContain('PC: WASD or arrows to chase');
    expect(tag).toContain('捕まえて！');
  });
});
