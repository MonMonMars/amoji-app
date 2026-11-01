// Cast notes from the selection review. Numbers are the stable castNo
// badges (a01 = 1 …), not the position in the fan after hides/reorders.
//
// Reference look (do not retune materials): 1–3, 7–10, 12, 13.
// That look is VRM0 MToon world outline 0.075, ShadeToony 0, ShadeShift −0.6
// on the body. three-vrm converts those floats to the factors below.

import { castNo } from './castNo';

/** Removed from the picker and story rolls. Numbers stay reserved. */
export const HIDDEN_CAST_IDS: readonly string[] = [
  'a64-lily-lily-animeit', // 14 damaged
  'a82-renel-bonnie', // 22
  'a95-mizu', // 28
];

const HIDDEN = new Set(HIDDEN_CAST_IDS);

/**
 * Explicit males. Every other roster id stays female, including unreviewed
 * models that used to be tagged male.
 */
export const MALE_CAST_IDS: readonly string[] = [
  'a03-fumiriya', // 3
  'a05-avatarsample-c', // 5
  'a24-hairsample-male', // 11
  'a75-sorano', // 18
  'a98-ethan', // 31
  'a105-serizawa-aoi', // 35
];

/** Neck/head yaw + roll leveled. 13 is the severe case; same full correction. */
export const HEAD_TILT_IDS: readonly string[] = [
  'a01-shino', // 1
  'a02-shibu', // 2
  'a03-fumiriya', // 3
  'a16-vita', // 8
  'a17-victoria-rubin', // 9
  'a24-hairsample-male', // 11
  'a63-hinoame-satuki-mei-sirayuki', // 13
  'a70-vtuber-aihina-sample', // 15
  'a71-mary-sweety', // 16
  'a74-mizuka', // 17
  'a75-sorano', // 18
  'a83-ao-witch', // 23
  'a85-kara', // 24
  'a89-rurina', // 25
  'a93-edokko', // 26
  'a94-rita', // 27
  'a97-pee-saaya', // 30
  'a99-miyora', // 32
];

/** Sunk clavicle when the arm hangs. Not applied to 1–3. */
export const SHOULDER_LIFT_IDS: readonly string[] = [
  'a04-avatarsample-a', // 4
  'a05-avatarsample-c', // 5
  'a70-vtuber-aihina-sample', // 15
];

/**
 * Upper-body twist/side-bend only. Feet and hip placement are left alone.
 * 6 distortion, 10, 19, 31, 34 (left-side bend).
 */
export const UPPER_BODY_IDS: readonly string[] = [
  'a10-agahomei-normal', // 6
  'a23-hairsample-female', // 10
  'a77-sasha', // 19
  'a98-ethan', // 31
  'a104-simplebrownsailorjk', // 34
];

/** Whole-body forward lean, plus a stricter root upright. */
export const FULL_UPRIGHT_IDS: readonly string[] = [
  'a103-rockredgradientjk', // 33
];

/**
 * Reference look (castNo 1-3, 7-10, 12, 13) — do not retune materials.
 * Everyone else gets the conservative MToon outlier pass (thick outline /
 * hard cel only) so shade/brightness stays closer across the cast.
 */
export const REF_LOOK_IDS: readonly string[] = [
  'a01-shino', // 1
  'a02-shibu', // 2
  'a03-fumiriya', // 3
  'a14-vivi', // 7
  'a16-vita', // 8
  'a17-victoria-rubin', // 9
  'a23-hairsample-female', // 10
  'a61-saori-kamiya-llunne', // 12
  'a63-hinoame-satuki-mei-sirayuki', // 13
];

/** @deprecated kept for tests/callers; prefer needsMToonUnify / REF_LOOK_IDS. */
export const MTOON_UNIFY_IDS: readonly string[] = [
  'a04-avatarsample-a',
  'a05-avatarsample-c',
  'a10-agahomei-normal',
];

/** Char 34 sits near the front of the fan. Badge stays castNo 34. */
export const PROMOTE_SELECT_ID = 'a104-simplebrownsailorjk';

/** Char 32 select-page portrait sits high; nudge the crop down. Not a mesh edit. */
export const SELECT_LOWER_ID = 'a99-miyora';

