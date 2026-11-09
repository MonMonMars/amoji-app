import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  CAST_AMBIENT_INTENSITY,
  CAST_FACE_INTENSITY,
  CAST_FILL_INTENSITY,
  CAST_HEMI_INTENSITY,
  CAST_KEY_INTENSITY,
  CAST_TONE_MAPPING_EXPOSURE,
  addCastDaylight,
  castToneMappingExposure,
  retuneCastDaylightRig,
} from '../lib/vrm/cast-lighting';
import {
  CAST_MATCAP_COLOR_SCALE,
  castLightingMultipliers,
  characterIdFromModelRef,
  needsCastFaceLight,
  needsCastMatcapDampen,
} from '../lib/vrm/cast-lighting-profile';
import { dampenCastMatcap, floorCastShadeColors } from '../lib/vrm/cast-materials';

describe('cast daylight constants', () => {
  it('keeps the r108 chat intensities locked for a shared cast look', () => {
    expect(CAST_TONE_MAPPING_EXPOSURE).toBe(1.0);
    expect(CAST_HEMI_INTENSITY).toBe(0.85);
    expect(CAST_KEY_INTENSITY).toBe(1.75);
    expect(CAST_FILL_INTENSITY).toBe(0.3);
    expect(CAST_AMBIENT_INTENSITY).toBe(0.14);
    expect(CAST_FACE_INTENSITY).toBe(0.42);
  });
});

describe('per-character cast lighting', () => {
  it('leaves unlisted ids at unit multipliers with face light off', () => {
    expect(castLightingMultipliers('a14-vivi')).toEqual({
      hemi: 1,
      key: 1,
      fill: 1,
      ambient: 1,
      face: 0,
      exposure: 1,
    });
    expect(needsCastFaceLight('a14-vivi')).toBe(false);
  });

  it('lights VRoid ref #1–3 with wrap + frontal face fill (not crushed key)', () => {
    for (const id of ['a01-shino', 'a02-shibu', 'a03-fumiriya'] as const) {
      const m = castLightingMultipliers(id);
      expect(m.key).toBeGreaterThan(0.9);
      expect(m.key).toBeLessThan(1);
      expect(m.fill).toBeGreaterThan(1.4);
      expect(m.ambient).toBeGreaterThan(1.5);
      expect(m.face).toBe(1);
      expect(needsCastFaceLight(id)).toBe(true);
      expect(needsCastMatcapDampen(id)).toBe(true);
      expect(castToneMappingExposure(id)).toBeLessThan(CAST_TONE_MAPPING_EXPOSURE);
    }
  });

  it('adds a visible face light only for Sendagaya/#13 when retuning the shared rig', () => {
    const scene = new THREE.Scene();
    const rig = addCastDaylight(scene);
    expect(rig.face.visible).toBe(false);
    expect(rig.face.intensity).toBe(0);

    retuneCastDaylightRig(rig, 'a01-shino');
    expect(rig.face.visible).toBe(true);
    expect(rig.face.intensity).toBeCloseTo(CAST_FACE_INTENSITY, 5);
    expect(rig.fill.intensity).toBeGreaterThan(CAST_FILL_INTENSITY);
    expect(rig.ambient.intensity).toBeGreaterThan(CAST_AMBIENT_INTENSITY);

    retuneCastDaylightRig(rig, 'a14-vivi');
    expect(rig.face.visible).toBe(false);
    expect(rig.face.intensity).toBe(0);
  });

  it('parses roster ids from model paths', () => {
    expect(characterIdFromModelRef('/models/want/a01-shino.vrm')).toBe('a01-shino');
    expect(characterIdFromModelRef('https://cdn.example/a63-hinoame-satuki-mei-sirayuki.vrm?x=1')).toBe(
      'a63-hinoame-satuki-mei-sirayuki',
    );
  });
});

describe('cast material lighting passes (three-vrm MToon truth)', () => {
  it('dampens matcapFactor as a Color (the PR #299 silent no-op)', () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ name: 'Hair' }),
    );
    const mat = mesh.material as THREE.MeshBasicMaterial & {
      matcapFactor: THREE.Color;
      rimLightingMixFactor: number;
    };
    mat.matcapFactor = new THREE.Color(1, 0.8, 0.6);
    mat.rimLightingMixFactor = 0.9;
    root.add(mesh);

    expect(dampenCastMatcap(root, 'a14-vivi')).toBe(0);
    expect(mat.matcapFactor.r).toBe(1);

    expect(dampenCastMatcap(root, 'a01-shino')).toBe(1);
    expect(mat.matcapFactor.r).toBeCloseTo(1 * CAST_MATCAP_COLOR_SCALE, 5);
    expect(mat.matcapFactor.g).toBeCloseTo(0.8 * CAST_MATCAP_COLOR_SCALE, 5);
    expect(mat.matcapFactor.b).toBeCloseTo(0.6 * CAST_MATCAP_COLOR_SCALE, 5);
    expect(mat.rimLightingMixFactor).toBeCloseTo(0.9 * 0.55, 5);
  });

  it('floors near-black shadeColorFactor (not the missing shadeColor alias)', () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ name: 'Face' }),
    );
    const mat = mesh.material as THREE.MeshBasicMaterial & {
      shadeColorFactor: THREE.Color;
      shadeColor?: THREE.Color;
    };
    mat.shadeColorFactor = new THREE.Color(0.02, 0.015, 0.01);
    // Deliberately omit shadeColor — that was the broken CompanionCanvas path.
    delete mat.shadeColor;
    root.add(mesh);

    expect(floorCastShadeColors(root)).toBe(1);
    const lum = Math.max(mat.shadeColorFactor.r, mat.shadeColorFactor.g, mat.shadeColorFactor.b);
    expect(lum).toBeGreaterThanOrEqual(0.2 - 1e-6);
  });
});
