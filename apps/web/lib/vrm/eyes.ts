// Eye readability + size stability. VRoid faces put the iris and the eye-white
// on coplanar meshes (same vertices, different materials). Without a depth bias
// the white wins the z-test on some frames and the pupil disappears. Expressions
// that drive the eyelid (blink, happy) can also cover the iris completely;
// those weights stay below a full seal so a dark pupil remains readable.
//
// VRM look-at (bone or lookLeft/lookRight expression morphs) can park the
// iris off-center or slide it out of the socket when a stale target or clip
// competes with our head-driven gaze — we pin look-at off and zero those morphs
// every frame on VRM 1.0 avatars.
//
// Eye SIZE: several emotion presets share one eye atlas (textureTransformBinds)
// and/or widen morphs (Surprised). Stacking them lerps UV offsets mid-cell and
// inflates the socket — eyes flicker big↔small. Shared cast caps + one dominant
// atlas expression keep size stable for every cast member.

import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import {
  CAST_EYE_ATLAS_ALIASES,
  CAST_EYE_ATLAS_EXPR,
  eyeCaps,
  type CastEyeAtlasExpr,
  type CastEyeProfile,
} from './cast-eye-profile';

const LOOK_EXPR = ['lookLeft', 'lookRight', 'lookUp', 'lookDown'] as const;

type LookAtLike = {
  autoUpdate: boolean;
  yaw: number;
  pitch: number;
  target?: THREE.Object3D | null;
  reset(): void;
  update(delta: number): void;
};

export type EyeKind = 'white' | 'iris' | 'highlight' | 'line';

export type EyeScalePin = {
  obj: THREE.Object3D;
  x: number;
  y: number;
  z: number;
};

const EYE_EXPR_CHANNEL: Record<string, 'blink' | 'squint' | 'wide' | 'zero'> = {
  blink: 'blink',
  blinkleft: 'blink',
  blinkright: 'blink',
  blink_l: 'blink',
  blink_r: 'blink',
  happy: 'squint',
  fun: 'squint',
  joy: 'squint',
  relaxed: 'squint',
  // Wide morphs / atlas cells — capped so pupils stay readable.
  surprised: 'wide',
  surprise: 'wide',
  lookleft: 'zero',
  lookright: 'zero',
  lookup: 'zero',
  lookdown: 'zero',
};

const ATLAS_SET = new Set<string>(CAST_EYE_ATLAS_EXPR.map((n) => n.toLowerCase()));

/**
 * Cap eyelid / wide morphs for a profile. `atlas` keeps the conservative
 * seed-san caps; `roster` lets pure-morph VRoid rigs reach full expression.
 * Default is `atlas` so any caller that has not opted in stays safe.
 */
export function capEyeExpression(
  name: string,
  value: number,
  profile: CastEyeProfile = 'atlas',
): number {
  if (!Number.isFinite(value)) return 0;
  const channel = EYE_EXPR_CHANNEL[name.toLowerCase()];
  if (channel === undefined) return value < 0 ? 0 : value;
  if (channel === 'zero') return 0;
  const caps = eyeCaps(profile);
  const cap = channel === 'blink' ? caps.blink : channel === 'squint' ? caps.squint : caps.wide;
  const v = value < 0 ? 0 : value;
  return v < cap ? v : cap;
}

const EXPRESSION_BIND_TYPES = new Set(['textureTransform', 'materialColor']);

type ExpressionLike = { binds?: readonly unknown[] };
export type ExpressionManagerLike = { expressions?: readonly ExpressionLike[] } | null | undefined;

/**
 * Pick the eye profile for a mounted rig.
 *
 * `atlas` when ANY expression carries a textureTransform bind: that is exactly
 * the seed-san setup (five emotion presets drive material 11's UV transform),
 * where stacking presets lerps between atlas cells and flickers eye size.
 * Material-colour binds are included defensively — they mark a VRM 0.x atlas
 * rig even though they do not move UVs themselves.
 *
 * `roster` otherwise: the VRoid WANT roster binds pure morph targets, so the
 * atlas rationale does not apply and full expression is safe.
 */
export function detectEyeProfile(manager: ExpressionManagerLike): CastEyeProfile {
  for (const expression of manager?.expressions ?? []) {
    for (const bind of expression.binds ?? []) {
      const type = (bind as { bindType?: unknown } | null)?.bindType;
      if (typeof type === 'string' && EXPRESSION_BIND_TYPES.has(type)) return 'atlas';
    }
  }
  return 'roster';
}

/**
 * Secondary emotion weight allowed alongside the primary on a roster rig.
 * The audit found the old winner-take-all wipe flattened a surprise beat to
 * neutral; keeping a reduced secondary lets brows/mouth come from different
 * emotions. The atlas profile still clears every loser (UV-cell safety).
 */
