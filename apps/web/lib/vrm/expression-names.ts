/**
 * Case-insensitive expression name resolution.
 *
 * three-vrm registers VRM 0.x blend-shape groups by their v1 preset name when
 * the 0.x preset maps (joy→happy, sorrow→sad, blink_l→blinkLeft, …), but a VRM
 * 0.x group with presetName `unknown` keeps its authored name verbatim. VRoid
 * exports its surprise face as `Surprised` with `presetName: unknown`, so the
 * manager key is literally `"Surprised"` — three-vrm's `setValue('surprised')`
 * silently no-ops (it looks the key up exactly), which is why most of the live
 * VRM 0.x roster never showed surprise and a surprise beat flattened the face
 * to neutral.
 *
 * Build a map from the ACTUAL expression names once per mount and resolve every
 * request through it. Do not lowercase the manager keys themselves: the
 * manager is three-vrm's and other code (animation tracks) still uses the
 * authored spelling.
 */

export type ExpressionNameMap = ReadonlyMap<string, string>;

/**
 * Cross-casing fallbacks for names a loader may not have normalised. Keys and
 * values are lowercase; values are looked up in the actual-name map.
 */
const CROSS_NAME_ALIASES: Readonly<Record<string, readonly string[]>> = {
  happy: ['joy'],
  sad: ['sorrow'],
  relaxed: ['fun'],
  surprised: ['surprise'],
  blinkleft: ['blink_l'],
  blinkright: ['blink_r'],
};

/** Index actual expression names by lowercase. First spelling wins (stable). */
export function buildExpressionNameMap(names: Iterable<string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const name of names) {
    if (!name) continue;
    const key = name.toLowerCase();
    if (!map.has(key)) map.set(key, name);
  }
  return map;
}

/**
 * Resolve a requested name (`surprised`) to the model's actual key
 * (`Surprised`). Returns null when the rig has no such expression — callers
 * treat that as "preset absent", never as a reason to write to a sibling.
 */
export function resolveExpressionName(
  map: ExpressionNameMap,
  requested: string,
): string | null {
  const lower = requested.toLowerCase();
  const direct = map.get(lower);
  if (direct) return direct;
  for (const alias of CROSS_NAME_ALIASES[lower] ?? []) {
    const hit = map.get(alias);
    if (hit) return hit;
  }
  return null;
}

/** True for the lid-closing channels the avatar's blink clock owns. */
export function isBlinkExpression(name: string): boolean {
  const lower = name.toLowerCase();
  return lower === 'blink' || lower === 'blinkleft' || lower === 'blinkright'
    || lower === 'blink_l' || lower === 'blink_r';
}
