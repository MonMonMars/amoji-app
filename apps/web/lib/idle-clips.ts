// Playable standing idles already on disk. Labels match the gallery
// sections: A = in-app clips, B = ready VRMA. Convert-only C clips have
// no VRMA yet, so they are not buttons.

export interface IdleClipOption {
  /** Tiny button text, e.g. a01. */
  label: string;
  /** Clip id CompanionCanvas can play. */
  id: string;
}

export const IDLE_CLIP_OPTIONS: readonly IdleClipOption[] = [
  { label: 'a01', id: 'IdleNeutral' },
  { label: 'a02', id: 'IdleSassy' },
  { label: 'a03', id: 'IdleChinHand' },
  { label: 'a04', id: 'IdleHug' },
  { label: 'b01', id: 'IdleBreathCalm' },
  { label: 'b02', id: 'StandardIdle' },
  { label: 'b03', id: 'LookAround' },
  { label: 'b04', id: 'Relax' },
];

export function idleClipByLabel(label: string): IdleClipOption | undefined {
  return IDLE_CLIP_OPTIONS.find((clip) => clip.label === label);
}

export function idleClipById(id: string): IdleClipOption | undefined {
  return IDLE_CLIP_OPTIONS.find((clip) => clip.id === id);
}