const ROSTER_SECONDARY_WEIGHT = 0.35;
const ROSTER_SECONDARY_MIN = 0.12;

/**
 * Keep a single dominant face preset for eye-atlas / eye-size morphs.
 * Blink and visemes stay independent. Winner is chosen from raw intent
 * (before caps) so a strong surprised poke is not beaten by a capped happy
 * squint.
 *
 * atlas: losers clear so UV offsets do not lerp between cells (big↔small
 * flicker) and wide morphs do not stick.
 * roster: the winner keeps full weight, one runner-up may coexist at
 * ROSTER_SECONDARY_WEIGHT, everything else clears. Deterministic: order is
 * CAST_EYE_ATLAS_EXPR and ties keep the earlier name.
 */
export function dominateEyeExpressions(
  weights: Readonly<Record<string, number>>,
  profile: CastEyeProfile = 'atlas',
): Record<string, number> {
  // Lowercase + fold aliases (surprise→surprised) so PascalCase / dual keys
  // cannot leave a second atlas cell lit (#433 residual).
  const folded: Record<string, number> = {};
  for (const [k, raw] of Object.entries(weights)) {
    const lower = k.toLowerCase();
    const canon = CAST_EYE_ATLAS_ALIASES[lower] ?? lower;
    const v = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    folded[canon] = Math.max(folded[canon] ?? 0, v);
  }

  const out: Record<string, number> = { ...folded };
  const caps = eyeCaps(profile);

  let best: string | null = null;
  let bestRaw = -Infinity;
  let second: string | null = null;
  let secondRaw = -Infinity;
  for (const name of CAST_EYE_ATLAS_EXPR) {
    const v = out[name] ?? 0;
    if (v > bestRaw) {
      second = best;
      secondRaw = bestRaw;
      best = name;
      bestRaw = v;
    } else if (v > secondRaw) {
      second = name;
      secondRaw = v;
    }
  }

  for (const name of CAST_EYE_ATLAS_EXPR) out[name] = 0;

  if (best && bestRaw > caps.floor) {
    out[best] = capEyeExpression(best, bestRaw, profile);
    if (
      profile === 'roster'
      && second
      && second !== best
      && secondRaw >= ROSTER_SECONDARY_MIN
    ) {
      out[second] = Math.min(secondRaw, ROSTER_SECONDARY_WEIGHT);
    }
  }
  // Clear alias keys so leftover `surprise` cannot fight `surprised`.
  for (const alias of Object.keys(CAST_EYE_ATLAS_ALIASES)) {
    out[alias] = 0;
  }

  // Non-atlas channels (blink, visemes, …) still get their own caps.
  for (const [k, raw] of Object.entries(out)) {
    if (ATLAS_SET.has(k.toLowerCase())) continue;
    if (k.toLowerCase() in CAST_EYE_ATLAS_ALIASES) continue;
    out[k] = capEyeExpression(k, raw, profile);
  }
  return out;
}

/** Apply dominateEyeExpressions then set each weight through the avatar. */
export function applyDominatedEyeExpressions(
  setEm: (name: string, value: number) => void,
  weights: Readonly<Record<string, number>>,
  profile: CastEyeProfile = 'atlas',
): void {
  const dominated = dominateEyeExpressions(weights, profile);
  for (const [name, value] of Object.entries(dominated)) {
    setEm(name, value);
  }
}

export function eyeMaterialKind(materialName: string, meshName = ''): EyeKind | null {
  const n = `${materialName} ${meshName}`.toLowerCase();
  if (/iris|pupil|瞳/.test(n)) return 'iris';
  if (/eyewhite|eye_white|eye-white|白目|sclera/.test(n)) return 'white';
  if (/highlight|catchlight|ハイライト|eyeextra|eye_extra/.test(n)) return 'highlight';
  if (/eyeline|eyelash|まつ|まぶた/.test(n)) return 'line';
  return null;
}

function isEyeMesh(mesh: THREE.Mesh): boolean {
  const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
  if (mats.some((m) => eyeMaterialKind(m.name || '', mesh.name || '') !== null)) return true;
  return /eye|iris|pupil|sclera|highlight|瞳|白目/i.test(mesh.name || '');
}

/** Snapshot local scales of eye meshes so later frames can pin them. */
export function captureEyeRestScales(root: THREE.Object3D): EyeScalePin[] {
  const pins: EyeScalePin[] = [];
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !isEyeMesh(mesh)) return;
    const s = mesh.scale;
    // Collapse near-zero authored scales to unit so the iris is drawable.
    if (s.x * s.x + s.y * s.y + s.z * s.z < 1e-8) s.set(1, 1, 1);
    pins.push({ obj: mesh, x: s.x, y: s.y, z: s.z });
  });
  return pins;
}

