// Eye readability. VRoid faces put the iris and the eye-white on coplanar
// meshes (same vertices, different materials). Without a depth bias the white
// wins the z-test on some frames and the pupil disappears. Expressions that
// drive the eyelid (blink, happy) can also cover the iris completely; those
// weights stay below a full seal so a dark pupil remains readable.

import * as THREE from 'three';

export type EyeKind = 'white' | 'iris' | 'highlight' | 'line';

const EYE_CLOSE_CAP: Record<string, number> = {
  blink: 0.34,
  blinkleft: 0.34,
  blinkright: 0.34,
  blink_l: 0.34,
  blink_r: 0.34,
  happy: 0.58,
  fun: 0.58,
  joy: 0.58,
  relaxed: 0.5,
};

/** Keep eyelid morphs from sealing the iris. Other expressions pass through. */
export function capEyeExpression(name: string, value: number): number {
  if (!Number.isFinite(value)) return 0;
  const cap = EYE_CLOSE_CAP[name.toLowerCase()];
  const v = value < 0 ? 0 : value;
  return cap === undefined || v < cap ? v : cap;
}

export function eyeMaterialKind(materialName: string, meshName = ''): EyeKind | null {
  const n = `${materialName} ${meshName}`.toLowerCase();
  if (/iris|瞳/.test(n)) return 'iris';
  if (/eyewhite|eye_white|eye-white|白目|sclera/.test(n)) return 'white';
  if (/highlight|catchlight|ハイライト|eyeextra|eye_extra/.test(n)) return 'highlight';
  if (/eyeline|eyelash|eyelash|まつ|まぶた/.test(n)) return 'line';
  return null;
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
    if (touched) mesh.renderOrder = order;
  });
}

/** True for iris / white / highlight / lash materials that must not be recolored. */
export function isEyeMaterial(materialName: string, meshName = ''): boolean {
  return eyeMaterialKind(materialName, meshName) !== null;
}
