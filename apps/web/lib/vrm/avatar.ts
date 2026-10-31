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
//   1. upright — measure the hips→head line in world space and, if it is
//      not vertical (rotated-root / Z-up exports), un-tilt the INNER model
//      node so she STANDS before her first rendered frame (r101). The old
//      path only yawed the facing, so a lying model stayed flat until
//      (unless) its first rebased clip frame corrected it — and generic
//      VRM 0.x avatars never receive clips at all.
//   2. facing — measure the shoulder line, yaw the whole model until she
//      faces +Z (toward the camera). A no-op for well-authored models.
//   3. arms — measure each upper/lower arm's current world direction and
//      rotate it to hang straight down. Works from T-pose, A-pose, or the
//      broken hands-up rest pose some legacy rigs ship. Runs AFTER the
//      upright fix so "down" means world-down, not lying-flat-down.
//
// r2026-10-04.76 — the calibration lives on the INNER model node, never on
// Avatar.root. The canvas writes position/scale/rotation to Avatar.root every
// frame (idle reset + poke/laugh overlays), so a root-level facing yaw was
// erased by the very next frame's rotation.set(0,0,0) — the exact "some
// characters face backward at startup" bug. Avatar.root is now a plain Group
// wrapper the canvas can stomp freely; the calibrated model hangs inside it.
//
// r2026-10-04.83 — two additive pitch channels (spinePitchAdd / chestPitchAdd)
// join the move-performance additives: they ride ON TOP of whatever drives
// the body (library clip or procedural pose) with human-limited range, and
// they are how the poke recoil leans a realistic human back without touching
// the mesh scale.
//
// r2026-10-04.86 — arm-raise additives (lArmRaise / rArmRaise) complete the
// move-performance set: + lifts the arm from wherever the body currently is,
// so the sing/piano/dance choreography (no library clip exists for those)
// composes over BOTH library clips and the procedural base without ever
// hand-rotating a clip-driven skeleton.
//
// r2026-10-05.97 — clip-mode head life is ADDITIVE (addRot tips the
// mixer-written quaternion a whisper further) instead of the old setRot()
// overwrite, which stomped the synced euler every frame and FROZE the clip's
// own head motion into a stiff stare while idling.
//
// r2026-10-05.103 — relaxed hands + shoulder ROM clamp. The library idles
// animate BODY bones only (verified in the .vrma sources: standard_idle.vrma
// maps zero finger bones; weightShift.vrma maps just thumb/index chains), so
// her fingers sat in the model's rigid rest splay between keys.
// calibrateRelaxedHands probes each finger once — the axis+sign that
// shortens tip↔wrist distance wins, which is pose-independent (fold vs
// unfold reads the same from T-pose or hanging arms) — and the canvas re-
// applies base·delta every frame AFTER mixer + applyPose. Bones a loaded
// clip animates (clipAnimatedBones — node names scanned from the clip track
// names) are skipped, so the mixer never fights the curl. FINGER_BONES below
// resolves the same camelCase humanoid names on VRM 0.x and 1.0 rigs.
// clampUpperArmAdduction floors the upper arm's outward (body-relative,
// shoulder-line) direction at ~8.6° past plumb, gated to at/below horizontal,
// so no swing, poke recoil or clip frame can carry an arm across the midline.
//
// r2026-10-05.107 — no 360° head spins. The r97 clip-mode additive head
// life was a raw euler `+=` on the bone: whenever the playing clip(s)
// carried no head track, nothing rewrote the head between frames, so the
// offset compounded into full turns. The additive layer is now rebuilt
// every frame from an explicit base — refreshed when the mixer rewrote the
// bone, reused when it did not — and the offset is hard-clamped to a human
// neck (±45° pitch, ±80° yaw, ±25° roll). The clip pose itself keeps full
// freedom; only the layer WE add is clamped.
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { ARM_DOWN_BASE } from '@amoji/vrm-renderer';
import { FootPlanter, type PlantLean } from './plant-feet';
import { ChestBounce } from './chest-bounce';
import { capEyeExpression } from './eyes';

export type AvatarKind = 'v1' | 'generic';

/** pose values use the same semantics as mapFrameToVrm's bone targets */
export interface AvatarPose {
  headX: number; headY: number; headZ: number;
  spineX: number; chestX: number;
  /** arm lowering from T-pose, radians (positive = lowered) */
  leftUpperArm: number; rightUpperArm: number;
  /** elbow bend, radians (positive = bent) */
  leftLowerArm: number; rightLowerArm: number;
  // move-performance + poke-recoil additives (folded in by the canvas before
  // applying); they ride on top of BOTH procedural poses and library clips
  spineY: number; chestZ: number;
  lArmX: number; rArmX: number;
  lElbowZ: number; rElbowZ: number;
  /** r83: lean-back recoil on the torso — spine flexes deeper than chest */
  spinePitchAdd: number; chestPitchAdd: number;
  /**
   * Poke head tip, separate from the clip-mode look whisper so a punch
   * is not scaled down to 30%. Optional for older pose literals.
   */
  headPitchAdd?: number; headRollAdd?: number;
  /**
   * r86: move-performance arm raises — + lifts the arm from wherever it
   * is right now (semantic, not raw-axis: each avatar kind maps it to
   * its own bone axes). Optional so existing pose literals keep compiling.
   */
  lArmRaise?: number; rArmRaise?: number;
}

// r2026-10-04.60 — human joint limits. Our characters are HUMAN, so the
// procedural pose path must respect anatomy: elbows flex one way only,
// the neck turns so far and no further, shoulders stop where real
// shoulders stop. Values are radians, applied to the semantic pose fields
// (before any per-rig sign flip), so both avatar kinds share one table.
//
// OVERRIDE RULE (Master Simon): online motion library clips are NOT
// limited — they animate the skeleton through the mixer and never pass
// through applyPose, so a library performance (dance, kungfu, deep bow…)
// may exceed these ranges at any time.
const HUMAN_LIMITS = {
  // head — pitch down/up, yaw, roll (a human neck: ~±35° pitch, ~±63° yaw)
  headX: [-0.6, 0.5], headY: [-1.1, 1.1], headZ: [-0.55, 0.55],
  // torso — spine flexes further than the chest
  spineX: [-0.45, 0.4], chestX: [-0.35, 0.3],
  // shoulders — from T-pose: negative lifts overhead (~170°), positive
  // lowers toward the sides (~90°); elbows flex 0→~140°, tiny hyperextension
  leftUpperArm: [-2.9, 1.6], rightUpperArm: [-2.9, 1.6],
  leftLowerArm: [-0.1, 2.4], rightLowerArm: [-0.1, 2.4],
  // move-performance additives
  spineY: [-0.8, 0.8],        // torso twist
  chestZ: [-0.4, 0.4],        // chest counter-twist
  lArmX: [-1.9, 1.9], rArmX: [-1.9, 1.9], // arm swing forward/back
  lElbowZ: [-0.6, 0.6], rElbowZ: [-0.6, 0.6], // extra elbow fold on top
  // r83: torso recoil additives (the skeleton poke). Wide enough for a
  // visible punch, still well under a half-turn so a bone cannot invert.
  spinePitchAdd: [-0.85, 0.85], chestPitchAdd: [-0.65, 0.65],
  headPitchAdd: [-0.9, 0.9], headRollAdd: [-0.55, 0.55],
  // r86: arm raises from the current position — an idol mic-hand or a
  // violin/piano arm lifts about this far and no further
  lArmRaise: [-1.6, 1.6], rArmRaise: [-1.6, 1.6],
} as const;

