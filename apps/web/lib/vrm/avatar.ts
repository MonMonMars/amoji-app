'use client';
// r2026-10-04.50 — unified avatar layer. Two kinds:
//
//   v1      a @pixiv/three-vrm VRM (VRMC_vrm 1.0) — normalized bones, the
//           pre-r.50 local-axis code path, VRMA idle clip support.
//   generic a "plain GLTF" humanoid (VRM 0.x legacy, or any glTF with a
//           humanBones table). three-vrm v3 refuses to load these, so we
//           drive them ourselves: bones resolved from the humanBones map,
//           expressions from blendShape binds, and ALL body motion is applied
//           as world-axis rotations on top of an auto-calibrated rest pose.
//
// Calibration (the r.50 fix for "everyone faces backward with hands up"):
//   1. facing — measure the shoulder line, yaw the whole model until she
//      faces +Z (toward the camera). A no-op for well-authored models.
//   2. arms — measure each upper/lower arm's current world direction and
//      rotate it to hang straight down. Works from T-pose, A-pose, or the
//      broken hands-up rest pose some legacy rigs ship.
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';

export type AvatarKind = 'v1' | 'generic';

/** pose values use the same semantics as mapFrameToVrm's bone targets */
export interface AvatarPose {
  headX: number; headY: number; headZ: number;
  spineX: number; chestX: number;
  /** arm lowering from T-pose, radians (positive = lowered) */
  leftUpperArm: number; rightUpperArm: number;
  /** elbow bend, radians (positive = bent) */
  leftLowerArm: number; rightLowerArm: number;
  // move-performance additives (folded in by the canvas before applying)
  spineY: number; chestZ: number;
  lArmX: number; rArmX: number;
  lElbowZ: number; rElbowZ: number;
}

export interface Avatar {
  kind: AvatarKind;
  /** scene-level node — poke/laugh/move overlays transform this */
  root: THREE.Object3D;
  /** when true, an animation clip drives the body; applyPose whispers head only */
  clipDrivesBody: boolean;
  setExpression(name: string, value: number): void;
  applyPose(pose: AvatarPose): void;
  update(dt: number): void;
}

// VRM 0.x / humanoid bone names we resolve (identical to VRMHumanBoneName)
const BONE_NAMES = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'leftShoulder', 'rightShoulder',
  'leftUpperArm', 'rightUpperArm',
  'leftLowerArm', 'rightLowerArm',
  'leftHand', 'rightHand',
] as const;
type BoneName = (typeof BONE_NAMES)[number];

// VRM 1.0 preset name → VRM 0.x blendShapeGroup name
const EXPRESSION_ALIAS: Record<string, string> = {
  happy: 'joy', angry: 'angry', sad: 'sorrow', surprised: 'surprised',
  fun: 'fun', relaxed: '',
  aa: 'a', ih: 'i', ou: 'u', ee: 'e', oh: 'o',
};

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);

// ---------------------------------------------------------------------------
// shared calibration helpers
// ---------------------------------------------------------------------------

/** yaw `root` so the line leftShoulder→rightShoulder implies facing +Z */
function calibrateFacing(root: THREE.Object3D, left: THREE.Object3D | null, right: THREE.Object3D | null): void {
  if (!left || !right) return;
  root.updateMatrixWorld(true);
  const lp = left.getWorldPosition(new THREE.Vector3());
  const rp = right.getWorldPosition(new THREE.Vector3());
  const d = rp.sub(lp);
  d.y = 0;
  if (d.lengthSq() < 1e-10) return;
  d.normalize();
  // forward = up × (right−left); we want forward == +Z
  const fx = d.z;
  const fz = -d.x;
  const yaw = -Math.atan2(fx, fz);
  if (Math.abs(yaw) < 1e-3) return;
  root.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(UP, yaw));
  root.updateMatrixWorld(true);
}

/**
 * rotate `bone` (in world space) so the direction bone→child points DOWN.
 * `fallbackAxis` is used when the bone points straight up (cross product
 * degenerate) — a 180° turn about that axis.
 */
