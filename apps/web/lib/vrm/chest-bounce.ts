// Secondary bounce for a chest or torso punch. A damped spring on the bust
// bones (not the ribcage, shoulders, or hips): compress with the hit, one
// rebound, then still. Peak is about 17°, enough to read on a poke.

import * as THREE from 'three';

/** How long the spring is allowed to move, seconds. */
export const CHEST_BOUNCE_SEC = 1.15;

const PEAK = 0.38; // radians, ~22° — readable on a breast poke

/** Pitch offset for a chest poke. Negative first (yield), then one rebound. */
export function chestBouncePitch(tSec: number): number {
  if (!(tSec > 0) || tSec > CHEST_BOUNCE_SEC) return 0;
  const damp = Math.exp(-tSec * 3.6);
  const pitch = -PEAK * damp * Math.sin(tSec * 11);
  return pitch === 0 ? 0 : pitch;
}

/** Chest and torso punches bounce. Head, arms, and legs stay still. */
export function chestPokeBounce(zone: string, tSec: number): number {
  const scale = zone === 'chest' ? 1 : zone === 'torso' ? 0.72 : 0;
  if (!scale) return 0;
  return chestBouncePitch(tSec) * scale;
}

/** Secondary bust bones only — not the chest/upper-chest ribcage. */
export function isBustBoneName(name: string): boolean {
  if (/skirt|hair|tail|coat|ribbon/i.test(name)) return false;
  return /bust|breast/i.test(name);
}

/** Left and right jiggle in opposite directions so a poke reads as a shake. */
export function bustSideSign(name: string): number {
  if (/(^|_)(l|left)(_|$)|_l_bust|leftbust|bust_l/i.test(name)) return 1;
  if (/(^|_)(r|right)(_|$)|_r_bust|rightbust|bust_r/i.test(name)) return -1;
  return 1;
}

/** Tip bones follow with a smaller share so the motion does not compound. */
export function bustBounceScale(name: string): number {
  return /2$/i.test(name) ? 0.55 : 1;
}

interface SpringJoint {
  bone: THREE.Object3D;
  reset(): void;
}

interface BustEntry {
  bone: THREE.Object3D;
  rest: THREE.Quaternion;
  scale: number;
  joint: SpringJoint | null;
}

const _axis = new THREE.Vector3(1, 0, 0);
const _yaw = new THREE.Vector3(0, 0, 1);
const _delta = new THREE.Quaternion();
const _yawQ = new THREE.Quaternion();

export class ChestBounce {
  private bones: BustEntry[] | null = null;
  private wasActive = false;

  apply(
    root: THREE.Object3D,
    pitch: number,
    joints?: Iterable<SpringJoint> | null,
  ): void {
    if (!this.bones) this.bones = collectBust(root, joints);
    const active = Math.abs(pitch) > 1e-5;
    if (!active && !this.wasActive) return;
    for (const entry of this.bones) {
      if (active) {
        _delta.setFromAxisAngle(_axis, pitch * entry.scale);
        _yawQ.setFromAxisAngle(_yaw, pitch * entry.scale * 0.35 * bustSideSign(entry.bone.name));
        entry.bone.quaternion.copy(entry.rest).multiply(_delta).multiply(_yawQ);
      } else {
        entry.bone.quaternion.copy(entry.rest);
      }
      entry.bone.updateMatrix();
      entry.bone.updateWorldMatrix(false, true);
    }
    // The skeleton matrices were baked in vrm.update() before this write.
    root.traverse((node) => {
      const mesh = node as THREE.SkinnedMesh;
      if (mesh.isSkinnedMesh) mesh.skeleton.update();
    });
    if (this.wasActive && !active) {
      for (const entry of this.bones) entry.joint?.reset();
    }
    this.wasActive = active;
  }
}

function collectBust(root: THREE.Object3D, joints?: Iterable<SpringJoint> | null): BustEntry[] {
  const byBone = new Map<THREE.Object3D, SpringJoint>();
  if (joints) {
    for (const joint of joints) byBone.set(joint.bone, joint);
  }
  const out: BustEntry[] = [];
  root.traverse((node) => {
    if (!isBustBoneName(node.name)) return;
    out.push({
      bone: node,
      rest: node.quaternion.clone(),
      scale: bustBounceScale(node.name),
      joint: byBone.get(node) ?? null,
    });
  });
  return out;
}
