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
  // move-performance + poke-recoil additives (folded in by the canvas before
  // applying); they ride on top of BOTH procedural poses and library clips
  spineY: number; chestZ: number;
  lArmX: number; rArmX: number;
  lElbowZ: number; rElbowZ: number;
  /** r83: lean-back recoil on the torso — spine flexes deeper than chest */
  spinePitchAdd: number; chestPitchAdd: number;
  /**
   * r86: move-performance arm raises — + lifts the arm from wherever the
   * body currently is (semantic, not raw-axis: each avatar kind maps it to
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
  // r83: torso recoil additives (the skeleton poke) — a human can lean
  // back about this far before it stops reading as human
  spinePitchAdd: [-0.6, 0.6], chestPitchAdd: [-0.5, 0.5],
  // r86: arm raises from the current position — an idol mic-hand or a
  // violin/piano arm lifts about this far and no further
  lArmRaise: [-1.6, 1.6], rArmRaise: [-1.6, 1.6],
} as const;

const clampField = (v: number, range: readonly [number, number]): number =>
  v < range[0] ? range[0] : v > range[1] ? range[1] : v;

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
  applyRelaxedHands(): void;
  /** r103: floor the upper arm's outward swing so arms never cross the midline */
  clampShoulderROM(): void;
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

/**
 * r101: un-tilt `node` so the hips→head line is vertical (+Y). Some VRMs
 * ship a rotated root (Z-up exports) and lie flat; the old calibration only
 * yawed the facing, so those models lay on the floor until (unless) their
 * first rebased clip frame corrected them — and generic avatars never get
 * clips. A no-op for upright models (dot(up, +Y) > 0.7), so the rest pose
 * of a well-authored model is never touched. Runs BEFORE facing and arm
 * calibration so every later measurement sees a standing body.
 */
function calibrateUpright(node: THREE.Object3D, hips: THREE.Object3D | null, head: THREE.Object3D | null): void {
  if (!hips || !head) return;
  node.updateMatrixWorld(true);
  const a = hips.getWorldPosition(new THREE.Vector3());
  const b = head.getWorldPosition(new THREE.Vector3());
  const up = b.sub(a);
  if (up.lengthSq() < 1e-10) return;
  up.normalize();
  if (up.dot(UP) > 0.7) return; // already upright — leave the rest pose alone
  node.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(up, UP));
  node.updateMatrixWorld(true);
}

/** yaw `node` so the line leftShoulder→rightShoulder implies facing +Z */
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
// r103: relaxed hands + shoulder ROM clamp (shared by both avatar kinds)
// ---------------------------------------------------------------------------

const SIDES = ['left', 'right'] as const;
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'] as const;
const PHALANGES = ['Proximal', 'Intermediate', 'Distal'] as const;
// every finger humanoid bone, camelCase on BOTH VRM 0.x and 1.0 rigs
const FINGER_BONE_NAMES: string[] = SIDES.flatMap((s) =>
  FINGERS.flatMap((f) => PHALANGES.map((p) => `${s}${f}${p}`)));

/** calibrated relaxed curl per finger, radians per phalange (proximal→distal) — 15–33° */
const RELAXED_CURL: Record<(typeof FINGERS)[number], readonly [number, number, number]> = {
  Thumb: [0.35, 0.30, 0.28],
  Index: [0.32, 0.47, 0.50],
  Middle: [0.28, 0.42, 0.45],
  Ring: [0.33, 0.50, 0.52],
  Little: [0.38, 0.55, 0.57],
};
const CURL_PROBE = 0.35;       // rad — calibration test rotation per axis
const CURL_MIN_GAIN = 1e-4;    // below this the finger is left untouched
const THUMB_OPPOSITION = 0.30; // rad — thumb proximal rolls toward the index

interface RelaxedHandEntry {
  node: THREE.Object3D;
  base: THREE.Quaternion;
  delta: THREE.Quaternion;
}

// r103 scratch (load-time calibration only — the per-frame path allocates nothing)
const _rhE = new THREE.Euler();
const _rhV = new THREE.Vector3();

