// Performance body motion map (t725-729 + measured BPM + lib_C* wiring).
// Pure data — no audio, no DOM.
//
// Beat match: mixer timeScale = clamp(trackBpm / clipBpm, 0.65, 1.45).
// Track BPM prefers measuredBpm(clipId) from scripts/estimate-audio-bpm.py;
// falls back to STYLE_BPM when confidence was too low.
// Authored reference BPMs: Dance VRMA ~100, Sing ~90, GentleSway (C112) ~72.
// Plant-feet shortlist (local VRMA as lib_C### when converted; interim Mixamo-
// class remotes in CompanionCanvas for C03/C61/C62/C110):
//   Sing/perform: C116 HypeMan, C117 DJ, C128 DJ02
//   Dance: C112 GentleSway, C113 DancingMedium, C114 DancingParty, C110 Twist,
//          C118 ClubDancer01, C03 Dance_Loop; also C111 Robot, C119/C124,
//          C60-62 Jazz/HipHop/Salsa, C09 KayKit
// Soft/ballad → C112 (+ mic); upbeat/party → C114/C118; DJ → C117/C128/C116;
// twist → C110; robot → C111; jazz/hiphop/salsa → C60/61/62; generic → C03/C113.
// Skip C144 sitting + float Mixamo chicken-dance.
// See public/models/anims/DEFERRED_DANCE_VRMA.md for FBX→VRMA remaining IDs.

import { measuredBpm } from './measured-bpm';

export type MotionFamily = 'sing' | 'dance';

export type MotionTag =
  | 'C112' | 'C113' | 'C114' | 'C110' | 'C118'
  | 'C117' | 'C128' | 'C116' | 'C111'
  | 'C03' | 'C60' | 'C61' | 'C62' | 'C09' | 'C119' | 'C124'
  | 'generic-sing' | 'generic-dance';

export interface PerfMotionProfile {
  tag: MotionTag;
  label: string;
  /** track BPM (measured when available, else style default) */
  bpm: number;
  /** true when bpm came from measured-bpm map */
  bpmMeasured: boolean;
  /** authored loop BPM for the body clip currently assumed (fallback Dance/Sing) */
  clipBpm: number;
  /** authored BPM for preferred lib_C* when that clip is the one playing */
  preferredClipBpm: number;
  /** mixer timeScale vs fallback clipBpm (canvas recomputes if preferred loads) */
  timeScale: number;
  /** preferred VRMA ids when shipped / interim-loaded under models/anims or remote */
  preferredClipIds: readonly string[];
  /** mixer clip names already loaded today */
  fallbackClipIds: readonly string[];
}

/** Style → estimated BPM (sensible defaults; used when measured BPM missing). */
export const STYLE_BPM: Readonly<Record<string, number>> = {
  'soft ballad': 72,
  chill: 84,
  'cute bounce': 108,
  'cute tease': 100,
  'cheerful pop': 118,
  'upbeat dance': 126,
  'opera aria': 76,
  'opera ensemble': 80,
  'opera toast': 112,
  'folk choral': 88,
};

const TAG_LABEL: Record<MotionTag, string> = {
  C112: 'GentleSway',
  C113: 'DancingMedium',
  C114: 'DancingParty',
  C110: 'DoTheTwist',
  C118: 'ClubDancer01',
  C117: 'DJ',
  C128: 'DJ02',
  C116: 'HypeMan',
  C111: 'DoTheRobot',
  C03: 'Dance_Loop',
  C60: 'JazzDancing',
  C61: 'HipHopDancing',
  C62: 'SalsaDancing',
  C09: 'KayKit',
  C119: 'ClubDancer02',
  C124: 'ClubDancer05',
  'generic-sing': 'Sing',
  'generic-dance': 'Dance',
};

/** Authored BPM for the preferred shortlist tag (when that VRMA is used). */
const TAG_CLIP_BPM: Partial<Record<MotionTag, number>> = {
  C112: 72,
  C113: 100,
  C114: 120,
  C110: 110,
  C118: 124,
  C117: 120,
  C128: 120,
  C116: 118,
  C111: 100,
  C03: 100,
  C60: 96,
  C61: 108,
  C62: 100,
  C09: 100,
  C119: 118,
  C124: 118,
  'generic-sing': 90,
  'generic-dance': 100,
};

const PREFERRED: Partial<Record<MotionTag, readonly string[]>> = {
  C112: ['lib_C112'],
  C113: ['lib_C113', 'lib_C03'],
  C114: ['lib_C114', 'lib_C118'],
  C110: ['lib_C110'],
  C118: ['lib_C118', 'lib_C114'],
  C117: ['lib_C117', 'lib_C128', 'lib_C116'],
  C128: ['lib_C128', 'lib_C117', 'lib_C116'],
  C116: ['lib_C116', 'lib_C117', 'lib_C128'],
  C111: ['lib_C111'],
  C03: ['lib_C03', 'lib_C113'],
  C60: ['lib_C60'],
  C61: ['lib_C61'],
  C62: ['lib_C62'],
  C09: ['lib_C09'],
  C119: ['lib_C119', 'lib_C118'],
  C124: ['lib_C124', 'lib_C118'],
};

