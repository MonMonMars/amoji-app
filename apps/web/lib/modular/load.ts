'use client';
// Fetch an existing modular GLB. Missing files reject so the viewer can
// keep the single-VRM path. Nothing here writes or re-splits assets.

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function loadModularGltf(url: string, asVrm: boolean): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    if (asVrm) loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(url, resolve, undefined, (err) => reject(err instanceof Error ? err : new Error(String(err))));
  });
}
