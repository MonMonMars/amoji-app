export const LANGS = ['en', 'yue', 'zh', 'ja'] as const;
export type Lang = (typeof LANGS)[number];

export const BACKGROUNDS = [
  'meadow', 'sakura', 'sunset', 'cloudsea', 'rain', 'ember',
  'neon', 'aurora', 'snowmoon', 'abyss', 'void', 'galaxy',
] as const;

/** Demo wardrobe. Head is identity, body is the outfit. */
export const WARDROBE_HEADS = ['A02', 'A10', 'A119'] as const;
export const WARDROBE_BODIES = ['A119', 'A120', 'A106', 'A02', 'A10'] as const;

export const DEFAULT_STATE = {
  characterId: 'a01-shino',
  backgroundId: 'void',
  lang: 'yue' as Lang,
  kidMode: false,
  wardrobe: null as { headId: string; bodyId: string } | null,
};

const ID_RE = /^[a-z0-9][a-z0-9-]{0,64}$/;

export function isLang(v: string): v is Lang {
  return (LANGS as readonly string[]).includes(v);
}

export function isCharacterId(v: string): boolean {
  return ID_RE.test(v);
}

export function isBackgroundId(v: string): boolean {
  return (BACKGROUNDS as readonly string[]).includes(v);
}

export function isWardrobePair(headId: string, bodyId: string): boolean {
  return (WARDROBE_HEADS as readonly string[]).includes(headId)
    && (WARDROBE_BODIES as readonly string[]).includes(bodyId);
}
