import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WardrobeSwap from '../components/WardrobeSwap';
import * as THREE from 'three';
import {
  DEMO_BODIES,
  DEMO_HEADS,
  WARDROBE_ENABLED,
  activeWardrobe,
  modularGlbRel,
  vrmCandidatesForOutfit,
  wardrobePair,
} from '../lib/modular/catalog';
import {
  AMOJI_PART,
  HEAD_SCALE,
  assembleModular,
  replaceBodyMeshes,
} from '../lib/modular/assemble';
import { createGenericAvatar } from '../lib/vrm/avatar';
import { loadModularSelection, saveModularSelection } from '../lib/modular/storage';
import { safePortrait } from '../lib/frontImage';
import { characterById } from '../lib/prefs';

const here = path.dirname(fileURLToPath(import.meta.url));
const MODULAR = path.resolve(here, '../public/models/modular');

function bone(name: string, y: number): THREE.Bone {
  const b = new THREE.Bone();
  b.name = name;
  b.position.set(0, y, 0);
  return b;
}

function chain(neckY: number) {
  const hips = bone('J_Bip_C_Hips', 0.9);
  const spine = bone('J_Bip_C_Spine', 0.2);
  const chest = bone('J_Bip_C_Chest', 0.15);
  const neck = bone('J_Bip_C_Neck', neckY);
  const head = bone('J_Bip_C_Head', 0.08);
  hips.add(spine);
  spine.add(chest);
  chest.add(neck);
  neck.add(head);
  return { hips, spine, chest, neck, head };
}

function skinned(name: string, bones: THREE.Bone[], size: [number, number, number]): THREE.SkinnedMesh {
  const mesh = new THREE.SkinnedMesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshStandardMaterial(),
  );
  mesh.name = name;
  mesh.scale.set(1, 1, 1);
  mesh.position.set(0, 0, 0);
  const skeleton = new THREE.Skeleton(bones);
  mesh.bind(skeleton);
  return mesh;
}

/** Body GLB: armature + one outfit mesh. Neck height differs per id on purpose. */
function makeBody(neckY: number, meshName = 'Outfit') {
  const scene = new THREE.Group();
  const c = chain(neckY);
  scene.add(c.hips);
  scene.updateMatrixWorld(true);
  const mesh = skinned(meshName, [c.hips, c.spine, c.chest, c.neck, c.head], [0.4, 1.1, 0.25]);
  scene.add(mesh);
  return { scene, mesh, headBone: c.head };
}

/** Head GLB: same joint names, plus a hair bone the body rig does not have. */
function makeHead(neckY: number) {
  const scene = new THREE.Group();
  const c = chain(neckY);
  const hair = bone('J_Sec_Hair_01', 0.22);
  c.head.add(hair);
  scene.add(c.hips);
  scene.updateMatrixWorld(true);
  const mesh = skinned('Face', [c.hips, c.spine, c.chest, c.neck, c.head, hair], [0.22, 0.3, 0.2]);
  scene.add(mesh);
  return { scene, mesh };
}

