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
  /** False when VRMA is not on disk yet �X still shown, tap no-ops. */
  playable: boolean;
}

function toOption(e: IdleLibraryEntry): IdleClipOption {
  return {
    label: String(e.num),
    id: e.clipId,
    num: e.num,
    cId: e.cId,
    name: e.name,
    playable: Boolean(e.playable && e.vrmaUrl),
  };
}

/** Every numbered library row through IDLE_LIBRARY max (#1-N). */
export const IDLE_CLIP_OPTIONS: readonly IdleClipOption[] = IDLE_LIBRARY
  .filter((e) => e.num >= 1 && e.num <= Math.max(...IDLE_LIBRARY.map((x) => x.num)))
  .map(toOption);

export function idleClipByLabel(label: string): IdleClipOption | undefined {
  return IDLE_CLIP_OPTIONS.find((clip) => clip.label === label);
}

export function idleClipById(id: string): IdleClipOption | undefined {
  return IDLE_CLIP_OPTIONS.find((clip) => clip.id === id);
}
