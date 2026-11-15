import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  CAST_LIGHTING_OVERRIDES,
  CAST_LIGHTING_UNIT,
  CAST_MATCAP_COLOR_SCALE,
  CAST_MATCAP_DAMPEN_IDS,
  castLightingMultipliers,
  characterIdFromModelRef,
  needsCastFaceLight,
  needsCastMatcapDampen,
} from '../lib/vrm/cast-lighting-profile';
import { dampenCastMatcap, floorCastShadeColors } from '../lib/vrm/cast-materials';

const SAMPLE_IDS = [
  'a01-shino',
  'a02-shibu',
  'a03-fumiriya',
  'a14-vivi',
  'a63-hinoame-satuki-mei-sirayuki',
  'a94-rita',
] as const;

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

describe('unified cast lighting (no per-character divergence)', () => {
  it('keeps the override allowlist empty', () => {
    expect(Object.keys(CAST_LIGHTING_OVERRIDES)).toEqual([]);
    expect(CAST_MATCAP_DAMPEN_IDS).toEqual([]);
  });

  it('resolves every sample id to the same unit multipliers', () => {
    for (const id of SAMPLE_IDS) {
      expect(castLightingMultipliers(id)).toEqual(CAST_LIGHTING_UNIT);
      expect(castToneMappingExposure(id)).toBe(CAST_TONE_MAPPING_EXPOSURE);
      expect(needsCastFaceLight(id)).toBe(false);
      expect(needsCastMatcapDampen(id)).toBe(true);
    }
    expect(castLightingMultipliers(undefined)).toEqual(CAST_LIGHTING_UNIT);
  });

  it('builds and retunes the same rig for formerly special-cased ids', () => {
    const scene = new THREE.Scene();
    const rig = addCastDaylight(scene, 'a01-shino');
    expect(rig.hemi.intensity).toBeCloseTo(CAST_HEMI_INTENSITY, 5);
    expect(rig.key.intensity).toBeCloseTo(CAST_KEY_INTENSITY, 5);
    expect(rig.fill.intensity).toBeCloseTo(CAST_FILL_INTENSITY, 5);
    expect(rig.ambient.intensity).toBeCloseTo(CAST_AMBIENT_INTENSITY, 5);
    expect(rig.face.visible).toBe(false);
    expect(rig.face.intensity).toBe(0);

    retuneCastDaylightRig(rig, 'a63-hinoame-satuki-mei-sirayuki');
    expect(rig.key.intensity).toBeCloseTo(CAST_KEY_INTENSITY, 5);
    expect(rig.fill.intensity).toBeCloseTo(CAST_FILL_INTENSITY, 5);
    expect(rig.ambient.intensity).toBeCloseTo(CAST_AMBIENT_INTENSITY, 5);
    expect(rig.face.visible).toBe(false);

    retuneCastDaylightRig(rig, 'a14-vivi');
    expect(rig.key.intensity).toBeCloseTo(CAST_KEY_INTENSITY, 5);
    expect(rig.face.visible).toBe(false);
  });

  it('parses roster ids from model paths', () => {
    expect(characterIdFromModelRef('/models/want/a01-shino.vrm')).toBe('a01-shino');
    expect(characterIdFromModelRef('https://cdn.example/a63-hinoame-satuki-mei-sirayuki.vrm?x=1')).toBe(
      'a63-hinoame-satuki-mei-sirayuki',
    );
  });
});

describe('cast material lighting passes (three-vrm MToon truth)', () => {
  it('dampens matcapFactor as a Color for every character id', () => {
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

    expect(dampenCastMatcap(root, 'a14-vivi')).toBe(1);
    expect(mat.matcapFactor.r).toBeCloseTo(1 * CAST_MATCAP_COLOR_SCALE, 5);
    expect(mat.matcapFactor.g).toBeCloseTo(0.8 * CAST_MATCAP_COLOR_SCALE, 5);
    expect(mat.matcapFactor.b).toBeCloseTo(0.6 * CAST_MATCAP_COLOR_SCALE, 5);
    expect(mat.rimLightingMixFactor).toBeCloseTo(0.9 * 0.55, 5);

    const root2 = new THREE.Group();
    const mesh2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ name: 'Hair' }),
    );
    const mat2 = mesh2.material as THREE.MeshBasicMaterial & {
      matcapFactor: THREE.Color;
      rimLightingMixFactor: number;
    };
    mat2.matcapFactor = new THREE.Color(1, 1, 1);
    mat2.rimLightingMixFactor = 0.5;
    root2.add(mesh2);
    expect(dampenCastMatcap(root2, 'a01-shino')).toBe(1);
    expect(mat2.matcapFactor.r).toBeCloseTo(CAST_MATCAP_COLOR_SCALE, 5);
  });

  it('wires unifyCastMToon + dampen on chat, preview, thumbs, and bake', () => {
    const root = join(__dirname, '..');
    const canvas = readFileSync(join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    const preview = readFileSync(join(root, 'components/ModelPreview.tsx'), 'utf8');
    const thumb = readFileSync(join(root, 'lib/modelThumb.ts'), 'utf8');
    const bake = readFileSync(join(root, 'app/thumb-bake/page.tsx'), 'utf8');
    for (const [label, src] of [
      ['CompanionCanvas', canvas],
      ['ModelPreview', preview],
      ['modelThumb', thumb],
      ['thumb-bake', bake],
    ] as const) {
      expect(src, label).toContain('unifyCastMToon');
      expect(src, label).toContain('dampenCastMatcap');
      expect(src, label).toContain('floorCastShadeColors');
      // Must not gate the shared shader path on a truthy character id.
      expect(src, label).not.toMatch(/if\s*\(\s*characterId\s*\)\s*dampenCastMatcap/);
    }
    // Chat material unify must run even when seedKey is missing.
    expect(canvas).toMatch(/unifyCastMToon\(a\.root,\s*seedKey\)/);
    expect(canvas).toMatch(/dampenCastMatcap\(a\.root,\s*seedKey\)/);
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
    delete mat.shadeColor;
    root.add(mesh);

    expect(floorCastShadeColors(root)).toBe(1);
    const lum = Math.max(mat.shadeColorFactor.r, mat.shadeColorFactor.g, mat.shadeColorFactor.b);
    expect(lum).toBeGreaterThanOrEqual(0.2 - 1e-6);
  });
});
