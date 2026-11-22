// Owner 採用 idle clips that sit OFF the curated rail (no rail row to toggle).
// r281: C14 IdleMixamoIdle (#126) and C15 IdleMixamoStanding (#50) used to
// rotate forever with no way to switch them off. They now get their own
// toggle rows + this local pref. Default = ON, so no owner 採用 clip drops
// out until the owner explicitly flips it.

import { idleByClipId } from './idle-library';
import { isHonorableIdleClip } from './idle-owner-migrate';
import { ownerIdleClipDeleted } from './owner-picker-decisions';
import { ownerOffRailIdleClipIds } from './idle-owner-pick';

/** Owner-off list. Empty/absent = every off-rail 採用 clip is ON. */
export const IDLE_OWNER_OFFRAIL_KEY = 'amoji.idleOwnerOff.v1' as const;

export interface IdleOwnerOffRailRow {
  clipId: string;
  libNum: number;
  cId: string | null;
  name: string;
  /** Button label — C14/C15 when the library row has a family code. */
  label: string;
  playable: boolean;
}

let memory: Set<string> | null = null;

function readOff(): Set<string> {
  if (memory) return memory;
  memory = new Set<string>();
  try {
    if (typeof localStorage === 'undefined') return memory;
    const raw = localStorage.getItem(IDLE_OWNER_OFFRAIL_KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return memory;
    for (const id of parsed) {
      if (typeof id === 'string' && id) memory.add(id);
    }
  } catch {
    memory = new Set<string>();
  }
  return memory;
}

function persist(next: Set<string>): void {
  memory = next;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(IDLE_OWNER_OFFRAIL_KEY, JSON.stringify([...next].sort()));
  } catch {
    /* private mode */
  }
}

/** Off-rail owner 採用 clips, in committed order. */
export function listOwnerOffRailIdleRows(): IdleOwnerOffRailRow[] {
  const rows: IdleOwnerOffRailRow[] = [];
  for (const clipId of ownerOffRailIdleClipIds()) {
    if (ownerIdleClipDeleted(clipId)) continue;
    if (!isHonorableIdleClip(clipId)) continue;
    const lib = idleByClipId(clipId);
    if (!lib || lib.retired) continue;
    rows.push({
      clipId,
      libNum: lib.num,
      cId: lib.cId,
      name: lib.name,
      label: lib.cId ?? `L${lib.num}`,
      playable: Boolean(lib.playable && lib.vrmaUrl),
    });
  }
  return rows;
}

export function isOwnerOffRailIdleClip(clipId: string): boolean {
  return listOwnerOffRailIdleRows().some((row) => row.clipId === clipId);
}

export function isOwnerOffRailIdleEnabled(clipId: string): boolean {
  if (!isOwnerOffRailIdleClip(clipId)) return false;
  return !readOff().has(clipId);
}

export function listOwnerOffRailEnabledClipIds(): string[] {
  const off = readOff();
  return listOwnerOffRailIdleRows()
    .filter((row) => !off.has(row.clipId))
    .map((row) => row.clipId);
}

/** Toggle one off-rail owner clip. Returns the currently enabled clip ids. */
export function setOwnerOffRailIdleEnabled(clipId: string, on: boolean): string[] {
  if (!isOwnerOffRailIdleClip(clipId)) return listOwnerOffRailEnabledClipIds();
  const next = new Set(readOff());
  if (on) next.delete(clipId);
  else next.add(clipId);
  persist(next);
  return listOwnerOffRailEnabledClipIds();
}

export function resetOwnerOffRailIdle(): void {
  memory = new Set<string>();
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(IDLE_OWNER_OFFRAIL_KEY);
  } catch {
    /* ignore */
  }
}

export function forgetOwnerOffRailIdleCache(): void {
  memory = null;
}
