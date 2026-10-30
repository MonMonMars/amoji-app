// Playable idle buttons for chat rails. Labels are IDLE_LIBRARY # (Mon: "use #N").
// Convert-only free-library rows stay in idle-library.ts but are not buttons.

import { IDLE_LIBRARY, type IdleLibraryEntry } from './idle-library';

export interface IdleClipOption {
  /** Button text: the library # as a string. */
  label: string;
  /** Clip id CompanionCanvas can play. */
  id: string;
  num: number;
  cId: string | null;
  name: string;
}

function toOption(e: IdleLibraryEntry): IdleClipOption {
  return {
    label: String(e.num),
    id: e.clipId,
    num: e.num,
    cId: e.cId,
    name: e.name,
  };
}

/** Every playable library row in # order (aliases like C01/C42 share a clipId). */
export const IDLE_CLIP_OPTIONS: readonly IdleClipOption[] = IDLE_LIBRARY
  .filter((e) => e.playable && e.vrmaUrl)
  .map(toOption);

export function idleClipByLabel(label: string): IdleClipOption | undefined {
  return IDLE_CLIP_OPTIONS.find((clip) => clip.label === label);
}

export function idleClipById(id: string): IdleClipOption | undefined {
  return IDLE_CLIP_OPTIONS.find((clip) => clip.id === id);
}
