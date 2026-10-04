'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import { mapFrameToVrm, posesByIds, sampleIdlePoseFrom } from '@amoji/vrm-renderer';
import { tickEngine, lastLaughAt, activeMove } from '../lib/companion';
import { setLoadProgress } from '../lib/load-progress';
import { type MoveKind } from '../lib/moves';
import { PROPS, propsForMove, propPresence, type PropDef, type PropPart } from '../lib/props';
import { characterById } from '../lib/prefs';
import { pokeStyleFor, pokeModeFor, poseIdsFor, lookFor } from '../lib/persona';
import { sampleSpeech } from '../lib/speech';
import { createV1Avatar, createGenericAvatar } from '../lib/vrm/avatar';
import type { Avatar, AvatarPose } from '../lib/vrm/avatar';

export interface CompanionCanvasProps {
  onNotice?: (n: { reason: 'webgl' | 'asset' }) => void;
  onPoke?: () => void;
  accent?: string;
  /** character id — gives her/him a deterministic, personal idle-motion sequence */
  seedKey?: string;
  /** light rig: 'outdoor' = neutral daylight, 'indoor' = soft interior light */
  lighting?: 'indoor' | 'outdoor';
}

// r2026-10-04.92 (Master Simon): start FURTHER AWAY and at a NORMAL STRAIGHT
// angle — the old phi 1.12 put the camera ~26° above her looking down (an
// "upper camera" close-up). Now the lens sits ~2.4° above eye level, 2.6m
// back: upper body centered, like someone standing across from you. Target
// stays at chest height (y 1.05). Double-tap empty space still returns here.
const HOME = { theta: 0, phi: 1.53, dist: 2.6 };
const HOME_TARGET = new THREE.Vector3(0, 1.05, 0);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

// Vertical orbit range, in radians measured from straight-up (polar angle).
// r2026-10-04.56: widened at Master Simon's request — 0.12 ≈ near-overhead
// top view, 2.35 ≈ worm's-eye view up from below the floor line. Theta is
// already unclamped (full 360° yaw).
const PHI_MIN = 0.12;
const PHI_MAX = 2.35;

/** stable per-character hash → motion seed: same character, same body language */
function seedFromKey(key: string): number {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) % 100000;
  return h;
}

/** how much each poke-twist flavor turns the body during the reaction */
const TWIST_AMOUNT: Record<string, number> = {
  playful: 0.1,
  startled: 0.06,
  unimpressed: 0.02,
  flustered: 0.05,
  challenging: 0.12,
};

// r95 (Master Simon): the hand-composed choreography additives are RETIRED.
// Their shape stays here only so the pose-target math below type-checks;
// the value is always undefined (no additive ever applied).
interface MoveAdd {
  lArmZ: number; rArmZ: number; lArmX: number; rArmX: number;
  lElbowZ: number; rElbowZ: number;
  spineX: number; spineY: number; chestZ: number;
  headX: number; headY: number; headZ: number;
  py: number; squash: number; stretch: number;
}

