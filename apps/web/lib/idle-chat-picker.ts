// In-chat idle picker rows (r282). Owner asked for a small button beside the
// character in the chat room that lists every idle with its C-code so she can
// tap down the list one at a time.
//
// Sources:
// - owner 採用 committed clips (idleClipIds) — C14/C15/C16/C18 + Sam/RPM.
// - the seven Shapeweld motions added in r282 — C156–C160, C164, C165.
//
// These Shapeweld rows deliberately live ONLY here. They are not promoted onto
// CHAT_IDLE_CURATED: promotion is what let C16 steal calm and C18 steal sing
// before r281, so the picker is the safe way to let the owner compare them.

import { isRetiredIdleClip } from './idle-retired';
import { isHonorableIdleClip } from './idle-owner-migrate';
import { ownerIdleClipDeleted } from './owner-picker-decisions';
import { idleByClipId } from './idle-library';
import { ownerIdleClipIds } from './idle-owner-pick';

/** Picker order is numeric by C-code; L-coded owner clips follow. */
export const SHAPEWELD_IDLE_CLIP_IDS = [
  'lib_C156',
  'lib_C157',
  'lib_C158',
  'lib_C159',
  'lib_C160',
  'lib_C164',
  'lib_C165',
] as const;

export interface IdlePickerRow {
  clipId: string;
  /** Prominent button text: C14 / C156, or L90 when the library row has no cId. */
  label: string;
  cId: string | null;
  libNum: number;
  name: string;
  /** Short human label under the C-code. */
  shortName: string;
  /** owner 採用 vs the r282 Shapeweld batch. */
  source: 'owner' | 'shapeweld';
  playable: boolean;
  /** Library feet-planted flag. */
  planted: boolean;
  /**
   * C164/C165 are the feet-planted stand-ins for the floating Mixamo
   * C16/C18 — called out in the row/detail so the owner knows why they matter.
   */
  plantedAlternative: boolean;
}

const SHORT_NAME: Record<string, string> = {
  IdleMixamoIdle: 'Mixamo idle',
  IdleMixamoStanding: 'Mixamo stand',
  IdleMixamoBreathing: 'Mixamo breathe',
  IdleMixamoHappy: 'Mixamo happy',
  IdleInnersceneSam: 'Innerscene stand',
  IdleRpmFStanding001: 'RPM stand',
  lib_C156: 'Samba',
  lib_C157: 'Wave dance',
  lib_C158: 'Uprock',
  lib_C159: 'Breakdance',
  lib_C160: 'Bashful',
  lib_C164: 'Idle (feet planted)',
  lib_C165: 'Happy idle (feet planted)',
};

const PLANTED_ALTERNATIVE = new Set<string>(['lib_C164', 'lib_C165']);

function toRow(clipId: string, source: IdlePickerRow['source']): IdlePickerRow | null {
  if (ownerIdleClipDeleted(clipId) || isRetiredIdleClip(clipId) || !isHonorableIdleClip(clipId)) return null;
  const lib = idleByClipId(clipId);
  if (!lib || lib.retired) return null;
  return {
    clipId,
    label: lib.cId ?? `L${lib.num}`,
    cId: lib.cId,
    libNum: lib.num,
    name: lib.name,
    shortName: SHORT_NAME[clipId] ?? lib.name,
    source,
    playable: Boolean(lib.playable && lib.vrmaUrl),
    planted: lib.planted,
    plantedAlternative: PLANTED_ALTERNATIVE.has(clipId),
  };
}

function cSortValue(row: IdlePickerRow): number {
  if (row.cId) {
    const n = Number.parseInt(row.cId.replace(/^C/, ''), 10);
    if (Number.isFinite(n)) return n;
  }
  return 10_000 + row.libNum;
}

/** Owner 採用 clips first (by C number), then the r282 Shapeweld batch. */
export function listIdlePickerRows(): IdlePickerRow[] {
  const rows: IdlePickerRow[] = [];
  const seen = new Set<string>();
  for (const clipId of ownerIdleClipIds()) {
    const row = toRow(clipId, 'owner');
    if (!row || seen.has(row.clipId)) continue;
    seen.add(row.clipId);
    rows.push(row);
  }
  for (const clipId of SHAPEWELD_IDLE_CLIP_IDS) {
    const row = toRow(clipId, 'shapeweld');
    if (!row || seen.has(row.clipId)) continue;
    seen.add(row.clipId);
    rows.push(row);
  }
  return rows.sort((a, b) => cSortValue(a) - cSortValue(b));
}

export function idlePickerRowFor(clipId: string | null | undefined): IdlePickerRow | undefined {
  if (!clipId) return undefined;
  return listIdlePickerRows().find((row) => row.clipId === clipId);
}
