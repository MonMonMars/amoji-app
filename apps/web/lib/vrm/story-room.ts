import * as THREE from 'three';

/**
 * Story-room GLB pipeline helpers.
 * Grab3D interiors often ship MeshStandard/PBR with high metalness and no
 * envMap — under ACES they read as pure black and can fill the frame.
 * Also oversized rooms can leave a front wall between the camera and the
 * companion after the width-only fit. These helpers keep night scenes moody
 * via the JPG SceneBackdrop while characters stay readable.
 */

/** Soft floor for room albedo luminance (linear). Below this → lift tint. */
export const STORY_ROOM_MIN_ALBEDO_LUM = 0.08;
/** Lifted neutral when albedo is near-black and no color map is bound. */
export const STORY_ROOM_LIFT_COLOR = new THREE.Color(0.18, 0.18, 0.2);
/** Matte floor so rooms light under cast daylight without an envMap. */
export const STORY_ROOM_MIN_ROUGHNESS = 0.7;
/**
 * Companion stands near z=0; keep the room's front face behind this so
 * opaque walls cannot occlude the character.
 */
export const STORY_ROOM_MAX_FRONT_Z = -0.85;

function albedoLum(c: THREE.Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function sanitizeOne(mat: THREE.Material): void {
  // MeshStandard / MeshPhysical share metalness+roughness+color.
  const std = mat as THREE.MeshStandardMaterial;
  if ('metalness' in std) {
    std.metalness = 0;
    const rough = typeof std.roughness === 'number' ? std.roughness : 1;
    std.roughness = Math.max(STORY_ROOM_MIN_ROUGHNESS, rough);
    if (std.color) {
      if (!std.map && albedoLum(std.color) < STORY_ROOM_MIN_ALBEDO_LUM) {
        std.color.copy(STORY_ROOM_LIFT_COLOR);
      } else if (std.color.r === 0 && std.color.g === 0 && std.color.b === 0) {
        // Mapped but tint black → white so the map (or missing map) stays visible.
        std.color.setRGB(1, 1, 1);
      }
    }
    if (typeof std.envMapIntensity === 'number') {
      std.envMapIntensity = Math.max(std.envMapIntensity, 0.35);
    }
    std.needsUpdate = true;
    return;
  }
  const basic = mat as THREE.MeshBasicMaterial;
  if (basic.color && !basic.map && albedoLum(basic.color) < STORY_ROOM_MIN_ALBEDO_LUM) {
    basic.color.copy(STORY_ROOM_LIFT_COLOR);
    basic.needsUpdate = true;
  }
}

/** Force matte, readable room materials under cast daylight (no envMap required). */
export function sanitizeStoryRoomMaterials(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (m) sanitizeOne(m);
    }
  });
}

/**
 * After scale + floor fit, push the room so its front face stays behind the
 * companion. No-op when already clear.
 */
export function placeStoryRoomBehind(
  room: THREE.Object3D,
  maxFrontZ: number = STORY_ROOM_MAX_FRONT_Z,
): void {
  room.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(room);
  if (box.isEmpty() || !Number.isFinite(box.max.z)) return;
  const dz = maxFrontZ - box.max.z;
  if (dz < 0) room.position.z += dz;
}
