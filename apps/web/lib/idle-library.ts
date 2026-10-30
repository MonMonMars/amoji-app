// Idle library SoT (CLIP_LIBRARY-style #). Standing/planted first.
// Map: # → free-library Cxx + path; playable when a local VRMA exists.
// Mon says "use #N". Defaults: #1 IdleBreathCalm + #2 StandardIdle only.

export interface IdleLibraryEntry {
  /** 1-based contiguous number shown in chat. */
  num: number;
  /** Clip id CompanionCanvas plays (VRMA base name or lib_Cxx). */
  clipId: string;
  /** free-library gallery id, or null for app-only calm defaults. */
  cId: string | null;
  /** Human name / data-anim stem. */
  name: string;
  /** free-library relative path (fbx preferred, else gif), or app vrma path. */
  path: string;
  /** Feet must stay planted when played. */
  planted: boolean;
  /** True when models/anims/<clipId>.vrma ships. */
  playable: boolean;
  /** Public URL path under ASSET_BASE, or null. */
  vrmaUrl: string | null;
  /** In default rotation when no amoji.idleEnabled.v1 yet. */
  defaultEnabled: boolean;
}

const VRMA = (id: string) => `models/anims/${id}.vrma`;

/** Standing planted idles: app calm defaults, then free-library C* (contiguous #). */
export const IDLE_LIBRARY: readonly IdleLibraryEntry[] = [
  {
    num: 1,
    clipId: 'IdleBreathCalm',
    cId: null,
    name: 'IdleBreathCalm',
    path: VRMA('IdleBreathCalm'),
    planted: true,
    playable: true,
    vrmaUrl: VRMA('IdleBreathCalm'),
    defaultEnabled: true,
  },
  {
    num: 2,
    clipId: 'StandardIdle',
    cId: null,
    name: 'StandardIdle',
    path: VRMA('StandardIdle'),
    planted: true,
    playable: true,
    vrmaUrl: VRMA('StandardIdle'),
    defaultEnabled: true,
  },
  // free-library standing — playable only when VRMA already on disk
  {
    num: 3,
    clipId: 'LookAround',
    cId: 'C01',
    name: 'RokokoEverydayIdles',
    path: 'animations/idle/rokoko_everyday_idles/Idle_LookingAround_MIXAMO_769.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('LookAround'),
    defaultEnabled: false,
  },
  {
    num: 4,
    clipId: 'lib_C02',
    cId: 'C02',
    name: 'Idle_Loop',
    path: 'animations/idle/quaternius_ual1/Idle_Loop.gif',
    planted: true,
    playable: false,
    vrmaUrl: null,
    defaultEnabled: false,
  },
  {
    num: 5,
    clipId: 'lib_C04',
    cId: 'C04',
    name: 'KayKitIdle',
    path: 'animations/idle/kaykit/Idle.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('lib_C04'),
    defaultEnabled: false,
  },
  {
    num: 6,
    clipId: 'lib_C11',
    cId: 'C11',
    name: 'UAL2FoldArms',
    path: 'animations/idle/quaternius_ual2/Idle_FoldArms_Loop.gif',
    planted: true,
    playable: false,
    vrmaUrl: null,
    defaultEnabled: false,
  },
  {
    num: 7,
    clipId: 'lib_C25',
    cId: 'C25',
    name: 'Bored',
    path: 'animations/idle/mixamo/Bored.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('lib_C25'),
    defaultEnabled: false,
  },
  {
    num: 8,
    clipId: 'lib_C36',
    cId: 'C36',
    name: 'RokokoArguing',
    path: 'animations/idle/rokoko_everyday_idles/Idle_Arguing_MIXAMO_WHS.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('lib_C36'),
    defaultEnabled: false,
  },
  {
    num: 9,
    clipId: 'lib_C37',
    cId: 'C37',
    name: 'RokokoChatting',
    path: 'animations/idle/rokoko_everyday_idles/Idle_Chatting_MIXAMO_WHS.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('lib_C37'),
    defaultEnabled: false,
  },
  {
    num: 10,
    clipId: 'lib_C38',
    cId: 'C38',
    name: 'RokokoChatting02',
    path: 'animations/idle/rokoko_everyday_idles/Idle_Chatting02_MIXAMO_WHS.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('lib_C38'),
    defaultEnabled: false,
  },
  {
    num: 11,
    clipId: 'lib_C39',
    cId: 'C39',
    name: 'RokokoConversation',
    path: 'animations/idle/rokoko_everyday_idles/Idle_Conversation_Loop_MIXAMO_769_segment-2.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('lib_C39'),
    defaultEnabled: false,
  },
  {
    num: 12,
    clipId: 'lib_C41',
    cId: 'C41',
    name: 'RokokoListeningToMusic',
    path: 'animations/idle/rokoko_everyday_idles/Idle_ListeningtoMusic_MIXAMO_WHS.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('lib_C41'),
    defaultEnabled: false,
  },
  {
    num: 13,
    clipId: 'LookAround',
    cId: 'C42',
    name: 'RokokoLookingAround02',
    path: 'animations/idle/rokoko_everyday_idles/Idle_LookingAround02_MIXAMO_769.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('LookAround'),
    defaultEnabled: false,
  },
  {
    num: 14,
    clipId: 'lib_C44',
    cId: 'C44',
    name: 'RokokoWatchingSomething',
    path: 'animations/idle/rokoko_everyday_idles/Idle_WatchingSomething_Loop_MIXAMO_769_segment.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('lib_C44'),
    defaultEnabled: false,
  },
  {
    num: 15,
    clipId: 'HelloWave',
    cId: 'C53',
    name: 'StandingGreeting',
    path: 'animations/idle/mixamo/StandingGreeting.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('HelloWave'),
    defaultEnabled: false,
  },
  {
    num: 16,
    clipId: 'Shrug',
    cId: 'C54',
    name: 'Shrugging',
    path: 'animations/idle/mixamo/Shrugging.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('Shrug'),
    defaultEnabled: false,
  },
  {
    num: 17,
    clipId: 'Sleepy',
    cId: 'C55',
    name: 'Yawn',
    path: 'animations/idle/mixamo/Yawn.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('Sleepy'),
    defaultEnabled: false,
  },
  {
    num: 18,
    clipId: 'Thinking',
    cId: 'C56',
    name: 'Thinking',
    path: 'animations/idle/mixamo/Thinking.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('Thinking'),
    defaultEnabled: false,
  },
  {
    num: 19,
    clipId: 'lib_C57',
    cId: 'C57',
    name: 'NervouslyLookAround',
    path: 'animations/idle/mixamo/NervouslyLookAround.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('lib_C57'),
    defaultEnabled: false,
  },
  {
    num: 20,
    clipId: 'ThumbsUp',
    cId: 'C58',
    name: 'StandingThumbsUp',
    path: 'animations/idle/mixamo/StandingThumbsUp.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('ThumbsUp'),
    defaultEnabled: false,
  },
  {
    num: 21,
    clipId: 'Clapping',
    cId: 'C59',
    name: 'StandingClap',
    path: 'animations/idle/mixamo/StandingClap.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('Clapping'),
    defaultEnabled: false,
  },
  {
    num: 22,
    clipId: 'Cheer',
    cId: 'C63',
    name: 'VictoryIdle',
    path: 'animations/idle/mixamo/VictoryIdle.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('Cheer'),
    defaultEnabled: false,
  },
  {
    num: 23,
    clipId: 'lib_C64',
    cId: 'C64',
    name: 'DefeatIdle',
    path: 'animations/idle/mixamo/DefeatIdle.fbx',
    planted: true,
    playable: true,
    vrmaUrl: VRMA('lib_C64'),
    defaultEnabled: false,
  },
  {
    num: 24,
    clipId: 'lib_C65',
    cId: 'C65',
    name: 'UAL1Talking',
    path: 'animations/idle/quaternius_ual1/Idle_Talking_Loop.gif',
    planted: true,
    playable: false,
    vrmaUrl: null,
    defaultEnabled: false,
  },
  {
    num: 25,
    clipId: 'lib_C75',
    cId: 'C75',
    name: 'UAL2NinjaIdle',
    path: 'animations/idle/quaternius_ual2/NinjaJump_Idle_Loop.gif',
    planted: true,
    playable: false,
    vrmaUrl: null,
    defaultEnabled: false,
  },
  {
    num: 26,
    clipId: 'lib_C84',
    cId: 'C84',
    name: 'KenneyProtagonistsIdle',
    path: 'animations/idle/kenney_protagonists/idle.gif',
    planted: true,
    playable: false,
    vrmaUrl: null,
    defaultEnabled: false,
  },
  {
    num: 27,
    clipId: 'lib_C85',
    cId: 'C85',
    name: 'PSXOfficeIdle',
    path: 'animations/idle/psx_people/office_idle.gif',
    planted: true,
    playable: false,
    vrmaUrl: null,
    defaultEnabled: false,
  },
  {
    num: 28,
    clipId: 'lib_C87',
    cId: 'C87',
    name: 'PSXOfficeTalk',
    path: 'animations/idle/psx_people/office_talk.gif',
    planted: true,
    playable: false,
    vrmaUrl: null,
    defaultEnabled: false,
  },
  {
    num: 29,
    clipId: 'lib_C90',
    cId: 'C90',
    name: 'PSXSurvivorIdle',
    path: 'animations/idle/psx_people/survivor_idle.gif',
    planted: true,
    playable: false,
    vrmaUrl: null,
    defaultEnabled: false,
  },
  {
    num: 30,
    clipId: 'lib_C92',
    cId: 'C92',
    name: 'PSXSurvivorTalk',
    path: 'animations/idle/psx_people/survivor_talk.gif',
    planted: true,
    playable: false,
    vrmaUrl: null,
    defaultEnabled: false,
  },
  {
    num: 31,
    clipId: 'lib_C95',
    cId: 'C95',
    name: 'SquadIdle',
    path: 'animations/idle/squad/idle.gif',
    planted: true,
    playable: false,
    vrmaUrl: null,
    defaultEnabled: false,
  },
  // optional side picks (still planted; not default rotation)
  {
    num: 32,
    clipId: 'Relax',
    cId: null,
    name: 'Relax',
    path: VRMA('Relax'),
    planted: true,
    playable: true,
    vrmaUrl: VRMA('Relax'),
    defaultEnabled: false,
  },
  {
    num: 33,
    clipId: 'IdleNeutral',
    cId: null,
    name: 'IdleNeutral',
    path: VRMA('IdleNeutral'),
    planted: true,
    playable: true,
    vrmaUrl: VRMA('IdleNeutral'),
    defaultEnabled: false,
  },
  {
    num: 34,
    clipId: 'IdleSassy',
    cId: null,
    name: 'IdleSassy',
    path: VRMA('IdleSassy'),
    planted: true,
    playable: true,
    vrmaUrl: VRMA('IdleSassy'),
    defaultEnabled: false,
  },
  {
    num: 35,
    clipId: 'IdleChinHand',
    cId: null,
    name: 'IdleChinHand',
    path: VRMA('IdleChinHand'),
    planted: true,
    playable: true,
    vrmaUrl: VRMA('IdleChinHand'),
    defaultEnabled: false,
  },
  {
    num: 36,
    clipId: 'IdleHug',
    cId: null,
    name: 'IdleHug',
    path: VRMA('IdleHug'),
    planted: true,
    playable: true,
    vrmaUrl: VRMA('IdleHug'),
    defaultEnabled: false,
  },
];

