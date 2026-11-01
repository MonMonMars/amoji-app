import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  HIDDEN_CAST_IDS,
  MALE_CAST_IDS,
  MTOON_UNIFY_IDS,
  REF_OUTLINE_WIDTH_FACTOR,
  REF_SHADING_SHIFT,
  REF_SHADING_TOONY,
  addMissingEyeHighlight,
  fillEnclosedHoles,
  fillTransparentBlack,
  needsHeadLevel,
  needsMToonUnify,
  needsShoulderLift,
  paintSolidBlack,
  recolorRedToBrown,
  selectionBadge,
  selectionCast,
  selectPortraitPosition,
  unifyMToonParams,
} from '../lib/cast-adjust';
import { applyCastFix, captureCastFix, castCorrection, levelQuaternion } from '../lib/vrm/cast-pose';
import { CHARACTERS } from '../lib/prefs';

describe('selection cast', () => {
  it('hides damaged cards and keeps their numbers', () => {
    expect(HIDDEN_CAST_IDS).toEqual([
      'a64-lily-lily-animeit',
      'a82-renel-bonnie',
      'a95-mizu',
    ]);
    const shown = selectionCast(CHARACTERS);
    expect(shown.some((c) => c.id === 'a64-lily-lily-animeit')).toBe(false);
    expect(selectionBadge('a64-lily-lily-animeit')).toBe(14);
    expect(selectionBadge('a105-serizawa-aoi')).toBe(35);
    expect(shown).toHaveLength(CHARACTERS.length - 3);
  });

  it('moves character 34 forward without renumbering it', () => {
    const shown = selectionCast(CHARACTERS);
    expect(shown[3]?.id).toBe('a104-simplebrownsailorjk');
    expect(selectionBadge('a104-simplebrownsailorjk')).toBe(34);
    expect(shown[0]?.id).toBe('a01-shino');
  });

  it('lowers only character 32 on the select card', () => {
    expect(selectPortraitPosition('a99-miyora')).toBe('center 46%');
    expect(selectPortraitPosition('a01-shino')).toBeUndefined();
  });
});

describe('roster gender', () => {
  it('marks the reviewed males and leaves everyone else female', () => {
    expect(CHARACTERS.filter((c) => c.gender === 'male').map((c) => c.id).sort()).toEqual(
      [...MALE_CAST_IDS].sort(),
    );
  });
});

describe('MToon unify', () => {
  it('only targets characters 4, 5, and 6', () => {
    expect(MTOON_UNIFY_IDS).toEqual([
      'a04-avatarsample-a',
      'a05-avatarsample-c',
      'a10-agahomei-normal',
    ]);
    expect(needsMToonUnify('a01-shino')).toBe(false);
    expect(needsMToonUnify('a14-vivi')).toBe(false);
    expect(needsMToonUnify('a63-hinoame-satuki-mei-sirayuki')).toBe(false);
    expect(needsMToonUnify('a94-rita')).toBe(false);
  });

  it('softens a hard toon and thins a thick world outline without turning it off', () => {
    const hard = unifyMToonParams({
      outlineWidthMode: 'worldCoordinates',
      outlineWidthFactor: REF_OUTLINE_WIDTH_FACTOR,
      shadingToonyFactor: 1,
      shadingShiftFactor: 1,
    });
    expect(hard).toEqual({
      shadingToonyFactor: REF_SHADING_TOONY,
      shadingShiftFactor: REF_SHADING_SHIFT,
    });
    const thick = unifyMToonParams({
      outlineWidthMode: 'worldCoordinates',
      outlineWidthFactor: 0.00235,
      shadingToonyFactor: REF_SHADING_TOONY,
      shadingShiftFactor: REF_SHADING_SHIFT,
    });
    expect(thick).toEqual({ outlineWidthFactor: REF_OUTLINE_WIDTH_FACTOR });
    expect(unifyMToonParams({
      outlineWidthMode: 'none',
      outlineWidthFactor: 0,
      shadingToonyFactor: 0.2,
      shadingShiftFactor: -0.2,
    })).toBeNull();
  });
});