const clampField = (v: number, range: readonly [number, number]): number =>
  v < range[0] ? range[0] : v > range[1] ? range[1] : v;

// r107: the ADDITIVE head layer (clip-mode look-at + poke/laugh reactions
// riding on the mixer's clip pose) is a HUMAN NECK, not a turntable. The
// clip pose keeps full freedom — a library performance may turn the head
// as far as its mocap says; only what WE add on top is range-limited.
const HEAD_ADD_ROM = { x: 0.785, y: 1.396, z: 0.436 } as const; // ±45° pitch, ±80° yaw, ±25° roll

/** clamp a pose to human anatomy — procedural puppetry can never dislocate her */
function clampPoseHuman(p: AvatarPose): AvatarPose {
  return {
    headX: clampField(p.headX, HUMAN_LIMITS.headX),
    headY: clampField(p.headY, HUMAN_LIMITS.headY),
    headZ: clampField(p.headZ, HUMAN_LIMITS.headZ),
    spineX: clampField(p.spineX, HUMAN_LIMITS.spineX),
    chestX: clampField(p.chestX, HUMAN_LIMITS.chestX),
    leftUpperArm: clampField(p.leftUpperArm, HUMAN_LIMITS.leftUpperArm),
    rightUpperArm: clampField(p.rightUpperArm, HUMAN_LIMITS.rightUpperArm),
    leftLowerArm: clampField(p.leftLowerArm, HUMAN_LIMITS.leftLowerArm),
    rightLowerArm: clampField(p.rightLowerArm, HUMAN_LIMITS.rightLowerArm),
    spineY: clampField(p.spineY, HUMAN_LIMITS.spineY),
    chestZ: clampField(p.chestZ, HUMAN_LIMITS.chestZ),
    lArmX: clampField(p.lArmX, HUMAN_LIMITS.lArmX),
    rArmX: clampField(p.rArmX, HUMAN_LIMITS.rArmX),
    lElbowZ: clampField(p.lElbowZ, HUMAN_LIMITS.lElbowZ),
    rElbowZ: clampField(p.rElbowZ, HUMAN_LIMITS.rElbowZ),
    spinePitchAdd: clampField(p.spinePitchAdd, HUMAN_LIMITS.spinePitchAdd),
    chestPitchAdd: clampField(p.chestPitchAdd, HUMAN_LIMITS.chestPitchAdd),
    headPitchAdd: clampField(p.headPitchAdd ?? 0, HUMAN_LIMITS.headPitchAdd),
    headRollAdd: clampField(p.headRollAdd ?? 0, HUMAN_LIMITS.headRollAdd),
    lArmRaise: clampField(p.lArmRaise ?? 0, HUMAN_LIMITS.lArmRaise),
    rArmRaise: clampField(p.rArmRaise ?? 0, HUMAN_LIMITS.rArmRaise),
  };
}

export interface Avatar {
  kind: AvatarKind;
  /** scene-level wrapper — poke/laugh/move overlays transform THIS */
  root: THREE.Object3D;
  /** when true, an animation clip drives the body; applyPose whispers head only */
  clipDrivesBody: boolean;
  /** r103: node names of bones any loaded clip animates — those stay the mixer's */
  readonly clipAnimatedBones: ReadonlySet<string>;
  /** r103: node names of every resolved finger bone (evidence for the guard) */
  readonly fingerBones: ReadonlySet<string>;
  setExpression(name: string, value: number): void;
  applyPose(pose: AvatarPose): void;
  /** r103: re-apply the calibrated relaxed-hand curl (idempotent base·delta) */
  applyRelaxedHands(fullIdle?: boolean): void;
  /** Slow clip-driven fingers and keep them slightly bent. Idle snaps to the curl. */
  smoothFingers(dt: number, fullIdle?: boolean): void;
  /** r103: floor the upper arm's outward swing so arms never cross the midline */
  clampShoulderROM(): void;
  /**
   * Idle only. A straight-down hang collapses the shoulder on A-pose rigs.
   * Open a hanging arm to a small natural abduct and lift a clavicle that
   * has dropped below the captured rest. Raised arms (waves, punches) are
   * left alone.
   */
  easeIdleHang(): void;
  /** r115: raw bone lookup for poke-zone raycast + hand-drag IK (null when absent) */
  getBoneNode(name: string): THREE.Object3D | null;
  /**
   * Keep both feet on the shared ground contact. Pass false only while a
   * walk or jump clip is playing. `lean` pitches the hips for a punch;
   * the soles stay on the captured contact.
   */
  plantFeet(plant: boolean, lean?: PlantLean): void;
  /** Soft secondary spring on bust bones. 0 restores them. Does not move the hips or feet. */
  applyChestBounce(pitch: number): void;
  /**
   * r124: re-measure the shoulder line and yaw away any residual error. The
   * constructor calibrates facing from the RAW rest pose, whose shoulder
   * line can be systematically off (~10° on several rigs) — once the idle
   * neutral frame settles the shoulders into their natural place, a second
   * pass on the inner node removes the lean. Safe to call any time; a no-op
   * when shoulders are already square.
   */
  recalibrateFacing(): void;
  /** r2026-10-12: second upright pass after idle neutral frame settles */
  recalibrateUpright(): void;
  update(dt: number): void;
}

// VRM 0.x / humanoid bone names we resolve (identical to VRMHumanBoneName)
// r115: upper legs join the table — the belly-poke zone probes them.
const BONE_NAMES = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'leftShoulder', 'rightShoulder',
  'leftUpperArm', 'rightUpperArm',
  'leftLowerArm', 'rightLowerArm',
  'leftHand', 'rightHand',
  'leftUpperLeg', 'rightUpperLeg',
  'leftLowerLeg', 'rightLowerLeg',
  'leftFoot', 'rightFoot',
  'leftToes', 'rightToes',
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

/**
 * r101: un-tilt `node` so the hips→head line is vertical (+Y). Some VRMs
 * ship a rotated root (Z-up exports) and lie flat; the old calibration only
 * yawed the facing, so those models lay on the floor until (unless) their
 * first rebased clip frame corrected them — and generic avatars never get
 * clips. Runs BEFORE facing and arm
 * calibration so every later measurement sees a standing body.
 * r2026-10-12: threshold tightened — the old 0.7 dot (~45°) let ~10° leans
 * through untouched; now anything past ~3° gets corrected.
 */
const UPRIGHT_DOT_MIN = 0.998; // cos(~3.6°) — standing straight is baseline

function calibrateUpright(node: THREE.Object3D, hips: THREE.Object3D | null, head: THREE.Object3D | null): void {
  if (!hips || !head) return;
  node.updateMatrixWorld(true);
  const a = hips.getWorldPosition(new THREE.Vector3());
  const b = head.getWorldPosition(new THREE.Vector3());
  const up = b.sub(a);
  if (up.lengthSq() < 1e-10) return;
  up.normalize();
  if (up.dot(UP) > UPRIGHT_DOT_MIN) return;
  node.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(up, UP));
  node.updateMatrixWorld(true);
}

/**
 * Yaw `node` so the line leftShoulder→rightShoulder implies facing +Z.
 * Pitch/roll are never touched here — upright is calibrateUpright's job.
 */