const BY_NUM = new Map(IDLE_LIBRARY.map((e) => [e.num, e]));
const BY_CLIP = new Map<string, IdleLibraryEntry>();
for (const e of IDLE_LIBRARY) {
  if (!BY_CLIP.has(e.clipId)) BY_CLIP.set(e.clipId, e);
}
const BY_C = new Map(
  IDLE_LIBRARY.filter((e) => e.cId).map((e) => [e.cId!, e]),
);

export function idleByNum(num: number): IdleLibraryEntry | undefined {
  return BY_NUM.get(num);
}

export function idleByClipId(clipId: string): IdleLibraryEntry | undefined {
  return BY_CLIP.get(clipId);
}

export function idleByCId(cId: string): IdleLibraryEntry | undefined {
  return BY_C.get(cId);
}

/** Unique playable entries (first # wins when clipId shared, e.g. C01/C42). */
export function playableIdles(): IdleLibraryEntry[] {
  const seen = new Set<string>();
  const out: IdleLibraryEntry[] = [];
  for (const e of IDLE_LIBRARY) {
    if (!e.playable || !e.vrmaUrl || seen.has(e.clipId)) continue;
    seen.add(e.clipId);
    out.push(e);
  }
  return out;
}

export function defaultEnabledNums(): number[] {
  return IDLE_LIBRARY.filter((e) => e.defaultEnabled).map((e) => e.num);
}

