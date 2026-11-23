// Martial flow VRMAs (Rokoko kata + tai chi) — always preload for demo / move clips
// even when the clip is not in the owner idle rotation.

export function martialPerfClipSources(animMirror: string): { id: string; urls: string[] }[] {
  return [
    { id: 'lib_C120', urls: [`${animMirror}/lib_C120.vrma`] },
    { id: 'lib_C121', urls: [`${animMirror}/lib_C121.vrma`] },
  ];
}