function alignBoneDown(
  bone: THREE.Object3D, child: THREE.Object3D,
  baseLocal: Map<string, THREE.Quaternion>, fallbackAxis: THREE.Vector3,
): void {
  bone.updateMatrixWorld(true);
  const a = bone.getWorldPosition(new THREE.Vector3());
  const b = child.getWorldPosition(new THREE.Vector3());
  const dir = b.sub(a);
  if (dir.lengthSq() < 1e-10) return;
  dir.normalize();
  const align = new THREE.Quaternion();
  if (dir.dot(DOWN) < -0.99999) {
    align.setFromAxisAngle(fallbackAxis, Math.PI);
  } else {
    align.setFromUnitVectors(dir, DOWN);
  }
  const parentW = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
  const world = bone.getWorldQuaternion(new THREE.Quaternion());
  // W' = align ⊗ W  →  local = parentW⁻¹ ⊗ align ⊗ W
  const local = parentW.invert().multiply(align).multiply(world);
  bone.quaternion.copy(local);
  baseLocal.set(bone.name, local.clone());
}

// ---------------------------------------------------------------------------
// VRM 1.0 avatar (normalized bones — the pre-r.50 code path, preserved)
// ---------------------------------------------------------------------------

class V1Avatar implements Avatar {
  kind = 'v1' as const;
  root: THREE.Object3D;
  clipDrivesBody = false;
  private vrm: VRM;

  constructor(vrm: VRM) {
    this.vrm = vrm;
    this.root = vrm.scene;
    calibrateFacing(
      vrm.scene,
      vrm.humanoid?.getNormalizedBoneNode('leftShoulder') ?? null,
      vrm.humanoid?.getNormalizedBoneNode('rightShoulder') ?? null,
    );
  }

  setExpression(name: string, value: number): void {
    const em = this.vrm.expressionManager;
    if (!em) return;
    try { em.setValue(name, value); } catch { /* preset absent on this model */ }
  }

  applyPose(p: AvatarPose): void {
    const setRot = (name: VRMHumanBoneName, axis: 'x' | 'y' | 'z', val: number) => {
      const node = this.vrm.humanoid?.getNormalizedBoneNode(name);
      if (node) node.rotation[axis] = val;
    };
    const addRot = (name: VRMHumanBoneName, axis: 'x' | 'y' | 'z', val: number) => {
      const node = this.vrm.humanoid?.getNormalizedBoneNode(name);
      if (node) node.rotation[axis] += val;
    };
    if (this.clipDrivesBody) {
      // clip drives the body — keep only a whisper of procedural head life
      setRot('head', 'x', p.headX * 0.5);
      setRot('head', 'y', p.headY * 0.5);
      setRot('head', 'z', p.headZ * 0.5);
    } else {
      setRot('head', 'x', p.headX);
      setRot('head', 'y', p.headY);
      setRot('head', 'z', p.headZ);
      setRot('leftUpperArm', 'z', -p.leftUpperArm);
      setRot('rightUpperArm', 'z', p.rightUpperArm);
      setRot('leftLowerArm', 'z', -p.leftLowerArm);
      setRot('rightLowerArm', 'z', p.rightLowerArm);
      setRot('spine', 'x', p.spineX);
      setRot('chest', 'x', p.chestX);
    }
    // move-performance additives ride on top in both modes
    if (p.spineY) addRot('spine', 'y', p.spineY);
    if (p.chestZ) addRot('chest', 'z', p.chestZ);
    if (p.lArmX) addRot('leftUpperArm', 'x', p.lArmX);
    if (p.rArmX) addRot('rightUpperArm', 'x', p.rArmX);
    if (p.lElbowZ) addRot('leftLowerArm', 'z', p.lElbowZ);
    if (p.rElbowZ) addRot('rightLowerArm', 'z', p.rElbowZ);
  }

  update(dt: number): void {
    this.vrm.update(dt);
  }
}

// ---------------------------------------------------------------------------
// generic humanoid avatar (VRM 0.x legacy / plain glTF)
// ---------------------------------------------------------------------------

interface ExpressionBind {
  mesh: THREE.Mesh;
  index: number;
}

class GenericAvatar implements Avatar {
  kind = 'generic' as const;
  root: THREE.Object3D;
  clipDrivesBody = false; // no VRMA support here — procedural pose always
  private bones = new Map<BoneName, THREE.Object3D>();
  private expressions = new Map<string, ExpressionBind[]>();
  /** calibrated rest local quats for bones applyPose drives (and arms) */
  private baseLocal = new Map<string, THREE.Quaternion>();
  private blinkT = 2.2 + Math.random() * 2;
  private blinkPhase = -1;

  // scratch objects (no per-frame allocation)
  private sRw = new THREE.Quaternion();
  private sPw = new THREE.Quaternion();
  private sE = new THREE.Euler();

