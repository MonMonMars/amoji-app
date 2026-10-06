'use client';
// r114 THUMB BAKE STUDIO — dev tool, localhost only.
// Renders every cast member ONE at a time through the real avatar pipeline
// (upright + facing calibration, IdleNeutral mid-frame pose from the motion
// library, relaxed calibrated fingers, a gentle smile, neutral daylight) and
// posts a 512px JPEG to the local save server (port 3999), which writes
// public/cast-thumbs/<id>.jpg. Selection tiles then show her ACTUAL face —
// posed, lit, smiling — instead of a raw T-pose render.
// On the deployed site this page renders a "dev only" notice and does nothing.
// r123 CUTOUT BAKE — alongside each 512px JPEG thumb the studio now renders a
// FULL-BODY, ALPHA-TRANSPARENT PNG cutout of the same posed frame and posts it
// to the save server (?kind=cutout → public/cast-cutout/<id>.png). The
// selection board composites that cutout over whatever scene is picked, so the
// row-0 preview shows her REAL posed body standing IN the scene — no live 3D
// stream needed on the selection page at all.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import { CHARACTERS } from '../../lib/prefs';
import { modelUrl } from '../../lib/asset';
import { createV1Avatar, createGenericAvatar } from '../../lib/vrm/avatar';
import type { Avatar } from '../../lib/vrm/avatar';

declare global {
  interface Window {
    __bakeProgress?: string;
    __bakeDone?: { ok: string[]; fail: string[]; cutouts: string[] };
  }
}

