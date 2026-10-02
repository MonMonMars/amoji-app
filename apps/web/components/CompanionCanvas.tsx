'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import { mapFrameToVrm, sampleIdlePose } from '@amoji/vrm-renderer';
import { getEngine } from '../lib/companion';
import { sampleSpeech } from '../lib/speech';

export interface CompanionCanvasProps {
  onNotice?: (n: { reason: 'webgl' | 'asset' }) => void;
  onPoke?: () => void;
  accent?: string;
}

const TARGET = new THREE.Vector3(0, 1.05, 0);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export default function CompanionCanvas({ onNotice, onPoke, accent = '#f9a8d4' }: CompanionCanvasProps) {
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
    scene.background = new THREE.Color('#171717');
    scene.add(new THREE.HemisphereLight('#ffffff', '#334155', 1.2));
    const dir = new THREE.DirectionalLight('#ffffff', 1.5);
    dir.position.set(1, 2, 2);
    scene.add(dir);

    const camera = new THREE.PerspectiveCamera(35, host.clientWidth / host.clientHeight, 0.1, 20);

    // spherical orbit state
    const orbit = { theta: 0, phi: 1.12, dist: 1.9 };
    const applyCamera = () => {
      orbit.phi = clamp(orbit.phi, 0.55, 1.5);
      orbit.dist = clamp(orbit.dist, 0.9, 4);
      camera.position.set(
        TARGET.x + orbit.dist * Math.sin(orbit.phi) * Math.sin(orbit.theta),
        TARGET.y + orbit.dist * Math.cos(orbit.phi),
        TARGET.z + orbit.dist * Math.sin(orbit.phi) * Math.cos(orbit.theta),
      );
      camera.lookAt(TARGET);
    };
    applyCamera();

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
    const poseSeed = Date.now() % 100000;

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load('/models/juno.vrm', (gltf) => {
      vrm = (gltf as unknown as { userData: { vrm: VRM } }).userData.vrm;
      scene.remove(placeholder);
      scene.add(vrm.scene);
      vrm.scene.position.set(0, 0, 0);

      // idle VRMA animation: body motion from the clip, expressions stay ours
      const animLoader = new GLTFLoader();
      animLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
      animLoader.load('/models/idle.vrma', (animGltf) => {
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
    }, undefined, () => {
      onNoticeRef.current?.({ reason: 'asset' });
    });

    // ---- pointer interaction: drag = orbit, pinch/wheel = zoom, tap = poke ----
    const raycaster = new THREE.Raycaster();
    let pokeAt = -Infinity;
    const pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number; moved: number }>();
    let pinchDist = 0;

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

    const onPointerDown = (e: PointerEvent) => {
      host.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0 });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
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
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) orbit.dist *= pinchDist / d;
        pinchDist = d;
        applyCamera();
      } else if (p.moved > 6) {
        orbit.theta -= dx * 0.006;
        orbit.phi -= dy * 0.005;
        applyCamera();
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (!p) return;
      const quick = performance.now() - p.t < 350;
      const still = Math.hypot(e.clientX - p.sx, e.clientY - p.sy) <= 6;
      if (quick && still && hitVrm(e.clientX, e.clientY)) {
        pokeAt = performance.now();
        onPokeRef.current?.();
      }
      pinchDist = 0;
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

    const engine = getEngine();
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(100, now - last);
      last = now;
      const frame = engine.tick(dt);
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
  }, [accent]);

  return <div ref={hostRef} className="absolute inset-0 touch-none" aria-label="Juno" />;
}
