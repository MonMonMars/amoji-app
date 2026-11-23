import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, type VRM } from '@pixiv/three-vrm';
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
  type VRMAnimation,
} from '@pixiv/three-vrm-animation';
import { clipFreesFeet } from '../lib/vrm/plant-feet';
import {
  MIN_REST_HIPS_Y,
  humanoidRestHipsY,
  saneRestHipsY,
  sanitizeClipHipsScale,
} from '../lib/vrm/vrma-hips-scale';

// Recorded 2026-11-23 against seed-san.vrm (VRM 1.0, humanoid hips Y
// 0.79557997). These 15 shipped .vrma files have a rest hips position whose Y
// is genuinely NEGATIVE (not merely near zero: no file is exactly 0 and no
// file is a small positive). The clip factory divides by it, so their
// hips-translation scale is negative: X/Z mirrored, Y inverted.
//
// restHipsPosition.y as parsed (15 dp):
//   Dance                    -0.272008627653122   scale -2.924833587
//   lib_C61                  -0.272008627653122   scale -2.924833587
//   lib_C62                  -0.272008627653122   scale -2.924833587
//   lib_C110                 -0.272008627653122   scale -2.924833587
//   lib_C127                 -0.272008627653122   scale -2.924833587
//   lib_C125                 -0.223816052079201   scale -3.554615331
//   lib_C126                 -0.223816052079201   scale -3.554615331
//   Sing                     -0.226163566112518   scale -3.517719426
//   IdleMixamoBreathing      -0.001923745415442   scale -413.557825071
//   IdleMixamoStanding       -0.001684514248083   scale -472.290436786
//   IdleMixamoIdle           -0.000830788420418   scale -957.620436741
//   IdleMixamoHappy          -0.000516790832603   scale -1539.462234638
//   lib_C116                 -3.948274718598840   scale -0.201500662
//   lib_C117                 -3.948274718598840   scale -0.201500662
//   lib_C128                 -3.948274718598840   scale -0.201500662
//
// Only the first seven reach the mixer with that scale (clipFreesFeet frees
// their hips/legs). The other eight are pinned by pinPlantedClipTracks to the
// rig rest pose before playback, so the scale is discarded and they are
// visually benign: Sing, the four IdleMixamo idles, and the three Rokoko
// DJ/HypeMan idles (whose hips translation is a constant anyway).
const NEGATIVE_REST_HIPS: Record<string, number> = {
  'Dance.vrma': -0.272008627653122,
  'lib_C61.vrma': -0.272008627653122,
  'lib_C62.vrma': -0.272008627653122,
  'lib_C110.vrma': -0.272008627653122,
  'lib_C127.vrma': -0.272008627653122,
  'lib_C125.vrma': -0.223816052079201,
  'lib_C126.vrma': -0.223816052079201,
  'Sing.vrma': -0.226163566112518,
  'IdleMixamoBreathing.vrma': -0.001923745415442,
  'IdleMixamoStanding.vrma': -0.001684514248083,
  'IdleMixamoIdle.vrma': -0.000830788420418,
  'IdleMixamoHappy.vrma': -0.000516790832603,
  'lib_C116.vrma': -3.948274718598840,
  'lib_C117.vrma': -3.948274718598840,
  'lib_C128.vrma': -3.948274718598840,
};

/** The seven whose negative scale actually reaches the mixer. */
const LIVE_BROKEN = [
  'Dance', 'lib_C61', 'lib_C62', 'lib_C110', 'lib_C125', 'lib_C126', 'lib_C127',
];

const animPath = (file: string) =>
  fileURLToPath(new URL(`../public/models/anims/${file}`, import.meta.url));

// three's FileLoader reports progress through ProgressEvent; the Node test
// environment has none. Browsers always do, so this is test-only.
if (!('ProgressEvent' in globalThis)) {
  (globalThis as unknown as Record<string, unknown>).ProgressEvent = class {
    type: string;
    lengthComputable = false;
    loaded = 0;
    total = 0;
    constructor(type: string, init: Record<string, unknown> = {}) {
      this.type = type;
      Object.assign(this, init);
    }
  };
}

async function silently<T>(fn: () => T | Promise<T>): Promise<T> {
  const error = console.error;
  const warn = console.warn;
  console.error = () => {};
  console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.error = error;
    console.warn = warn;
  }
}

async function parseAnim(file: string): Promise<VRMAnimation> {
  const buf = readFileSync(animPath(file));
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  const gltf = await silently(() =>
    loader.parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), ''),
  );
  const anims = (gltf.userData as { vrmAnimations?: VRMAnimation[] }).vrmAnimations;
  expect(anims?.length).toBeGreaterThan(0);
  return anims![0]!;
}

function hipsTrackValues(clip: { tracks: { name: string; values: ArrayLike<number> }[] }) {
  const track = clip.tracks.find((t) => t.name.endsWith('.position'));
  expect(track).toBeTruthy();
  return track!.values;
}

