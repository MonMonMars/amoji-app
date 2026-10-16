// Assemble a modular character from already-split GLBs.
//
// Rig = the body file's armature (VRoid J_Bip_* bones, inverse bind matrices
// kept). Head meshes come from *_head.glb and are skinned onto that rig.
// Body meshes come from *_body.glb. Swapping clothes drops body meshes only.
//
// Mon: do not rescale the head. head_scale stays 1. Neck-height differences
// are a pairing concern, not a scale. This file has no fit factor.

import * as THREE from 'three';

/** Exported head scale. Identity. Do not change this to "fit" a body. */
export const HEAD_SCALE = 1;

export const AMOJI_PART = 'amojiPart';

export type AssembledPart = 'head' | 'body';

export interface GltfLike {
  scene: THREE.Object3D;
}

export interface ModularAssembly {
  /** Body GLB scene. Head meshes are added here; the armature stays. */
  scene: THREE.Object3D;
  bonesByName: Map<string, THREE.Bone>;
}

function isSkinned(o: THREE.Object3D): o is THREE.SkinnedMesh {
  return (o as THREE.SkinnedMesh).isSkinnedMesh === true;
}

function isBone(o: THREE.Object3D): o is THREE.Bone {
  return (o as THREE.Bone).isBone === true;
}

/** First bone of each name on the live rig. */
export function indexBones(root: THREE.Object3D): Map<string, THREE.Bone> {
  const map = new Map<string, THREE.Bone>();
  root.traverse((o) => {
    if (!isBone(o) || !o.name || map.has(o.name)) return;
    map.set(o.name, o);
  });
  return map;
}

/**
 * Copy a bone the live rig does not have (hair, skirt) onto the shared
 * parent. Local rest transform only — no scale to match neck height.
 */
function graftBone(
  source: THREE.Bone,
  bonesByName: Map<string, THREE.Bone>,
  rigRoot: THREE.Object3D,
): THREE.Bone {
  if (source.name) {
    const existing = bonesByName.get(source.name);
    if (existing) return existing;
  }
  const clone = new THREE.Bone();
  clone.name = source.name;
  clone.position.copy(source.position);
  clone.quaternion.copy(source.quaternion);
  clone.scale.copy(source.scale);
  const parent = source.parent;
  if (parent && isBone(parent)) {
    graftBone(parent, bonesByName, rigRoot).add(clone);
  } else if (parent?.name) {
    let named: THREE.Object3D | null = null;
    rigRoot.traverse((o) => {
      if (!named && o.name === parent.name) named = o;
    });
    (named ?? rigRoot).add(clone);
  } else {
    rigRoot.add(clone);
  }
  if (clone.name) bonesByName.set(clone.name, clone);
  return clone;
}

function tagMeshes(root: THREE.Object3D, part: AssembledPart): void {
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.userData[AMOJI_PART] = part;
  });
}

/**
 * Authored local scale, then HEAD_SCALE (1) for head meshes.
 * Neck Z is not an input. There is nothing here that can shrink a head.
 */
function applyAuthoredScale(target: THREE.Object3D, source: THREE.Object3D, part: AssembledPart): void {
  target.scale.copy(source.scale);
  if (part === 'head') target.scale.multiplyScalar(HEAD_SCALE);
}

function rebindSkinnedMeshes(
  sourceRoot: THREE.Object3D,
  bonesByName: Map<string, THREE.Bone>,
  rigRoot: THREE.Object3D,
  part: AssembledPart,
): THREE.SkinnedMesh[] {
  const sources: THREE.SkinnedMesh[] = [];
  sourceRoot.traverse((o) => {
    if (isSkinned(o)) sources.push(o);
  });
  const created: THREE.SkinnedMesh[] = [];
  for (const src of sources) {
    const bones = src.skeleton.bones.map((b) => graftBone(b, bonesByName, rigRoot));
    const inverses = src.skeleton.boneInverses.map((m) => m.clone());
    const mesh = new THREE.SkinnedMesh(src.geometry, src.material);
    mesh.name = src.name;
    mesh.position.copy(src.position);
    mesh.quaternion.copy(src.quaternion);
    applyAuthoredScale(mesh, src, part);
    mesh.bindMode = src.bindMode;
    mesh.frustumCulled = false;
    mesh.userData[AMOJI_PART] = part;
    const skeleton = new THREE.Skeleton(bones, inverses);
    mesh.bind(skeleton, src.bindMatrix.clone());
    rigRoot.add(mesh);
    created.push(mesh);
  }
  return created;
}

/**
 * Prefer the body GLB as the runtime rig. Attach every skinned mesh from
 * the head GLB. Body meshes already on the rig stay, tagged as the outfit.
 * Head mesh scale is the export scale times HEAD_SCALE (1).
 */
export function assembleModular(body: GltfLike, head: GltfLike): ModularAssembly {
  const scene = body.scene;
  const bonesByName = indexBones(scene);
  tagMeshes(scene, 'body');
  scene.traverse((o) => {
    if (isSkinned(o)) o.frustumCulled = false;
  });
  rebindSkinnedMeshes(head.scene, bonesByName, scene, 'head');
  return { scene, bonesByName };
}

function disposeMeshResources(mesh: THREE.Mesh): void {
  mesh.geometry?.dispose();
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) m?.dispose();
}

/**
 * Clothes change: unload body meshes, bind the next *_body.glb onto the
 * same armature. Head meshes are left in place, still at HEAD_SCALE.
 */
export function replaceBodyMeshes(assembly: ModularAssembly, nextBody: GltfLike): void {
  const doomed: THREE.Mesh[] = [];
  assembly.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.userData[AMOJI_PART] === 'body') doomed.push(mesh);
  });
  for (const mesh of doomed) {
    mesh.removeFromParent();
    disposeMeshResources(mesh);
  }
  rebindSkinnedMeshes(nextBody.scene, assembly.bonesByName, assembly.scene, 'body');
}