/**
 * r103: measure a gentle relaxed-hand curl for every finger the rig has.
 * The curl AXIS/DIR is not assumed (rigs disagree): for each finger, rotate
 * ALL its phalanges by ±CURL_PROBE about each local axis in turn and keep
 * the combo that DECREASES the phalanges' summed distance to the wrist —
 * fold vs unfold is pose-independent, so the test reads true from a T-pose
 * or hanging arms alike. A finger whose distance does not shrink on ANY
 * axis is left untouched. The thumb proximal additionally gets opposition:
 * the rotation that moves the thumb tip TOWARD the index proximal.
 * Entry = { node, base: rest local quat, delta: curl quat } — per frame the
 * avatar writes base·delta, which is idempotent. Bones a loaded clip
 * animates (clipAnimatedBones — node names) are skipped so the mixer and
 * the curl never fight over the same phalange.
 */
function calibrateRelaxedHands(
  fingers: ReadonlyMap<string, THREE.Object3D>,
  clipAnimatedBones: ReadonlySet<string>,
): RelaxedHandEntry[] {
  const out: RelaxedHandEntry[] = [];
  for (const side of SIDES) {
    // the wrist is any proximal phalange's parent — shared by the whole hand
    const anyProximal = fingers.get(`${side}ThumbProximal`)
      ?? fingers.get(`${side}IndexProximal`);
    const wrist = anyProximal?.parent;
    if (!wrist) continue;
    const wristPos = wrist.getWorldPosition(new THREE.Vector3());
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
      const saved = chain.map((n) => n.quaternion.clone());
      const before = measure();
      let bestAxis: 'x' | 'y' | 'z' | null = null;
      let bestSign = 1;
      let bestGain = CURL_MIN_GAIN;
      for (const axis of ['x', 'y', 'z'] as const) {
        for (const sign of [1, -1] as const) {
          for (const node of chain) {
            _rhE.setFromQuaternion(node.quaternion);
            _rhE[axis] += CURL_PROBE * sign;
            node.quaternion.setFromEuler(_rhE);
          }
          wrist.updateWorldMatrix(true, true);
          const gain = before - measure();
          for (let i = 0; i < chain.length; i++) chain[i]!.quaternion.copy(saved[i]!);
          wrist.updateWorldMatrix(true, true);
          if (gain > bestGain) { bestGain = gain; bestAxis = axis; bestSign = sign; }
        }
      }
      if (!bestAxis) continue; // no fold direction on this rig — leave it alone
      // thumb proximal additionally opposes toward the index finger
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
            for (const sign of [1, -1] as const) {
              _rhE.setFromQuaternion(savedQ);
              _rhE[axis] += CURL_PROBE * sign;
              chain[0]!.quaternion.setFromEuler(_rhE);
              wrist.updateWorldMatrix(true, true);
              const gain = dist0 - distal.getWorldPosition(_rhV).distanceTo(target);
              if (gain > bestOpp) { bestOpp = gain; oppAxis = axis; oppSign = sign; }
            }
          }
          chain[0]!.quaternion.copy(savedQ);
          wrist.updateWorldMatrix(true, true);
          if (bestOpp <= CURL_MIN_GAIN) oppAxis = null; // no opposition found
        }
      }
      for (let i = 0; i < chain.length; i++) {
        const node = chain[i]!;
        if (clipAnimatedBones.has(node.name)) continue; // a clip owns this bone
        const curl = RELAXED_CURL[finger][i] ?? 0;
        const opp = i === 0 && oppAxis ? THUMB_OPPOSITION : 0;
        if (!curl && !opp) continue;
        _rhE.set(0, 0, 0);
        if (curl) _rhE[bestAxis] += bestSign * curl;
        if (opp) _rhE[oppAxis!] += oppSign * opp;
        out.push({ node, base: saved[i]!.clone(), delta: new THREE.Quaternion().setFromEuler(_rhE) });
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
  private fingerMap = new Map<string, THREE.Object3D>();

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
  }

  setExpression(name: string, value: number): void {
    const em = this.vrm.expressionManager;
    if (!em) return;
    try { em.setValue(name, value); } catch { /* preset absent on this model */ }
  }

  applyPose(raw: AvatarPose): void {
    // r60: procedural puppetry is clamped to human anatomy first — a
    // generated pose can lean/twist, but never dislocate. (Library clips
    // bypass this path entirely; they own the skeleton via the mixer.)
    const p = clampPoseHuman(raw);
    const setRot = (name: VRMHumanBoneName, axis: 'x' | 'y' | 'z', val: number) => {
      const node = this.vrm.humanoid?.getNormalizedBoneNode(name);
      if (node) node.rotation[axis] = val;
    };
    const addRot = (name: VRMHumanBoneName, axis: 'x' | 'y' | 'z', val: number) => {
      const node = this.vrm.humanoid?.getNormalizedBoneNode(name);
      if (node) node.rotation[axis] += val;
    };
    if (this.clipDrivesBody) {
      // r97: a whisper of procedural head life — ADDED to whatever the mixer
      // wrote this frame. The old setRot() overwrote the synced euler every
      // frame, freezing the clip's own head motion into a stiff stare.
      addRot('head', 'x', p.headX * 0.3);
      addRot('head', 'y', p.headY * 0.3);
      addRot('head', 'z', p.headZ * 0.3);
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
    // move-performance + poke-recoil additives ride on top in both modes
    if (p.spineY) addRot('spine', 'y', p.spineY);
    if (p.chestZ) addRot('chest', 'z', p.chestZ);
    if (p.lArmX) addRot('leftUpperArm', 'x', p.lArmX);
    if (p.rArmX) addRot('rightUpperArm', 'x', p.rArmX);
    if (p.lElbowZ) addRot('leftLowerArm', 'z', p.lElbowZ);
    if (p.rElbowZ) addRot('rightLowerArm', 'z', p.rElbowZ);
    // r83: the poke recoil — pure additive torso lean-back, so it composes
    // with library clips (the mixer wrote the bone this frame; addRot reads
    // the synced euler and tips it further back within human limits)
    if (p.spinePitchAdd) addRot('spine', 'x', p.spinePitchAdd);
    if (p.chestPitchAdd) addRot('chest', 'x', p.chestPitchAdd);
    // r86: move-performance arm raises (+ = lift the arm from wherever it
    // is right now). V1 raw axes: left z+ lifts, right z− lifts.
    if (p.lArmRaise) addRot('leftUpperArm', 'z', p.lArmRaise);
    if (p.rArmRaise) addRot('rightUpperArm', 'z', -p.rArmRaise);
  }

  // r103: re-apply the calibrated relaxed curl AFTER the mixer + applyPose
  // wrote the skeleton this frame. Idempotent (base·delta, never accumulate),
  // and any phalange a clip animates is skipped so the two never fight.
  applyRelaxedHands(): void {
    for (const e of this.relaxedHands) {
      if (this.clipAnimatedBones.has(e.node.name)) continue; // the mixer owns it
      e.node.quaternion.copy(e.base).multiply(e.delta);
    }
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
  private blinkT = 2.2 + Math.random() * 2;
  private blinkPhase = -1;

  // scratch objects (no per-frame allocation)
  private sRw = new THREE.Quaternion();
  private sPw = new THREE.Quaternion();
  private sE = new THREE.Euler();

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
    this.applyBone('head', p.headX, p.headY, p.headZ);
    // r86: arm raises fold into the same Z channel (+semantic lowers, so a
    // raise subtracts on the left and adds on the right)
    this.applyBone('leftUpperArm', p.lArmX, 0, p.leftUpperArm - (p.lArmRaise ?? 0));
    this.applyBone('rightUpperArm', p.rArmX, 0, -(p.rightUpperArm - (p.lArmRaise ?? 0)));
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
  applyRelaxedHands(): void {
    for (const e of this.relaxedHands) {
      if (this.clipAnimatedBones.has(e.node.name)) continue; // the mixer owns it
      e.node.quaternion.copy(e.base).multiply(e.delta);
    }
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
