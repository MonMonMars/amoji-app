import * as THREE from 'three';
import { castLightingMultipliers } from './cast-lighting-profile';

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

/** Soft frontal key for VRoid ref faces (Sendagaya #1–3 / grazing #13). */
export const CAST_FACE_COLOR = '#fff4ec';
export const CAST_FACE_INTENSITY = 0.42;
export const CAST_FACE_POSITION = [0.2, 1.55, 2.6] as const;

export interface CastDaylightRig {
  hemi: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  ambient: THREE.AmbientLight;
  face: THREE.DirectionalLight;
}

export function castToneMappingExposure(characterId?: string): number {
  return CAST_TONE_MAPPING_EXPOSURE * castLightingMultipliers(characterId).exposure;
}

export function applyCastToneMapping(renderer: THREE.WebGLRenderer, characterId?: string): void {
  renderer.toneMapping = CAST_TONE_MAPPING;
  renderer.toneMappingExposure = castToneMappingExposure(characterId);
}

/** Apply roster-specific multipliers to an existing rig (thumb bake loop, shared thumb env). */
export function retuneCastDaylightRig(rig: CastDaylightRig, characterId?: string): void {
  const m = castLightingMultipliers(characterId);
  rig.hemi.intensity = CAST_HEMI_INTENSITY * m.hemi;
  rig.key.intensity = CAST_KEY_INTENSITY * m.key;
  rig.fill.intensity = CAST_FILL_INTENSITY * m.fill;
  rig.ambient.intensity = CAST_AMBIENT_INTENSITY * m.ambient;
  rig.face.intensity = CAST_FACE_INTENSITY * m.face;
  rig.face.visible = m.face > 0;
}

/** Adds the shared hemi + key + fill + ambient (+ optional face). Returns handles for dispose / retune. */
export function addCastDaylight(scene: THREE.Scene, characterId?: string): CastDaylightRig {
  const m = castLightingMultipliers(characterId);
  const hemi = new THREE.HemisphereLight(CAST_HEMI_SKY, CAST_HEMI_GROUND, CAST_HEMI_INTENSITY * m.hemi);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(CAST_KEY_COLOR, CAST_KEY_INTENSITY * m.key);
  key.position.set(CAST_KEY_POSITION[0], CAST_KEY_POSITION[1], CAST_KEY_POSITION[2]);
  scene.add(key);
  const fill = new THREE.DirectionalLight(CAST_FILL_COLOR, CAST_FILL_INTENSITY * m.fill);
  fill.position.set(CAST_FILL_POSITION[0], CAST_FILL_POSITION[1], CAST_FILL_POSITION[2]);
  scene.add(fill);
  const ambient = new THREE.AmbientLight(CAST_AMBIENT_COLOR, CAST_AMBIENT_INTENSITY * m.ambient);
  scene.add(ambient);
  const face = new THREE.DirectionalLight(CAST_FACE_COLOR, CAST_FACE_INTENSITY * m.face);
  face.position.set(CAST_FACE_POSITION[0], CAST_FACE_POSITION[1], CAST_FACE_POSITION[2]);
  face.visible = m.face > 0;
  scene.add(face);
  return { hemi, key, fill, ambient, face };
}