export const MALE_VOICE = { yue: 'zh-HK-WanLungNeural', en: 'en-HK-SamNeural' } as const;
export const FEMALE_VOICE = { yue: 'zh-HK-HiuGaaiNeural', en: 'en-HK-YanNeural' } as const;

/** three-vrm: outlineWidthFactor = 0.01 * VRM0 _OutlineWidth. 0.075 → 0.00075. */
export const REF_OUTLINE_WIDTH_FACTOR = 0.00075;
/**
 * VRM0 body ShadeToony 0, ShadeShift −0.6 converts as
 * toony = lerp(0, 1, 0.5 + 0.5 * shift) = 0.2
 * shift = −shift − (1 − toony) = −0.2
 */
export const REF_SHADING_TOONY = 0.2;
export const REF_SHADING_SHIFT = -0.2;

const HEAD = new Set(HEAD_TILT_IDS);
const SHOULDER = new Set(SHOULDER_LIFT_IDS);
const UPPER = new Set(UPPER_BODY_IDS);
const UPRIGHT = new Set(FULL_UPRIGHT_IDS);
const REF_LOOK = new Set(REF_LOOK_IDS);

export function isHiddenCast(id: string): boolean {
  return HIDDEN.has(id);
}

export function rosterGender(id: string): 'female' | 'male' {
  return (MALE_CAST_IDS as readonly string[]).includes(id) ? 'male' : 'female';
}

export function needsHeadLevel(id: string): boolean {
  return HEAD.has(id);
}

export function needsShoulderLift(id: string): boolean {
  return SHOULDER.has(id);
}

export function needsUpperBodyLevel(id: string): boolean {
  return UPPER.has(id);
}

export function needsFullUpright(id: string): boolean {
  return UPRIGHT.has(id);
}

export function needsMToonUnify(id: string): boolean {
  // Skip the reviewed reference look; soft-fix hard cel / thick outline elsewhere.
  return !REF_LOOK.has(id);
}

export interface MToonUnifyInput {
  outlineWidthMode?: string;
  outlineWidthFactor?: number;
  shadingToonyFactor?: number;
  shadingShiftFactor?: number;
}

export interface MToonUnifyPatch {
  outlineWidthFactor?: number;
  shadingToonyFactor?: number;
  shadingShiftFactor?: number;
}

/**
 * Push a loaded MToon material toward the 1–3 body setup.
 * Outline mode is never switched off. Eyes should not be passed in.
 */
export function unifyMToonParams(m: MToonUnifyInput): MToonUnifyPatch | null {
  const patch: MToonUnifyPatch = {};
  const mode = m.outlineWidthMode;
  const width = m.outlineWidthFactor;
  if (mode && mode !== 'none' && typeof width === 'number' && width > REF_OUTLINE_WIDTH_FACTOR * 1.15) {
    patch.outlineWidthFactor = REF_OUTLINE_WIDTH_FACTOR;
  }
  // Char 4 body converts to toony 1 / shift 1 (hard cel). Gradient reference is 0.2 / −0.2.
  if (typeof m.shadingToonyFactor === 'number' && m.shadingToonyFactor >= 0.75) {
    patch.shadingToonyFactor = REF_SHADING_TOONY;
    patch.shadingShiftFactor = REF_SHADING_SHIFT;
  }
  return patch.outlineWidthFactor === undefined && patch.shadingToonyFactor === undefined ? null : patch;
}

export function selectionCast<T extends { id: string }>(characters: readonly T[]): T[] {
  const visible = characters.filter((c) => !HIDDEN.has(c.id));
  const hit = visible.findIndex((c) => c.id === PROMOTE_SELECT_ID);
  if (hit <= 0) return visible;
  const next = visible.slice();
  const [item] = next.splice(hit, 1);
  // After the first three kept cards (1–3), before the rest.
  const at = Math.min(3, next.length);
  next.splice(at, 0, item!);
  return next;
}

/** Stable badge. Hidden ids keep their number even though they are not shown. */
export function selectionBadge(id: string): number {
  return castNo(id);
}

