// Subtle secondary motion for a chest poke. A single damped spring on the
// bust bones (not the ribcage, shoulders, or hips): compress, one small
// return, then still. Peak is about 5°, which reads as a soft settle.

import * as THREE from 'three';

/** How long the spring is allowed to move, seconds. */
export const CHEST_BOUNCE_SEC = 0.8;

const PEAK = 0.09; // radians, ~5°

/** Pitch offset for a chest poke. Negative first (yield), then one rebound. */
export function chestBouncePitch(tSec: number): number {
  if (!(tSec > 0) || tSec > CHEST_BOUNCE_SEC) return 0;
  const damp = Math.exp(-tSec * 6.5);
  const pitch = -PEAK * damp * Math.sin(tSec * 16);
  return pitch === 0 ? 0 : pitch;
}

/** Non-chest pokes stay still. */
export function chestPokeBounce(zone: string, tSec: number): number {
  if (zone !== 'chest') return 0;
  return chestBouncePitch(tSec);
}

/** Secondary bust bones only — not the chest/upper-chest ribcage. */
export function isBustBoneName(name: string): boolean {
  return /(?:^|_)bust\d*$/i.test(name) || /(?:^|_)breast\d*$/i.test(name);
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
const _delta = new THREE.Quaternion();

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
        entry.bone.quaternion.copy(entry.rest).multiply(_delta);
      } else {
        entry.bone.quaternion.copy(entry.rest);
      }
      entry.bone.updateMatrix();
      entry.bone.updateWorldMatrix(false, true);
    }
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
