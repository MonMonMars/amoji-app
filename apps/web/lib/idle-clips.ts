// Playable idle buttons for chat rails — curated CHAT_IDLE_CURATED only (#1..N).
// Full library rows stay in idle-library.ts for gallery / dev smoke.

import {
  CHAT_IDLE_CURATED,
  curatedLibraryRow,
  curatedRailByClipId,
  type IdleCuratedRailEntry,
} from './idle-curated-rail';
import { idleByClipId, type IdleLibraryEntry } from './idle-library';

export interface IdleClipOption {
  /** Button text: curated rail # as a string. */
  label: string;
  /** Clip id CompanionCanvas can play. */
  id: string;
  /** Curated rail # (not library #). */
  num: number;
  /** Library # (Mon smoke / gallery). */
  libNum: number;
  cId: string | null;
  name: string;
  category: IdleCuratedRailEntry['category'];
  labelKey: string;
  /** False when VRMA is not on disk yet — still shown, tap no-ops. */
  playable: boolean;
}

function toCuratedOption(e: IdleCuratedRailEntry, lib: IdleLibraryEntry): IdleClipOption {
  return {
    label: String(e.railNum),
    id: e.clipId,
    num: e.railNum,
    libNum: e.legacyLibNum,
    cId: lib.cId,
    name: lib.name,
    category: e.category,
    labelKey: e.labelKey,
    playable: Boolean(lib.playable && lib.vrmaUrl),
  };
}

/** Curated chat rail options only. */
export const IDLE_CLIP_OPTIONS: readonly IdleClipOption[] = CHAT_IDLE_CURATED.map((e) => {
  const lib = curatedLibraryRow(e.clipId);
  if (!lib) throw new Error(`curated rail missing library row: ${e.clipId}`);
  return toCuratedOption(e, lib);
});

export function idleClipByLabel(label: string): IdleClipOption | undefined {
  return IDLE_CLIP_OPTIONS.find((clip) => clip.label === label);
}

/** Resolve clip for pin / canvas — curated first, then any playable library row. */
export function idleClipById(id: string): IdleClipOption | undefined {
  const curated = curatedRailByClipId(id);
  const lib = idleByClipId(id);
  if (!lib || lib.retired || !lib.playable || !lib.vrmaUrl) {
    return undefined;
  }
  if (curated) return toCuratedOption(curated, lib);
  return {
    label: `L${lib.num}`,
    id: lib.clipId,
    num: lib.num,
    libNum: lib.num,
    cId: lib.cId,
    name: lib.name,
    category: 'breathe',
    labelKey: `idle.lib.${lib.clipId}`,
    playable: true,
  };
}
