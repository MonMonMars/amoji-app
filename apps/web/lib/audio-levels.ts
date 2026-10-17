// Three independent levels. Only 20/40/60/80/100. Stored on prefs (`amoji.prefs.v1`).
// Mic open/close never reads or writes these.

export const VOLUME_STEPS = [20, 40, 60, 80, 100] as const;
export type VolumeStep = (typeof VOLUME_STEPS)[number];
export type VolumeKey = 'sfxVol' | 'bgmVol' | 'voiceVol';

const PREFS_KEY = 'amoji.prefs.v1';
export const DEFAULT_VOLUME: VolumeStep = 80;

export function isVolumeStep(n: number): n is VolumeStep {
  return (VOLUME_STEPS as readonly number[]).includes(n);
}

export function readVolume(key: VolumeKey): VolumeStep {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_VOLUME;
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_VOLUME;
    const n = Number((JSON.parse(raw) as Record<string, unknown>)[key]);
    return isVolumeStep(n) ? n : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

/** 0.2 … 1 */
export function volumeLinear(key: VolumeKey): number {
  return readVolume(key) / 100;
}