  constructor(gltf: GLTF) {
    this.root = gltf.scene;
    const json = (gltf.parser as unknown as { json: Record<string, unknown> }).json;
    this.resolveBones(gltf, json);
    this.resolveExpressions(gltf, json);
    this.calibrate();
  }

  // -- skeleton / face resolution ------------------------------------------

  private resolveBones(gltf: GLTF, json: Record<string, unknown>): void {
    const ext = (json.extensions ?? {}) as Record<string, unknown>;
    const nodes = (json.nodes ?? []) as Array<{ name?: string } | undefined>;
    const findByIndex = (i: unknown): THREE.Object3D | null => {
      if (typeof i !== 'number') return null;
      const name = nodes[i]?.name;
      if (!name) return null;
      let found: THREE.Object3D | null = null;
      gltf.scene.traverse((o) => { if (!found && o.name === name) found = o; });
      return found;
    };
    const put = (bone: string, nodeIdx: unknown) => {
      const obj = findByIndex(nodeIdx);
      if (obj && (BONE_NAMES as readonly string[]).includes(bone)) {
        this.bones.set(bone as BoneName, obj);
      }
    };
    // VRM 0.x: humanBones is an array of { bone, node }
    const v0 = ext.VRM as { humanoid?: { humanBones?: Array<{ bone?: string; node?: number }> } } | undefined;
    if (v0?.humanoid?.humanBones) {
      for (const hb of v0.humanoid.humanBones) put(hb.bone ?? '', hb.node);
    }
    // VRMC_vrm 1.0: humanBones is a map of bone → { node }
    const v1 = ext.VRMC_vrm as { humanoid?: { humanBones?: Record<string, { node?: number }> } } | undefined;
    if (v1?.humanoid?.humanBones) {
      for (const [bone, ref] of Object.entries(v1.humanoid.humanBones)) put(bone, ref?.node);
    }
    if (!this.bones.has('head')) throw new Error('no humanoid head bone — not a usable avatar');
  }