describe('head level', () => {
  it('removes roll and yaw and keeps pitch', () => {
    const rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.5, -0.4, 'YXZ'));
    const leveled = levelQuaternion(rest, 'head');
    const e = new THREE.Euler().setFromQuaternion(leveled, 'YXZ');
    expect(e.x).toBeCloseTo(0.2, 5);
    expect(e.y).toBeCloseTo(0, 5);
    expect(e.z).toBeCloseTo(0, 5);
    const correction = castCorrection(rest, 'head');
    const fixed = correction.clone().multiply(rest);
    const fe = new THREE.Euler().setFromQuaternion(fixed, 'YXZ');
    expect(fe.y).toBeCloseTo(0, 5);
    expect(fe.z).toBeCloseTo(0, 5);
  });

  it('levels a severe head tilt on the character 13 id', () => {
    expect(needsHeadLevel('a63-hinoame-satuki-mei-sirayuki')).toBe(true);
    const head = new THREE.Object3D();
    head.quaternion.setFromEuler(new THREE.Euler(0.1, 0.9, 0.7, 'YXZ'));
    const parent = new THREE.Object3D();
    parent.add(head);
    const state = captureCastFix('a63-hinoame-satuki-mei-sirayuki', (name) => (name === 'head' ? head : null));
    expect(state?.levels.length).toBe(1);
    applyCastFix(state!);
    const e = new THREE.Euler().setFromQuaternion(head.quaternion, 'YXZ');
    expect(Math.abs(e.y)).toBeLessThan(1e-4);
    expect(Math.abs(e.z)).toBeLessThan(1e-4);
    expect(needsShoulderLift('a01-shino')).toBe(false);
    expect(needsShoulderLift('a04-avatarsample-a')).toBe(true);
  });
});

describe('texture edits', () => {
  it('fills transparent pants holes with opaque black', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 0]);
    expect(fillTransparentBlack(data)).toBe(1);
    expect(Array.from(data)).toEqual([255, 0, 0, 255, 0, 0, 0, 255]);
  });

  it('fills an enclosed hole and leaves gutter pixels that touch the border', () => {
    const w = 3;
    const h = 3;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 20; data[i + 3] = 255;
    }
    const center = (1 * w + 1) * 4;
    data[center + 3] = 0;
    expect(fillEnclosedHoles(data, w, h)).toBe(1);
    expect(data[center]).toBe(0);
    expect(data[center + 3]).toBe(255);
    const gutter = new Uint8ClampedArray(w * h * 4);
    expect(fillEnclosedHoles(gutter, w, h)).toBe(0);
  });

  it('paints clothing texels solid black', () => {
    const data = new Uint8ClampedArray([200, 180, 20, 255, 0, 0, 0, 255]);
    expect(paintSolidBlack(data)).toBe(1);
    expect(Array.from(data)).toEqual([0, 0, 0, 255, 0, 0, 0, 255]);
  });

  it('turns red hair brown and leaves a blue pixel', () => {
    const data = new Uint8ClampedArray([180, 30, 30, 255, 20, 40, 160, 255]);
    expect(recolorRedToBrown(data)).toBe(1);
    expect(data[0]).toBeGreaterThan(data[2]!);
    expect(data[4]).toBe(20);
    expect(data[6]).toBe(160);
  });

  it('adds a white catchlight on the dim half of an eye atlas', () => {
    const w = 8;
    const h = 4;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 40; data[i + 1] = 20; data[i + 2] = 20; data[i + 3] = 255;
    }
    const hi = (1 * w + 1) * 4;
    data[hi] = 255; data[hi + 1] = 255; data[hi + 2] = 255;
    expect(addMissingEyeHighlight(data, w, h)).toBe(true);
    const mirrored = (1 * w + (w - 1 - 1)) * 4;
    expect(data[mirrored]).toBe(255);
    expect(data[mirrored + 1]).toBe(255);
  });
});
