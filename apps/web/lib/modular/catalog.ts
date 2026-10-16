// Demo female wardrobe — head is identity, body is the outfit.
// Measurements are the neck seam (VRoid J_Bip_C_Neck world Z) and head AABB
// height. They document the swap cluster. They are NEVER a scale factor.
//
// Assets are consumed as already-split GLBs. This module does not split,
// rescale, or rewrite meshes.

export type ModularRole = 'head+body' | 'body-outfit';
export type ModularPart = 'head' | 'body';

export interface ModularAsset {
  /** Modular library id, e.g. A02. Folder + file prefix. */
  id: string;
  /** Display name. Identity names follow the head. */
  name: string;
  /** Short chip label. */
  short: string;
  /** Companion id in the want-list cast. Voice, persona, and name follow this when the asset is the head. */
  characterId: string;
  role: ModularRole;
  /** J_Bip_C_Neck world Z. Seam tolerance is about ±0.002. Not a scale. */
  neckZ: number;
  /** Mesh AABB height above the neck. Not a scale. */
  headH: number;
}

/**
 * Female cluster from the 2026-10-13 pair table (neck_z ~1.30–1.32).
 * Heads: A02 Shibu, A10 AgahoMei Normal, A119 Kanami Uniform.
 * Bodies: A119, A120, A106, A02, A10.
 * A98 (tall outlier) is intentionally absent — do not cross-swap it here.
 */
export const DEMO_ASSETS: readonly ModularAsset[] = [
  { id: 'A02', name: 'Shibu', short: 'Shibu', characterId: 'a02-shibu', role: 'head+body', neckZ: 1.3153, headH: 0.3002 },
  { id: 'A10', name: 'AgahoMei Normal', short: 'AgahoMei', characterId: 'a10-agahomei-normal', role: 'head+body', neckZ: 1.3005, headH: 0.2888 },
  { id: 'A119', name: 'Kanami Uniform', short: 'Kanami', characterId: 'a119-kanami-uniform', role: 'head+body', neckZ: 1.313, headH: 0.2963 },
  { id: 'A120', name: 'Morikawa Yuki Summer Uniform', short: 'Yuki Summer', characterId: 'a120-morikawa-yuki-summer-uniform', role: 'body-outfit', neckZ: 1.315, headH: 0.3308 },
  { id: 'A106', name: 'AuroraGradHairJK', short: 'Aurora JK', characterId: 'a106-auroragradhairjk', role: 'body-outfit', neckZ: 1.3202, headH: 0.3358 },
] as const;

/** Identity picker. Order matches the brief. */
export const DEMO_HEADS: readonly ModularAsset[] = ['A02', 'A10', 'A119'].map(
  (id) => DEMO_ASSETS.find((a) => a.id === id)!,
);

/** Outfit picker. Order matches the brief: A119 / A120 / A106 / A02 / A10. */
export const DEMO_BODIES: readonly ModularAsset[] = ['A119', 'A120', 'A106', 'A02', 'A10'].map(
  (id) => DEMO_ASSETS.find((a) => a.id === id)!,
);

/** Default identity when an outfit is chosen before any head. */
export const DEFAULT_DEMO_HEAD = 'A119';

export function demoHeadById(id: string): ModularAsset | undefined {
  return DEMO_HEADS.find((h) => h.id === id);
}

export function demoBodyById(id: string): ModularAsset | undefined {
  return DEMO_BODIES.find((b) => b.id === id);
}

export function demoHeadByCharacterId(characterId: string): ModularAsset | undefined {
  return DEMO_HEADS.find((h) => h.characterId === characterId);
}

/**
 * Repo-relative GLB path (under public/models). No binary is generated here.
 * `modular/A02/A02_head.glb`, `modular/A02/A02_body.glb`, …
 */
export function modularGlbRel(id: string, part: ModularPart): string {
  return `modular/${id}/${id}_${part}.glb`;
}

/** Fetch URL, including the Pages base path when the build sets one. */
export function modularGlbUrl(id: string, part: ModularPart): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${base}/models/${modularGlbRel(id, part)}`;
}

export interface ModularSelection {
  headId: string;
  bodyId: string;
}

/**
 * Wardrobe pair for a companion. Demo heads try modular GLBs (own body, or
 * the last outfit). Anyone outside the female cluster stays on the single VRM.
 */
export function activeWardrobe(characterId: string, stored: ModularSelection | null): ModularSelection | null {
  const head = demoHeadByCharacterId(characterId);
  if (!head) return null;
  const bodyId = stored && demoBodyById(stored.bodyId)
    ? stored.bodyId
    : (demoBodyById(head.id) ? head.id : DEMO_BODIES[0]!.id);
  return { headId: head.id, bodyId };
}