describe('modular wardrobe catalog', () => {
  it('demo heads are A02, A10, A119 and bodies are A119, A120, A106, A02, A10', () => {
    expect(DEMO_HEADS.map((h) => h.id)).toEqual(['A02', 'A10', 'A119']);
    expect(DEMO_BODIES.map((b) => b.id)).toEqual(['A119', 'A120', 'A106', 'A02', 'A10']);
    expect(DEMO_HEADS.map((h) => h.characterId)).toEqual([
      'a02-shibu',
      'a10-agahomei-normal',
      'a119-kanami-uniform',
    ]);
  });

  it('points at existing split GLBs and does not invent a rescale', () => {
    expect(modularGlbRel('A120', 'body')).toBe('modular/A120/A120_body.glb');
    expect(modularGlbRel('A02', 'head')).toBe('modular/A02/A02_head.glb');
    expect(HEAD_SCALE).toBe(1);
    const src = fs.readFileSync(path.resolve(here, '../lib/modular/assemble.ts'), 'utf8');
    expect(src).toContain('export const HEAD_SCALE = 1');
    expect(src).not.toMatch(/neckZ|headH|neck_z/);
    expect(fs.existsSync(path.resolve(here, '../../../scripts/split_head_body.py'))).toBe(false);
  });

  it('documents the drop path from Mon’s modular library and ships no GLB binaries', () => {
    const readme = fs.readFileSync(path.join(MODULAR, 'README.md'), 'utf8');
    expect(readme).toContain('D:\\Blender\\projects\\mon-character\\free-library\\modular\\');
    expect(readme).toContain('Do not rescale the head');
    expect(readme).toContain('Do not re-split');
    for (const id of ['A02', 'A10', 'A119', 'A120', 'A106']) {
      expect(readme).toContain(`${id}/${id}_head.glb`);
      expect(readme).toContain(`${id}/${id}_body.glb`);
      expect(fs.existsSync(path.join(MODULAR, id))).toBe(true);
    }
    const entries = fs.readdirSync(MODULAR, { recursive: true }).map(String);
    expect(entries.filter((f) => f.endsWith('.glb'))).toEqual([]);
  });

  it('keeps wardrobe pairs in the catalog but does not apply them while cloth swap is off', () => {
    expect(WARDROBE_ENABLED).toBe(false);
    expect(activeWardrobe('a01-shino', null)).toBeNull();
    expect(activeWardrobe('a02-shibu', null)).toBeNull();
    expect(activeWardrobe('a10-agahomei-normal', { headId: 'A02', bodyId: 'A120' })).toBeNull();
    expect(activeWardrobe('a98-ethan', { headId: 'A02', bodyId: 'A10' })).toBeNull();
    expect(wardrobePair('a01-shino', null)).toBeNull();
    expect(wardrobePair('a02-shibu', null)).toEqual({ headId: 'A02', bodyId: 'A02' });
    expect(wardrobePair('a10-agahomei-normal', { headId: 'A02', bodyId: 'A120' })).toEqual({
      headId: 'A10',
      bodyId: 'A120',
    });
    expect(wardrobePair('a98-ethan', { headId: 'A02', bodyId: 'A10' })).toBeNull();
  });

  it('puts the outfit VRM ahead of the head when split GLBs are unavailable', () => {
    const modelFor = (id: string) => characterById(id).model;
    expect(vrmCandidatesForOutfit('A120', 'want/a02-shibu.vrm', modelFor)).toEqual([
      'want/a120-morikawa-yuki-summer-uniform.vrm',
      'want/a02-shibu.vrm',
      'seed-san.vrm',
    ]);
    expect(vrmCandidatesForOutfit('A02', 'want/a02-shibu.vrm', modelFor)).toEqual([
      'want/a02-shibu.vrm',
      'seed-san.vrm',
    ]);
    expect(vrmCandidatesForOutfit(undefined, 'want/a98-ethan.vrm', modelFor)).toEqual([
      'want/a98-ethan.vrm',
      'seed-san.vrm',
    ]);
    const canvas = fs.readFileSync(path.resolve(here, '../components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toContain('vrmCandidatesForOutfit');
    expect(canvas).toContain('beginLoad(candidatesFor');
  });

  it('shows the front release portrait and scrolls option rows sideways', () => {
    const ui = fs.readFileSync(path.resolve(here, '../components/WardrobeSwap.tsx'), 'utf8');
    const board = fs.readFileSync(path.resolve(here, '../components/SelectionBoard.tsx'), 'utf8');
    const row = fs.readFileSync(path.resolve(here, '../components/HScrollRow.tsx'), 'utf8');
    expect(board).toContain('image={c.image}');
    expect(board).not.toContain('CompanionCanvas');
    expect(board).not.toContain('ModelPreview');
    expect(board).toContain('backgroundLetter');
    expect(board).not.toContain('dicebear');
    expect(board).not.toContain('cast-cutout');
    expect(ui).toContain('characterById');
    expect(ui).not.toContain('flex-wrap');
    expect(row).toContain('flex-nowrap');
    expect(row).toContain('overflow-x-auto');
    expect(safePortrait('https://github.com/MonMonMars/amoji-app/releases/download/free-library-want-2026-10-12/a02-shibu.png'))
      .toContain('a02-shibu.png');
    expect(ui).toContain('WARDROBE_ENABLED');
    const hidden = renderToStaticMarkup(createElement(WardrobeSwap, {
      lang: 'en',
      characterId: 'a02-shibu',
      onCharacter: () => {},
    }));
    expect(hidden).toBe('');
    expect(ui).toContain('data-testid="wardrobe-hero"');
    expect(ui).toContain('useState(false)');
    expect(ui).toContain('fixed inset-0');
    expect(board).toContain('data-testid="selection-hero"');
    expect(board).not.toContain('comingSoon');
    expect(board).not.toContain("t(lang, 'back')");
    const chat = fs.readFileSync(path.resolve(here, '../app/chat/page.tsx'), 'utf8');
    expect(chat).toContain('CompanionCanvas');
    expect(chat).toContain('h-10 w-10');
    expect(chat).toContain('pointer-events-none absolute inset-x-0 bottom-0');
  });
});

describe('modular assembly', () => {
  it('binds the head onto the body rig without scaling it when neck heights differ', () => {
    // A10 neck_z 1.3005 vs A106 neck_z 1.3202 — a fit scale would be ~0.985.
    const body = makeBody(0.2, 'A106Outfit');
    const head = makeHead(0.05);
    const asm = assembleModular(body, head);
    const face = asm.scene.getObjectByName('Face') as THREE.SkinnedMesh;
    expect(face).toBeTruthy();
    expect(face.userData[AMOJI_PART]).toBe('head');
    expect(face.scale.toArray()).toEqual([1, 1, 1]);
    asm.scene.updateMatrixWorld(true);
    const world = face.getWorldScale(new THREE.Vector3());
    expect(world.toArray()).toEqual([1, 1, 1]);
    const wrongFit = 1.3005 / 1.3202;
    expect(face.scale.y).not.toBeCloseTo(wrongFit, 2);
    expect(head.mesh.scale.toArray()).toEqual([1, 1, 1]);

    const liveHead = asm.bonesByName.get('J_Bip_C_Head');
    expect(liveHead).toBe(body.headBone);
    expect(liveHead?.scale.toArray()).toEqual([1, 1, 1]);
    const hair = liveHead?.children.find((c) => c.name === 'J_Sec_Hair_01');
    expect(hair).toBeTruthy();
    expect(asm.scene.getObjectByName('A106Outfit')).toBeTruthy();
  });

  it('swaps outfit meshes and leaves the same head mesh at scale 1', () => {
    const body = makeBody(0.2, 'A02Outfit');
    const head = makeHead(0.11);
    const asm = assembleModular(body, head);
    const face = asm.scene.getObjectByName('Face') as THREE.SkinnedMesh;
    const next = makeBody(0.18, 'A120Outfit');
    replaceBodyMeshes(asm, next);
    expect(asm.scene.getObjectByName('Face')).toBe(face);
    expect(face.scale.toArray()).toEqual([1, 1, 1]);
    expect(asm.scene.getObjectByName('A02Outfit')).toBeUndefined();
    const outfit = asm.scene.getObjectByName('A120Outfit') as THREE.Mesh;
    expect(outfit).toBeTruthy();
    expect(outfit.userData[AMOJI_PART]).toBe('body');
    expect(face.userData[AMOJI_PART]).toBe('head');
  });

  it('drives a modular rig from VRoid joint names with the head unscaled', () => {
    const body = makeBody(0.16, 'Body');
    const head = makeHead(0.09);
    const asm = assembleModular(body, head);
    const gltf = {
      scene: asm.scene,
      parser: { json: { nodes: [], extensions: {} } },
      animations: [],
      cameras: [],
      scenes: [asm.scene],
      asset: { version: '2.0' },
      userData: {},
    };
    const avatar = createGenericAvatar(gltf as never);
    expect(avatar.kind).toBe('generic');
    expect(avatar.getBoneNode('head')?.name).toBe('J_Bip_C_Head');
    expect(avatar.getBoneNode('hips')?.name).toBe('J_Bip_C_Hips');
    const face = asm.scene.getObjectByName('Face') as THREE.Object3D;
    expect(face.scale.toArray()).toEqual([1, 1, 1]);
  });
});

describe('modular localStorage', () => {
  it('persists a valid head and body and drops unknown ids', () => {
    const g = globalThis as { localStorage?: Storage };
    const prev = g.localStorage;
    const map = new Map<string, string>();
    g.localStorage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { map.set(k, v); },
      removeItem: (k: string) => { map.delete(k); },
      clear: () => map.clear(),
      key: () => null,
      length: 0,
    } as Storage;
    map.set('amoji.modular.v1', JSON.stringify({ headId: 'A10', bodyId: 'A120' }));
    saveModularSelection({ headId: 'A02', bodyId: 'A02' });
    expect(map.get('amoji.modular.v1')).toContain('A120');
    expect(loadModularSelection()).toBeNull();
    expect(map.has('amoji.modular.v1')).toBe(false);
    g.localStorage = prev;
  });
});
