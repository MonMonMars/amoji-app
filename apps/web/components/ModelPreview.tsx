'use client';
// Live 3D portrait for the selection board preview row (r2026-10-03.33).
// Renders the picked character REAL VRM inside the top-row preview chip, so
// the face chosen on the board is the face that shows up in the chat room.
// The painted portrait stays as the poster underneath until the model
// streams in; any load failure keeps the poster — nothing breaks.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';

export default function ModelPreview({
  url,
  tint,
  height,
  width,
  onReady,
}: {
  url?: string;
  tint: string;
  height: number;
  width: number;
  onReady?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !url) return;
    let disposed = false;
    let cleanupRaf: (() => void) | null = null;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // no WebGL here — the poster portrait stays visible
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#334155', 1.4));
    const dir = new THREE.DirectionalLight('#ffffff', 1.6);
    dir.position.set(0.6, 1.4, 1.2);
    scene.add(dir);

    const camera = new THREE.PerspectiveCamera(30, host.clientWidth / host.clientHeight, 0.01, 20);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(url, (gltf) => {
      if (disposed) { renderer.dispose(); return; }
      const vrm = (gltf as unknown as { userData: { vrm: VRM } }).userData.vrm;
      // same identity treatment as the chat room: gentle palette tint + build
      const tintCol = new THREE.Color(tint);
      vrm.scene.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          const mat = m as THREE.MeshStandardMaterial;
          if (mat.color) mat.color.multiply(tintCol);
        }
      });
      vrm.scene.scale.set(width, height, width);
      scene.add(vrm.scene);

      // frame the face: camera level with the head, close-up distance from
      // the model bounding box so every cast member fills the chip the same way
      const box = new THREE.Box3().setFromObject(vrm.scene);
      const size = box.getSize(new THREE.Vector3());
      const headY = box.min.y + size.y * 0.62;
      const d = Math.max(size.y * 1.05, 0.6);
      camera.position.set(0, headY + size.y * 0.03, d);
      camera.lookAt(0, headY, 0);
      onReadyRef.current?.();

      let raf = 0;
      const t0 = performance.now();
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        const s = (now - t0) / 1000;
        // gentle living sway so the preview feels alive, not a statue
        vrm.scene.rotation.y = Math.sin(s * 0.7) * 0.09;
        vrm.scene.position.y = Math.sin(s * 1.4) * 0.006;
        vrm.update(1 / 60);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
      cleanupRaf = () => cancelAnimationFrame(raf);
    }, undefined, () => {
      // load failed (dead link, old VRM, no CORS) — the poster portrait stays
    });

    return () => {
      disposed = true;
      cleanupRaf?.();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [url, tint, height, width]);

  return <div ref={hostRef} className="absolute inset-0" aria-hidden />;
}
