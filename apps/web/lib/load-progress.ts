// r2026-10-04.91 (Master Simon) — shared character-loading percentage.
// CompanionCanvas owns the model/clip loaders and publishes progress here;
// StatusPlate (the top-left name bar) subscribes and shows a mini spinner +
// % while she loads. A module-level pub/sub instead of lifted state: the
// canvas and the plate live in different page branches and never meet as
// parent/child, and the canvas must NOT keep a React state alive for it
// (that was the old forever-spinning bottom-left ring).
let value: number | null = null;
const listeners = new Set<(v: number | null) => void>();

export function setLoadProgress(v: number | null): void {
  if (v === value) return;
  value = v;
  for (const l of listeners) l(v);
}

export function getLoadProgress(): number | null {
  return value;
}

/** subscribe; returns the unsubscribe fn for useEffect cleanup */
export function onLoadProgress(listener: (v: number | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
