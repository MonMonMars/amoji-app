// Interim + local sources for performance shortlist VRMAs (lib_C*).
// Local ANIM_MIRROR paths win when lib_C*.vrma is under models/anims/.
// Mixamo-class remotes from 3dchat still fill C03/C61/C62/C110 until local
// FBX lands. Rokoko/Jazz locals ship as status: local; KayKit C09 still deferred.

export interface DanceClipSource {
  id: string;
  /** free-library C-id (documentation) */
  cId: string;
  label: string;
  /** remote interim URLs (optional) */
  remoteUrls: readonly string[];
  /** true when a local models/anims/<id>.vrma is expected / preferred */
  localPreferred: boolean;
  /** conversion status */
  status: 'interim-remote' | 'local' | 'deferred-rokoko' | 'deferred-mixamo' | 'deferred-cc0';
}

const CHAT = 'https://raw.githubusercontent.com/DavinciDreams/3dchat/main/public/animations/vrma';

/** Shortlist used by CompanionCanvas PERF_SOURCES. */
export const DANCE_CLIP_SOURCES: readonly DanceClipSource[] = [
  {
    id: 'lib_C110', cId: 'C110', label: 'DoTheTwist',
    remoteUrls: [`${CHAT}/twistDance.vrma`],
    localPreferred: true, status: 'interim-remote',
  },
  {
    id: 'lib_C61', cId: 'C61', label: 'HipHopDancing',
    remoteUrls: [`${CHAT}/hipHopDancing.vrma`, `${CHAT}/hipHopDance.vrma`],
    localPreferred: true, status: 'interim-remote',
  },
  {
    id: 'lib_C62', cId: 'C62', label: 'SalsaDancing',
    remoteUrls: [`${CHAT}/sambaDancing.vrma`, `${CHAT}/rumbaDancing.vrma`],
    localPreferred: true, status: 'interim-remote',
  },
  {
    id: 'lib_C03', cId: 'C03', label: 'Dance_Loop',
    remoteUrls: [`${CHAT}/hipHopDance.vrma`],
    localPreferred: true, status: 'interim-remote',
  },
  // Rokoko / Jazz: local VRMA shipped; KayKit C09 still deferred (non-humanoid)
  { id: 'lib_C112', cId: 'C112', label: 'GentleSway', remoteUrls: [], localPreferred: true, status: 'local' },
  { id: 'lib_C113', cId: 'C113', label: 'DancingMedium', remoteUrls: [], localPreferred: true, status: 'local' },
  { id: 'lib_C114', cId: 'C114', label: 'DancingParty', remoteUrls: [], localPreferred: true, status: 'local' },
  { id: 'lib_C111', cId: 'C111', label: 'DoTheRobot', remoteUrls: [], localPreferred: true, status: 'local' },
  { id: 'lib_C118', cId: 'C118', label: 'ClubDancer01', remoteUrls: [], localPreferred: true, status: 'local' },
  { id: 'lib_C119', cId: 'C119', label: 'ClubDancer02', remoteUrls: [], localPreferred: true, status: 'local' },
  { id: 'lib_C124', cId: 'C124', label: 'ClubDancer05', remoteUrls: [], localPreferred: true, status: 'local' },
  { id: 'lib_C116', cId: 'C116', label: 'HypeMan', remoteUrls: [], localPreferred: true, status: 'local' },
  { id: 'lib_C117', cId: 'C117', label: 'DJ', remoteUrls: [], localPreferred: true, status: 'local' },
  { id: 'lib_C128', cId: 'C128', label: 'DJ02', remoteUrls: [], localPreferred: true, status: 'local' },
  { id: 'lib_C60', cId: 'C60', label: 'JazzDancing', remoteUrls: [], localPreferred: true, status: 'local' },
  { id: 'lib_C09', cId: 'C09', label: 'KayKitDance', remoteUrls: [], localPreferred: true, status: 'deferred-cc0' },
];

export function dancePerfClipSources(animMirror: string): { id: string; urls: string[] }[] {
  return DANCE_CLIP_SOURCES.map((s) => {
    const urls: string[] = [];
    if (s.localPreferred) urls.push(`${animMirror}/${s.id}.vrma`);
    urls.push(...s.remoteUrls);
    return { id: s.id, urls };
  });
}
