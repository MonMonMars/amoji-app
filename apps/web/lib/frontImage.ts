// Cartoon fronts only. The want-list release PNGs are back-view renders.
// UI portraits must come from local pipeline captures:
//   /cast-thumbs/<id>.jpg   headshot
//   /cast-cutout/<id>.png   full body
//   /portraits/<id>.*       older painted fronts
// Never substitute the GitHub release PNG, and never invent new art.

const RELEASE_BACK = /releases\/download\/|free-library-want-/i;

/** True when `src` is a want-list release still (those files face away). */
export function isBackViewPortrait(src?: string | null): boolean {
  if (!src) return false;
  return RELEASE_BACK.test(src);
}

/** A portrait URL that is safe to show, or undefined when it is a back view. */
export function safePortrait(src?: string | null): string | undefined {
  if (!src || isBackViewPortrait(src)) return undefined;
  return src;
}

export function castThumbUrl(id: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${base}/cast-thumbs/${id}.jpg`;
}

export function castCutoutUrl(id: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${base}/cast-cutout/${id}.png`;
}