const SAVE_URL = 'http://localhost:3999/save';
const IDLE_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/models/anims/IdleNeutral.vrma`;
const BG = new THREE.Color('#262636');

// Bake-only hips rebase (same math as CompanionCanvas r94/r113, trimmed):
// land the idle's first-frame hips rotation on our calibrated rest and pin
// its height — a foreign-rig idle otherwise turns the model or sinks it.
function rebaseClipHips(clip: THREE.AnimationClip, vrm: VRM): void {
  const hips = vrm.humanoid?.getNormalizedBoneNode('hips');
  if (!hips) return;
  const restQ = hips.quaternion.clone();
  const restP = hips.position.clone();
  for (const track of clip.tracks) {
    const suffix = track.name.endsWith('.quaternion')
      ? '.quaternion'
      : track.name.endsWith('.position')
        ? '.position'
        : null;
    if (!suffix) continue;
    const path = track.name.slice(0, -suffix.length);
    const bone = path.includes('[') && path.endsWith(']')
      ? path.slice(path.lastIndexOf('[') + 1, -1)
      : path.slice(path.lastIndexOf('.') + 1);
    if (bone !== hips.name) continue;
    const v = track.values;
    if (suffix === '.quaternion') {
      const q0 = new THREE.Quaternion(v[0]!, v[1]!, v[2]!, v[3]!);
      const fix = restQ.clone().multiply(q0.invert());
      const q = new THREE.Quaternion();
      for (let i = 0; i + 3 < v.length; i += 4) {
        q.set(v[i]!, v[i + 1]!, v[i + 2]!, v[i + 3]!).premultiply(fix);
        v[i] = q.x; v[i + 1] = q.y; v[i + 2] = q.z; v[i + 3] = q.w;
      }
    } else {
      const p0x = v[0]!, p0z = v[2]!;
      for (let i = 0; i + 2 < v.length; i += 3) {
        let dx = v[i]! - p0x;
        let dz = v[i + 2]! - p0z;
        const h = Math.hypot(dx, dz);
        if (h > 0.25) { const s = 0.25 / h; dx *= s; dz *= s; }
        v[i] = dx + restP.x;
        v[i + 1] = restP.y;
        v[i + 2] = dz + restP.z;
      }
    }
  }
}

function disposeRoot(root: THREE.Object3D | null): void {
  if (!root) return;
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

// texture settle wait that ALSO works in a hidden tab: rAF never fires when
// the tab is in the background, so race it against a plain timer.
const settle = () =>
  new Promise<void>((r) => {
    const t = setTimeout(r, 350);
    requestAnimationFrame(() => { clearTimeout(t); requestAnimationFrame(() => r()); });
  });

// r123: crop the transparent margins off a rendered cutout frame and return a
// PNG dataURL of just the character (small pad so hair/foot shadows stay).
function cropAlphaPng(src: HTMLCanvasElement, pad = 8): string {
  const w = src.width; const h = src.height;
  const c2 = document.createElement('canvas');
  c2.width = w; c2.height = h;
  const ctx = c2.getContext('2d');
  if (!ctx) return src.toDataURL('image/png');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h).data;
  let minX = w; let minY = h; let maxX = -1; let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (img[(y * w + x) * 4 + 3]! > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return src.toDataURL('image/png'); // nothing drawn — keep as-is
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext('2d')?.drawImage(c2, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

export default function ThumbBakePage() {
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState<{ ok: string[]; fail: string[] } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const ranRef = useRef(false);
  const isLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  useEffect(() => {
    if (!isLocal || ranRef.current) return;
    ranRef.current = true;

    const bakeAll = async () => {
      const ok: string[] = [];
      const fail: string[] = [];
      const cutouts: string[] = [];
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      canvas.style.cssText = 'width:280px;height:280px;border:1px solid #444;border-radius:8px';
      hostRef.current?.appendChild(canvas);

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(512, 512, false);
      const scene = new THREE.Scene();
      scene.background = BG;
      scene.add(new THREE.HemisphereLight('#ffffff', '#334155', 1.15));
      const key = new THREE.DirectionalLight('#ffffff', 1.7);
      key.position.set(0.6, 1.4, 1.2);
      scene.add(key);
      const fill = new THREE.DirectionalLight('#dfe8ff', 0.5);
      fill.position.set(-0.8, 0.6, -0.6);
      scene.add(fill);
      const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);

      const vrmLoader = new GLTFLoader();
      vrmLoader.register((parser) => new VRMLoaderPlugin(parser));
      const animLoader = new GLTFLoader();
      animLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));

      // the shared idle performance (loaded once, cloned per rig via the clip factory)
      let idleAnim: VRMAnimation | null = null;
      try {
        const g = await animLoader.loadAsync(IDLE_URL);
        idleAnim = (g as unknown as { userData: { vrmAnimations: VRMAnimation[] } }).userData.vrmAnimations?.[0] ?? null;
      } catch { /* no idle on the mirror — procedural fallback below */ }

      for (const c of CHARACTERS) {
        const label = `#${c.id} ${c.name}`;
        const prog = (s: string) => {
          window.__bakeProgress = `${ok.length + fail.length + 1}/${CHARACTERS.length} ${label}: ${s}`;
          setLog((l) => [...l.slice(-60), `${label} — ${s}`]);
        };
        let root: THREE.Object3D | null = null;
        let vrm: VRM | undefined;
        try {
          prog('loading…');
          const url = modelUrl(c.model);
          if (!url) throw new Error('no model url');
          // per-model watchdog — a hung remote URL must never stall the bake
          const gltf = await Promise.race([
            vrmLoader.loadAsync(url),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('load timed out')), 45_000),
            ),
          ]);
          vrm = (gltf as unknown as { userData: { vrm?: VRM } }).userData.vrm;
          let avatar: Avatar;
          if (vrm) {
            avatar = createV1Avatar(vrm);
          } else {
            avatar = createGenericAvatar(gltf);
            avatar.applyPose({
              headX: 0.02, headY: 0, headZ: 0,
              spineX: 0.02, chestX: 0.02,
              leftUpperArm: 1.35, rightUpperArm: 1.35,
              leftLowerArm: 0.25, rightLowerArm: 0.25,
              spineY: 0, chestZ: 0,
              lArmX: 0, rArmX: 0, lElbowZ: 0, rElbowZ: 0,
              spinePitchAdd: 0, chestPitchAdd: 0,
            });
          }
          root = avatar.root;
          scene.add(root);

          if (vrm && idleAnim) {
            const clip = createVRMAnimationClip(idleAnim, vrm);
            clip.tracks = clip.tracks.filter((t) => !t.name.includes('expression'));
            rebaseClipHips(clip, vrm);
            const mixer = new THREE.AnimationMixer(vrm.scene);
            mixer.clipAction(clip).play();
            mixer.setTime(1.15); // a natural mid-idle beat — not frame 0
            mixer.update(0);
            // r124: re-measure facing now that the idle stance has settled
            // (the constructor pass read the raw rest pose's ~10°-off
            // shoulder line) — thumbs/cutouts show her standing square
            avatar.recalibrateFacing();
          }
          // r114b: detect rigs the idle clip failed to bind on (track names
          // that don't resolve leave the model in its bind/T-pose). Arms
          // hanging = |world Y| of the upper-arm direction is large; arms
          // sideways = T/A-pose. Fall back to the calibrated procedural
          // arms-down pose so NO thumbnail ever shows a T-pose.
          const armDownY = (side: 'left' | 'right'): number | null => {
            const up = avatar.getBoneNode(`${side}UpperArm`);
            const lo = avatar.getBoneNode(`${side}LowerArm`);
            if (!up || !lo) return null;
            const a = new THREE.Vector3(); up.getWorldPosition(a);
            const b = new THREE.Vector3(); lo.getWorldPosition(b);
            return b.sub(a).normalize().y;
          };
          const ly = armDownY('left'); const ry = armDownY('right');
          const tposed = ly !== null && ry !== null && ly > -0.45 && ry > -0.45;
          if (tposed) {
            avatar.applyPose({
              headX: 0.02, headY: 0, headZ: 0,
              spineX: 0.02, chestX: 0.02,
              leftUpperArm: 1.35, rightUpperArm: 1.35,
              leftLowerArm: 0.25, rightLowerArm: 0.25,
              spineY: 0, chestZ: 0,
              lArmX: 0, rArmX: 0, lElbowZ: 0, rElbowZ: 0,
              spinePitchAdd: 0, chestPitchAdd: 0,
            });
            prog('idle clip unbound — procedural fallback pose');
          }
          avatar.applyRelaxedHands();
          avatar.setExpression('happy', 0.45);
          avatar.update(0);
          await settle(); // let textures settle before the snapshot (hidden-tab safe)

          // r114b: head/hips-anchored portrait framing. The old whole-body
          // Box3 guess cropped tall rigs' heads (robbie/nova) and zoomed
          // through chibi faces (mochi). Anchor on the actual head bone,
          // cover head→chest with margin for hats/hair, and widen for
          // hair/hat X-extent.
          const box = new THREE.Box3().setFromObject(root);
          const size = box.getSize(new THREE.Vector3());
          const headN = avatar.getBoneNode('head');
          const hipsN = avatar.getBoneNode('hips');
          const hp = new THREE.Vector3(); headN?.getWorldPosition(hp);
          const pp = new THREE.Vector3(); hipsN?.getWorldPosition(pp);
          let targetY: number; let visibleH: number;
          if (headN && hipsN) {
            const span = Math.max(Math.abs(hp.y - pp.y), 0.12);
            targetY = hp.y - span * 0.38;
            visibleH = Math.max(
              span * 2.0,                 // head + chest + margin
              (box.max.y - targetY) * 2.1, // never crop hats/hair
              size.x * 1.2,                // wide hair/hats fit sideways
            );
          } else {
            targetY = box.min.y + size.y * 0.62;
            visibleH = Math.max(size.y * 0.85, size.x * 1.2);
          }
          const d = Math.max(visibleH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)), 0.3);
          camera.position.set(0, targetY + visibleH * 0.03, d);
          camera.lookAt(0, targetY, 0);

          renderer.render(scene, camera);
          const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.9);
          const res = await fetch(`${SAVE_URL}?id=${encodeURIComponent(c.id)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl }),
          });
          if (!res.ok) throw new Error(`save ${res.status}`);
          ok.push(c.id);
          prog('baked ✓');

          // r123 CUTOUT PASS — same pose, full body, TRANSPARENT background,
          // cropped to the character. The renderer was created with alpha, so
          // clearing the scene background is all it takes.
          try {
            prog('cutout…');
            scene.background = null;
            const visH = Math.max(size.y * 1.06, size.x * 1.12, 0.3);
            const midY = box.min.y + size.y * 0.5;
            const d2 = Math.max(visH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)), 0.3);
            camera.position.set(0, midY, d2);
            camera.lookAt(0, midY, 0);
            renderer.render(scene, camera);
            const png = cropAlphaPng(renderer.domElement);
            const res2 = await fetch(`${SAVE_URL}?id=${encodeURIComponent(c.id)}&kind=cutout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dataUrl: png }),
            });
            if (!res2.ok) throw new Error(`save cutout ${res2.status}`);
            cutouts.push(c.id);
          } finally {
            scene.background = BG;
          }
        } catch (e) {
          fail.push(c.id);
          prog(`FAILED ${e instanceof Error ? e.message : String(e)}`);
        } finally {
          if (root) scene.remove(root);
          disposeRoot(root);
          (vrm as unknown as { dispose?: () => void } | undefined)?.dispose?.();
        }
      }

      renderer.dispose();
      window.__bakeDone = { ok, fail, cutouts };
      window.__bakeProgress = `DONE — ${ok.length} thumbs, ${cutouts.length} cutouts, ${fail.length} failed`;
      setDone({ ok, fail });
      setLog((l) => [...l, `— ${ok.length} thumbs, ${cutouts.length} cutouts, ${fail.length} failed —`]);
    };

    void bakeAll().catch((e) => {
      window.__bakeDone = { ok: [], fail: ['driver: ' + String(e)], cutouts: [] };
    });
  }, [isLocal]);

  if (!isLocal) {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#16161f] text-white/70">
        Thumb bake studio is a dev-only tool — run the app locally.
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#16161f] p-6 font-mono text-sm text-white/80">
      <h1 className="mb-1 text-lg font-bold text-white">Thumb Bake Studio</h1>
      <p className="mb-4 text-white/50">
        Rendering every cast member through the real avatar pipeline — {done ? 'finished' : 'running…'}
      </p>
      <div className="flex gap-6">
        <div ref={hostRef} className="shrink-0" />
        <div className="max-h-[70vh] flex-1 overflow-y-auto whitespace-pre-wrap">
          {log.map((l, i) => (
            <div key={i} className={l.includes('FAILED') ? 'text-red-400' : 'text-white/70'}>{l}</div>
          ))}
        </div>
      </div>
    </main>
  );
}
