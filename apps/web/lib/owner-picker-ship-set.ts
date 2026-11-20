import pickerJson from '../data/owner-picker-selection.json';
import { OWNER_SHIP_LISTEN_MV_CODES, OWNER_SHIP_SONG_CLIP_IDS } from './owner-perf-ship-set';
export const OWNER_PICKER_SELECTION_VERSION = 'owner-picker-selection-v1' as const;
export interface OwnerPickerSelectionShip {
  version?: string; use?: string[]; delete?: string[]; keep?: string[];
  listenMvCodes?: string[]; songClipIds?: string[]; idleRailNums?: number[]; idleClipIds?: string[];
}
function normList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}
export function committedOwnerPickerSelection(): OwnerPickerSelectionShip {
  const raw = pickerJson as OwnerPickerSelectionShip;
  return {
    version: raw.version ?? OWNER_PICKER_SELECTION_VERSION,
    use: normList(raw.use), delete: normList(raw.delete), keep: normList(raw.keep),
    listenMvCodes: normList(raw.listenMvCodes).length ? normList(raw.listenMvCodes) : [...OWNER_SHIP_LISTEN_MV_CODES],
    songClipIds: normList(raw.songClipIds).length ? normList(raw.songClipIds) : [...OWNER_SHIP_SONG_CLIP_IDS],
    idleRailNums: Array.isArray(raw.idleRailNums) ? raw.idleRailNums.filter((n): n is number => typeof n === 'number' && Number.isInteger(n)) : undefined,
    idleClipIds: normList(raw.idleClipIds),
  };
}