function calibrateFacing(node: THREE.Object3D, left: THREE.Object3D | null, right: THREE.Object3D | null): void {
  if (!left || !right) return;
  node.updateMatrixWorld(true);
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
  node.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(UP, yaw));
  node.updateMatrixWorld(true);
}

/**
 * rotate `bone` (in world space) so the direction bone→child points DOWN.
 * `fallbackAxis` is used when the bone points straight up (cross product
 * degenerate) — a 180° turn about that axis.
 */
function alignBoneToward(
  bone: THREE.Object3D, child: THREE.Object3D,
  targetDir: THREE.Vector3,
  baseLocal: Map<string, THREE.Quaternion>, fallbackAxis: THREE.Vector3,
): void {
  bone.updateMatrixWorld(true);
  const a = bone.getWorldPosition(new THREE.Vector3());
  const b = child.getWorldPosition(new THREE.Vector3());
  const dir = b.sub(a);
  if (dir.lengthSq() < 1e-10) return;
  dir.normalize();
  const align = new THREE.Quaternion();
  if (dir.dot(targetDir) < -0.99999) {
    align.setFromAxisAngle(fallbackAxis, Math.PI);
  } else {
    align.setFromUnitVectors(dir, targetDir);
  }
  const parentW = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
  const world = bone.getWorldQuaternion(new THREE.Quaternion());
  // W' = align ⊗ W  →  local = parentW⁻¹ ⊗ align ⊗ W
  const local = parentW.invert().multiply(align).multiply(world);
  bone.quaternion.copy(local);
  baseLocal.set(bone.name, local.clone());
}

function alignBoneDown(
  bone: THREE.Object3D, child: THREE.Object3D,
  baseLocal: Map<string, THREE.Quaternion>, fallbackAxis: THREE.Vector3,
): void {
  alignBoneToward(bone, child, DOWN, baseLocal, fallbackAxis);
}

/** Natural hang: a little out from the body and a little forward. Facing is +Z. */
function naturalArmDir(side: 'left' | 'right', abduct: number, forward: number): THREE.Vector3 {
  const out = side === 'left' ? -1 : 1;
  return new THREE.Vector3(out * Math.sin(abduct), -Math.cos(abduct), Math.sin(forward)).normalize();
}

// ---------------------------------------------------------------------------
// r103: relaxed hands + shoulder ROM clamp (shared by both avatar kinds)
// ---------------------------------------------------------------------------

const SIDES = ['left', 'right'] as const;
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'] as const;
const PHALANGES = ['Proximal', 'Intermediate', 'Distal'] as const;
// every finger humanoid bone, camelCase on BOTH VRM 0.x and 1.0 rigs
const FINGER_BONE_NAMES: string[] = SIDES.flatMap((s) =>
  FINGERS.flatMap((f) => PHALANGES.map((p) => `${s}${f}${p}`)));

// VRoid joint names on modular GLBs that Blender exported without a
// VRMC_vrm humanoid block. Used only when the extension map has no head.
const VROID_TO_HUMANOID: Record<string, string> = {
  J_Bip_C_Hips: 'hips',
  J_Bip_C_Spine: 'spine',
  J_Bip_C_Chest: 'chest',
  J_Bip_C_Neck: 'neck',
  J_Bip_C_Head: 'head',
  J_Bip_L_Shoulder: 'leftShoulder',
  J_Bip_R_Shoulder: 'rightShoulder',
  J_Bip_L_UpperArm: 'leftUpperArm',
  J_Bip_R_UpperArm: 'rightUpperArm',
  J_Bip_L_LowerArm: 'leftLowerArm',
  J_Bip_R_LowerArm: 'rightLowerArm',
  J_Bip_L_Hand: 'leftHand',
  J_Bip_R_Hand: 'rightHand',
  J_Bip_L_UpperLeg: 'leftUpperLeg',
  J_Bip_R_UpperLeg: 'rightUpperLeg',
  J_Bip_L_LowerLeg: 'leftLowerLeg',
  J_Bip_R_LowerLeg: 'rightLowerLeg',
  J_Bip_L_Foot: 'leftFoot',
  J_Bip_R_Foot: 'rightFoot',
  J_Bip_L_ToeBase: 'leftToes',
  J_Bip_R_ToeBase: 'rightToes',
  J_Bip_L_Toes: 'leftToes',
  J_Bip_R_Toes: 'rightToes',
};

function vroidFingerHumanoid(boneName: string): string | null {
  const m = /^J_Bip_([LR])_(Thumb|Index|Middle|Ring|Little)([123])$/.exec(boneName);
  if (!m) return null;
  const side = m[1] === 'L' ? 'left' : 'right';
  const ph = m[3] === '1' ? 'Proximal' : m[3] === '2' ? 'Intermediate' : 'Distal';
  return `${side}${m[2]}${ph}`;
}

/** Gentle curl, proximal→distal. Enough to relax a straight bind pose, not a fist. */
const RELAXED_CURL: Record<(typeof FINGERS)[number], readonly [number, number, number]> = {
  Thumb: [0.22, 0.16, 0.14],
  Index: [0.20, 0.26, 0.20],
  Middle: [0.18, 0.24, 0.18],
  Ring: [0.20, 0.26, 0.20],
  Little: [0.22, 0.28, 0.20],
};
const CURL_PROBE = 0.35;       // rad — calibration test rotation per axis
const CURL_MIN_GAIN = 0.004;   // metres — ignore twist/noise that barely shortens the chain
const THUMB_OPPOSITION = 0.16; // rad — thumb proximal rolls toward the index

interface RelaxedHandEntry {
  node: THREE.Object3D;
  base: THREE.Quaternion;
  delta: THREE.Quaternion;
}

// r103 scratch (load-time calibration only — the per-frame path allocates nothing)
const _rhV = new THREE.Vector3();
const _rhQ = new THREE.Quaternion();
const _rhTip = new THREE.Vector3();
const _rhAcross = new THREE.Vector3();
const LOCAL_AXIS: Record<'x' | 'y' | 'z', THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

/** Local axis the bone extends along (twist). Curl must not use this axis. */
function boneLongAxis(node: THREE.Object3D): 'x' | 'y' | 'z' {
  const p = node.children[0]?.position ?? node.position;
  const ax = Math.abs(p.x);
  const ay = Math.abs(p.y);
  const az = Math.abs(p.z);
  if (ax >= ay && ax >= az) return 'x';
  if (ay >= az) return 'y';
  return 'z';
}

/**
 * r103: measure a gentle relaxed-hand curl for every finger the rig has.
 * The curl axis is the fold that shortens the chain toward the wrist and is
 * NOT the bone's long axis (twist) and NOT a sideways splay across the palm.
 * A finger that does not fold cleanly is left in its bind pose. The thumb
 * proximal also opposes toward the index when that motion is real.
 * Entry = { node, base: rest local quat, delta: curl quat } — per frame the
 * avatar writes base·delta, which is idempotent.
 */
