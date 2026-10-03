'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import { mapFrameToVrm, sampleIdlePose } from '@amoji/vrm-renderer';
import { tickEngine } from '../lib/companion';
import { characterById } from '../lib/prefs';
import { sampleSpeech } from '../lib/speech';

export interface CompanionCanvasProps {
  onNotice?: (n: { reason: 'webgl' | 'asset' }) => void;
  onPoke?: () => void;
  accent?: string;
  /** character id — gives her/him a deterministic, personal idle-motion sequence */
  seedKey?: string;
}

const HOME = { theta: 0, phi: 1.12, dist: 1.9 };
const HOME_TARGET = new THREE.Vector3(0, 1.05, 0);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** stable per-character hash → motion seed: same character, same body language */
function seedFromKey(key: string): number {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) % 100000;
  return h;
}

export default function CompanionCanvas({ onNotice, onPoke, accent = '#f9a8d4', seedKey }: CompanionCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;
  const onPokeRef = useRef(onPoke);
  onPokeRef.current = onPoke;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onNoticeRef.current?.({ reason: 'webgl' });
      return;
    }
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // transparent canvas — the page's themed gradient shows through (alpha:true)
    scene.background = null;
    scene.add(new THREE.HemisphereLight('#ffffff', '#334155', 1.2));
    const dir = new THREE.DirectionalLight('#ffffff', 1.5);
    dir.position.set(1, 2, 2);
    scene.add(dir);

    const camera = new THREE.PerspectiveCamera(35, host.clientWidth / host.clientHeight, 0.1, 20);

    // spherical orbit state + pannable look-target
    const target = HOME_TARGET.clone();
    const orbit = { theta: HOME.theta, phi: HOME.phi, dist: HOME.dist };
    const applyCamera = () => {
      orbit.phi = clamp(orbit.phi, 0.3, 1.72);
      orbit.dist = clamp(orbit.dist, 0.7, 5);
      target.x = clamp(target.x, -0.9, 0.9);
      target.y = clamp(target.y, 0.4, 1.7);
      camera.position.set(
        target.x + orbit.dist * Math.sin(orbit.phi) * Math.sin(orbit.theta),
        target.y + orbit.dist * Math.cos(orbit.phi),
        target.z + orbit.dist * Math.sin(orbit.phi) * Math.cos(orbit.theta),
      );
      camera.lookAt(target);
    };
    applyCamera();

    // smooth camera-reset animation state
    let resetAnim: {
      t0: number; dur: number;
      from: { theta: number; phi: number; dist: number };
      fromTarget: THREE.Vector3;
    } | null = null;

    // placeholder while the model is missing or loading
    const placeholder = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 0.8, 8, 16),
      new THREE.MeshStandardMaterial({ color: accent }),
    );
    placeholder.position.set(0, 0.9, 0);
    scene.add(placeholder);

    let vrm: VRM | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let mixerActive = false;
    // per-character motion personality: Rin always fidgets the same way,
    // Ren drifts through his own calm sequence — deterministic per character.
    const poseSeed = seedKey ? seedFromKey(seedKey) : Date.now() % 100000;
    const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    // Per-character drop-in model first (CharacterDef.model, e.g. tifa.vrm),
    // then the shipped defaults. Local/closed builds ship juno.vrm (Kizuna AI);
    // open builds fall back to seed-san.vrm (VRM Public License 1.0, VirtualCast)
    // — see ASSET_MANIFEST.md.
    const ownModel = seedKey ? characterById(seedKey).model : undefined;
    const MODEL_CANDIDATES = [ownModel, 'juno.vrm', 'seed-san.vrm'].filter(
      (m): m is string => !!m,
    );

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const onModelLoaded = (gltf: unknown) => {
      vrm = (gltf as unknown as { userData: { vrm: VRM } }).userData.vrm;
      scene.remove(placeholder);
      scene.add(vrm.scene);
      vrm.scene.position.set(0, 0, 0);

      // idle VRMA animation: body motion from the clip, expressions stay ours
      const animLoader = new GLTFLoader();
      animLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
      animLoader.load(`${ASSET_BASE}/models/idle.vrma`, (animGltf) => {
        try {
          const anims = (animGltf as unknown as { userData: { vrmAnimations: VRMAnimation[] } }).userData.vrmAnimations;
          if (!anims?.length || !vrm) return;
          const clip = createVRMAnimationClip(anims[0]!, vrm);
          // strip expression tracks so speech/visemes keep full control of the face
          clip.tracks = clip.tracks.filter((t) => !t.name.includes('expression'));
          if (!clip.tracks.length) return;
          mixer = new THREE.AnimationMixer(vrm.scene);
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
          mixerActive = true;
        } catch {
          onNoticeRef.current?.({ reason: 'asset' });
        }
      }, undefined, () => {
        // no idle clip — procedural idle still carries the body
      });
    };

    const loadModel = (index: number) => {
      if (index >= MODEL_CANDIDATES.length) {
        onNoticeRef.current?.({ reason: 'asset' });
        return;
      }
      loader.load(`${ASSET_BASE}/models/${MODEL_CANDIDATES[index]}`, onModelLoaded, undefined, () => loadModel(index + 1));
    };
    loadModel(0);

    // ---- pointer gestures ────────────────────────────────────────────────────
    // one finger drag   = rotate around her
    // two finger drag   = move (pan) the camera · pinch = zoom
    // double tap empty  = reset camera · tap / double tap her = poke
    const raycaster = new THREE.Raycaster();
    let pokeAt = -Infinity;
    let lastEmptyTap = -Infinity;
    const pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number; moved: number }>();
    let pinchDist = 0;
    let lastMid: { x: number; y: number } | null = null;

    const hitVrm = (cx: number, cy: number): boolean => {
      if (!vrm) return false;
      const rect = host.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((cx - rect.left) / rect.width) * 2 - 1,
        -((cy - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObject(vrm.scene, true).length > 0;
    };

    const midpoint = () => {
      const pts = [...pointers.values()];
      const a = pts[0]!, b = pts[1]!;
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

    const onPointerDown = (e: PointerEvent) => {
      host.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0 });
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const a = pts[0]!, b = pts[1]!;
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        lastMid = midpoint();
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      p.moved += Math.abs(dx) + Math.abs(dy);
      if (pointers.size === 2) {
        // pinch zoom + two-finger pan
        const pts = [...pointers.values()];
        const a = pts[0]!, b = pts[1]!;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) orbit.dist *= pinchDist / d;
        pinchDist = d;
        const m = midpoint();
        if (lastMid) {
          const scale = 0.0016 * (orbit.dist / 1.9);
          target.x -= (m.x - lastMid.x) * scale;
          target.y += (m.y - lastMid.y) * scale * 0.75;
        }
        lastMid = m;
        resetAnim = null;
        applyCamera();
      } else if (p.moved > 6) {
        orbit.theta -= dx * 0.006;
        orbit.phi -= dy * 0.005;
        resetAnim = null;
        applyCamera();
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {
        pinchDist = 0;
        lastMid = null;
      }
      if (!p) return;
      const quick = performance.now() - p.t < 350;
      const still = Math.hypot(e.clientX - p.sx, e.clientY - p.sy) <= 8;
      if (quick && still) {
        if (hitVrm(e.clientX, e.clientY)) {
          pokeAt = performance.now();
          onPokeRef.current?.();
        } else {
          const nowTs = performance.now();
          if (nowTs - lastEmptyTap < 350) {
            resetAnim = {
              t0: nowTs,
              dur: 380,
              from: { ...orbit },
              fromTarget: target.clone(),
            };
          }
          lastEmptyTap = nowTs;
        }
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbit.dist *= e.deltaY > 0 ? 1.09 : 0.92;
      applyCamera();
    };
    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', onPointerUp);
    host.addEventListener('pointercancel', onPointerUp);
    host.addEventListener('wheel', onWheel, { passive: false });

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(100, now - last);
      last = now;

      if (resetAnim) {
        const p = clamp((now - resetAnim.t0) / resetAnim.dur, 0, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        orbit.theta = resetAnim.from.theta + (HOME.theta - resetAnim.from.theta) * ease;
        orbit.phi = resetAnim.from.phi + (HOME.phi - resetAnim.from.phi) * ease;
        orbit.dist = resetAnim.from.dist + (HOME.dist - resetAnim.from.dist) * ease;
        target.lerpVectors(resetAnim.fromTarget, HOME_TARGET, ease);
        if (p >= 1) resetAnim = null;
      }
      applyCamera();

      const frame = tickEngine(dt);
      const pose = mixerActive ? undefined : sampleIdlePose(frame.t, poseSeed);
      const targets = mapFrameToVrm(frame, 1, pose);
      if (vrm) {
        const em = vrm.expressionManager;
        if (em) {
          // poke squash-bounce: quick surprised bounce, 600ms decay
          const pokeAge = now - pokeAt;
          const boost = pokeAge < 600 ? 1 - pokeAge / 600 : 0;
          if (boost > 0) vrm.scene.scale.y = 1 - 0.07 * Math.sin((1 - boost) * Math.PI);
          else vrm.scene.scale.y = 1;

          // speech visemes: duck the emotion shapes while the mouth talks
          const sp = sampleSpeech();
          const duck = sp ? 1 - 0.4 * sp.duck : 1;
          const v = (x: number) => clamp(x * duck + (sp ? 0 : 0), 0, 1);
          em.setValue('happy', v(Math.max(targets.blendShape.joy, targets.blendShape.fun)));
          em.setValue('angry', v(targets.blendShape.angry));
          em.setValue('sad', v(targets.blendShape.sorrow));
          em.setValue('surprised', clamp(v(targets.blendShape.surprise) + 0.9 * boost, 0, 1));
          em.setValue('relaxed', v(targets.blendShape.relaxed));
          if (sp) {
            const mouth = sp.mouth;
            const on = (want: string) => (sp.vowel === want ? 1 : 0.12);
            em.setValue('aa', mouth * on('aa'));
            em.setValue('ih', mouth * on('ih'));
            em.setValue('ou', mouth * on('ou'));
            em.setValue('ee', mouth * on('ee'));
            em.setValue('oh', mouth * on('oh'));
          } else {
            em.setValue('aa', 0); em.setValue('ih', 0); em.setValue('ou', 0);
            em.setValue('ee', 0); em.setValue('oh', 0);
          }
        }
        const setRot = (name: VRMHumanBoneName, axis: 'x' | 'y' | 'z', val: number) => {
          const node = vrm?.humanoid?.getNormalizedBoneNode(name);
          if (node) node.rotation[axis] = val;
        };
        const b = targets.bones;
        if (mixerActive) {
          // clip drives the body — keep only a whisper of procedural head life
          mixer?.update(dt / 1000);
          setRot('head', 'x', b.headPitch * 0.5);
          setRot('head', 'y', b.headYaw * 0.5);
          setRot('head', 'z', b.headRoll * 0.5);
        } else {
          setRot('head', 'x', b.headPitch);
          setRot('head', 'y', b.headYaw);
          setRot('head', 'z', b.headRoll);
          setRot('leftUpperArm', 'z', -b.leftUpperArm);
          setRot('rightUpperArm', 'z', b.rightUpperArm);
          setRot('leftLowerArm', 'z', -b.leftLowerArm);
          setRot('rightLowerArm', 'z', b.rightLowerArm);
          setRot('spine', 'x', b.spinePitch);
          setRot('chest', 'x', b.chestPitch);
        }
        vrm.update(dt / 1000);
      } else {
        placeholder.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', onPointerUp);
      host.removeEventListener('pointercancel', onPointerUp);
      host.removeEventListener('wheel', onWheel);
      vrm?.scene.removeFromParent();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [accent, seedKey]);

  return <div ref={hostRef} className="absolute inset-0 touch-none" aria-label="companion" />;
}