/** Restore captured eye mesh scales — blink/expr must not leave meshes resized. */
export function pinEyeRestScales(pins: readonly EyeScalePin[]): void {
  for (const p of pins) {
    const s = p.obj.scale;
    if (s.x !== p.x || s.y !== p.y || s.z !== p.z) s.set(p.x, p.y, p.z);
  }
}

/** Turn off VRM look-at tracking; gaze is driven by head pose only. */
export function disableVrmAutoLookAt(vrm: VRM): void {
  const la = vrm.lookAt as LookAtLike | undefined;
  if (!la) return;
  la.autoUpdate = false;
  la.target = null;
  la.reset();
  la.update(0);
  const em = vrm.expressionManager;
  if (!em) return;
  for (const name of LOOK_EXPR) {
    try { em.setValue(name, 0); } catch { /* preset absent */ }
  }
}

/** Keep expression/bone look-at from drifting after clips or a stale target. */
export function pinVrmEyeGaze(vrm: VRM): void {
  const la = vrm.lookAt as LookAtLike | undefined;
  if (!la || la.autoUpdate) return;
  if (la.yaw !== 0 || la.pitch !== 0) {
    la.reset();
    la.update(0);
  }
  const em = vrm.expressionManager;
  if (!em) return;
  for (const name of LOOK_EXPR) {
    try {
      const cur = em.getValue(name);
      if (typeof cur === 'number' && cur > 1e-4) em.setValue(name, 0);
    } catch { /* preset absent */ }
  }
}

function asStd(mat: THREE.Material): THREE.MeshStandardMaterial {
  return mat as THREE.MeshStandardMaterial;
}

/**
 * Draw the iris in front of the eye-white, and catchlights in front of the
 * iris, on every mesh whose material name identifies an eye part.
 */
export function stabilizeEyeMaterials(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    let order = mesh.renderOrder;
    let touched = false;
    for (const mat of mats) {
      const kind = eyeMaterialKind(mat.name || '', mesh.name || '');
      if (!kind) continue;
      touched = true;
      const m = asStd(mat);
      if (m.emissive) m.emissive.setRGB(0, 0, 0);
      if (m.emissiveMap && (kind === 'iris' || kind === 'white')) m.emissiveMap = null;
      m.polygonOffset = true;
      if (kind === 'white') {
        m.polygonOffsetFactor = 2;
        m.polygonOffsetUnits = 2;
        m.depthWrite = true;
        order = Math.max(order, 1);
      } else if (kind === 'iris') {
        m.polygonOffsetFactor = -3;
        m.polygonOffsetUnits = -3;
        m.depthWrite = true;
        m.transparent = false;
        const mapReady = !!(m.map && (m.map as THREE.Texture).image);
        if (!mapReady) {
          // A masked iris with no texture discards every fragment and the
          // white mesh behind it reads as a blank eye.
          m.map = null;
          m.alphaTest = 0;
          m.color?.setRGB(0.16, 0.09, 0.08);
        } else if (m.alphaTest > 0.55) {
          m.alphaTest = 0.4;
        }
        order = Math.max(order, 3);
      } else if (kind === 'highlight') {
        m.polygonOffsetFactor = -5;
        m.polygonOffsetUnits = -5;
        m.depthWrite = false;
        m.transparent = true;
        order = Math.max(order, 4);
      } else {
        m.polygonOffsetFactor = -4;
        m.polygonOffsetUnits = -4;
        m.depthWrite = false;
        m.transparent = true;
        order = Math.max(order, 5);
      }
      m.needsUpdate = true;
    }
    if (touched) {
      mesh.renderOrder = order;
      mesh.visible = true;
      mesh.frustumCulled = false;
      const s = mesh.scale;
      if (s.x * s.x + s.y * s.y + s.z * s.z < 1e-8) s.set(1, 1, 1);
    }
  });
  // Overscaled face ribbons (some cast exports) sit in front of the eye sockets.
  root.traverse((node) => {
    const max = Math.max(Math.abs(node.scale.x), Math.abs(node.scale.y), Math.abs(node.scale.z));
    if (max < 5) return;
    if (!/ribon|ribbon|リボン/i.test(node.name || '')) return;
    node.scale.set(1, 1, 1);
  });
}

/** True for iris / white / highlight / lash materials that must not be recolored. */
export function isEyeMaterial(materialName: string, meshName = ''): boolean {
  return eyeMaterialKind(materialName, meshName) !== null;
}

export type { CastEyeAtlasExpr };