export function calibrateRelaxedHands(
  fingers: ReadonlyMap<string, THREE.Object3D>,
  _clipAnimatedBones: ReadonlySet<string>,
): RelaxedHandEntry[] {
  const out: RelaxedHandEntry[] = [];
  for (const side of SIDES) {
    const anyProximal = fingers.get(`${side}ThumbProximal`)
      ?? fingers.get(`${side}IndexProximal`);
    const wrist = anyProximal?.parent;
    if (!wrist) continue;
    const wristPos = wrist.getWorldPosition(new THREE.Vector3());
    const indexP = fingers.get(`${side}IndexProximal`);
    const littleP = fingers.get(`${side}LittleProximal`);
    let across: THREE.Vector3 | null = null;
    if (indexP && littleP) {
      across = _rhAcross.copy(littleP.getWorldPosition(new THREE.Vector3())).sub(indexP.getWorldPosition(_rhTip));
      if (across.lengthSq() < 1e-8) across = null;
      else across.normalize();
    }
    for (const finger of FINGERS) {
      const chain: THREE.Object3D[] = [];
      for (const ph of PHALANGES) {
        const node = fingers.get(`${side}${finger}${ph}`);
        if (node) chain.push(node);
      }
      if (!chain.length) continue;
      const measure = () => {
        let d = 0;
        for (const node of chain) d += node.getWorldPosition(_rhV).distanceTo(wristPos);
        return d;
      };
      const tipOf = () => chain[chain.length - 1]!.getWorldPosition(_rhTip);
      const saved = chain.map((n) => n.quaternion.clone());
      const before = measure();
      const tip0 = tipOf().clone();
      const twist = boneLongAxis(chain[0]!);
      let bestAxis: 'x' | 'y' | 'z' | null = null;
      let bestSign = 1;
      let bestScore = CURL_MIN_GAIN;
      for (const axis of ['x', 'y', 'z'] as const) {
        if (axis === twist) continue;
        for (const sign of [1, -1] as const) {
          for (const node of chain) {
            node.quaternion.multiply(_rhQ.setFromAxisAngle(LOCAL_AXIS[axis], CURL_PROBE * sign));
          }
          wrist.updateWorldMatrix(true, true);
          const gain = before - measure();
          const moved = tipOf().sub(tip0);
          const splay = across ? Math.abs(moved.dot(across)) : 0;
          const score = gain - splay * 0.65;
          for (let i = 0; i < chain.length; i++) chain[i]!.quaternion.copy(saved[i]!);
          wrist.updateWorldMatrix(true, true);
          if (gain > CURL_MIN_GAIN && score > bestScore) {
            bestScore = score;
            bestAxis = axis;
            bestSign = sign;
          }
        }
      }
      if (!bestAxis) continue;
      let oppAxis: 'x' | 'y' | 'z' | null = null;
      let oppSign = 1;
      if (finger === 'Thumb') {
        const distal = fingers.get(`${side}ThumbDistal`);
        const indexProx = fingers.get(`${side}IndexProximal`);
        if (distal && indexProx) {
          const target = indexProx.getWorldPosition(new THREE.Vector3());
          const dist0 = distal.getWorldPosition(_rhV).distanceTo(target);
          let bestOpp = CURL_MIN_GAIN;
          const savedQ = chain[0]!.quaternion.clone();
          for (const axis of ['x', 'y', 'z'] as const) {
            if (axis === twist || axis === bestAxis) continue;
            for (const sign of [1, -1] as const) {
              chain[0]!.quaternion.copy(savedQ).multiply(_rhQ.setFromAxisAngle(LOCAL_AXIS[axis], CURL_PROBE * sign));
              wrist.updateWorldMatrix(true, true);
              const gain = dist0 - distal.getWorldPosition(_rhV).distanceTo(target);
              if (gain > bestOpp) { bestOpp = gain; oppAxis = axis; oppSign = sign; }
            }
          }
          chain[0]!.quaternion.copy(savedQ);
          wrist.updateWorldMatrix(true, true);
        }
      }
      for (let i = 0; i < chain.length; i++) {
        const node = chain[i]!;
        const curl = RELAXED_CURL[finger][i] ?? 0;
        const opp = i === 0 && oppAxis ? THUMB_OPPOSITION : 0;
        if (!curl && !opp) continue;
        const delta = new THREE.Quaternion();
        if (curl) delta.multiply(_rhQ.setFromAxisAngle(LOCAL_AXIS[bestAxis], bestSign * curl));
        if (opp && oppAxis) delta.multiply(_rhQ.setFromAxisAngle(LOCAL_AXIS[oppAxis], oppSign * opp));
        out.push({ node, base: saved[i]!.clone(), delta });
      }
    }
  }
  return out;
}

const SHOULDER_MIN_OUTWARD = -0.15; // cos-space floor — ≈ 8.6° past plumb
const SHOULDER_GATE_Y = 0.05;       // the clamp only fires at/below horizontal

// r103 scratch (per-frame — reused every call, zero allocation)
const _shA = new THREE.Vector3();
const _shB = new THREE.Vector3();
const _shD = new THREE.Vector3();
const _shLP = new THREE.Vector3();
const _shRP = new THREE.Vector3();
const _shOut = new THREE.Vector3();
const _shFix = new THREE.Vector3();
const _shQF = new THREE.Quaternion();
const _shQP = new THREE.Quaternion();
const _shQW = new THREE.Quaternion();

/**
 * r103: floor an upper arm's OUTWARD swing in world space, body-relative
 * (outward = the shoulder line, left→right). If the arm direction's
 * component along the shoulder line sinks past SHOULDER_MIN_OUTWARD the arm
 * has crossed the body midline — rebuild the direction with the component
 * floored and apply the minimal world-space rotation that takes the bone
 * there (world→local exactly like alignBoneDown). Gated to arms at/below
 * horizontal (direction.y < SHOULDER_GATE_Y) so overhead waves and dance
 * arm-crosses above the shoulder keep full freedom.
 */
function clampUpperArmAdduction(
  upperArm: THREE.Object3D,
  lowerArm: THREE.Object3D,
  shoulderL: THREE.Object3D,
  shoulderR: THREE.Object3D,
): void {
  const a = upperArm.getWorldPosition(_shA);
  const b = lowerArm.getWorldPosition(_shB);
  const d = _shD.subVectors(b, a);
  if (d.lengthSq() < 1e-10) return;
  d.normalize();
  if (d.y >= SHOULDER_GATE_Y) return; // above horizontal — full freedom
  const lp = shoulderL.getWorldPosition(_shLP);
  const rp = shoulderR.getWorldPosition(_shRP);
  const outward = _shOut.subVectors(rp, lp);
  if (outward.lengthSq() < 1e-10) return;
  outward.normalize();
  const outD = d.dot(outward);
  if (outD >= SHOULDER_MIN_OUTWARD) return; // not crossed past the midline
  const dFix = _shFix.copy(d).addScaledVector(outward, SHOULDER_MIN_OUTWARD - outD).normalize();
  _shQF.setFromUnitVectors(d, dFix);
  const parentW = upperArm.parent!.getWorldQuaternion(_shQP);
  const world = upperArm.getWorldQuaternion(_shQW);
  // W' = qFix ⊗ W  →  local = parentW⁻¹ ⊗ qFix ⊗ W
  upperArm.quaternion.copy(parentW.invert()).multiply(_shQF).multiply(world);
}

/** Radians out from straight down for a calm idle arm. ~24°, clear of the ribs. */
export const IDLE_ARM_ABDUCT = 0.42;

/**
 * Direction a hanging arm should take so the shoulder stays open.
 * Returns null when the arm is raised or already open enough.
 * `outward` is left-shoulder → right-shoulder.
 */