/** object-position Y for the select portrait. Undefined keeps the shared face crop. */
export function selectPortraitPosition(id: string): string | undefined {
  if (id === SELECT_LOWER_ID) return 'center 46%';
  return undefined;
}

export function fillTransparentBlack(data: Uint8ClampedArray, alphaMax = 24): number {
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 255;
    if (a <= alphaMax) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
      n += 1;
    }
  }
  return n;
}

/**
 * Fill transparent regions that do not touch the image border.
 * Atlas gutters stay clear; holes inside a pants island become solid black.
 */
export function fillEnclosedHoles(data: Uint8ClampedArray, width: number, height: number, alphaMax = 24): number {
  const n = width * height;
  const seen = new Uint8Array(n);
  const stack: number[] = [];
  let filled = 0;
  const transparent = (p: number) => (data[p * 4 + 3] ?? 255) <= alphaMax;
  for (let start = 0; start < n; start++) {
    if (seen[start] || !transparent(start)) continue;
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    const comp: number[] = [];
    let touches = false;
    while (stack.length) {
      const p = stack.pop()!;
      comp.push(p);
      const x = p % width;
      const y = (p - x) / width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touches = true;
      const tryPush = (q: number) => {
        if (q < 0 || q >= n || seen[q] || !transparent(q)) return;
        seen[q] = 1;
        stack.push(q);
      };
      if (x > 0) tryPush(p - 1);
      if (x + 1 < width) tryPush(p + 1);
      if (y > 0) tryPush(p - width);
      if (y + 1 < height) tryPush(p + width);
    }
    if (touches) continue;
    for (const p of comp) {
      const i = p * 4;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
      filled += 1;
    }
  }
  return filled;
}

/** Opaque texels become solid black. Alpha holes are filled black too. */
export function paintSolidBlack(data: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a < 8) {
      data[i + 3] = 0;
      continue;
    }
    if ((data[i] ?? 0) !== 0 || (data[i + 1] ?? 0) !== 0 || (data[i + 2] ?? 0) !== 0) n += 1;
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 255;
  }
  return n;
}

/** Red hair texels → brown. Non-red pixels (highlights, shadows) stay. */
export function recolorRedToBrown(data: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const a = data[i + 3] ?? 0;
    if (a < 16) continue;
    if (r < 70 || r < g * 1.28 || r < b * 1.28) continue;
    const lum = (r + g + b) / (3 * 255);
    data[i] = Math.round(36 + lum * 78);
    data[i + 1] = Math.round(18 + lum * 42);
    data[i + 2] = Math.round(12 + lum * 28);
    n += 1;
  }
  return n;
}

/**
 * If one side of an eye atlas has a bright catchlight and the other does not,
 * stamp a small white disc on the dim side at the bright side's mirrored spot.
 */
export function addMissingEyeHighlight(data: Uint8ClampedArray, width: number, height: number): boolean {
  if (width < 4 || height < 2) return false;
  const mid = Math.floor(width / 2);
  const peak = (x0: number, x1: number) => {
    let best = 0;
    let bx = x0;
    let by = 0;
    for (let y = 0; y < height; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * width + x) * 4;
        const a = data[i + 3] ?? 0;
        if (a < 40) continue;
        const lum = 0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0);
        if (lum > best) {
          best = lum;
          bx = x;
          by = y;
        }
      }
    }
    return { lum: best, x: bx, y: by };
  };
  const left = peak(0, mid);
  const right = peak(mid, width);
  const brighter = left.lum >= right.lum ? left : right;
  const dim = left.lum >= right.lum ? right : left;
  if (brighter.lum < 175 || dim.lum > brighter.lum - 50) return false;
  const span = left.lum >= right.lum ? mid : width - mid;
  const origin = left.lum >= right.lum ? mid : 0;
  const srcOrigin = left.lum >= right.lum ? 0 : mid;
  const localX = brighter.x - srcOrigin;
  const x = Math.max(origin, Math.min(origin + span - 1, origin + (span - 1 - localX)));
  const y = brighter.y;
  const rad = Math.max(1, Math.round(Math.min(width, height) * 0.035));
  for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy > rad * rad) continue;
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      const i = (py * width + px) * 4;
      if ((data[i + 3] ?? 0) < 20) continue;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }
  return true;
}