function yValues(values: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i += 3) out.push(values[i]!);
  return out;
}

/** Least-squares slope of ys against xs. */
function slope(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  return num / den;
}

const span = (ys: number[]) => Math.max(...ys) - Math.min(...ys);

let vrm: VRM;
let humanoidY: number;

beforeAll(async () => {
  const buf = readFileSync(fileURLToPath(new URL('../public/models/seed-san.vrm', import.meta.url)));
  (globalThis as { self?: unknown }).self ??= globalThis;
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  // Node has no image decoder; the skeleton is what these assertions need.
  const gltf = await silently(() =>
    loader.parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), ''),
  );
  vrm = (gltf.userData as { vrm: VRM }).vrm;
  vrm.scene.updateMatrixWorld(true);
  humanoidY = humanoidRestHipsY(vrm.humanoid);
  expect(humanoidY).toBeGreaterThan(0.1);
});

describe('VRMA rest hips scale', () => {
  it('records the 15 negative rest hips Y values and repairs their scale', async () => {
    for (const [file, expected] of Object.entries(NEGATIVE_REST_HIPS)) {
      const anim = await parseAnim(file);
      // Genuinely negative — not "approximately zero": no small positive,
      // no exact zero.
      expect(anim.restHipsPosition.y).toBeLessThan(0);
      expect(anim.restHipsPosition.y).toBeCloseTo(expected, 9);

      const rawScale = humanoidY / anim.restHipsPosition.y;
      expect(rawScale).toBeLessThan(0); // the bug: mirrored / inverted hips

      expect(sanitizeClipHipsScale(anim, humanoidY)).toBe(true);
      expect(humanoidY / anim.restHipsPosition.y).toBeCloseTo(1, 9);
    }
  }, 30_000);

  it('classifies 7 of the 15 as reaching the mixer and 8 as pinned', () => {
    // plant-feet.ts clipFreesFeet: dance clips keep authored hip+leg keys,
    // everything else is pinned to the rig rest pose after clip creation.
    const freed = Object.keys(NEGATIVE_REST_HIPS)
      .map((f) => f.replace(/\.vrma$/, ''))
      .filter((id) => clipFreesFeet(id));
    expect(freed.sort()).toEqual([...LIVE_BROKEN].sort());
  });

  it('never changes a healthy clip: byte-identical output', async () => {
    // IdleBreathCalm restY 0.90568335 -> scale 0.878430602 (control).
    expect(saneRestHipsY(0.905683350000000, humanoidY)).toBe(0.905683350000000);

    const a = await parseAnim('IdleBreathCalm.vrma');
    const b = await parseAnim('IdleBreathCalm.vrma');
    expect(a.restHipsPosition.y).toBeGreaterThan(MIN_REST_HIPS_Y);
    expect(sanitizeClipHipsScale(b, humanoidY)).toBe(false);

    const clipA = await silently(() => createVRMAnimationClip(a, vrm));
    const clipB = await silently(() => createVRMAnimationClip(b, vrm));
    expect(clipB.tracks.length).toBe(clipA.tracks.length);
    for (let i = 0; i < clipA.tracks.length; i++) {
      expect(clipB.tracks[i]!.name).toBe(clipA.tracks[i]!.name);
      expect(Array.from(clipB.tracks[i]!.values)).toEqual(Array.from(clipA.tracks[i]!.values));
    }
  });

  it('plays Dance hips travel right-side up (was scale -2.9248)', async () => {
    const before = await parseAnim('Dance.vrma');
    const rawY = yValues(before.humanoidTracks.translation.get('hips')!.values);

    const brokenY = yValues(
      hipsTrackValues(await silently(() => createVRMAnimationClip(before, vrm))),
    );
    // raw * humanoidY / restY with a negative restY: authored ups play as downs.
    expect(slope(rawY, brokenY)).toBeCloseTo(-2.9248, 3);

    const after = await parseAnim('Dance.vrma');
    expect(sanitizeClipHipsScale(after, humanoidY)).toBe(true);
    const fixedY = yValues(
      hipsTrackValues(await silently(() => createVRMAnimationClip(after, vrm))),
    );
    expect(slope(rawY, fixedY)).toBeCloseTo(1, 6);
    // Authored vertical travel is preserved (9.07 cm peak-to-peak), where the
    // broken scale gave 26.55 cm of inverted bob.
    expect(span(fixedY)).toBeCloseTo(span(rawY), 6);
    expect(span(fixedY)).toBeCloseTo(0.0907, 3);
  });

  it('keeps a healthy dance clip untouched (lib_C112 control)', async () => {
    const anim = await parseAnim('lib_C112.vrma');
    // restY 0.939969429238097 -> scale 0.846389197, positive.
    expect(anim.restHipsPosition.y).toBeCloseTo(0.939969429238097, 9);
    expect(sanitizeClipHipsScale(anim, humanoidY)).toBe(false);
    expect(humanoidY / anim.restHipsPosition.y).toBeCloseTo(0.846389197, 8);
  });
});