export function idleHangDirection(
  current: THREE.Vector3,
  outward: THREE.Vector3,
  left: boolean,
): THREE.Vector3 | null {
  if (current.lengthSq() < 1e-10) return null;
  const d = current.clone().normalize();
  // Only skip when the arm is clearly raised. A near-vertical hang is the slump.
  if (d.y > -0.55) return null;
  const fromDown = Math.acos(Math.min(1, Math.max(0, -d.y)));
  if (fromDown >= IDLE_ARM_ABDUCT - 0.02) return null;
  const horiz = new THREE.Vector3(d.x, 0, d.z);
  if (horiz.lengthSq() < 1e-6) {
    horiz.copy(outward);
    if (left) horiz.negate();
  }
  if (horiz.lengthSq() < 1e-10) return null;
  horiz.normalize();
  const s = Math.sin(IDLE_ARM_ABDUCT);
  return new THREE.Vector3(horiz.x * s, -Math.cos(IDLE_ARM_ABDUCT), horiz.z * s);
}

interface ShoulderRest {
  q: THREE.Quaternion;
  drop: number;
  /** Only restore bind clavicle when bind upper-arm already hangs (A-pose). */
  restoreClavicle: boolean;
}

/** Hang-like bind arms (A-pose). T-pose arms are near horizontal (dir.y ~ 0). */
export const SHOULDER_RESTORE_ARM_DIR_Y = -0.35;

/** True when bind upper-arm world direction is hang-like enough to reuse clavicle. */
export function clavicleRestoreFromArmDir(dirY: number): boolean {
  return dirY <= SHOULDER_RESTORE_ARM_DIR_Y;
}

function captureShoulderRest(get: (name: string) => THREE.Object3D | null): Map<string, ShoulderRest> {
  const out = new Map<string, ShoulderRest>();
  const chest = get('chest') ?? get('spine') ?? get('hips');
  if (!chest) return out;
  const cy = chest.getWorldPosition(new THREE.Vector3()).y;
  for (const side of SIDES) {
    const shoulder = get(`${side}Shoulder`);
    const upper = get(`${side}UpperArm`);
    const lower = get(`${side}LowerArm`);
    if (!shoulder || !upper) continue;
    const drop = upper.getWorldPosition(new THREE.Vector3()).y - cy;
    // Arm chain direction at bind: T-pose ~horizontal (dir.y~0); A-pose hangs (dir.y low).
    let dirY = 0;
    if (lower) {
      const a = upper.getWorldPosition(new THREE.Vector3());
      const b = lower.getWorldPosition(new THREE.Vector3());
      const d = b.sub(a);
      if (d.lengthSq() > 1e-10) dirY = d.normalize().y;
    }
    out.set(side, {
      q: shoulder.quaternion.clone(),
      drop,
      restoreClavicle: clavicleRestoreFromArmDir(dirY),
    });
  }
  return out;
}

function easeIdleHangOn(
  get: (name: string) => THREE.Object3D | null,
  rest: ReadonlyMap<string, ShoulderRest>,
): void {
  const sl = get('leftShoulder');
  const sr = get('rightShoulder');
  const chest = get('chest') ?? get('spine') ?? get('hips');
  if (!sl || !sr || !chest) return;
  const outward = _shOut.subVectors(sr.getWorldPosition(_shRP), sl.getWorldPosition(_shLP));
  if (outward.lengthSq() < 1e-10) return;
  outward.normalize();
  const cy = chest.getWorldPosition(_shA).y;
  for (const side of SIDES) {
    const upper = get(`${side}UpperArm`);
    const lower = get(`${side}LowerArm`);
    const shoulder = get(`${side}Shoulder`);
    if (!upper || !lower || !shoulder) continue;
    const spec = rest.get(side);
    if (spec) {
      const drop = upper.getWorldPosition(_shA).y - cy;
      // Copy the bind clavicle only when bind was already a hang (A-pose).
      // T-pose bind clavicles are for raised arms; pasting them onto a hanging
      // upper arm collapses the shoulder into the torso (Mon t265u).
      if (spec.restoreClavicle && drop < spec.drop - 0.004) shoulder.quaternion.copy(spec.q);
    }
    shoulder.updateMatrixWorld(true);
    const a = upper.getWorldPosition(_shA);
    const b = lower.getWorldPosition(_shB);
    const d = _shD.subVectors(b, a);
    const want = idleHangDirection(d, outward, side === 'left');
    if (want && d.lengthSq() > 1e-10) {
      d.normalize();
      _shQF.setFromUnitVectors(d, want.clone().normalize());
      const parentW = upper.parent!.getWorldQuaternion(_shQP);
      const world = upper.getWorldQuaternion(_shQW);
      upper.quaternion.copy(parentW.invert()).multiply(_shQF).multiply(world);
    }
  }
}

const _fgTgt = new THREE.Quaternion();
const _fgBlend = new THREE.Quaternion();
const FINGER_BEND = 0.08;
const FINGER_TAU = 0.2;

/** Clip fingers stay a little bent, and the bend eases in instead of snapping. */
function smoothClipFingers(
  entries: readonly RelaxedHandEntry[],
  clipAnimatedBones: ReadonlySet<string>,
  shown: Map<THREE.Object3D, THREE.Quaternion>,
  dt: number,
  fullIdle = false,
): void {
  const a = fullIdle ? 1 : 1 - Math.exp(-Math.max(0, dt) / FINGER_TAU);
  const bend = fullIdle ? 1 : FINGER_BEND;
  for (const e of entries) {
    if (!fullIdle && !clipAnimatedBones.has(e.node.name)) continue;
    _fgTgt.copy(e.base).multiply(e.delta);
    _fgBlend.copy(e.node.quaternion).slerp(_fgTgt, bend);
    let q = shown.get(e.node);
    if (!q) {
      q = _fgBlend.clone();
      shown.set(e.node, q);
    } else {
      q.slerp(_fgBlend, a);
    }
    e.node.quaternion.copy(q);
  }
}

// ---------------------------------------------------------------------------
// VRM 1.0 avatar (normalized bones — the pre-r.50 code path, preserved)
// ---------------------------------------------------------------------------

class V1Avatar implements Avatar {
  kind = 'v1' as const;
  root: THREE.Object3D;
  clipDrivesBody = false;
  readonly clipAnimatedBones: ReadonlySet<string>;
  readonly fingerBones: ReadonlySet<string>;
  private vrm: VRM;
  private relaxedHands: RelaxedHandEntry[] = [];
  private fingerShown = new Map<THREE.Object3D, THREE.Quaternion>();
  private fingerMap = new Map<string, THREE.Object3D>();
  private shoulderRest = new Map<string, ShoulderRest>();
  // r107: additive-head state — see applyClipHeadAdd
  private headAddInit = false;
  private planter = new FootPlanter();
  private chestBounce = new ChestBounce();
  private readonly headAddBaseE = new THREE.Euler();
  private readonly headAddWritten = new THREE.Quaternion();
  private readonly addSlots = new Map<string, { base: THREE.Quaternion; written: THREE.Quaternion; init: boolean }>();
  private readonly addEuler = new THREE.Euler(0, 0, 0, 'XYZ');
  private readonly addDelta = new THREE.Quaternion();

