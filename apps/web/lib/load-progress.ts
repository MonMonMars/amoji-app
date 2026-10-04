// r2026-10-04.91 (Master Simon) — shared character-loading percentage.
// CompanionCanvas owns the model/clip loaders and publishes progress here;
// StatusPlate (the top-left name bar) subscribes and shows a mini spinner +
// % while she loads. A module-level pub/sub instead of lifted state: the
// canvas and the plate live in different page branches and never meet as
// parent/child, and the canvas must NOT keep a React state alive for it
// (that was the old forever-spinning bottom-left ring).
// r2026-10-05.102: the value is now `number | 'prep' | null`. Byte/clip
// progress publishes honest percentages that cap at 99 (they can never sit
// at a frozen 99 — once the model parses and the reveal gate waits for
// textures + first frames, we publish the indeterminate 'prep' state so the
// plate animates a gentle "preparing…" instead of counting a meaningless
// number). null = she is on stage (or the load was given up).

export type LoadProgress = number | 'prep' | null;

let value: LoadProgress = null;
const listeners = new Set<(v: LoadProgress) => void>();

export function setLoadProgress(v: LoadProgress): void {
  if (v === value) return;
  value = v;
  for (const l of listeners) l(v);
}

export function getLoadProgress(): LoadProgress {
  return value;
}

/** subscribe; returns the unsubscribe fn for useEffect cleanup */
export function onLoadProgress(listener: (v: LoadProgress) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
