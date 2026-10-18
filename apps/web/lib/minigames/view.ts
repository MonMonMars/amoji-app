import { expressionFor } from './anim';
import { laneCamera, tagCamera } from './camera';
import { laneX } from './constants';
import type { LaneState } from './lane';
import type { TagState } from './tag';
import type { GameAnim, MiniGameView } from './types';

function tagAnim(s: TagState): GameAnim {
  if (s.phase === 'countdown') return 'tease';
  if (s.outcome === 'catch') return s.endAge < 0.75 ? 'caught' : 'win_pose';
  if (s.outcome === 'timeout') return 'pout';
  if (s.dashLeft > 0) return 'dash';
  if (s.teaseLeft > 0) return 'tease';
  return 'run';
}

function laneAnim(s: LaneState): GameAnim {
  if (s.phase === 'countdown') return 'idle';
  if (s.outcome === 'crash') return s.endAge < 0.65 ? 'crash' : 'pout';
  if (s.outcome === 'survive') return 'win_pose';
  if (s.teaseLeft > 0) return 'tease';
  return 'run';
}

export function viewOfTag(s: TagState): MiniGameView {
  const anim = tagAnim(s);
  const rig = tagCamera(s);
  return {
    kind: 'tag',
    phase: s.phase,
    vrmX: s.vrm.x,
    vrmZ: s.vrm.z,
    vrmYaw: s.vrm.yaw,
    anim,
    expr: expressionFor(anim),
    camX: rig.cam.x,
    camY: rig.cam.y,
    camZ: rig.cam.z,
    lookX: rig.look.x,
    lookY: rig.look.y,
    lookZ: rig.look.z,
    camFollow: rig.follow,
    marker: { x: s.player.x, z: s.player.z, yaw: s.player.yaw },
    obstacles: [],
  };
}

export function viewOfLane(s: LaneState): MiniGameView {
  const anim = laneAnim(s);
  const rig = laneCamera(s);
  const obstacles = s.obstacles
    .filter((o) => !o.passed && o.z > s.z - 2 && o.z < s.z + 26)
    .slice(0, 16)
    .map((o) => ({
      id: o.id,
      x: laneX(o.lane),
      z: o.z,
      w: 0.72,
      d: 0.72,
      h: 0.95,
    }));
  return {
    kind: 'lane',
    phase: s.phase,
    vrmX: s.x,
    vrmZ: s.z,
    vrmYaw: 0,
    anim,
    expr: expressionFor(anim),
    camX: rig.cam.x,
    camY: rig.cam.y,
    camZ: rig.cam.z,
    lookX: rig.look.x,
    lookY: rig.look.y,
    lookZ: rig.look.z,
    camFollow: rig.follow,
    marker: null,
    obstacles,
  };
}