  constructor(vrm: VRM, clipAnimatedBones: ReadonlySet<string> = new Set()) {
    this.vrm = vrm;
    this.clipAnimatedBones = clipAnimatedBones;
    // r2026-10-04.76: wrap the model — the calibration yaw stays on the
    // inner scene node; the canvas's per-frame root transforms (and the
    // idle rotation.set(0,0,0) reset) only ever touch the wrapper.
    const wrap = new THREE.Group();
    wrap.add(vrm.scene);
    this.root = wrap;
    // r101: un-tilt a rotated-root (Z-up) export BEFORE the facing yaw — a
    // model that lies flat used to stay flat until its first rebased clip
    // frame (and only if clips ever loaded).
    calibrateUpright(
      vrm.scene,
      vrm.humanoid?.getNormalizedBoneNode('hips') ?? null,
      vrm.humanoid?.getNormalizedBoneNode('head') ?? null,
    );
    calibrateFacing(
      vrm.scene,
      vrm.humanoid?.getNormalizedBoneNode('leftShoulder') ?? null,
      vrm.humanoid?.getNormalizedBoneNode('rightShoulder') ?? null,
    );
    // r103: resolve the finger humanoid bones, then measure the relaxed-hand
    // curl while the rig is still pristine (fold-test calibration — see the
    // helper above). Clips load AFTER this, so the clipAnimatedBones guard
    // is re-checked per frame in applyRelaxedHands.
    for (const side of SIDES) {
      for (const finger of FINGERS) {
        for (const ph of PHALANGES) {
          const name = `${side}${finger}${ph}` as VRMHumanBoneName;
          const node = vrm.humanoid?.getNormalizedBoneNode(name);
          if (node) this.fingerMap.set(name, node);
        }
      }
    }
    this.fingerBones = new Set([...this.fingerMap.values()].map((n) => n.name));
    this.relaxedHands = calibrateRelaxedHands(this.fingerMap, this.clipAnimatedBones);
    this.root.updateMatrixWorld(true);
    this.shoulderRest = captureShoulderRest((name) => this.getBoneNode(name));
    this.planter.capture(vrm.scene, (name) => this.getBoneNode(name));
    // A stray look-at target rolls the iris off the pupil. Gaze stays on the head.
    if (vrm.lookAt) vrm.lookAt.autoUpdate = false;
  }

  setExpression(name: string, value: number): void {
    const em = this.vrm.expressionManager;
    if (!em) return;
    try { em.setValue(name, capEyeExpression(name, value)); } catch { /* preset absent on this model */ }
  }

  applyPose(raw: AvatarPose): void {
    // r60: procedural puppetry is clamped to human anatomy first — a
    // generated pose can lean/twist, but never dislocate. (Library clips
    // bypass this path entirely; they own the skeleton via the mixer.)
    const p = clampPoseHuman(raw);
    const setEuler = (name: VRMHumanBoneName, x: number, y: number, z: number) => {
      const node = this.vrm.humanoid?.getNormalizedBoneNode(name);
      if (node) node.rotation.set(x, y, z);
    };
    const headX = clampField(p.headX + (p.headPitchAdd ?? 0), HUMAN_LIMITS.headPitchAdd);
    const headZ = clampField(p.headZ + (p.headRollAdd ?? 0), HUMAN_LIMITS.headRollAdd);
    if (this.clipDrivesBody) {
      // r97: a whisper of procedural head life — ADDED to whatever the mixer
      // wrote this frame. The old setRot() overwrote the synced euler every
      // frame, freezing the clip's own head motion into a stiff stare.
      // r107: the whisper is now a rebuilt-from-base, ROM-clamped offset
      // (see applyClipHeadAdd) — the old euler += could neither wrap nor
      // clamp, and it spiralled into 360° spins whenever no active clip
      // track owned the head bone between frames.
      this.applyClipHeadAdd(p);
    } else {
      setEuler('head', headX, p.headY, headZ);
      setEuler('leftUpperArm', 0, 0, -p.leftUpperArm);
      setEuler('rightUpperArm', 0, 0, p.rightUpperArm);
      setEuler('leftLowerArm', 0, 0, -p.leftLowerArm);
      setEuler('rightLowerArm', 0, 0, p.rightLowerArm);
      setEuler('spine', p.spineX, 0, 0);
      setEuler('chest', p.chestX, 0, 0);
    }
    // Poke and move additives are a local quaternion on a fresh base.
    // euler += used to accumulate on any clip that did not key that bone,
    // which flipped the whole body.
    this.applyStableAdd('spine', p.spinePitchAdd, p.spineY, 0);
    this.applyStableAdd('chest', p.chestPitchAdd, 0, p.chestZ);
    this.applyStableAdd('leftUpperArm', p.lArmX, 0, p.lArmRaise ?? 0);
    this.applyStableAdd('rightUpperArm', p.rArmX, 0, -(p.rArmRaise ?? 0));
    this.applyStableAdd('leftLowerArm', 0, 0, p.lElbowZ);
    this.applyStableAdd('rightLowerArm', 0, 0, p.rElbowZ);
  }

  /**
   * Rebuild `base * localDelta` every frame. If the mixer (or setEuler)
   * rewrote the bone, that pose becomes the new base. If nothing else
   * touched it, the same delta is reapplied — it never accumulates.
   */
  private applyStableAdd(name: VRMHumanBoneName, x: number, y: number, z: number): void {
    const node = this.vrm.humanoid?.getNormalizedBoneNode(name);
    if (!node) return;
    let slot = this.addSlots.get(name);
    if (!slot) {
      slot = { base: new THREE.Quaternion(), written: new THREE.Quaternion(), init: false };
      this.addSlots.set(name, slot);
    }
    const mag = Math.abs(x) + Math.abs(y) + Math.abs(z);
    if (mag < 1e-6) {
      if (slot.init && node.quaternion.equals(slot.written)) {
        node.quaternion.copy(slot.base);
        slot.written.copy(node.quaternion);
      }
      return;
    }
    if (!slot.init || !node.quaternion.equals(slot.written)) {
      slot.base.copy(node.quaternion);
      slot.init = true;
    }
    this.addEuler.set(x, y, z);
    this.addDelta.setFromEuler(this.addEuler);
    node.quaternion.copy(slot.base).multiply(this.addDelta);
    slot.written.copy(node.quaternion);
  }

  /**
   * r107 (Master Simon): "the character's head rotates 360° — very
   * strange." The r97 additive head life was `node.rotation[axis] += v` —
   * a raw euler accumulate on the bone. When the active clip(s) carry no
   * head track, the mixer never rewrites the head between frames, so the
   * += compounded (up to ~0.18 rad/frame) and the head swept full circles.
   * Fix: rebuild the additive layer every frame from an explicit base.
   *   · base refresh — if the bone's quaternion differs from what WE wrote
   *     last frame, the mixer (re)wrote it (it owns a head track): refresh
   *     the base from the synced euler. If it matches exactly, nothing
   *     touched the bone since (no head track): reuse the stored base, so
   *     the SAME offset re-applies identically instead of accumulating.
   *   · shortest path — the offset is an absolute, ROM-clamped target,
   *     never a frame-over-frame delta, so no angle can travel the long
   *     way around; the total stays within base ± the neck ROM below.
   *   · ROM — pitch ±45° / yaw ±80° / roll ±25°: even a runaway pose value
   *     can only tilt a human amount from the clip pose. The clip pose
   *     itself is untouched — library performances keep full freedom.
   */
  private applyClipHeadAdd(p: AvatarPose): void {
    const node = this.vrm.humanoid?.getNormalizedBoneNode('head');
    if (!node) return;
    if (!this.headAddInit || !node.quaternion.equals(this.headAddWritten)) {
      this.headAddBaseE.copy(node.rotation); // synced euler = what the mixer wrote
      this.headAddInit = true;
    }
    const ox = clampField(p.headX * 0.3 + (p.headPitchAdd ?? 0), HUMAN_LIMITS.headPitchAdd);
    const oy = clampField(p.headY * 0.3, [-HEAD_ADD_ROM.y, HEAD_ADD_ROM.y] as const);
    const oz = clampField(p.headZ * 0.3 + (p.headRollAdd ?? 0), HUMAN_LIMITS.headRollAdd);
    node.rotation.set(
      this.headAddBaseE.x + ox,
      this.headAddBaseE.y + oy,
      this.headAddBaseE.z + oz,
    );
    this.headAddWritten.copy(node.quaternion);
  }

