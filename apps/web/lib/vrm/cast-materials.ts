// Post-load material and texture passes. Reference-family characters are not
// retuned. MToon stays MToon — only the converted outline/toon factors move.

import * as THREE from 'three';
import { needsMToonUnify } from '../cast-adjust';
import {
  CAST_MATCAP_COLOR_SCALE,
  CAST_RIM_MIX_SCALE,
  needsCastMatcapDampen,
} from './cast-lighting-profile';
import {
  addMissingEyeHighlight,
  fillEnclosedHoles,
  paintSolidBlack,
  recolorRedToBrown,
  unifyMToonParams,
} from '../cast-adjust';
import { eyeMaterialKind, isEyeMaterial } from './eyes';

type Role = 'eye' | 'hair' | 'shoe' | 'cloth' | 'other';

function roleOf(materialName: string, meshName: string): Role {
  if (isEyeMaterial(materialName, meshName) || eyeMaterialKind(materialName, meshName)) return 'eye';
  const n = `${materialName} ${meshName}`.toLowerCase();
  if (/hair|髪/.test(n)) return 'hair';
  if (/shoe|boot|靴/.test(n)) return 'shoe';
  if (/hoodie|jacket|coat|sweater|bottom|top|cloth|wear|onepiece|pants|skirt|shirt|dress|costume|uniform/.test(n)) return 'cloth';
  return 'other';
}

interface MToonLike {
  outlineWidthMode?: string;
  outlineWidthFactor?: number;
  shadingToonyFactor?: number;
  shadingShiftFactor?: number;
  needsUpdate?: boolean;
}

/** Body/cloth/hair of characters 4–6 only. Eyes and outline-off materials stay. */
export function unifyCastMToon(root: THREE.Object3D, characterId: string): number {
  if (!needsMToonUnify(characterId)) return 0;
  let n = 0;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (roleOf(mat.name || '', mesh.name || '') === 'eye') continue;
      const m = mat as MToonLike;
      const patch = unifyMToonParams(m);
      if (!patch) continue;
      if (patch.outlineWidthFactor !== undefined) m.outlineWidthFactor = patch.outlineWidthFactor;
      if (patch.shadingToonyFactor !== undefined) m.shadingToonyFactor = patch.shadingToonyFactor;
      if (patch.shadingShiftFactor !== undefined) m.shadingShiftFactor = patch.shadingShiftFactor;
      m.needsUpdate = true;
      n += 1;
    }
  });
  return n;
}

/**
 * VRoid ref mats (#1–3): pull matcap/rim down so hair/face do not blow out
 * under key 1.75. three-vrm exposes matcapFactor as a Color (vec3), NOT a
 * float — treating it as a number was a silent no-op in PR #299.
 */
export function dampenCastMatcap(root: THREE.Object3D, characterId: string): number {
  if (!needsCastMatcapDampen(characterId)) return 0;
  let n = 0;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const m = mat as THREE.Material & {
        matcapFactor?: THREE.Color | number;
        rimLightingMixFactor?: number;
      };
      let touched = false;
      const cap = m.matcapFactor;
      if (cap && typeof cap === 'object' && typeof (cap as THREE.Color).r === 'number') {
        const c = cap as THREE.Color;
        if (Math.max(c.r, c.g, c.b) > 0.01) {
          c.multiplyScalar(CAST_MATCAP_COLOR_SCALE);
          touched = true;
        }
      } else if (typeof cap === 'number' && cap > 0.01) {
        // Defensive: older/alternate MToon builds may still expose a float.
        (m as { matcapFactor: number }).matcapFactor = Math.min(cap, cap * CAST_MATCAP_COLOR_SCALE);
        touched = true;
      }
      if (typeof m.rimLightingMixFactor === 'number' && m.rimLightingMixFactor > 0.15) {
        m.rimLightingMixFactor = Math.min(
          m.rimLightingMixFactor,
          m.rimLightingMixFactor * CAST_RIM_MIX_SCALE,
        );
        touched = true;
      }
      if (touched) {
        m.needsUpdate = true;
        n += 1;
      }
    }
  });
  return n;
}

/**
 * Floor near-black MToon shade so soft toon (Sendagaya ShadeShift −0.6) never
 * collapses to pure black under grazing key. three-vrm uses shadeColorFactor;
 * the legacy shadeColor alias does not exist on MToonMaterial.
 */
