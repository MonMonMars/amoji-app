import * as THREE from 'three';

/**
 * ONE neutral daylight rig for every cast surface (chat, select preview,
 * runtime thumbs, thumb-bake). Intensities are intentional magic numbers
 * from r108 CompanionCanvas — keep them locked so models share one look.
 */
export const CAST_TONE_MAPPING = THREE.ACESFilmicToneMapping;
/** Midtones stay neutral under ACES; do not raise without checking warm backdrops. */
export const CAST_TONE_MAPPING_EXPOSURE = 1.0;

export const CAST_HEMI_SKY = '#f2f7ff';
export const CAST_HEMI_GROUND = '#8f8a80';
export const CAST_HEMI_INTENSITY = 0.85;

export const CAST_KEY_COLOR = '#ffffff';
export const CAST_KEY_INTENSITY = 1.75;
export const CAST_KEY_POSITION = [2.2, 3.8, 2.0] as const;

export const CAST_FILL_COLOR = '#e3eaf5';
export const CAST_FILL_INTENSITY = 0.3;
export const CAST_FILL_POSITION = [-1.8, 0.6, -1.4] as const;

export const CAST_AMBIENT_COLOR = '#ffffff';
/** Whisper floor so broken toon shade never renders pure black. */
export const CAST_AMBIENT_INTENSITY = 0.14;

export function applyCastToneMapping(renderer: THREE.WebGLRenderer): void {
  renderer.toneMapping = CAST_TONE_MAPPING;
  renderer.toneMappingExposure = CAST_TONE_MAPPING_EXPOSURE;
}

/** Adds the shared hemi + key + fill + ambient. Returns handles for dispose. */
export function addCastDaylight(scene: THREE.Scene): {
  hemi: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  ambient: THREE.AmbientLight;
} {
  const hemi = new THREE.HemisphereLight(CAST_HEMI_SKY, CAST_HEMI_GROUND, CAST_HEMI_INTENSITY);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(CAST_KEY_COLOR, CAST_KEY_INTENSITY);
  key.position.set(CAST_KEY_POSITION[0], CAST_KEY_POSITION[1], CAST_KEY_POSITION[2]);
  scene.add(key);
  const fill = new THREE.DirectionalLight(CAST_FILL_COLOR, CAST_FILL_INTENSITY);
  fill.position.set(CAST_FILL_POSITION[0], CAST_FILL_POSITION[1], CAST_FILL_POSITION[2]);
  scene.add(fill);
  const ambient = new THREE.AmbientLight(CAST_AMBIENT_COLOR, CAST_AMBIENT_INTENSITY);
  scene.add(ambient);
  return { hemi, key, fill, ambient };
}