export function estimateBpm(style: string, _clipId?: string): number {
  const s = style.trim().toLowerCase();
  if (STYLE_BPM[s] != null) return STYLE_BPM[s]!;
  const keys = Object.keys(STYLE_BPM).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (s.includes(k)) return STYLE_BPM[k]!;
  }
  return 100;
}

/** Prefer measured track BPM; else style default. */
export function trackBpmFor(style: string, clipId?: string): { bpm: number; measured: boolean } {
  if (clipId) {
    const m = measuredBpm(clipId);
    if (m != null) return { bpm: m, measured: true };
  }
  return { bpm: estimateBpm(style, clipId), measured: false };
}

export function motionTagFor(
  style: string,
  kind: 'song' | 'dance',
  clipId?: string,
): MotionTag {
  const s = style.trim().toLowerCase();
  const cid = (clipId ?? '').toLowerCase();

  if (cid.includes('8bit-disco') || cid.includes('8-bit-disco')) return 'C116';
  if (cid.includes('disco')) return 'C128';
  if (/\bdj\b/.test(cid) || cid.includes('-dj') || cid.startsWith('dj')) return 'C117';
  if (cid.includes('twist')) return 'C110';
  if (cid.includes('robot')) return 'C111';
  if (cid.includes('jazz')) return 'C60';
  if (cid.includes('hiphop') || cid.includes('hip-hop')) return 'C61';
  if (cid.includes('salsa')) return 'C62';
  if (cid.includes('kaykit')) return 'C09';
  if (cid.includes('club')) return 'C118';

  if (s.includes('soft ballad') || s === 'ballad') return 'C112';
  if (s.includes('upbeat dance') || s.includes('upbeat')) return 'C114';
  if (s.includes('cheerful pop')) return 'C113';
  if (s.includes('cute bounce') || s.includes('cute tease')) return 'C113';
  if (s.includes('chill')) return 'C112';
  if (s.includes('twist')) return 'C110';
  if (s.includes('robot')) return 'C111';
  if (s.includes('jazz')) return 'C60';
  if (s.includes('hiphop') || s.includes('hip-hop')) return 'C61';
  if (s.includes('salsa')) return 'C62';
  if (s.includes('kaykit')) return 'C09';
  if (s.includes('club') || s.includes('party')) return 'C118';
  if (s.includes('opera') || s.includes('folk choral')) {
    return kind === 'song' ? 'C116' : 'C113';
  }

  if (kind === 'song') return 'generic-sing';
  return 'C03';
}

export function timeScaleForBpm(bpm: number, clipBpm: number): number {
  const denom = clipBpm > 0 ? clipBpm : 100;
  const raw = bpm / denom;
  const clamped = Math.min(1.45, Math.max(0.65, raw));
  return Math.round(clamped * 1000) / 1000;
}

/**
 * Resolve motion for a performance clip.
 * Until Rokoko VRMAs ship, mixer often uses Dance/Sing; interim Mixamo-class
 * remotes may fill lib_C03 / lib_C61 / lib_C62 / lib_C110. timeScale uses
 * fallback clip BPM; CompanionCanvas recomputes when a preferred clip plays.
 */
export function resolvePerfMotion(clip: {
  id: string;
  kind: 'song' | 'dance';
  style: string;
}): PerfMotionProfile {
  const tag = motionTagFor(clip.style, clip.kind, clip.id);
  const { bpm, measured } = trackBpmFor(clip.style, clip.id);
  const clipBpm = clip.kind === 'dance' ? 100 : 90;
  const preferredClipBpm = clipBpmForTag(tag);
  const timeScale = timeScaleForBpm(bpm, clipBpm);
  const preferredClipIds = PREFERRED[tag] ?? (tag.startsWith('C') ? [`lib_${tag}`] : []);
  const fallbackClipIds: readonly string[] = clip.kind === 'song' ? ['Sing'] : ['Dance'];
  return {
    tag,
    label: TAG_LABEL[tag] ?? tag,
    bpm,
    bpmMeasured: measured,
    clipBpm,
    preferredClipBpm,
    timeScale,
    preferredClipIds,
    fallbackClipIds,
  };
}

/** Documented tag→clip BPM (for tests / when preferred VRMAs load). */
export function clipBpmForTag(tag: MotionTag): number {
  return TAG_CLIP_BPM[tag] ?? (tag === 'generic-sing' ? 90 : 100);
}

/** Recompute mixer timeScale for the clip that actually played. */
export function timeScaleForProfile(
  profile: PerfMotionProfile,
  playingClipId: string,
): number {
  const usePreferred =
    playingClipId.startsWith('lib_') ||
    profile.preferredClipIds.includes(playingClipId);
  const clipBpm = usePreferred ? profile.preferredClipBpm : profile.clipBpm;
  return timeScaleForBpm(profile.bpm, clipBpm);
}