export function floorCastShadeColors(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (isEyeMaterial(mat.name || '', mesh.name || '')) continue;
      const m = mat as THREE.Material & {
        shadeColorFactor?: THREE.Color;
        shadeColor?: THREE.Color;
      };
      const shade = m.shadeColorFactor ?? m.shadeColor;
      if (!shade || typeof shade.r !== 'number') continue;
      const lum = Math.max(shade.r, shade.g, shade.b);
      if (lum >= 0.2) continue;
      if (lum < 1e-4) shade.setRGB(0.45, 0.43, 0.42);
      else shade.multiplyScalar(0.2 / lum);
      m.needsUpdate = true;
      n += 1;
    }
  });
  return n;
}

function editTexture(
  tex: THREE.Texture | null | undefined,
  fn: (data: Uint8ClampedArray, w: number, h: number) => void,
): boolean {
  if (!tex || typeof document === 'undefined') return false;
  const image = tex.image as (CanvasImageSource & { width?: number; height?: number }) | null;
  const w = image?.width ?? 0;
  const h = image?.height ?? 0;
  if (!image || w < 2 || h < 2) return false;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(image, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  fn(img.data, w, h);
  ctx.putImageData(img, 0, 0);
  tex.image = canvas;
  tex.needsUpdate = true;
  return true;
}

function mapsOf(mat: THREE.Material): THREE.Texture[] {
  const m = mat as THREE.MeshStandardMaterial;
  return [m.map, m.emissiveMap].filter((t): t is THREE.Texture => !!t);
}

/** Texture-only wardrobe fixes. No mesh edits. */
export function patchCastTextures(root: THREE.Object3D, characterId: string): void {
  const pants = characterId === 'a75-sorano';
  const clothBlack = characterId === 'a94-rita';
  const hair = characterId === 'a103-rockredgradientjk';
  const eye = characterId === 'a105-serizawa-aoi';
  if (!pants && !clothBlack && !hair && !eye) return;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const role = roleOf(mat.name || '', mesh.name || '');
      const name = `${mat.name || ''} ${mesh.name || ''}`.toLowerCase();
      if (pants && (/bottom|pants|trouser/.test(name) || /body/.test(name))) {
        for (const tex of mapsOf(mat)) {
          editTexture(tex, (data, w, h) => { fillEnclosedHoles(data, w, h); });
        }
      }
      if (clothBlack && role === 'cloth') {
        for (const tex of mapsOf(mat)) editTexture(tex, (data) => { paintSolidBlack(data); });
      }
      if (hair && role === 'hair') {
        for (const tex of mapsOf(mat)) editTexture(tex, (data) => { recolorRedToBrown(data); });
      }
      if (eye && role === 'eye' && /iris|highlight|瞳|ハイライト/.test(name)) {
        for (const tex of mapsOf(mat)) {
          editTexture(tex, (data, w, h) => { addMissingEyeHighlight(data, w, h); });
        }
      }
    }
  });
}

/**
 * Char 13: iris/highlight missing, a red socket shows through, then the pupil
 * pops in and out. Keep the eye meshes drawn in front from the first frame
 * and stop a red untextured iris from reading as the socket.
 */
export function stabilizeCastEyes(root: THREE.Object3D, characterId: string): void {
  if (characterId !== 'a63-hinoame-satuki-mei-sirayuki') return;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    let eye = false;
    for (const mat of mats) {
      const kind = eyeMaterialKind(mat.name || '', mesh.name || '');
      if (!kind) continue;
      eye = true;
      const m = mat as THREE.MeshStandardMaterial;
      m.visible = true;
      if (kind === 'iris' || kind === 'white' || kind === 'highlight') {
        m.opacity = 1;
        if (kind !== 'highlight') m.transparent = false;
        m.depthTest = true;
        const col = m.color;
        if (kind === 'iris' && col && col.r > col.g + 0.18 && col.r > 0.35 && !m.map) {
          col.setRGB(0.12, 0.07, 0.06);
        }
        if (m.emissive) m.emissive.setRGB(0, 0, 0);
      }
      m.needsUpdate = true;
    }
    if (!eye) return;
    mesh.visible = true;
    mesh.frustumCulled = false;
    const s = mesh.scale;
    if (s.x * s.x + s.y * s.y + s.z * s.z < 1e-8) s.set(1, 1, 1);
  });
  // The baked face keeps its eye islands, but a ribbon parented to the chest
  // is scaled 10× and sits in front of the sockets: a red sheet that flickers
  // against the pupils. Bring that accessory back to unit scale.
  root.traverse((node) => {
    const max = Math.max(Math.abs(node.scale.x), Math.abs(node.scale.y), Math.abs(node.scale.z));
    if (max < 5) return;
    if (!/ribon|ribbon|リボン/i.test(node.name || '')) return;
    node.scale.set(1, 1, 1);
  });
}
