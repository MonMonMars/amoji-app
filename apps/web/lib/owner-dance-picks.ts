// Owner dance VRMA prefs — curated rail enables + per-character pins (#432).

import { curatedRailByClipId } from './idle-curated-rail';
import { isHonorableIdleClip } from './idle-owner-migrate';
import { listEnabledDanceClipIds } from './idle-enabled';
import { idlePickFor } from './idle-pick';
import { ownerIdleClipDeleted } from './owner-picker-decisions';

/** Ordered owner dance clips: character pin (when dance) then enabled dance rails. */
export function ownerDanceClipPrefs(characterId?: string | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    if (!isHonorableIdleClip(id) || seen.has(id) || ownerIdleClipDeleted(id)) return;
    seen.add(id);
    out.push(id);
  };
  if (characterId) {
    const pin = idlePickFor(characterId);
    if (pin && curatedRailByClipId(pin)?.category === 'dance') push(pin);
  }
  for (const id of listEnabledDanceClipIds()) push(id);
  return out;
}