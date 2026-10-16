// Front-facing stills only. The want-list release PNG on CharacterDef.image
// is the portrait to show. Cast-thumb and cast-cutout bakes face the back
// and are not used as previews.

/** Release / portrait URL to display. Empty when missing. */
export function safePortrait(src?: string | null): string | undefined {
  if (!src) return undefined;
  return src;
}
