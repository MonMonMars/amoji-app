'use client';
// Runtime-rendered model thumbnails (r2026-10-05.104): each model loads once,
// renders ONE frame offscreen, and the resulting JPEG dataURL is cached in
// memory + sessionStorage (keyed by revision + URL), so scrolling the
// selection board never re-streams a model. Requests are lazy (Intersection-
// Observer in ModelThumb) and serialized through one queue — at most one
// model is in flight at a time — and every load fully disposes its scene,
// textures and geometries. Load failures return null and are NOT cached, so
// a later scroll can retry.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { APP_REVISION } from './revision';

interface ThumbEnv {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  loader: GLTFLoader;
}

let env: ThumbEnv | null | undefined; // undefined = unbuilt, null = unavailable

// djb2 over the URL, namespaced by app revision so a deploy invalidates
// every stored thumbnail automatically.
function cacheKey(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h + url.charCodeAt(i)) >>> 0;
  return `amoji.thumb.${APP_REVISION}.${h.toString(36)}`;
}

const memoryCache = new Map<string, string>();

function readStorage(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function writeStorage(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* quota — memory cache still covers */ }
}

function getEnv(): ThumbEnv | null {
  if (env !== undefined) return env;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#334155', 1.4));
    const dir = new THREE.DirectionalLight('#ffffff', 1.6);
    dir.position.set(0.6, 1.4, 1.2);
    scene.add(dir);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    env = { renderer, scene, camera, loader };
  } catch {
    env = null;
  }
  return env;
}

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e: unknown) => { clearTimeout(t); reject(e instanceof Error ? e : new Error(String(e))); },
    );
  });
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.normalMap?.dispose();
      mat.roughnessMap?.dispose();
      mat.metalnessMap?.dispose();
      mat.emissiveMap?.dispose();
      mat.dispose();
    }
  });
}

interface LoadResult {
  root: THREE.Object3D;
  vrm?: VRM;
}

function loadModel(loader: GLTFLoader, url: string): Promise<LoadResult> {
  return new Promise<LoadResult>((resolve, reject) => {
    loader.load(
      url,
      (data) => {
        const vrm = (data as unknown as { userData: { vrm?: VRM } }).userData.vrm;
        resolve({ root: vrm?.scene ?? data.scene, vrm });
      },
      undefined,
      (err) => { reject(err instanceof Error ? err : new Error(String(err))); },
    );
  });
}

const inflight = new Map<string, Promise<string | null>>();
let queue: Promise<void> = Promise.resolve();

/** Render (or fetch from cache) a one-frame JPEG thumbnail of a VRM model. */
export function requestModelThumb(url: string): Promise<string | null> {
  const key = cacheKey(url);
  const cached = memoryCache.get(key) ?? readStorage(key);
  if (cached) {
    memoryCache.set(key, cached);
    return Promise.resolve(cached);
  }
  const running = inflight.get(key);
  if (running) return running;

  const task = async (): Promise<string | null> => {
    const e = getEnv();
    if (!e) return null;
    const { renderer, scene, camera, loader } = e;
    let root: THREE.Object3D | null = null;
    let vrm: VRM | undefined;
    try {
      const loaded = await withTimeout(loadModel(loader, url), 30_000, 'thumbnail load timed out');
      root = loaded.root;
      vrm = loaded.vrm;
      scene.add(root);
      // frame the face exactly like ModelPreview does — head height from the
      // bounding box so every cast member fills the chip the same way
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const headY = box.min.y + size.y * 0.62;
      const d = Math.max(size.y * 1.05, 0.6);
      camera.position.set(0, headY + size.y * 0.03, d);
      camera.lookAt(0, headY, 0);
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.85);
      memoryCache.set(key, dataUrl);
      writeStorage(key, dataUrl);
      return dataUrl;
    } catch {
      return null; // failures are not cached — a later scroll can retry
    } finally {
      if (root) scene.remove(root);
      (vrm as unknown as { dispose?: () => void } | undefined)?.dispose?.();
      if (root) disposeObject(root);
    }
  };

  const job = queue.then(task);
  queue = job.then(() => undefined, () => undefined);
  inflight.set(key, job);
  void job.finally(() => { inflight.delete(key); });
  return job;
}
