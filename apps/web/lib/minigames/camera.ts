// Soft third-person rig. Follow frames are lerped by CAM_LERP in the canvas.
// prefers-reduced-motion: Tag locks to a fixed elevated overview;
// Lane locks behind the center of the road (x = 0) and only tracks forward z.

import type { LaneState } from './lane';
import type { TagState } from './tag';
import type { Vec3 } from './types';

export interface CameraRig {
  cam: Vec3;
  look: Vec3;
  follow: boolean;
}

const ELEV = (35 * Math.PI) / 180;

export function tagCamera(state: TagState): CameraRig {
  if (state.reduced) {
    return {
      follow: false,
      look: { x: 0, y: 0.9, z: 0 },
      cam: { x: 0, y: 8.6, z: 6.2 },
    };
  }
  const look = {
    x: state.player.x * 0.35 + state.vrm.x * 0.65,
    y: 1.05,
    z: state.player.z * 0.35 + state.vrm.z * 0.65,
  };
  const dist = 4.8;
  const horiz = dist * Math.cos(ELEV);
  const yaw = state.player.yaw;
  return {
    follow: true,
    look,
    cam: {
      x: state.player.x - Math.sin(yaw) * horiz,
      y: look.y + dist * Math.sin(ELEV),
      z: state.player.z - Math.cos(yaw) * horiz,
    },
  };
}

export function laneCamera(state: LaneState): CameraRig {
  if (state.reduced) {
    return {
      follow: false,
      look: { x: 0, y: 1.05, z: state.z + 2 },
      cam: { x: 0, y: 2.5, z: state.z - 4.4 },
    };
  }
  return {
    follow: true,
    look: { x: state.x, y: 1.05, z: state.z + 1.4 },
    cam: { x: state.x, y: 2.35, z: state.z - 4.3 },
  };
}
