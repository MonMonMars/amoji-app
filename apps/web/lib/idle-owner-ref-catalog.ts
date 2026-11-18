/**
 * Owner idle VRMA references (metadata-only — picker + agents; not yet in IDLE_LIBRARY).
 * Wire when VRMA lands on disk; until then record-only in owner-resources.
 */
export interface IdleOwnerRefEntry {
  ownerCode: string;
  /** Proposed clipId when converted. */
  clipId: string;
  name: string;
  source: string;
  license: string;
  notes: string;
}

function idleRefCode(n: number): string {
  return `ID${String(n).padStart(3, '0')}`;
}

/** ID126–ID135 — ten owner-sourced standing idles (CC0 / Mixamo / Quaternius refs). */
export const IDLE_OWNER_REF_CATALOG: readonly IdleOwnerRefEntry[] = [
  {
    ownerCode: idleRefCode(126),
    clipId: 'IdleOwnerMixamoConfident',
    name: 'Mixamo Confident Idle (planned)',
    source: 'Mixamo · Adobe account export',
    license: 'Mixamo ToS (game use)',
    notes: 'Standing planted · upbeat chat idle',
  },
  {
    ownerCode: idleRefCode(127),
    clipId: 'IdleOwnerMixamoThoughtful',
    name: 'Mixamo Thoughtful Idle (planned)',
    source: 'Mixamo',
    license: 'Mixamo ToS',
    notes: 'Think-pose family · blend with Thinking VRMA',
  },
  {
    ownerCode: idleRefCode(128),
    clipId: 'IdleOwnerRpmLean',
    name: 'RPM subtle lean (planned)',
    source: 'Ready Player Me standing pack',
    license: 'RPM',
    notes: 'Matches RPM family crossfade rules',
  },
  {
    ownerCode: idleRefCode(129),
    clipId: 'IdleOwnerQuaterniusWave',
    name: 'Quaternius casual wave idle (planned)',
    source: 'Quaternius UAL2',
    license: 'CC0',
    notes: 'Greet-adjacent · not card-greet loop',
  },
  {
    ownerCode: idleRefCode(130),
    clipId: 'IdleOwnerQuaterniusPhone',
    name: 'Quaternius phone glance (planned)',
    source: 'Quaternius UAL2',
    license: 'CC0',
    notes: 'Chat “looking at phone” rail candidate',
  },
  {
    ownerCode: idleRefCode(131),
    clipId: 'IdleOwnerKaykitHop',
    name: 'KayKit light hop (planned)',
    source: 'KayKit lib_C family',
    license: 'CC0',
    notes: 'Cute bounce · sing/dance adjacent',
  },
  {
    ownerCode: idleRefCode(132),
    clipId: 'IdleOwnerInnersceneCalm',
    name: 'Innerscene calm stand (planned)',
    source: 'Innerscene Sam pack',
    license: 'Owner CC0 drop',
    notes: 'Calm upright · no forward hunch',
  },
  {
    ownerCode: idleRefCode(133),
    clipId: 'IdleOwnerStretchReady',
    name: 'Stretch ready stand (planned)',
    source: 'Mixamo stretching',
    license: 'Mixamo ToS',
    notes: 'Handoff to stretch category clips',
  },
  {
    ownerCode: idleRefCode(134),
    clipId: 'IdleOwnerMartialGuard',
    name: 'Martial guard idle (planned)',
    source: 'Mixamo fighting idle',
    license: 'Mixamo ToS',
    notes: 'Kungfu / taichi demo-phase adjacent',
  },
  {
    ownerCode: idleRefCode(135),
    clipId: 'IdleOwnerDancePulse',
    name: 'Dance pulse idle (planned)',
    source: 'lib_C112 family derivative',
    license: 'CC0',
    notes: 'Music-pose pool candidate',
  },
];

export const IDLE_OWNER_REF_FIRST = IDLE_OWNER_REF_CATALOG[0]!.ownerCode;
export const IDLE_OWNER_REF_LAST = IDLE_OWNER_REF_CATALOG[IDLE_OWNER_REF_CATALOG.length - 1]!.ownerCode;