  private resolveExpressions(gltf: GLTF, json: Record<string, unknown>): void {
    const ext = (json.extensions ?? {}) as Record<string, unknown>;
    // mesh index → loaded THREE.Mesh objects
    const byMeshIndex = new Map<number, THREE.Mesh[]>();
    const associations = (gltf.parser as unknown as { associations?: Map<object, { meshes?: number }> }).associations;
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const idx = associations?.get(mesh)?.meshes;
      if (typeof idx === 'number') {
        const list = byMeshIndex.get(idx) ?? [];
        list.push(mesh);
        byMeshIndex.set(idx, list);
      }
    });
    const addGroup = (name: string, binds: Array<{ mesh?: number; index?: number }>) => {
      if (!name) return;
      const out: ExpressionBind[] = [];
      for (const b of binds) {
        if (typeof b.mesh !== 'number' || typeof b.index !== 'number') continue;
        for (const m of byMeshIndex.get(b.mesh) ?? []) {
          if (m.morphTargetInfluences && b.index < m.morphTargetInfluences.length) {
            out.push({ mesh: m, index: b.index });
          }
        }
      }
      if (out.length) this.expressions.set(name.toLowerCase(), out);
    };
    // VRM 0.x blendShapeGroups
    const v0 = ext.VRM as {
      blendShapeMaster?: { blendShapeGroups?: Array<{ name?: string; binds?: Array<{ mesh?: number; index?: number }> }> };
    } | undefined;
    for (const g of v0?.blendShapeMaster?.blendShapeGroups ?? []) addGroup(g.name ?? '', g.binds ?? []);
    // VRMC_vrm 1.0 expressions (custom only — presets go through the alias map)
    const v1 = ext.VRMC_vrm as {
      expressions?: { custom?: Record<string, { morphTargetBinds?: Array<{ node?: number; index?: number }> }> };
    } | undefined;
    for (const [name, def] of Object.entries(v1?.expressions?.custom ?? {})) {
      const binds = (def.morphTargetBinds ?? []).map((b) => ({ mesh: b.node, index: b.index }));
      addGroup(name, binds);
    }
  }

  // -- calibration -----------------------------------------------------------

  private calibrate(): void {
    this.root.updateMatrixWorld(true);
    calibrateFacing(this.root, this.bones.get('leftShoulder') ?? null, this.bones.get('rightShoulder') ?? null);

    // remember every bone's rest local rotation first (head/spine baseline)
    for (const [, node] of this.bones) {
      this.baseLocal.set(node.name, node.quaternion.clone());
    }

    // arms: hang them straight down, elbows straight — whatever the rig's
    // rest pose was (T-pose, A-pose, or the broken hands-up export).
    const armX = new THREE.Vector3(1, 0, 0);
    const pairs: Array<[BoneName, BoneName, THREE.Vector3]> = [
      ['leftUpperArm', 'leftLowerArm', armX],
      ['rightUpperArm', 'rightLowerArm', armX],
      ['leftLowerArm', 'leftHand', new THREE.Vector3(0, 0, 1)],
      ['rightLowerArm', 'rightHand', new THREE.Vector3(0, 0, 1)],
    ];
    this.root.updateMatrixWorld(true);
    for (const [boneName, childName, fb] of pairs) {
      const bone = this.bones.get(boneName);
      const child = this.bones.get(childName);
      if (bone && child) alignBoneDown(bone, child, this.baseLocal, fb);
    }
    this.root.updateMatrixWorld(true);
  }

  // -- runtime API -----------------------------------------------------------

  setExpression(name: string, value: number): void {
    const v = Math.max(0, Math.min(1, value));
    const bindName = (EXPRESSION_ALIAS[name.toLowerCase()] ?? name).toLowerCase();
    if (!bindName) return; // e.g. relaxed on a 0.x model — nothing to drive
    const binds = this.expressions.get(bindName);
    if (!binds) return;
    for (const b of binds) b.mesh.morphTargetInfluences![b.index] = v;
  }

  applyPose(p: AvatarPose): void {
    // world-axis deltas on top of the calibrated rest pose:
    //   head        X=pitch Y=yaw Z=roll
    //   spine       X=pitch Y=yaw · chest X=pitch Z=roll
    //   upper arms  Z (left + lowers, right − lowers), X = swing
    //   elbows      X (positive bends the forearm forward)
    this.root.updateMatrixWorld(true);
    this.applyBone('spine', p.spineX, p.spineY, 0);
    this.applyBone('chest', p.chestX, 0, p.chestZ);
    this.applyBone('head', p.headX, p.headY, p.headZ);
    this.applyBone('leftUpperArm', p.lArmX, 0, p.leftUpperArm);
    this.applyBone('rightUpperArm', p.rArmX, 0, -p.rightUpperArm);
    this.applyBone('leftLowerArm', p.leftLowerArm - p.lElbowZ, 0, 0);
    this.applyBone('rightLowerArm', p.rightLowerArm + p.rElbowZ, 0, 0);
  }

  private applyBone(name: BoneName, x: number, y: number, z: number): void {
    const node = this.bones.get(name);
    if (!node) return;
    if (x === 0 && y === 0 && z === 0) {
      // settle back to the calibrated rest pose
      const base = this.baseLocal.get(node.name);
      if (base) node.quaternion.copy(base);
      return;
    }
    this.sE.set(x, y, z, 'XYZ');
    this.sRw.setFromEuler(this.sE);
    node.parent!.getWorldQuaternion(this.sPw);
    // local = pw⁻¹ ⊗ Rw ⊗ pw ⊗ baseLocal
    const base = this.baseLocal.get(node.name);
    node.quaternion.copy(this.sPw).invert().multiply(this.sRw).multiply(this.sPw);
    if (base) node.quaternion.multiply(base);
  }

  update(dt: number): void {
    // gentle periodic blink so legacy models feel alive
    if (this.blinkPhase >= 0) {
      this.blinkPhase += dt;
      const k = this.blinkPhase / 0.16;
      const v = k >= 1 ? 0 : 1 - Math.abs(k * 2 - 1);
      this.setExpression('blink', v);
      if (k >= 1) this.blinkPhase = -1;
    } else {
      this.blinkT -= dt;
      if (this.blinkT <= 0) {
        this.blinkT = 2.4 + Math.random() * 2.6;
        this.blinkPhase = 0;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// factories
// ---------------------------------------------------------------------------

export function createV1Avatar(vrm: VRM): Avatar {
  return new V1Avatar(vrm);
}

/** build a calibrated avatar from a plain-GLTF load (VRM 0.x or humanoid glTF) */
export function createGenericAvatar(gltf: GLTF): Avatar {
  return new GenericAvatar(gltf);
}