  // r103: re-apply the calibrated relaxed curl AFTER the mixer + applyPose
  // wrote the skeleton this frame. Idempotent (base·delta, never accumulate),
  // and any phalange a clip animates is skipped so the two never fight.
  // Calm idle owns the fingers outright so a VRMA claw cannot stay blended in.
  applyRelaxedHands(fullIdle = false): void {
    for (const e of this.relaxedHands) {
      if (!fullIdle && this.clipAnimatedBones.has(e.node.name)) continue;
      e.node.quaternion.copy(e.base).multiply(e.delta);
    }
  }

  smoothFingers(dt: number, fullIdle = false): void {
    smoothClipFingers(this.relaxedHands, this.clipAnimatedBones, this.fingerShown, dt, fullIdle);
  }

  // r103: floor each upper arm's outward swing (see clampUpperArmAdduction)
  clampShoulderROM(): void {
    const h = (n: VRMHumanBoneName) => this.vrm.humanoid?.getNormalizedBoneNode(n) ?? null;
    const sl = h('leftShoulder');
    const sr = h('rightShoulder');
    if (!sl || !sr) return;
    const l = h('leftUpperArm');
    const le = h('leftLowerArm');
    if (l && le) clampUpperArmAdduction(l, le, sl, sr);
    const r = h('rightUpperArm');
    const re = h('rightLowerArm');
    if (r && re) clampUpperArmAdduction(r, re, sl, sr);
  }

  easeIdleHang(): void {
    easeIdleHangOn((name) => this.getBoneNode(name), this.shoulderRest);
  }

  plantFeet(plant: boolean, lean?: PlantLean): void {
    if (plant) this.planter.apply(lean);
  }

  applyChestBounce(pitch: number): void {
    const joints = this.vrm.springBoneManager?.joints;
    this.chestBounce.apply(this.vrm.scene, pitch, joints);
  }

  /** r115: the humanoid bone behind a semantic name (normalized node for VRM 1.0) */
  getBoneNode(name: string): THREE.Object3D | null {
    try {
      return this.vrm.humanoid?.getNormalizedBoneNode(name as VRMHumanBoneName) ?? null;
    } catch {
      return null;
    }
  }

  /** r124: second facing pass on the inner scene after the idle frame settles */
  recalibrateFacing(): void {
    calibrateFacing(
      this.vrm.scene,
      this.vrm.humanoid?.getNormalizedBoneNode('leftShoulder') ?? null,
      this.vrm.humanoid?.getNormalizedBoneNode('rightShoulder') ?? null,
    );
  }

