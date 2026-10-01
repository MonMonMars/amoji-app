'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { mapFrameToVrm } from '@amoji/vrm-renderer';
import { getEngine } from '../lib/companion';

export default function CompanionCanvas({ onNotice }: { onNotice?: (n: { reason: 'webgl' | 'asset' }) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;

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
    camera.position.set(0, 1.35, 1.7);

    // placeholder while the model is missing or loading
    const placeholder = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 0.8, 8, 16),
      new THREE.MeshStandardMaterial({ color: '#f9a8d4' }),
    );
    placeholder.position.set(0, 0.9, 0);
    scene.add(placeholder);

    let vrm: VRM | null = null;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load('/models/juno.vrm', (gltf) => {
      vrm = (gltf as unknown as { userData: { vrm: VRM } }).userData.vrm;
      scene.remove(placeholder);
      scene.add(vrm.scene);
      vrm.scene.position.set(0, 0, 0);
    }, undefined, () => {
      onNoticeRef.current?.({ reason: 'asset' });
    });

    const engine = getEngine();
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(100, now - last);
      last = now;
      const frame = engine.tick(dt);
      const targets = mapFrameToVrm(frame);
      if (vrm) {
        const em = vrm.expressionManager;
        if (em) {
          // map mapper outputs onto VRM 1.0 preset names (three-vrm v3)
          em.setValue('happy', Math.max(targets.blendShape.joy, targets.blendShape.fun));
          em.setValue('angry', targets.blendShape.angry);
          em.setValue('sad', targets.blendShape.sorrow);
          em.setValue('surprised', targets.blendShape.surprise);
          em.setValue('relaxed', targets.blendShape.relaxed);
        }
        // body: face + idle bones (arms, spine, chest). NOTE: arm Z signs are
        // mirrored by convention and unverified visually — flip if arms splay.
        const setRot = (name: VRMHumanBoneName, axis: 'x' | 'y' | 'z', v: number) => {
          const node = vrm?.humanoid?.getNormalizedBoneNode(name);
          if (node) node.rotation[axis] = v;
        };
        const b = targets.bones;
        setRot('head', 'x', b.headPitch);
        setRot('head', 'y', b.headYaw);
        setRot('head', 'z', b.headRoll);
        setRot('leftUpperArm', 'z', -b.leftUpperArm);
        setRot('rightUpperArm', 'z', b.rightUpperArm);
        setRot('leftLowerArm', 'z', -b.leftLowerArm);
        setRot('rightLowerArm', 'z', b.rightLowerArm);
        setRot('spine', 'x', b.spinePitch);
        setRot('chest', 'x', b.chestPitch);
        vrm.update(dt / 1000);
      } else {
        placeholder.rotation.y += 0.003;
      }
      camera.lookAt(0, 1.15, 0); // head-anchored feel
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
      vrm?.scene.removeFromParent();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" aria-label="Juno" />;
}
