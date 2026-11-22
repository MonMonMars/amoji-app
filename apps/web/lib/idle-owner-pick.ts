// Owner 採用 idle clips — one committed ship-set, two rotation kinds:
// - on a curated rail → the rail toggle is authoritative (r281)
// - off-rail (e.g. Mixamo C14/C15) → its own owner toggle, default ON
import { CHAT_IDLE_CURATED } from './idle-curated-rail';
import { committedOwnerPickerSelection } from './owner-picker-ship-set';

/** Clip ids the owner committed as 採用 (deduped, insertion order). */
export function ownerIdleClipIds(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of committedOwnerPickerSelection().idleClipIds ?? []) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Curated rail #s the owner committed as ON (static ship-set, not prefs). */
export function ownerIdleRailNums(): number[] {
  return [...(committedOwnerPickerSelection().idleRailNums ?? [])];
}

/** Every curated rail hosting this clip (Happy is #22 + #23 — both count). */
export function ownerIdleRailsForClip(clipId: string): number[] {
  return CHAT_IDLE_CURATED.filter((e) => e.clipId === clipId).map((e) => e.railNum);
}

/** True when the owner picked this clip (採用 list) or one of its rails. */
export function ownerIdleClipSelected(clipId: string): boolean {
  if (ownerIdleClipIds().includes(clipId)) return true;
  const rails = ownerIdleRailsForClip(clipId);
  const enabled = new Set(ownerIdleRailNums());
  return rails.some((n) => enabled.has(n));
}

/** Owner 採用 clips that have no curated rail row (switchable, not renumbered). */
export function ownerOffRailIdleClipIds(): string[] {
  return ownerIdleClipIds().filter((id) => ownerIdleRailsForClip(id).length === 0);
}