export default function CompanionCanvas({ onNotice, onPoke, accent = '#f9a8d4', seedKey, lighting = 'outdoor' }: CompanionCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;
  const onPokeRef = useRef(onPoke);
  onPokeRef.current = onPoke;
  // r84 (Master Simon): while she loads, the stage stays EMPTY — no giant
  // placeholder figure. r91: the loading indicator moved OUT of this canvas
  // and INTO the top-left name bar (StatusPlate) through the shared store in
  // lib/load-progress — smaller, next to the status it reports, and backed
  // by a watchdog so it can never spin at 99% forever. null = ready.

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setLoadProgress(0);
    // r91 (Master Simon): the indicator must never spin forever. A model
    // request can stream to ~99% and then hang (progress events but no
    // success/error — a stalled connection); without a guard the old ring
    // sat at 99% eternally. After 25s the indicator retires and the asset
    // notice takes over. Cleared the moment she mounts (or on unmount).
    const loadWatchdog = setTimeout(() => {
      setLoadProgress(null);
      onNoticeRef.current?.({ reason: 'asset' });
    }, 25000);

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
    // r2026-10-04.77 (Master Simon): NORMAL light, nothing orange. Two
    // rigs picked by `lighting`:
    //   outdoor — neutral daylight: cool-ish sky over warm ground bounce,
    //     one clean sun key plus a soft fill so nothing on the character
    //     picks up a color cast.
    //   indoor — soft interior: warm-ish key lamp overhead, cool window
    //     fill, gentle ambience. Deliberately desaturated so skin stays skin.
    if (lighting === 'indoor') {
      scene.add(new THREE.HemisphereLight('#ffffff', '#57534e', 0.7));
      const key = new THREE.DirectionalLight('#fff6ec', 1.2);
      key.position.set(0.6, 2.8, 1.2);
      scene.add(key);
      const fill = new THREE.DirectionalLight('#edf3ff', 0.35);
      fill.position.set(-1.6, 1.4, 1.6);
      scene.add(fill);
    } else {
      scene.add(new THREE.HemisphereLight('#f2f7ff', '#8f8a80', 0.85));
      const sun = new THREE.DirectionalLight('#ffffff', 1.75);
      sun.position.set(2.2, 3.8, 2.0);
      scene.add(sun);
      const bounce = new THREE.DirectionalLight('#e3eaf5', 0.3);
      bounce.position.set(-1.8, 0.6, -1.4);
      scene.add(bounce);
    }

    const camera = new THREE.PerspectiveCamera(35, host.clientWidth / host.clientHeight, 0.1, 20);

    // spherical orbit state + pannable look-target
    const target = HOME_TARGET.clone();
    const orbit = { theta: HOME.theta, phi: HOME.phi, dist: HOME.dist };
    const applyCamera = () => {
      orbit.phi = clamp(orbit.phi, PHI_MIN, PHI_MAX);
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

    // r84 (Master Simon): NO placeholder mesh while loading — the old accent
    // capsule read as "a huge ball in the middle". The stage stays empty and
    // the name-bar indicator reports real progress: model bytes (75%) +
    // motion clips delivered (25%). Recomputed on every loader progress
    // event. r91: published through lib/load-progress instead of local state.
    let modelPct = 0;
    let clipDone = 0;
    let lastReported = -1;
    const reportProgress = () => {
      const pct = Math.min(99, Math.round(modelPct * 0.75 + (clipDone / TOTAL_CLIPS) * 25));
      if (pct !== lastReported) {
        lastReported = pct;
        setLoadProgress(pct);
      }
    };

    // r2026-10-04.69: stage props — one THREE.Group per catalog entry. A
    // prop fades in while its move is on stage and melts away after, never
    // touching the skeleton (props are set dressing, not puppetry).
    interface AnimPart {
      obj: THREE.Object3D;
      base: THREE.Vector3;
      baseRotZ: number;
      anim: NonNullable<PropPart['anim']>;
      phase: number;
    }
    const propGroups = new Map<string, { group: THREE.Group; animParts: AnimPart[]; scale: number }>();
    const buildProp = (def: PropDef) => {
      const group = new THREE.Group();
      const animParts: AnimPart[] = [];
      for (const part of def.parts) {
        let geo: THREE.BufferGeometry;
        if (part.kind === 'box') geo = new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2]);
        else if (part.kind === 'cylinder') geo = new THREE.CylinderGeometry(part.size[0], part.size[1], part.size[2], 20);
        else if (part.kind === 'sphere') geo = new THREE.SphereGeometry(part.size[0], 20, 14);
        else geo = new THREE.ConeGeometry(part.size[0], part.size[1], 20);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.55 }));
        mesh.position.set(part.pos[0], part.pos[1], part.pos[2]);
        if (part.rot) mesh.rotation.set(part.rot[0], part.rot[1], part.rot[2]);
        group.add(mesh);
        const anim = part.anim ?? 'none';
        if (anim !== 'none') {
          animParts.push({ obj: mesh, base: mesh.position.clone(), baseRotZ: mesh.rotation.z, anim, phase: part.animPhase ?? 0 });
        }
      }
      group.visible = false;
      group.scale.setScalar(0.001);
      scene.add(group);
      propGroups.set(def.id, { group, animParts, scale: 0 });
    };
    for (const def of PROPS) buildProp(def);

    let avatar: Avatar | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let mixerActive = false;
    // per-character motion personality: Rin always fidgets the same way,
    // Ren drifts through his own calm sequence — deterministic per character.
    const poseSeed = seedKey ? seedFromKey(seedKey) : Date.now() % 100000;
    // r2026-10-03.04: each character drifts through a personality-curated
    // subset of the pose library instead of the full shared catalog.
    const poseSubset = posesByIds(poseIdsFor(seedKey ?? 'juno'));
    const poke = pokeStyleFor(seedKey ?? 'juno');
    // r83 (Master Simon): humans take the poke as SKELETON recoil — mesh
    // squash-deform reads as rubber on a realistic body. Only the chibi cast
    // (mochi) keeps the deform squash, where cartoon physics is the look.
    const pokeMode = pokeModeFor(seedKey ?? 'juno');
    // r2026-10-03.28: per-character look — the shared open-license VRM gets a
    // gentle palette tint and an individual build (height/shoulders), so each
    // character reads as her/his own person in the 3D scene.
    const look = lookFor(seedKey ?? 'juno');
    const BASE_SX = look.width;
    const BASE_SY = look.height;
    const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    // r2026-10-04.50: every character maps to a local anime VRM under
    // /models/cast (see ASSET_MANIFEST.md). Load strategy per candidate:
    //   1. three-vrm plugin parse → VRM 1.0 avatar (VRMA idle clip eligible)
    //   2. plain GLTF parse → generic avatar (VRM 0.x legacy rig; bones and
    //      morphs are driven through the humanBones table with automatic
    //      facing + arm calibration, so a legacy model never shows its back
    //      or a raised-arms rest pose)
    //   3. any failure walks the chain to the next candidate.
    // r2026-10-04.58: body motion comes from the ONLINE MOTION LIBRARY
    // (open .vrma clips — real keyframed performances, streamed from the
    // library with a local /models/anims mirror taking over once vendored).
    // Master Simon's rule: the skeleton is NEVER rotated by hand while a
    // library clip drives the body. The old procedural pose/move math now
    // only runs as a last-resort fallback when no clip could be built.
    const ownModel = seedKey ? characterById(seedKey).model : undefined;
    const MODEL_CANDIDATES = [ownModel, 'juno.vrm', 'seed-san.vrm'].filter(
      (m): m is string => !!m,
    );

    // -- clip library ---------------------------------------------------------
    // r2026-10-04.93 (Master Simon): idle is a REAL LIBRARY now — 16 open
    // .vrma idle performances streamed from three CORS-open motion libraries
    // (Mixamo-class mocap: weight shifts, stretches, head shakes, sighs,
    // bashful fidgets…), replacing the 4 tiny auto-generated samples that
    // made idle stiff. AND the zombie stand is gone: every idle plays as a
    // LOOP with a random mid-clip start offset, and the rotation crossfades
    // between two LIVE motions on a swap timer — she is ALWAYS inside some
    // idle movement, never parked in a straight stand between clips.
    // Local mirror first (vendored by scripts/fetch-anims.mjs into
    // /models/anims); the raw hosts are CORS-open so the browser can stream
    // them until the binaries land in the repo.
    const ANIM_MIRROR = `${ASSET_BASE}/models/anims`;
    const ANIM_LIBRARY = 'https://raw.githubusercontent.com/tk256ailab/vrm-viewer/main/VRMA';
    // the VRM consortium's genuine standard_idle + a real formal bow
    const ALT_HOST = 'https://raw.githubusercontent.com/hirokazuniimoto/virtual-avatar-sdk/main/assets/animations';
    // a proper wave greeting
    const ST_HOST = 'https://raw.githubusercontent.com/test157t/VRM-Assets-Pack-For-Silly-Tavern/main/animation_nitral-fork';
    // r93: two more CORS-open libraries full of REAL keyframed mocap idles
    // (file lists verified via the GitHub API; desktop-waifu sits on the
    // `master` branch, 3dchat on `main`)
    const DW_HOST = 'https://raw.githubusercontent.com/yv-was-taken/desktop-waifu/master/public/animations';
    const CHAT_HOST = 'https://raw.githubusercontent.com/DavinciDreams/3dchat/main/public/animations/vrma';

    interface ClipSource { id: string; urls: string[] }
    // the idle pool — every entry a standing, loopable idle performance.
    // The rotation picks 1–2 of a clip's own beats, then hands over.
    const IDLE_SOURCES: ClipSource[] = [
      { id: 'StandardIdle', urls: [`${ANIM_MIRROR}/StandardIdle.vrma`, `${ALT_HOST}/standard_idle.vrma`, `${ANIM_LIBRARY}/StandardIdle.vrma`] },
      { id: 'NeutralIdle', urls: [`${ANIM_MIRROR}/NeutralIdle.vrma`, `${DW_HOST}/neutral_idle.vrma`] },
      { id: 'DwarfIdle', urls: [`${ANIM_MIRROR}/DwarfIdle.vrma`, `${DW_HOST}/Dwarf%20Idle.vrma`] },
      { id: 'LadyIdle', urls: [`${ANIM_MIRROR}/LadyIdle.vrma`, `${DW_HOST}/Female%20Standing%20Pose.vrma`] },
      { id: 'ArmStretch', urls: [`${ANIM_MIRROR}/ArmStretch.vrma`, `${DW_HOST}/Arm%20Stretching.vrma`] },
      { id: 'HeadShake', urls: [`${ANIM_MIRROR}/HeadShake.vrma`, `${DW_HOST}/Stroke%20Shaking%20Head.vrma`] },
      { id: 'ThinkingPose', urls: [`${ANIM_MIRROR}/ThinkingPose.vrma`, `${DW_HOST}/thinking.vrma`] },
      { id: 'WeightShift', urls: [`${ANIM_MIRROR}/WeightShift.vrma`, `${CHAT_HOST}/weightShift.vrma`] },
      { id: 'HeadNod', urls: [`${ANIM_MIRROR}/HeadNod.vrma`, `${CHAT_HOST}/headNod.vrma`] },
      { id: 'RelievedSigh', urls: [`${ANIM_MIRROR}/RelievedSigh.vrma`, `${CHAT_HOST}/relievedSigh.vrma`] },
      { id: 'Cocky', urls: [`${ANIM_MIRROR}/Cocky.vrma`, `${CHAT_HOST}/beingCocky.vrma`] },
      { id: 'Bashful', urls: [`${ANIM_MIRROR}/Bashful.vrma`, `${CHAT_HOST}/bashful.vrma`] },
      { id: 'BoredIdle', urls: [`${ANIM_MIRROR}/BoredIdle.vrma`, `${CHAT_HOST}/boredmelancholyIdle_1.vrma`] },
      { id: 'Acknowledge', urls: [`${ANIM_MIRROR}/Acknowledge.vrma`, `${CHAT_HOST}/acknowledging.vrma`] },
      { id: 'Sleepy', urls: [`${ANIM_MIRROR}/Sleepy.vrma`, `${ANIM_LIBRARY}/Sleepy.vrma`] },
      { id: 'Relax', urls: [`${ANIM_MIRROR}/Relax.vrma`, `${ANIM_LIBRARY}/Relax.vrma`] },
      { id: 'LookAround', urls: [`${ANIM_MIRROR}/LookAround.vrma`, `${ANIM_LIBRARY}/LookAround.vrma`] },
      { id: 'Thinking', urls: [`${ANIM_MIRROR}/Thinking.vrma`, `${ANIM_LIBRARY}/Thinking.vrma`] },
    ];
    // one-shot dialogue performances (library clips with a real ending)
    const PERF_SOURCES: ClipSource[] = [
      { id: 'Jump', urls: [`${ANIM_MIRROR}/Jump.vrma`, `${ANIM_LIBRARY}/Jump.vrma`] },
      { id: 'Bow', urls: [`${ANIM_MIRROR}/Bow.vrma`, `${ALT_HOST}/quick_formal_bow.vrma`] },
      { id: 'Hello', urls: [`${ANIM_MIRROR}/Hello.vrma`, `${ST_HOST}/hello.vrma`] },
    ];
    const TOTAL_CLIPS = IDLE_SOURCES.length + PERF_SOURCES.length;
    const clips = new Map<string, THREE.AnimationClip>();
    let idleAction: THREE.AnimationAction | null = null;
    let perfAction: THREE.AnimationAction | null = null;
    let idleOrder: string[] = [];
    let idleIdx = 0;
    // r93: when the current idle hands over to the next one (RAF clock, ms).
    // The handover is a crossfade between two LIVE loops — never a freeze.
    let idleHoldUntil = Infinity;
    // dialogue performances that have a matching library clip; other move
    // kinds take the procedural choreography channel below (r86) — composed
    // as semantic additives so they still never touch a clip-driven skeleton.
    const MOVE_CLIP: Partial<Record<MoveKind, string>> = { jump: 'Jump' };
    // r2026-10-04.59 (Master Simon): EVERY clip change is a blend, never a
    // jump — pose A at 10° glides into pose B at 90° over `fade` seconds.
    // The mixer crossfades bone quaternions, so intermediate frames are real
    // in-between poses, not snaps.
    const FADE = {
      entry: 0.9,      // procedural pose → first library clip
      idleRotate: 1.2, // r93: idle → next idle — a longer glide between two live loops
      toPerf: 0.45,    // idle → one-shot performance
      perfCut: 0.3,    // performance → interrupted by another performance
      perfEnd: 0.7,    // finished performance → back to idle
    };

    const nextIdle = (fade: number) => {
      if (!mixer || !idleOrder.length) return;
      const clip = clips.get(idleOrder[idleIdx % idleOrder.length]!);
      idleIdx++;
      if (!clip) return;
      const action = mixer.clipAction(clip);
      // r93: idles LOOP — the old LoopOnce + clampWhenFinished parked her on
      // the clip's end frame (a straight stand) while the next clip faded
      // in: the "zombie pose between idle movements". A looping body is
      // never parked anywhere.
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.reset();
      // start mid-clip at a random offset: the entry frame is never the
      // clip's neutral first frame, and two consecutive idles blend
      // motion-into-motion instead of neutral-into-neutral
      action.time = Math.random() * clip.duration;
      if (idleAction && idleAction !== action) {
        // blend from wherever the body currently is into this clip
        idleAction.crossFadeTo(action, fade, false);
        action.play();
      } else {
        action.fadeIn(fade).play();
      }
      idleAction = action;
      // hold this idle for 1–2 of its own beats, then hand over mid-motion
      const holdMs = Math.min(14000, Math.max(5000, clip.duration * 1000 * (1 + Math.random())));
      idleHoldUntil = performance.now() + holdMs;
    };

    const playPerf = (name: string) => {
      if (!mixer) return;
      const clip = clips.get(name);
      if (!clip) return;
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.reset();
      if (perfAction && perfAction !== action) {
        // r59: glide out of the previous performance — a hard stop() here
        // was the visible "snap" from pose A to pose B
        perfAction.crossFadeTo(action, FADE.perfCut, false);
      } else if (idleAction && idleAction !== action) {
        idleAction.crossFadeTo(action, FADE.toPerf, false);
      } else {
        action.fadeIn(FADE.toPerf);
      }
      action.play();
      perfAction = action;
    };

    const startClipEngine = (vrm: VRM) => {
      mixer = new THREE.AnimationMixer(vrm.scene);
      mixer.addEventListener('finished', (e) => {
        if (e.action === perfAction) {
          // a one-shot performance ended → glide back into the idle playlist
          perfAction = null;
          nextIdle(FADE.perfEnd);
        }
        // r93: idles never "finish" — they loop until the swap timer hands
        // over mid-motion, so there is no clamped end-frame freeze to
        // recover from and no neutral stand between idle movements
      });
      // per-character deterministic idle playlist — r93: the WHOLE idle pool
      // (16 library idles), each character rotated into a personal order
      idleOrder = IDLE_SOURCES.map((s) => s.id).filter((id) => clips.has(id));
      if (!idleOrder.length) idleOrder = [...clips.keys()];
      const shift = poseSeed % idleOrder.length;
      idleOrder = idleOrder.slice(shift).concat(idleOrder.slice(0, shift));
      idleIdx = 0;
      mixerActive = true;
      if (avatar) avatar.clipDrivesBody = true;
      // r59: blend IN from the current (procedural) pose over ~a second —
      // the very first clip no longer pops in from nowhere
      nextIdle(FADE.entry);
    };

    const loadClips = (vrm: VRM) => {
      const animLoader = new GLTFLoader();
      animLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
      // r2026-10-04.79 (Master Simon): "she starts facing front, then later
      // turns her back to me" — the library clips carry ABSOLUTE hips
      // rotations authored on a rig whose rest faces 180° off ours. The
      // mixer's first clip overwrites the (calibrated) rest hips pose with
      // the source convention, and the whole body turns around inside the
      // calibrated wrapper the moment a clip takes over. Previous agents who
      // mixed load-time calibration with absolute library clips inherited
      // the same bug. Fix: rebase every clip's hips tracks onto OUR rest —
      //   rotation: key'(t) = restQ · key0⁻¹ · key(t)
      //   position: key'(t) = key(t) − key0 + restP
      // so each clip's neutral frame lands exactly on our rest pose while
      // all of its real motion (bows, sways, turns, jumps) is preserved.
      // This MUST be captured before any action plays — the bones are still
      // pristine at this point (mountAvatar only tints + wraps).
      const hipsNode = vrm.humanoid?.getNormalizedBoneNode('hips') ?? null;
      const hipsRestQ = hipsNode ? hipsNode.quaternion.clone() : null;
      const hipsRestP = hipsNode ? hipsNode.position.clone() : null;
      // r94 (Master Simon): "she keeps floating up and down — keep her feet
      // on the ground". Many library idles carry breathing/bounce keys on
      // the hips Y that read as floating. Idle loops get their hips HEIGHT
      // pinned to our rest foot-planted height (X/Z sway — weight shifts —
      // is preserved); one-shot performances (Jump etc.) keep full Y travel
      // rebased onto our rest so they start and land on the floor.
      const IDLE_IDS = new Set(IDLE_SOURCES.map((s) => s.id));
      const rebaseClipHips = (clip: THREE.AnimationClip, lockFeet: boolean) => {
        if (!hipsNode || !hipsRestQ || !hipsRestP) return;
        const tag = `.${hipsNode.name}.`;
        for (const track of clip.tracks) {
          if (!track.name.includes(tag)) continue;
          const v = track.values;
          if (track.name.endsWith('.quaternion')) {
            const q0 = new THREE.Quaternion(v[0]!, v[1]!, v[2]!, v[3]!);
            const fix = hipsRestQ.clone().multiply(q0.invert());
            const q = new THREE.Quaternion();
            for (let i = 0; i + 3 < v.length; i += 4) {
              q.set(v[i]!, v[i + 1]!, v[i + 2]!, v[i + 3]!).premultiply(fix);
              v[i] = q.x; v[i + 1] = q.y; v[i + 2] = q.z; v[i + 3] = q.w;
            }
          } else if (track.name.endsWith('.position')) {
            const p0x = v[0]!, p0y = v[1]!, p0z = v[2]!;
            for (let i = 0; i + 2 < v.length; i += 3) {
              v[i] = v[i]! - p0x + hipsRestP.x;
              // r94: idles never ride the hips Y — feet stay planted on the
              // floor through every idle loop (jump/dance still lift via
              // performances + the choreography root channel)
              v[i + 1] = lockFeet ? hipsRestP.y : v[i + 1]! - p0y + hipsRestP.y;
              v[i + 2] = v[i + 2]! - p0z + hipsRestP.z;
            }
          }
        }
      };
      let pending = TOTAL_CLIPS;
      const done = () => {
        // r84: every resolved clip (success or exhausted retries) nudges the
        // loading indicator, so the percentage keeps moving even while the
        // model itself is already cached/fast
        clipDone += 1;
        reportProgress();
        if (--pending === 0 && clips.size > 0 && avatar) startClipEngine(vrm);
      };
      // try each candidate URL in order: local mirror → the online libraries
      // (every source lists its own hosts; all are CORS-open raw GitHub)
      const loadOne = (src: ClipSource, idx = 0) => {
        if (idx >= src.urls.length) {
          done();
          return;
        }
        animLoader.load(src.urls[idx]!, (animGltf) => {
          try {
            const anims = (animGltf as unknown as { userData: { vrmAnimations: VRMAnimation[] } }).userData.vrmAnimations;
            if (anims?.length && avatar) {
              const clip = createVRMAnimationClip(anims[0]!, vrm);
              // expression tracks stay ours — speech/visemes own the face
              clip.tracks = clip.tracks.filter((t) => !t.name.includes('expression'));
              // r79: land the clip's neutral frame on our calibrated rest;
              // r94: idle loops pin the hips height (no floating)
              rebaseClipHips(clip, IDLE_IDS.has(src.id));
              if (clip.tracks.length) clips.set(src.id, clip);
            }
          } catch { /* this clip is unusable on this rig — skip it */ }
          done();
        }, undefined, () => loadOne(src, idx + 1));
      };
      for (const src of [...IDLE_SOURCES, ...PERF_SOURCES]) loadOne(src);
    };

    const mountAvatar = (a: Avatar) => {
      avatar = a;
      scene.add(a.root);
      a.root.position.set(0, 0, 0);
      // r84/r91 — she's on stage: the name-bar loading indicator bows out
      modelPct = 100;
      reportProgress();
      setLoadProgress(null);
      clearTimeout(loadWatchdog);

      // r2026-10-03.28: tint every material toward the character look. The tint
      // is near-white, so it shifts the whole palette (outfit, hair, light on
      // skin) without destroying natural skin tones.
      const tint = new THREE.Color(look.tint);
      a.root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          const mat = m as THREE.MeshStandardMaterial;
          if (mat.color) mat.color.multiply(tint);
        }
      });
    };

    const loadPlain = (index: number, url: string) => {
      const plain = new GLTFLoader();
      plain.load(url, (gltf) => {
        try {
          mountAvatar(createGenericAvatar(gltf));
        } catch {
          loadModel(index + 1);
        }
      }, (ev) => {
        // r84: byte-level progress for the loading indicator
        if (ev.lengthComputable && ev.total > 0) {
          modelPct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
          reportProgress();
        }
      }, () => loadModel(index + 1));
    };

    const loadModel = (index: number) => {
      if (index >= MODEL_CANDIDATES.length) {
        // r84 — nothing left to try: stop waiting, show the notice
        setLoadProgress(null);
        clearTimeout(loadWatchdog);
        onNoticeRef.current?.({ reason: 'asset' });
        return;
      }
      const cand = MODEL_CANDIDATES[index]!;
      const url = /^https?:\/\//.test(cand) ? cand : `${ASSET_BASE}/models/${cand}`;
      const vrmLoader = new GLTFLoader();
      vrmLoader.register((parser) => new VRMLoaderPlugin(parser));
      vrmLoader.load(url, (gltf) => {
        const v = (gltf as unknown as { userData: { vrm?: VRM } }).userData.vrm;
        if (!v) {
          loadPlain(index, url);
          return;
        }
        mountAvatar(createV1Avatar(v));
        loadClips(v);
      }, (ev) => {
        // r84: byte-level progress for the loading indicator
        if (ev.lengthComputable && ev.total > 0) {
          modelPct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
          reportProgress();
        }
      }, () => loadPlain(index, url));
    };
    loadModel(0);

    // ---- pointer gestures ────────────────────────────────────────────────
    // one finger drag   = rotate around her
    // two finger drag   = move (pan) the camera · pinch = zoom
    // double tap empty  = reset camera · tap / double tap her = poke
    const raycaster = new THREE.Raycaster();
    let pokeAt = -Infinity;
    let lastEmptyTap = -Infinity;
    // r2026-10-04.58: which library performance the move trigger already
    // fired for (rising-edge firing — one clip start per triggerMove)
    let mvHandled: MoveKind | null = null;
    const pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number; moved: number }>();
    let pinchDist = 0;
    let lastMid: { x: number; y: number } | null = null;

    const hitVrm = (cx: number, cy: number): boolean => {
      if (!avatar) return false;
      const rect = host.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((cx - rect.left) / rect.width) * 2 - 1,
        -((cy - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObject(avatar.root, true).length > 0;
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
      const pose = mixerActive ? undefined : sampleIdlePoseFrom(frame.t, poseSeed, poseSubset);
      const targets = mapFrameToVrm(frame, 1, pose);
      // r2026-10-03.39: a dialogue-triggered movement performance (sing / jump
      // / kungfu / taichi / piano / jog), stamped on the same clock as `now`.
      const mv = activeMove(now);
      // r95 (Master Simon): NO hand-composed skeleton choreography. The old
      // moveDeltas × moveEnvelope "semantic additives" made eating / dance /
      // kungfu twist the spine past human limits (upper body spinning 360°).
      // New rule: a move either has a REAL clip in the online movement
      // library (Jump / Bow / Hello — fired via MOVE_CLIP below) or the body
      // simply stays in its library idle. The skeleton is never rotated by
      // formula. Stage props (piano, mic…) still ride the move clock.
      const md: MoveAdd | undefined = undefined;
      if (avatar) {
        // r83: the poke reaction has TWO engines, picked per character:
        //   · human (skeleton): NO mesh squash — the SKELETON takes the hit.
        //     The torso whips back (spine, then chest a beat later), the head
        //     snaps with a tiny shiver, the shoulders lift and the elbows
        //     fold — all folded into the pose targets below and routed
        //     through the human joint limits. The root only carries the
        //     push-back translation (physics, not deform): she is literally
        //     shoved away from your finger.
        //   · chibi (deform): the classic squash-bounce — cartoon physics,
        //     which is exactly what reads right on a tiny round character.
        // laugh reaction: rhythmic belly-bounce giggle, head thrown back (~1.6s).
        const pokeAge = now - pokeAt;
        const boost = pokeAge < 900 ? 1 - pokeAge / 900 : 0;
        const laughAge = now - lastLaughAt();
        const laugh = laughAge >= 0 && laughAge < 1600 ? 1 - laughAge / 1600 : 0;
        // skeleton-flinch offsets (skeleton poke mode only)
        let skSpine = 0, skChest = 0, skHeadX = 0, skHeadZ = 0;
        let skLArm = 0, skRArm = 0, skLElb = 0, skRElb = 0, skLUp = 0, skRUp = 0;
        if (boost > 0 || laugh > 0) {
          let px = 0, py = 0, pz = 0;
          let sx = 1, sy = 1, sz = 1;
          let rotX = 0, rotY = 0;
          if (boost > 0) {
            const t = 1 - boost; // 0→1 through the reaction
            const arc = Math.sin(t * Math.PI); // squash-bounce belly
            const press = Math.min(t / 0.07, 1) * Math.exp(-Math.max(0, t - 0.07) * 4); // shove out, ease home
            const wobble = 0.04 * Math.exp(-t * 4.5) * Math.sin(t * 26); // spring settle
            pz -= 0.3 * press + wobble; // pushed back, away from the camera
            py -= 0.06 * arc; // knees dip
            if (pokeMode === 'deform') {
              // chibi only: cartoon squash, physics by rubber
              sx += 0.07 * arc;
              sy -= poke.squash * 1.4 * arc;
              sz += 0.05 * arc;
              rotX += -0.16 * arc; // lean back from the poke
              rotY += (TWIST_AMOUNT[poke.twist] ?? 0.05) * 1.6 * Math.sin(t * Math.PI * 2);
            } else {
              // human: the SKELETON takes the hit. Spine whips back on the
              // press, chest follows a beat later (staggered like a real
              // flinch), the head snaps back with a fading shiver, the
              // shoulders lift and the elbows fold a breath.
              const press2 = Math.min(Math.max(t - 0.05, 0) / 0.08, 1) * Math.exp(-Math.max(0, t - 0.13) * 3.6);
              skSpine = -0.3 * press;
              skChest = -0.34 * press2;
              skHeadX = -0.3 * press + 0.05 * Math.sin(t * 22) * Math.exp(-t * 5);
              skHeadZ = (TWIST_AMOUNT[poke.twist] ?? 0.05) * 2.2 * press;
              skLArm = -0.55 * press;
              skRArm = -0.45 * press;
              skLElb = 0.5 * press;
              skRElb = 0.45 * press;
              skLUp = -0.25 * press; // upper arms lift a breath
              skRUp = -0.25 * press;
            }
          }
          if (laugh > 0) {
            const lt = 1 - laugh; // 0→1 through the giggle
            const bounce = Math.abs(Math.sin(lt * Math.PI * 4.5)) * Math.exp(-lt * 2.0);
            py -= 0.035 * bounce;
            sx += 0.05 * bounce;
            sy -= 0.08 * bounce;
            sz += 0.05 * bounce;
            rotX += -0.12 * Math.sin(lt * Math.PI); // lean back laughing
          }
          // r86: the choreography's whole-body lift rides the root, and its
          // squash/stretch stays chibi-only (cartoon physics on a realistic
          // human reads as rubber — same rule as the poke)
          py += md?.py ?? 0;
          if (md && pokeMode === 'deform') {
            sy += md.squash;
            sx += md.stretch * 0.6;
            sz += md.stretch * 0.6;
          }
          avatar.root.position.set(px, py, pz);
          avatar.root.scale.set(sx * BASE_SX, sy * BASE_SY, sz * BASE_SX);
          avatar.root.rotation.set(rotX, rotY, 0);
        } else {
          const mSy = md && pokeMode === 'deform' ? md.squash : 0;
          const mSx = md && pokeMode === 'deform' ? md.stretch * 0.6 : 0;
          avatar.root.position.set(0, md?.py ?? 0, 0);
          avatar.root.scale.set((1 + mSx) * BASE_SX, (1 + mSy) * BASE_SY, (1 + mSx) * BASE_SX);
          avatar.root.rotation.set(0, 0, 0);
        }

        // speech visemes: duck the emotion shapes while the mouth talks
        const sp = sampleSpeech();
        const duck = sp ? 1 - 0.4 * sp.duck : 1;
        const v = (x: number) => clamp(x * duck + (sp ? 0 : 0), 0, 1);
        const pokeBoost = 0.9 * boost;
        const laughBoost = 0.85 * laugh; // full smile while the giggles play
        const setEm = (name: string, val: number) => avatar!.setExpression(name, val);
        setEm('happy', clamp(v(Math.max(targets.blendShape.joy, targets.blendShape.fun)) + (poke.face === 'happy' ? pokeBoost : 0) + laughBoost, 0, 1));
        setEm('angry', v(targets.blendShape.angry) + (poke.face === 'angry' ? pokeBoost : 0));
        setEm('sad', v(targets.blendShape.sorrow));
        setEm('surprised', poke.face === 'surprised'
          ? clamp(v(targets.blendShape.surprise) + pokeBoost, 0, 1)
          : v(targets.blendShape.surprise));
        setEm('relaxed', v(targets.blendShape.relaxed) + (poke.face === 'relaxed' ? pokeBoost : 0));
        if (sp) {
          const mouth = sp.mouth;
          const on = (want: string) => (sp.vowel === want ? 1 : 0.12);
          setEm('aa', mouth * on('aa'));
          setEm('ih', mouth * on('ih'));
          setEm('ou', mouth * on('ou'));
          setEm('ee', mouth * on('ee'));
          setEm('oh', mouth * on('oh'));
        } else {
          setEm('aa', 0); setEm('ih', 0); setEm('ou', 0);
          setEm('ee', 0); setEm('oh', 0);
        }

        const b = targets.bones;
        const poseTargets: AvatarPose = {
          headX: b.headPitch + skHeadX + (md?.headX ?? 0),
          headY: b.headYaw + (md?.headY ?? 0),
          headZ: b.headRoll + skHeadZ + (md?.headZ ?? 0),
          spineX: b.spinePitch, chestX: b.chestPitch,
          leftUpperArm: b.leftUpperArm + skLUp, rightUpperArm: b.rightUpperArm + skRUp,
          leftLowerArm: b.leftLowerArm, rightLowerArm: b.rightLowerArm,
          spineY: md?.spineY ?? 0, chestZ: md?.chestZ ?? 0,
          lArmX: skLArm + (md?.lArmX ?? 0), rArmX: skRArm + (md?.rArmX ?? 0),
          lElbowZ: skLElb + (md?.lElbowZ ?? 0), rElbowZ: skRElb + (md?.rElbowZ ?? 0),
          // r86: the choreography's forward-lean rides the additive torso
          // channels so it composes with library clips too; the arm raises
          // map to the semantic raise fields (moves.ts convention: left z+
          // / right z− = arm up), so a raise is a raise on every rig.
          spinePitchAdd: skSpine + (md?.spineX ?? 0), chestPitchAdd: skChest,
          lArmRaise: md?.lArmZ ?? 0, rArmRaise: -(md?.rArmZ ?? 0),
        };
        // dialogue-triggered performance: fire the matching LIBRARY clip once
        // on the rising edge. Clip-less kinds keep the skeleton for the
        // additive choreography above (r86).
        if (mv && mvHandled !== mv.kind) {
          mvHandled = mv.kind;
          const clipName = MOVE_CLIP[mv.kind];
          if (clipName) playPerf(clipName);
        } else if (!mv) {
          mvHandled = null;
        }
        // r93: idle handover — when this idle's hold expires and no one-shot
        // performance is on stage, glide into the next idle mid-motion. The
        // body is always inside a live loop: no straight stand between moves.
        if (mixerActive && !perfAction && now >= idleHoldUntil) {
          nextIdle(FADE.idleRotate);
        }
        // r2026-10-04.58: while a library clip drives the body, the skeleton
        // belongs to the mixer — so applyPose there is limited to its designed
        // whisper + additives. r83: it MUST still be called in clip mode,
        // because the poke recoil and head life arrive through its additive
        // channels (spine/chest pitch, arm flinch), which compose on top of
        // whatever the mixer wrote this frame.
        if (avatar.clipDrivesBody) {
          mixer?.update(dt / 1000);
          avatar.applyPose(poseTargets);
        } else {
          avatar.applyPose(poseTargets);
        }
        avatar.update(dt / 1000);
      }

      // r2026-10-04.69: stage props ride the same move clock — pop in when
      // the performance starts, melt away after it ends, micro-animated all
      // the way through. Scale is smoothed so a retriggered move doesn't pop.
      for (const [propId, pg] of propGroups) {
        const on = mv ? propsForMove(mv.kind).some((d) => d.id === propId) : false;
        const want = on && mv ? propPresence(mv.t) : 0;
        pg.scale += (want - pg.scale) * Math.min(1, dt / 110);
        if (pg.scale < 0.02) {
          pg.group.visible = false;
          continue;
        }
        pg.group.visible = true;
        pg.group.scale.setScalar(Math.max(pg.scale, 0.001));
        for (const ap of pg.animParts) {
          if (ap.anim === 'pianoKeys') {
            ap.obj.position.y = ap.base.y - 0.011 * Math.max(0, Math.sin(now * 0.014 + ap.phase));
          } else if (ap.anim === 'softBob') {
            ap.obj.position.y = ap.base.y + 0.008 * Math.sin(now * 0.0045 + ap.phase);
          } else if (ap.anim === 'sway') {
            ap.obj.rotation.z = ap.baseRotZ + 0.09 * Math.sin(now * 0.004 + ap.phase);
          } else if (ap.anim === 'sparkle') {
            ap.obj.scale.setScalar(1 + 0.08 * Math.max(0, Math.sin(now * 0.009 + ap.phase)));
          }
        }
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
      clearTimeout(loadWatchdog);
      window.removeEventListener('resize', onResize);
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', onPointerUp);
      host.removeEventListener('pointercancel', onPointerUp);
      host.removeEventListener('wheel', onWheel);
      avatar?.root.removeFromParent();
      // r69: dispose the stage props with the scene
      for (const pg of propGroups.values()) {
        pg.group.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) (m as THREE.Material).dispose();
        });
        pg.group.removeFromParent();
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [accent, seedKey, lighting]);

  // r91 (Master Simon): no overlay here at all — the empty stage IS the
  // loading state, and the top-left name bar (StatusPlate) carries a mini
  // spinner + the real percentage through lib/load-progress.
  return <div ref={hostRef} className="absolute inset-0 touch-none" aria-label="companion" />;
}