  recalibrateUpright(): void {
    calibrateUpright(
      this.vrm.scene,
      this.vrm.humanoid?.getNormalizedBoneNode('hips') ?? null,
      this.vrm.humanoid?.getNormalizedBoneNode('head') ?? null,
    );
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
  readonly clipAnimatedBones: ReadonlySet<string>;
  readonly fingerBones: ReadonlySet<string>;
  /** the calibrated inner model node (facing yaw lives here, never on root) */
  private inner: THREE.Object3D;
  private bones = new Map<BoneName, THREE.Object3D>();
  private fingers = new Map<string, THREE.Object3D>();
  private expressions = new Map<string, ExpressionBind[]>();
  /** calibrated rest local quats for bones applyPose drives (and arms) */
  private baseLocal = new Map<string, THREE.Quaternion>();
  private relaxedHands: RelaxedHandEntry[] = [];
  private fingerShown = new Map<THREE.Object3D, THREE.Quaternion>();
  private shoulderRest = new Map<string, ShoulderRest>();
  private blinkT = 2.2 + Math.random() * 2;
  private blinkPhase = -1;

  // scratch objects (no per-frame allocation)
  private sRw = new THREE.Quaternion();
  private sPw = new THREE.Quaternion();
  private sE = new THREE.Euler();
  private planter = new FootPlanter();
  private chestBounce = new ChestBounce();

  constructor(gltf: GLTF, clipAnimatedBones: ReadonlySet<string> = new Set()) {
    // r2026-10-04.76: same wrapper split as V1Avatar — canvas overlays own
    // the wrapper, the facing calibration owns the inner scene node.
    this.inner = gltf.scene;
    this.root = new THREE.Group();
    this.root.add(gltf.scene);
    this.clipAnimatedBones = clipAnimatedBones;
    const json = (gltf.parser as unknown as { json: Record<string, unknown> }).json;
    this.resolveBones(gltf, json);
    this.resolveExpressions(gltf, json);
    this.calibrate();
    // r103: relaxed-hand calibration AFTER arm calibration — the fold-test
    // measures world distances, so the arms must be in their final rest pose
    this.fingerBones = new Set([...this.fingers.values()].map((n) => n.name));
    this.relaxedHands = calibrateRelaxedHands(this.fingers, this.clipAnimatedBones);
    this.root.updateMatrixWorld(true);
    this.shoulderRest = captureShoulderRest((name) => this.getBoneNode(name));
    this.planter.capture(this.inner, (name) => this.getBoneNode(name));
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
      if (!obj) return;
      if ((BONE_NAMES as readonly string[]).includes(bone)) {
        this.bones.set(bone as BoneName, obj);
      } else if ((FINGER_BONE_NAMES as readonly string[]).includes(bone)) {
        // r103: finger humanoid bones — the relaxed-hand calibration resolves
        // them by the same camelCase names on VRM 0.x and 1.0 rigs
        this.fingers.set(bone, obj);
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
    // Modular head/body GLBs keep the VRoid names and often drop the
    // VRMC_vrm extension. Resolve those joints directly — no rescale.
    if (!this.bones.has('head')) this.resolveVroidBones(gltf.scene);
    if (!this.bones.has('head')) throw new Error('no humanoid head bone — not a usable avatar');
  }

  private resolveVroidBones(root: THREE.Object3D): void {
    const found = new Map<string, THREE.Object3D>();
    root.traverse((o) => {
      if (!o.name) return;
      if (!VROID_TO_HUMANOID[o.name] && !vroidFingerHumanoid(o.name)) return;
      const prev = found.get(o.name);
      const boneLike = (o as THREE.Bone).isBone === true;
      if (!prev || boneLike) found.set(o.name, o);
    });
    const putNamed = (human: string, node: THREE.Object3D) => {
      if ((BONE_NAMES as readonly string[]).includes(human)) {
        this.bones.set(human as BoneName, node);
      } else if ((FINGER_BONE_NAMES as readonly string[]).includes(human)) {
        this.fingers.set(human, node);
      }
    };
    for (const [name, node] of found) {
      const human = VROID_TO_HUMANOID[name] ?? vroidFingerHumanoid(name);
      if (human) putNamed(human, node);
    }
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
    // r101: un-tilt a lying (rotated-root / Z-up export) model BEFORE any
    // other calibration — measuring shoulders and arm directions against a
    // flat body would align the arms along the floor, and no clip ever
    // arrives to rescue a generic (VRM 0.x) rig.
    calibrateUpright(this.inner, this.bones.get('hips') ?? null, this.bones.get('head') ?? null);
    // facing yaw goes on the INNER node — the canvas rewrites the wrapper's
    // rotation every frame, so calibrating the wrapper would be undone.
    calibrateFacing(this.inner, this.bones.get('leftShoulder') ?? null, this.bones.get('rightShoulder') ?? null);

    // remember every bone's rest local rotation first (head/spine baseline)
    for (const [, node] of this.bones) {
      this.baseLocal.set(node.name, node.quaternion.clone());
    }

    // arms: a natural hang, a little out and forward — straight down collapses
    // the shoulder on rigs authored in A-pose, and the procedural pose used
    // to add ARM_DOWN_BASE on top of that (arms through the torso).
    const armX = new THREE.Vector3(1, 0, 0);
    const aims: Array<[BoneName, BoneName, THREE.Vector3, THREE.Vector3]> = [
      ['leftUpperArm', 'leftLowerArm', naturalArmDir('left', 0.4, 0.12), armX],
      ['rightUpperArm', 'rightLowerArm', naturalArmDir('right', 0.4, 0.12), armX],
      ['leftLowerArm', 'leftHand', naturalArmDir('left', 0.28, 0.06), new THREE.Vector3(0, 0, 1)],
      ['rightLowerArm', 'rightHand', naturalArmDir('right', 0.28, 0.06), new THREE.Vector3(0, 0, 1)],
    ];
    this.root.updateMatrixWorld(true);
    for (const [boneName, childName, dir, fb] of aims) {
      const bone = this.bones.get(boneName);
      const child = this.bones.get(childName);
      if (bone && child) alignBoneToward(bone, child, dir, this.baseLocal, fb);
    }
    this.root.updateMatrixWorld(true);
  }

  // -- runtime API -----------------------------------------------------------

  setExpression(name: string, value: number): void {
    const capped = capEyeExpression(name, value);
    const v = Math.max(0, Math.min(1, capped));
    const bindName = (EXPRESSION_ALIAS[name.toLowerCase()] ?? name).toLowerCase();
    if (!bindName) return; // e.g. relaxed on a 0.x model — nothing to drive
    const binds = this.expressions.get(bindName);
    if (!binds) return;
    for (const b of binds) b.mesh.morphTargetInfluences![b.index] = v;
  }

  applyPose(raw: AvatarPose): void {
    // r60: clamp to human anatomy before touching any bone (library clips
    // never come through here, so they keep full freedom).
    const p = clampPoseHuman(raw);
    // world-axis deltas on top of the calibrated rest pose:
    //   head        X=pitch Y=yaw Z=roll
    //   spine       X=pitch Y=yaw · chest X=pitch Z=roll
    //   upper arms  Z (left + lowers, right − lowers), X = swing
    //   elbows      X (positive bends the forearm forward)
    this.root.updateMatrixWorld(true);
    // r83: the poke-recoil pitch additives fold into the spine/chest pitch
    // (two X-rotations about the same axis compose as their sum)
    this.applyBone('spine', p.spineX + p.spinePitchAdd, p.spineY, 0);
    this.applyBone('chest', p.chestX + p.chestPitchAdd, 0, p.chestZ);
    this.applyBone(
      'head',
      clampField(p.headX + (p.headPitchAdd ?? 0), HUMAN_LIMITS.headPitchAdd),
      p.headY,
      clampField(p.headZ + (p.headRollAdd ?? 0), HUMAN_LIMITS.headRollAdd),
    );
    // The calibrated rest already hangs the arm. mapFrameToVrm's upper-arm
    // value includes ARM_DOWN_BASE measured from a T-pose, so only the extra
    // (breath, pose, poke raise) is applied here.
    const lExtra = p.leftUpperArm - ARM_DOWN_BASE;
    const rExtra = p.rightUpperArm - ARM_DOWN_BASE;
    this.applyBone('leftUpperArm', p.lArmX, 0, lExtra - (p.lArmRaise ?? 0));
    this.applyBone('rightUpperArm', p.rArmX, 0, -(rExtra - (p.rArmRaise ?? 0)));
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

  // r103: same contract as V1Avatar — idempotent base·delta, clip-owned
  // phalanges skipped (clipAnimatedBones holds node names from the track scan)
  applyRelaxedHands(fullIdle = false): void {
    for (const e of this.relaxedHands) {
      if (!fullIdle && this.clipAnimatedBones.has(e.node.name)) continue;
      e.node.quaternion.copy(e.base).multiply(e.delta);
    }
  }

  smoothFingers(dt: number, fullIdle = false): void {
    smoothClipFingers(this.relaxedHands, this.clipAnimatedBones, this.fingerShown, dt, fullIdle);
  }

  // r103: floor each upper arm's outward swing (see clampUpperArmAdduction)
  clampShoulderROM(): void {
    const sl = this.bones.get('leftShoulder');
    const sr = this.bones.get('rightShoulder');
    if (!sl || !sr) return;
    const l = this.bones.get('leftUpperArm');
    const le = this.bones.get('leftLowerArm');
    if (l && le) clampUpperArmAdduction(l, le, sl, sr);
    const r = this.bones.get('rightUpperArm');
    const re = this.bones.get('rightLowerArm');
    if (r && re) clampUpperArmAdduction(r, re, sl, sr);
  }

  easeIdleHang(): void {
    easeIdleHangOn((name) => this.getBoneNode(name), this.shoulderRest);
  }

  plantFeet(plant: boolean, lean?: PlantLean): void {
    if (plant) this.planter.apply(lean);
  }

  applyChestBounce(pitch: number): void {
    this.chestBounce.apply(this.inner, pitch);
  }

  /** r115: resolved bone by semantic name — body map first, then fingers */
  getBoneNode(name: string): THREE.Object3D | null {
    return this.bones.get(name as BoneName) ?? this.fingers.get(name) ?? null;
  }

  /** r124: second facing pass on the inner node after the idle frame settles */
  recalibrateFacing(): void {
    calibrateFacing(
      this.inner,
      this.bones.get('leftShoulder') ?? null,
      this.bones.get('rightShoulder') ?? null,
    );
  }

  recalibrateUpright(): void {
    calibrateUpright(
      this.inner,
      this.bones.get('hips') ?? null,
      this.bones.get('head') ?? null,
    );
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

export function createV1Avatar(vrm: VRM, clipAnimatedBones: ReadonlySet<string> = new Set()): Avatar {
  return new V1Avatar(vrm, clipAnimatedBones);
}

/** build a calibrated avatar from a plain-GLTF load (VRM 0.x or humanoid glTF) */
export function createGenericAvatar(gltf: GLTF, clipAnimatedBones: ReadonlySet<string> = new Set()): Avatar {
  return new GenericAvatar(gltf, clipAnimatedBones);
}
