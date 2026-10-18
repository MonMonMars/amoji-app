'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import { mapFrameToVrm, posesByIds, sampleIdlePoseFrom } from '@amoji/vrm-renderer';
import { tickEngine, lastLaughAt, activeMove, thinkingPoseActive } from '../lib/companion';
import { setLoadProgress } from '../lib/load-progress';
import { type MoveKind } from '../lib/moves';
import { PROPS, propsForMove, propPresence, type PropDef, type PropPart } from '../lib/props';
import { characterById } from '../lib/prefs';
import { modelUrl } from '../lib/asset';
import { pokeStyleFor, poseIdsFor, lookFor } from '../lib/persona';
import { orderIdleClips, personalityMotion } from '../lib/personality';
import { classifyPoke, pokeBodyReaction } from '../lib/poke-hit';
import { clipFreesFeet, collectPlantRest, pinPlantedClipTracks } from '../lib/vrm/plant-feet';
import { chestPokeBounce } from '../lib/vrm/chest-bounce';
import { sampleSpeech } from '../lib/speech';
import { createV1Avatar, createGenericAvatar } from '../lib/vrm/avatar';
import type { Avatar, AvatarPose } from '../lib/vrm/avatar';
import { modularGlbUrl, vrmCandidatesForOutfit } from '../lib/modular/catalog';
import { assembleModular, replaceBodyMeshes, type ModularAssembly } from '../lib/modular/assemble';
import { loadModularGltf } from '../lib/modular/load';
import { publishModularView } from '../lib/modular/storage';
import { PHI_HOME, PHI_MAX, PHI_MIN } from '../lib/orbit-limits';
import { CAM_LERP, getMiniGameView, miniGameModelCandidates, registerGroundPick, resolveGameClip, type GameAnim } from '../lib/minigames';
import { disposeMiniGameStage, updateMiniGameStage } from './minigameStage';

// r97 (Master Simon): idle-clip restoration — the mixer now starts the
// moment the FIRST clip lands (it used to wait for all 26 loads, so a single
// hung URL meant no mixer at all and a permanent T-pose), every URL attempt
// carries a 12s watchdog (a stalled stream can no longer block the chain),
// and the dead tk256ailab host is removed — verified-live library hosts lead
// every chain, with the local mirror as fallback.
// r98 (Master Simon): feet on the floor through TALK. Performance clips
// (sing / dance / piano / violin / punch / jump / bow / hello — the ones a
// speech trigger fires the moment she starts talking about them) used to
// keep their baked root-Y verbatim: authored on rigs of a different scale
// and pose (seated / bent-knee mocap), that hips-Y dragged her body far
// below the r94-pinned idle the instant a talk move took over — she visibly
// "fell" (equivalently: the camera seemed to rise), then popped back up
// when the idle returned. Now EVERY clip's hips-Y is normalized onto our
// rest height — median baseline + over-scale compression + a knee-deep
// floor clamp — while X/Z sway and genuine motion (hops, dips, bows) are
// preserved. The camera target is static and clamped and nothing in the
// speaking path touches it, so no camera change ships in r98.
// r101 (Master Simon): no more black or lying first frames. Some VRMs ship
// a rotated root (Z-up exports), and the old load path only ever yaws the
// facing — nothing un-tilted the body, so those characters lay flat until
// (unless) their first rebased clip frame corrected them; generic VRM 0.x
// models never get clips at all. lib/vrm/avatar.ts now un-tilts hips→head
// to +Y at calibration time (BEFORE the first rendered frame). And the
// avatar no longer steps on stage the instant the glTF parses: she mounts
// INVISIBLE and is revealed only after every texture has decoded AND the
// first pose/clip frame has been applied AND two fully-lit frames have
// been presented — on iPhone Safari a big MToon atlas decodes late, and
// the old code showed the raw rest pose for those frames (the "completely
// black at the beginning" report). The 25s load watchdog can force the
// reveal so a stuck texture never leaves her invisible forever.
// r102 (Master Simon): three iPhone-Safari fixes. (1) The loading bar can
// never freeze at 99% again: byte/clip progress still counts up honestly,
// but once an avatar MOUNTS the remaining wait is the reveal gate (clip
// engine + texture decode + two lit frames) — not byte-measurable — so the
// plate shows an indeterminate "preparing…" until she steps on stage or the
// 25s watchdog retires it. (2) She can never drop off the stage again:
// rebaseClipHips now clamps hips X/Z travel too (r98 clamped Y only, so a
// clip authored on a differently-scaled rig could still WALK the hips
// meters away horizontally), and the render loop hard-clamps the avatar
// root every frame. (3) Voice/SFX disentangle lives in lib/voice.ts +
// lib/sfx.ts (the "bell rings / typing sounds" were movement foley firing
// while every TTS tier stayed silent).
// r103 (Master Simon): relaxed hands + shoulder ROM clamp. (1) The library
// idles animate BODY bones only — standard_idle.vrma's humanoid map carries
// no finger entries at all, and even weightShift.vrma maps just thumb/index
// chains — so between keyframes her fingers sat in the model's rigid rest
// splay. avatar.ts now calibrates a gentle curl per finger ONCE at load
// (fold-test: rotate all phalanges ±0.35 rad about each local axis, keep
// the axis+sign that shortens tip↔wrist — pose-independent) and the render
// loop re-applies it every frame AFTER the mixer and applyPose as
// base·delta (idempotent). Fingers a clip actually animates are tracked in
// clipAnimatedBones — node names scanned from every loaded clip's track
// names, dot- and bracket-binding forms both — and left entirely to the
// clip. (2) A big swing could carry an upper arm past the body midline —
// clampShoulderROM floors the arm's outward (body-relative) direction at
// ~8.6° past plumb, gated to at/below horizontal so dance crosses and
// overhead waves stay free.
// r108 (Master Simon): neutral daylight everywhere — the indoor rig's warm
// cream key ('#fff6ec') read as an orange cast against the warm ember/neon
// backdrops; ONE neutral rig lights every backdrop now, and ACES filmic
// tone mapping at exposure 1.0 pins the color pipeline.
// r109 (Master Simon): intermittent "character renders all black" — three
// hardenings. (1) A texture whose request ERRORED (iPhone network hiccup)
// never decodes, so the r101 texture gate could never pass and the 25s
// watchdog revealed a model with broken texture slots (black). The gate now
// sweeps EVERY texture-typed property (MToon shade/rim/matcap included),
// and after 4s of undecoded textures a one-shot fallback neutralizes the
// broken slots (null map + lifted base color + floored shade color).
// (2) MToon shadeColor could sit near-black and render black at some
// angles — it is floored at mount and in the fallback, and a whisper of
// flat ambient light guarantees no material state can render pure black.
// (3) A NaN sweep for the first 60 frames after mount resets any corrupt
// quaternion/scale, and the reveal gate re-compiles shaders on its first
// pass so nothing compiles against still-empty texture slots.

export interface CompanionCanvasProps {
  onNotice?: (n: { reason: 'webgl' | 'asset' }) => void;
  /** Where the poke landed: head, torso, chest, side, or back. */
  onPoke?: (zone: string) => void;
  /** Fired once when a hand grab starts, so chat can speak a hold line. */
  onHandHold?: () => void;
  accent?: string;
  /** character id — gives her/him a deterministic, personal idle-motion sequence */
  seedKey?: string;
  /**
   * Modular wardrobe. Head GLB is identity; body GLB is the outfit.
   * When either file is missing, the single-VRM candidate chain runs.
   * Head meshes are never rescaled.
   */
  wardrobeHeadId?: string;
  wardrobeBodyId?: string;
  /**
   * Mini-game: load only this character's want-list VRM.
   * No Seed-san demo and no modular stand-in.
   */
  libraryOnly?: boolean;
  /** @deprecated r108: ignored — one neutral daylight rig lights every backdrop */
  lighting?: 'indoor' | 'outdoor';
}

// r2026-10-04.92 (Master Simon): start FURTHER AWAY and at a NORMAL STRAIGHT
// angle — the old phi 1.12 put the camera ~26° above her looking down (an
// "upper camera" close-up). Now the lens sits ~2.4° above eye level, 2.6m
// back: upper body centered, like someone standing across from you. Target
// stays at chest height (y 1.05). Double-tap empty space still returns here.
const HOME = { theta: 0, phi: PHI_HOME, dist: 2.6 };
const HOME_TARGET = new THREE.Vector3(0, 1.05, 0);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

// Polar window lives in lib/orbit-limits.ts (PHI_MIN / PHI_MAX). Theta is
// unclamped (full 360° yaw). Drag, pinch, and reset share the clamp in
// applyCamera below — poke and hand-grab do not write phi.

// r101: texture slots that must hold a DECODED image before the avatar may
// step on stage. On iPhone Safari the big MToon atlases decode late — the
// old code rendered the model while they were still empty (the "completely
// black at the beginning" report).
// r109: sweep EVERY texture-typed property (MToon shadeTexture / rimTexture /
// matcapTexture included), not just the MeshStandardMaterial slots.
const modelTexturesReady = (root: THREE.Object3D): boolean => {
  let ready = true;
  root.traverse((node) => {
    if (!ready) return;
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      for (const v of Object.values(m as unknown as Record<string, unknown>)) {
        const tex = v as THREE.Texture | null;
        if (tex && (tex as unknown as { isTexture?: boolean }).isTexture && !tex.image) {
          ready = false;
          return;
        }
      }
    }
  });
  return ready;
};

// r109: a texture that ERRORED (network hiccup on iPhone) never decodes —
// without a fallback the old gate either never passed (watchdog then
// revealed a black model at 25s) or passed with a broken map that renders
// black. This swaps every still-empty texture for null (the material then
// shows its base color), lifts a black base color to a neutral skin/fabric
// tone, and floors a near-black MToon shadeColor. Idempotent; the caller
// guards with a one-shot flag.
const FALLBACK_BASE = new THREE.Color('#c9b8a6');
const neutralizeBrokenTextures = (root: THREE.Object3D): void => {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const rec = m as unknown as Record<string, unknown>;
      let touched = false;
      for (const key of Object.keys(rec)) {
        const v = rec[key] as THREE.Texture | null;
        if (v && (v as unknown as { isTexture?: boolean }).isTexture && !v.image) {
          rec[key] = null; // failed slot — fall back to the material's base color
          touched = true;
        }
      }
      const std = m as THREE.MeshStandardMaterial;
      if (std.color && !std.map) {
        // no map and a near-black base color can never be right — lift it
        if (Math.max(std.color.r, std.color.g, std.color.b) < 0.08) {
          std.color.copy(FALLBACK_BASE);
          touched = true;
        }
      }
      const shade = (m as unknown as { shadeColor?: THREE.Color }).shadeColor;
      if (shade) {
        const lum = Math.max(shade.r, shade.g, shade.b);
        if (lum < 0.2) {
          if (lum < 1e-4) shade.setRGB(0.45, 0.43, 0.42);
          else shade.multiplyScalar(0.2 / lum); // keep the hue, floor the darkness
          touched = true;
        }
      }
      if (touched) m.needsUpdate = true;
    }
  });
};

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

export default function CompanionCanvas({
  onNotice, onPoke, onHandHold, accent = '#f9a8d4', seedKey, wardrobeHeadId, wardrobeBodyId,
  libraryOnly = false,
}: CompanionCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;
  const onPokeRef = useRef(onPoke);
  onPokeRef.current = onPoke;
  const onHandHoldRef = useRef(onHandHold);
  onHandHoldRef.current = onHandHold;
  // Body swaps must not rebuild the WebGL scene — the head mesh stays.
  const wardrobeBodyRef = useRef(wardrobeBodyId);
  wardrobeBodyRef.current = wardrobeBodyId;
  const libraryOnlyRef = useRef(libraryOnly);
  const showLibraryRef = useRef<() => void>(() => {});
  const swapBodyRef = useRef<(bodyId: string) => void>(() => {});

  useEffect(() => {
    libraryOnlyRef.current = libraryOnly;
  }, [libraryOnly]);

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
    // r101: the watchdog ALSO forces the reveal gate — whatever happened,
    // a stuck texture must never leave her invisible off stage.
    const loadWatchdog = setTimeout(() => {
      setLoadProgress(null);
      forceReveal = true;
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
    // r108 (Master Simon): pin the color pipeline — ACES filmic at exposure
    // 1.0 keeps highlights from clipping warm and leaves midtones neutral.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // transparent canvas — the page's themed gradient shows through (alpha:true)
    scene.background = null;
    // r2026-10-05.108 (Master Simon): ONE neutral daylight rig for every
    // backdrop. The r77 indoor branch keyed her with a warm cream lamp
    // ('#fff6ec') that, against the warm ember/neon backdrops (the only
    // 'indoor' settings), read as a full orange cast — the "strange colors"
    // report. The indoor/outdoor switch is gone: cool sky over a
    // desaturated ground bounce, one clean white sun key, one cool fill —
    // nothing on the character picks up a color cast.
    // These are scene-level lights: ANY avatar added to the scene (initial
    // load or a character switch, which remounts this effect) is inside
    // their range by construction — there is no per-model light to miss.
    scene.add(new THREE.HemisphereLight('#f2f7ff', '#8f8a80', 0.85));
    const sun = new THREE.DirectionalLight('#ffffff', 1.75);
    sun.position.set(2.2, 3.8, 2.0);
    scene.add(sun);
    const bounce = new THREE.DirectionalLight('#e3eaf5', 0.3);
    bounce.position.set(-1.8, 0.6, -1.4);
    scene.add(bounce);
    // r109: lighting floor — a whisper of flat ambient so that NO material
    // state (a black toon shade, a failed texture slot) can ever render
    // pure black, whatever the toon ramp says.
    scene.add(new THREE.AmbientLight('#ffffff', 0.14));

    const camera = new THREE.PerspectiveCamera(35, host.clientWidth / host.clientHeight, 0.1, 20);

    // spherical orbit state + pannable look-target
    const target = HOME_TARGET.clone();
    const orbit = { theta: HOME.theta, phi: HOME.phi, dist: HOME.dist };
    const applyCamera = () => {
      orbit.phi = clamp(orbit.phi, PHI_MIN, PHI_MAX);
      orbit.dist = clamp(orbit.dist, 0.7, 5);
      target.x = clamp(target.x, -0.9, 0.9);
      target.y = clamp(target.y, 0.12, 1.28);
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
    let lastReported: number | 'prep' = -1;
    // r102: once an avatar is MOUNTED the remaining wait is the reveal gate
    // (clip engine + texture decode + two lit frames) — none of it is
    // byte-measurable, so counting a percentage from there would be fiction.
    // The bar goes honestly INDETERMINATE ('prep' → "preparing…" on the
    // plate) until she steps on stage, instead of creeping to 99 and
    // freezing there. A character switch remounts this effect, which resets
    // everything (setLoadProgress(0) runs at effect start).
    let mounted = false;
    const reportProgress = () => {
      if (mounted) {
        if (lastReported !== 'prep') { lastReported = 'prep'; setLoadProgress('prep'); }
        return;
      }
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
    const blendNodes: THREE.Object3D[] = [];
    const blendFrom: THREE.Quaternion[] = [];
    const blendQ = new THREE.Quaternion();
    let blendT0 = -1;
    let blendDur = 0.68;
    let blendAvatar: Avatar | null = null;
    const beginBoneBlend = (seconds = 0.68) => {
      if (!avatar) return;
      if (blendAvatar !== avatar) {
        blendNodes.length = 0;
        blendFrom.length = 0;
        avatar.root.traverse((n) => {
          if ((n as THREE.Bone).isBone) {
            blendNodes.push(n);
            blendFrom.push(new THREE.Quaternion());
          }
        });
        blendAvatar = avatar;
      }
      for (let i = 0; i < blendNodes.length; i++) blendFrom[i]!.copy(blendNodes[i]!.quaternion);
      blendT0 = performance.now();
      blendDur = seconds;
    };
    const applyBoneBlend = (nowMs: number) => {
      if (blendT0 < 0) return;
      const u = (nowMs - blendT0) / (blendDur * 1000);
      if (u >= 1) { blendT0 = -1; return; }
      const k = u * u * u * (u * (u * 6 - 15) + 10);
      for (let i = 0; i < blendNodes.length; i++) {
        blendQ.copy(blendFrom[i]!).slerp(blendNodes[i]!.quaternion, k);
        blendNodes[i]!.quaternion.copy(blendQ);
      }
    };
    let mixer: THREE.AnimationMixer | null = null;
    let mixerActive = false;
    // r101 reveal gate — the avatar mounts INVISIBLE and steps on stage only
    // when textures are decoded AND the first pose/clip frame is applied AND
    // two fully-lit frames have been presented. forceReveal (the 25s load
    // watchdog) overrides so nothing can keep her invisible forever.
    let revealPending = false;
    let revealPoseApplied = false;
    let revealLitFrames = 0;
    let forceReveal = false;
    // r109: reveal-gate hardening state — mount timestamp (textures that
    // never decode must not hold her hostage until the 25s watchdog),
    // frames since mount (NaN sweep window), the one-shot flag for the
    // texture-error fallback, and a once-only log guard for the sweep.
    let mountTime = 0;
    let mountFrame = 0;
    let textureFallbackApplied = false;
    let nanLogged = false;
    // per-character motion personality: Rin always fidgets the same way,
    // Ren drifts through his own calm sequence — deterministic per character.
    const poseSeed = seedKey ? seedFromKey(seedKey) : Date.now() % 100000;
    const gender = seedKey ? characterById(seedKey).gender : 'female';
    // r2026-10-03.04: each character drifts through a personality-curated
    // subset of the pose library instead of the full shared catalog.
    const poseSubset = posesByIds(poseIdsFor(seedKey ?? 'juno'));
    const poke = pokeStyleFor(seedKey ?? 'juno');
    // r2026-10-03.28: per-character look — the shared open-license VRM gets a
    // gentle palette tint and an individual build (height/shoulders), so each
    // character reads as her/his own person in the 3D scene.
    const look = lookFor(seedKey ?? 'a01-shino');
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
    const MODEL_CANDIDATES = libraryOnlyRef.current
      ? miniGameModelCandidates(ownModel)
      : [ownModel, 'seed-san.vrm'].filter((m): m is string => !!m);

    // -- clip library ---------------------------------------------------------
    // r2026-10-12 (Mon): short upright standing idle rotation — in-repo
    // `/models/anims` only for the core set. No Impatient / IdleSassy / chin-
    // hand / hug / dwarf / cocky / bored idles in the default pool (they read
    // exaggerated or broken on VRoid companions). Optional remotes load last
    // and only if reachable; rebaseClipHips pins feet + yaw-only hips on idles.
    const ANIM_MIRROR = `${ASSET_BASE}/models/anims`;
    const CHAT_HOST = 'https://raw.githubusercontent.com/DavinciDreams/3dchat/main/public/animations/vrma';
    const ALT_HOST = 'https://raw.githubusercontent.com/hirokazuniimoto/virtual-avatar-sdk/main/assets/animations';
    const ST_HOST = 'https://raw.githubusercontent.com/test157t/VRM-Assets-Pack-For-Silly-Tavern/main/animation_nitral-fork';

    interface ClipSource { id: string; urls: string[] }
    const IDLE_SOURCES: ClipSource[] = [
      { id: 'IdleBreathCalm', urls: [`${ANIM_MIRROR}/IdleBreathCalm.vrma`] },
      { id: 'IdleNeutral', urls: [`${ANIM_MIRROR}/IdleNeutral.vrma`] },
      { id: 'LookAround', urls: [`${ANIM_MIRROR}/LookAround.vrma`] },
      { id: 'Relax', urls: [`${ANIM_MIRROR}/Relax.vrma`] },
      { id: 'Thinking', urls: [`${ANIM_MIRROR}/Thinking.vrma`] },
      // optional tail — only enter rotation if fetch succeeds; feet planted + hips yaw-only
      { id: 'WeightShift', urls: [`${CHAT_HOST}/weightShift.vrma`] },
      { id: 'StandardIdle', urls: [`${ALT_HOST}/standard_idle.vrma`] },
    ];
    // one-shot dialogue performances (library clips with a real ending)
    // r96 (Master Simon): the move triggers get REAL performances too —
    // dance / sing / kungfu / piano / violin fire actual keyframed mocap
    // from the 3dchat Mixamo-class library (file list verified via the
    // GitHub API) instead of leaving the body in its idle.
    // r106: eat / dine join them. No literal eating clip exists in any
    // reachable free VRMA library (3dchat / desktop-waifu / MotionPack all
    // fully listed), so eat takes smoking.vrma — repetitive pinched-finger
    // hand-to-mouth, the closest real motion to steady bites — and dine
    // takes blowAKiss.vrma, one graceful hand raise to lips (a toast/sip).
    // Kinds still without a clip (taichi / jog / yoga / stretch) keep the
    // r95 rule: the skeleton stays in the library idle.
    const PERF_SOURCES: ClipSource[] = [
      { id: 'Jump', urls: [`${ANIM_MIRROR}/Jump.vrma`] },
      { id: 'Bow', urls: [`${ALT_HOST}/quick_formal_bow.vrma`, `${ANIM_MIRROR}/Bow.vrma`] },
      { id: 'Hello', urls: [`${ST_HOST}/hello.vrma`, `${ANIM_MIRROR}/Hello.vrma`] },
      { id: 'Dance', urls: [`${CHAT_HOST}/hipHopDancing.vrma`, `${ANIM_MIRROR}/Dance.vrma`] },
      { id: 'Sing', urls: [`${CHAT_HOST}/singing.vrma`, `${ANIM_MIRROR}/Sing.vrma`] },
      { id: 'Punch', urls: [`${CHAT_HOST}/punch.vrma`, `${ANIM_MIRROR}/Punch.vrma`] },
      { id: 'Piano', urls: [`${CHAT_HOST}/pianoPlaying.vrma`, `${ANIM_MIRROR}/Piano.vrma`] },
      { id: 'Violin', urls: [`${CHAT_HOST}/playingTheViolin.vrma`, `${ANIM_MIRROR}/Violin.vrma`] },
      // r106: eating performances — hand-to-mouth proxies, see note above
      { id: 'Eat', urls: [`${CHAT_HOST}/smoking.vrma`, `${ANIM_MIRROR}/Eat.vrma`] },
      { id: 'Dine', urls: [`${CHAT_HOST}/blowAKiss.vrma`, `${ANIM_MIRROR}/Dine.vrma`] },
      // r110 (Master Simon): emotion performances from the recovered handoff
      // library — cheer-ups and reactions get REAL keyframed body language
      // (her "you did it!" is a literal cheer, not just a smile blendshape).
      { id: 'Cheer', urls: [`${ANIM_MIRROR}/Cheer.vrma`] },
      { id: 'Clapping', urls: [`${ANIM_MIRROR}/Clapping.vrma`] },
      { id: 'Idea', urls: [`${ANIM_MIRROR}/Idea.vrma`] },
      { id: 'Goodbye', urls: [`${ANIM_MIRROR}/Goodbye.vrma`] },
      { id: 'Blush', urls: [`${ANIM_MIRROR}/Blush.vrma`] },
    ];
    const TOTAL_CLIPS = IDLE_SOURCES.length + PERF_SOURCES.length;
    const clips = new Map<string, THREE.AnimationClip>();
    // r103: node names of every bone ANY loaded clip animates — scanned from
    // each clip's track names as it lands. The avatar hands those bones to
    // the mixer untouched; relaxed hands apply only to fingers no clip keys.
    // The SAME live Set is shared with the avatar (filled after mount —
    // clips stream in asynchronously), so no re-handshake is ever needed.
    const clipAnimatedBones = new Set<string>();
    let idleAction: THREE.AnimationAction | null = null;
    let perfAction: THREE.AnimationAction | null = null;
    let perfClipId: string | null = null;
    let idleOrder: string[] = [];
    let idleClipId = '';
    let thinkMiss = false;
    let idleIdx = 0;
    // r93: when the current idle hands over to the next one (RAF clock, ms).
    // The handover is a crossfade between two LIVE loops — never a freeze.
    let idleHoldUntil = Infinity;
    // dialogue performances that have a matching library clip; move kinds
    // without one keep the library idle (r95/r96) — the skeleton is never
    // rotated by formula.
    const MOVE_CLIP: Partial<Record<MoveKind, string>> = {
      jump: 'Jump',
      dance: 'Dance',
      sing: 'Sing',
      kungfu: 'Punch',
      piano: 'Piano',
      violin: 'Violin',
      eat: 'Eat',
      dine: 'Dine',
      // r110: emotion performances (recovered handoff library)
      cheer: 'Cheer',
      clap: 'Clapping',
      idea: 'Idea',
      goodbye: 'Goodbye',
      blush: 'Blush',
    };
    // r2026-10-04.59 (Master Simon): EVERY clip change is a blend, never a
    // jump — pose A at 10° glides into pose B at 90° over `fade` seconds.
    // The mixer crossfades bone quaternions, so intermediate frames are real
    // in-between poses, not snaps.
    const FADE = {
      entry: 1.15,     // procedural pose → first library clip
      idleRotate: 1.65, // longer glide so idle loops don't snap
      toPerf: 0.6,     // idle → one-shot performance
      perfCut: 0.35,   // performance → interrupted by another performance
      perfEnd: 0.85,   // finished performance → back to idle
    };

    const playClipAsIdle = (clip: THREE.AnimationClip, id: string, fade: number) => {
      if (!mixer) return;
      beginBoneBlend(0.7);
      const action = mixer.clipAction(clip);
      action.timeScale = personalityMotion(seedKey ?? '', gender).timeScale;
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
      idleClipId = id;
      // hold this idle for 1–2 of its own beats, then hand over mid-motion
      const holdMs = Math.min(14000, Math.max(5000, clip.duration * 1000 * (1 + Math.random())));
      idleHoldUntil = performance.now() + holdMs;
    };

    const nextIdle = (fade: number) => {
      if (!mixer || !idleOrder.length) return;
      const id = idleOrder[idleIdx % idleOrder.length]!;
      idleIdx++;
      const clip = clips.get(id);
      if (!clip) return;
      playClipAsIdle(clip, id, fade);
    };

    const playNamedIdle = (id: string, fade: number): boolean => {
      const clip = clips.get(id);
      if (!clip) return false;
      playClipAsIdle(clip, id, fade);
      return true;
    };

    const playPerf = (name: string) => {
      if (!mixer) return;
      const clip = clips.get(name);
      if (!clip) return;
      perfClipId = name;
      beginBoneBlend(0.7);
      const action = mixer.clipAction(clip);
      action.timeScale = personalityMotion(seedKey ?? '', gender).timeScale;
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
          // A mini-game pose holds its last frame. Idle stays paused until exit.
          if (getMiniGameView()) return;
          // a one-shot performance ended → glide back into the idle playlist
          perfAction = null;
          perfClipId = null;
          nextIdle(FADE.perfEnd);
        }
        // r93: idles never "finish" — they loop until the swap timer hands
        // over mid-motion, so there is no clamped end-frame freeze to
        // recover from and no neutral stand between idle movements
      });
      // per-character deterministic idle playlist — r93: the WHOLE idle pool
      // (16 library idles), each character rotated into a personal order
      idleOrder = orderIdleClips(
        IDLE_SOURCES.map((s) => s.id).filter((id) => clips.has(id)),
        seedKey ?? '',
        gender,
      );
      if (!idleOrder.length) idleOrder = orderIdleClips([...clips.keys()], seedKey ?? '', gender);
      idleIdx = 0;
      mixerActive = true;
      if (avatar) avatar.clipDrivesBody = true;
      // r59: blend IN from the current (procedural) pose over ~a second —
      // the very first clip no longer pops in from nowhere
      nextIdle(FADE.entry);
      // r124 / r2026-10-12: after the entry crossfade settles, re-measure
      // facing (yaw) and upright (hips→head pitch/roll) on the inner model.
      {
        const av = avatar;
        if (av) {
          setTimeout(() => {
            av.recalibrateUpright();
            av.recalibrateFacing();
          }, 900);
        }
      }
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
      // Hips + both legs, captured while the rig is still at rest. Non-walk
      // / non-jump clips get these tracks pinned so idle knee-bends cannot
      // hover the soles.
      const plantRest = collectPlantRest((name) => {
        try {
          return vrm.humanoid?.getNormalizedBoneNode(name as 'hips') ?? null;
        } catch {
          return null;
        }
      });
      // r94 (Master Simon): "she keeps floating up and down — keep her feet
      // on the ground". Many library idles carry breathing/bounce keys on
      // the hips Y that read as floating. Idle loops get their hips HEIGHT
      // pinned to our rest foot-planted height (X/Z sway — weight shifts —
      // is preserved).
      // r98 (Master Simon): the SAME protection now covers the performance
      // clips. Talking replies trigger MOVE_CLIP performances (sing / dance /
      // piano / violin / punch / jump / bow / hello) the moment speech
      // starts, and those clips carry baked root-Y authored on rigs of
      // a different scale and pose (seated / bent-knee mocap). Handed to the
      // mixer verbatim, that hips-Y sank her far below the r94-pinned idle —
      // she visibly "fell" when talking began (equivalently: the camera
      // seemed to rise), then popped back up when the idle returned. Now
      // EVERY clip's hips-Y is normalized onto OUR rest height: the track's
      // MEDIAN key becomes its standing baseline (robust against a first
      // frame that already sits low), over-scale rig units are compressed
      // to a human hip-travel span, and no key may sink below a knee-deep
      // floor. X/Z sway and all genuine motion (hops, dips, bows) survive.
      const IDLE_IDS = new Set(IDLE_SOURCES.map((s) => s.id));
      const HIP_TRAVEL_MAX = 0.8; // meters — no human hips-Y span exceeds this
      const FLOOR_FRAC = 0.55;    // never sink below 55% of rest hips height
      // r102: same idea on the horizontal plane — a clip authored on a rig
      // at another scale can walk the hips METERS away in X/Z (she slid
      // right off the stage). Sway and steps survive; migration does not.
      const HORIZ_TRAVEL_MAX = 1.0; // meters of total hips X/Z drift from rest
      const rebaseClipHips = (clip: THREE.AnimationClip, lockFeet: boolean) => {
        if (!hipsNode || !hipsRestQ || !hipsRestP) return;
        const floorY = hipsRestP.y * FLOOR_FRAC;
        for (const track of clip.tracks) {
          // r113: match the hips track by REDUCING the binding path to its
          // bare node name — the library emits `J_Bip_C_Hips.position`
          // (no leading dot), while the old dot-wrapped tag `.Name.` only
          // matched the `.Name.position` form and silently skipped every
          // clip, letting foreign-rig baked hips-Y drop her at first talk.
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
          if (bone !== hipsNode.name) continue;
          const v = track.values;
          if (track.name.endsWith('.quaternion')) {
            const q0 = new THREE.Quaternion(v[0]!, v[1]!, v[2]!, v[3]!);
            const fix = hipsRestQ.clone().multiply(q0.invert());
            const q = new THREE.Quaternion();
            const qYaw = new THREE.Quaternion();
            const eDelta = new THREE.Euler(0, 0, 0, 'YXZ');
            for (let i = 0; i + 3 < v.length; i += 4) {
              q.set(v[i]!, v[i + 1]!, v[i + 2]!, v[i + 3]!).premultiply(fix);
              if (lockFeet) {
                // r2026-10-12: library idles often bake a constant hips pitch/roll
                // on foreign rigs — after landing frame 0 on our rest, keep only
                // yaw so the torso stays world-up (facing yaw is fine).
                q.copy(hipsRestQ.clone().invert().multiply(q));
                eDelta.setFromQuaternion(q, 'YXZ');
                eDelta.x = 0;
                eDelta.z = 0;
                qYaw.setFromEuler(eDelta);
                q.copy(hipsRestQ).multiply(qYaw);
              }
              v[i] = q.x; v[i + 1] = q.y; v[i + 2] = q.z; v[i + 3] = q.w;
            }
          } else if (track.name.endsWith('.position')) {
            const p0x = v[0]!, p0z = v[2]!;
            if (lockFeet) {
              // Idles keep the hips parked on the rest pose. X/Z sway used
              // to drag both feet across the floor.
              for (let i = 0; i + 2 < v.length; i += 3) {
                v[i] = hipsRestP.x;
                v[i + 1] = hipsRestP.y;
                v[i + 2] = hipsRestP.z;
              }
            } else {
              // r98: performances keep their REAL Y motion (hops, dips,
              // bows) as deltas around our rest height, but the normalized
              // baseline can never drag her below the floor
              const n = Math.floor(v.length / 3);
              if (!n) continue;
              const ys: number[] = [];
              let minY = Infinity, maxY = -Infinity;
              for (let i = 0; i < n; i++) {
                const y = v[i * 3 + 1]!;
                ys.push(y);
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
              ys.sort((a, b) => a - b);
              const anchorY = ys[Math.floor(ys.length / 2)]!;
              const span = maxY - minY;
              const spanScale = span > HIP_TRAVEL_MAX ? HIP_TRAVEL_MAX / span : 1;
              for (let i = 0; i < n; i++) {
                // r102: same horizontal clamp as the idle branch (above)
                let dx = v[i * 3]! - p0x;
                let dz = v[i * 3 + 2]! - p0z;
                const h = Math.hypot(dx, dz);
                if (h > HORIZ_TRAVEL_MAX) {
                  const s = HORIZ_TRAVEL_MAX / h;
                  dx *= s;
                  dz *= s;
                }
                v[i * 3] = dx + hipsRestP.x;
                let y = (v[i * 3 + 1]! - anchorY) * spanScale + hipsRestP.y;
                if (y < floorY) y = floorY;
                v[i * 3 + 1] = y;
                v[i * 3 + 2] = dz + hipsRestP.z;
              }
            }
          }
        }
      };
      let pending = TOTAL_CLIPS;
      // r97: the mixer starts when the FIRST clip lands, not when all 26
      // resolve — one hung URL used to mean no mixer ever = the T-pose stand
      let engineStarted = false;
      const done = () => {
        // r84: every resolved clip (success or exhausted retries) nudges the
        // loading indicator, so the percentage keeps moving even while the
        // model itself is already cached/fast
        clipDone += 1;
        reportProgress();
        if (!engineStarted && clips.size > 0 && avatar) {
          engineStarted = true;
          startClipEngine(vrm);
        }
        pending -= 1;
        // r103 (one-time evidence): what does the library ACTUALLY animate?
        // Logged when the last clip settles — the relaxed-hand guard keys on
        // this (standard_idle.vrma maps zero finger bones; weightShift.vrma
        // only thumb/index — so the calibrated curl almost always applies).
        if (pending === 0 && avatar) {
          const fingers = [...clipAnimatedBones].filter((n) => avatar!.fingerBones.has(n));
          console.info(`[amoji] r103: ${clips.size} clips, ${clipAnimatedBones.size} animated bones, clip-driven fingers: ${fingers.length ? fingers.join(', ') : 'none'}`);
        }
      };
      // try each candidate URL in order: verified-live library first, the
      // local mirror as fallback (r97 — the dead hosts were cut, see above)
      const loadOne = (src: ClipSource, idx = 0) => {
        if (idx >= src.urls.length) {
          done();
          return;
        }
        // r97: per-attempt watchdog — without it a stalled stream (bytes
        // flowing, no load/error event) hung this chain forever and, with
        // the old all-clips gate, kept her in the T-pose. 12s per attempt,
        // then the chain falls through to the next URL. `settled` guards
        // against double-firing when a late load/error lands after the
        // watchdog already moved on.
        let settled = false;
        const attemptTimer = setTimeout(() => {
          if (settled) return;
          settled = true;
          loadOne(src, idx + 1);
        }, 12_000);
        animLoader.load(src.urls[idx]!, (animGltf) => {
          if (settled) return;
          settled = true;
          clearTimeout(attemptTimer);
          try {
            const anims = (animGltf as unknown as { userData: { vrmAnimations: VRMAnimation[] } }).userData.vrmAnimations;
            if (anims?.length && avatar) {
              const clip = createVRMAnimationClip(anims[0]!, vrm);
              // expression tracks stay ours — speech/visemes own the face
              clip.tracks = clip.tracks.filter((t) => !t.name.includes('expression'));
              // r79: land the clip's neutral frame on our calibrated rest;
              // r94: idle loops pin the hips height (no floating);
              // r98: performances normalize their root-Y onto our rest too
              rebaseClipHips(clip, IDLE_IDS.has(src.id));
              if (!clipFreesFeet(src.id)) pinPlantedClipTracks(clip, plantRest);
              if (clip.tracks.length) clips.set(src.id, clip);
              // r103: record which bones this clip drives, so the avatar can
              // leave them to the mixer. Track names arrive as PropertyBinding
              // paths — `Bone.quaternion`, `.Bone.quaternion`, or
              // `.bones[Bone].quaternion` — all reduce to the bare node name.
              for (const t of clip.tracks) {
                if (!t.name.endsWith('.quaternion')) continue;
                const path = t.name.slice(0, -'.quaternion'.length);
                const bone = path.includes('[') && path.endsWith(']')
                  ? path.slice(path.lastIndexOf('[') + 1, -1)
                  : path.slice(path.lastIndexOf('.') + 1);
                clipAnimatedBones.add(bone);
              }
            }
          } catch { /* this clip is unusable on this rig — skip it */ }
          done();
        }, undefined, () => {
          if (settled) return;
          settled = true;
          clearTimeout(attemptTimer);
          loadOne(src, idx + 1);
        });
      };
      for (const src of [...IDLE_SOURCES, ...PERF_SOURCES]) loadOne(src);
    };

    const mountAvatar = (a: Avatar) => {
      avatar = a;
      scene.add(a.root);
      a.root.position.set(0, 0, 0);
      // r101 (Master Simon): she mounts INVISIBLE and steps on stage only
      // through the reveal gate in the render loop — textures decoded AND
      // the first pose/clip frame applied AND two fully-lit frames
      // presented. No black (late-decoding MToon atlas), no raw T-pose, no
      // lying-flat first frame is ever shown.
      a.root.visible = false;
      revealPending = true;
      revealPoseApplied = false;
      revealLitFrames = 0;
      // r109: reset the reveal-gate hardening state for this mount.
      mountTime = performance.now();
      mountFrame = 0;
      textureFallbackApplied = false;
      nanLogged = false;
      // r102: from this moment the honest progress state is 'prep' — the
      // reveal-gate wait is not byte-measurable (see reportProgress above)
      mounted = true;
      // warm every shader program + upload whatever has decoded while she
      // is still off stage, so her first visible frame is fully lit
      renderer.compile(scene, camera);
      // r84/r91 — progress reporting continues, but the spinner now retires
      // at the REVEAL (she counts as loaded only when she is actually on
      // stage, textured, posed and lit), not at glTF parse time
      modelPct = 100;
      reportProgress();

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
          // r109: MToon shadeColor floor — a near-black shade color plus
          // toon lighting can render near-black at some angles (the "all
          // black" reports). Lift it the same way neutralizeBrokenTextures
          // does.
          const shade = (m as unknown as { shadeColor?: THREE.Color }).shadeColor;
          if (shade) {
            const lum = Math.max(shade.r, shade.g, shade.b);
            if (lum < 0.2) {
              if (lum < 1e-4) shade.setRGB(0.45, 0.43, 0.42);
              else shade.multiplyScalar(0.2 / lum); // keep the hue, floor the darkness
            }
          }
        }
      });
    };

    const loadPlain = (index: number, url: string, token: number) => {
      const plain = new GLTFLoader();
      plain.load(url, (gltf) => {
        if (cancelled || token !== loadToken) return;
        try {
          // r103: hand the shared clip-animated-bone set to the avatar — the
          // relaxed-hand guard reads it per frame (clips never load on this
          // path, so the set stays empty and every finger gets the curl)
          mountAvatar(createGenericAvatar(gltf, clipAnimatedBones));
          shownModel = activeCandidates[index] ?? '';
          loadingModel = '';
        } catch {
          loadModel(index + 1, token);
        }
      }, (ev) => {
        // r84: byte-level progress for the loading indicator
        if (cancelled || token !== loadToken) return;
        if (ev.lengthComputable && ev.total > 0) {
          modelPct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
          reportProgress();
        }
      }, () => {
        if (cancelled || token !== loadToken) return;
        loadModel(index + 1, token);
      });
    };

    let cancelled = false;
    let modularAsm: ModularAssembly | null = null;
    // False until the first modular attempt settles. Outfit clicks during
    // that window are applied from wardrobeBodyRef at settle time.
    let swapsLive = false;
    let loadToken = 0;
    let activeCandidates = MODEL_CANDIDATES;
    let swapReq = 0;
    let shownModel = '';
    let loadingModel = '';

    const candidatesFor = (bodyId?: string) => (
      bodyId
        ? vrmCandidatesForOutfit(bodyId, ownModel, (id) => characterById(id).model)
        : MODEL_CANDIDATES
    );

    const clearAvatar = () => {
      avatar?.root.removeFromParent();
      avatar = null;
      mounted = false;
    };

    /** Drop the current mesh and load this candidate chain. A newer call wins. */
    const beginLoad = (candidates: string[]) => {
      loadToken += 1;
      activeCandidates = candidates;
      loadingModel = candidates[0] ?? '';
      shownModel = '';
      clearAvatar();
      modelPct = 0;
      setLoadProgress(0);
      loadModel(0, loadToken);
    };

    const mountModular = async (headId: string, bodyId: string): Promise<boolean> => {
      publishModularView('loading');
      const bodyGltf = await loadModularGltf(modularGlbUrl(bodyId, 'body'), true);
      const headGltf = await loadModularGltf(modularGlbUrl(headId, 'head'), false);
      if (cancelled) return true;
      const asm = assembleModular(bodyGltf, headGltf);
      modularAsm = asm;
      let shownBody = bodyId;
      const latestBody = wardrobeBodyRef.current;
      if (latestBody && latestBody !== bodyId) {
        try {
          const next = await loadModularGltf(modularGlbUrl(latestBody, 'body'), false);
          if (cancelled) return true;
          replaceBodyMeshes(asm, next);
          shownBody = latestBody;
        } catch { /* keep the outfit that did load */ }
      }
      if (cancelled) return true;
      const v = (bodyGltf.userData as { vrm?: VRM }).vrm;
      if (v) {
        mountAvatar(createV1Avatar(v, clipAnimatedBones));
        loadClips(v);
      } else {
        mountAvatar(createGenericAvatar(bodyGltf, clipAnimatedBones));
      }
      shownModel = 'modular';
      loadingModel = '';
      publishModularView('modular');
      swapsLive = true;
      const after = wardrobeBodyRef.current;
      if (after && after !== shownBody) swapBodyRef.current(after);
      return true;
    };

    const loadModel = (index: number, token: number) => {
      if (cancelled || token !== loadToken) return;
      if (index >= activeCandidates.length) {
        // r84 — nothing left to try: stop waiting, show the notice
        loadingModel = '';
        setLoadProgress(null);
        clearTimeout(loadWatchdog);
        onNoticeRef.current?.({ reason: 'asset' });
        return;
      }
      const cand = activeCandidates[index]!;
      const url = modelUrl(cand) ?? `${ASSET_BASE}/models/${cand}`;
      const vrmLoader = new GLTFLoader();
      vrmLoader.register((parser) => new VRMLoaderPlugin(parser));
      vrmLoader.load(url, (gltf) => {
        if (cancelled || token !== loadToken) return;
        const v = (gltf as unknown as { userData: { vrm?: VRM } }).userData.vrm;
        if (!v) {
          loadPlain(index, url, token);
          return;
        }
        // r103: the avatar keeps a LIVE reference to clipAnimatedBones — the
        // clips stream in after the mount and fill the same set
        clearAvatar();
        mountAvatar(createV1Avatar(v, clipAnimatedBones));
        shownModel = cand;
        loadingModel = '';
        loadClips(v);
      }, (ev) => {
        // r84: byte-level progress for the loading indicator
        if (cancelled || token !== loadToken) return;
        if (ev.lengthComputable && ev.total > 0) {
          modelPct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
          reportProgress();
        }
      }, () => {
        if (cancelled || token !== loadToken) return;
        loadPlain(index, url, token);
      });
    };
    swapBodyRef.current = (bodyId: string) => {
      if (cancelled || !swapsLive || !wardrobeHeadId) return;
      if (modularAsm) {
        const req = ++swapReq;
        loadModularGltf(modularGlbUrl(bodyId, 'body'), false).then((gltf) => {
          if (cancelled || req !== swapReq || !modularAsm) return;
          if (wardrobeBodyRef.current !== bodyId) return;
          replaceBodyMeshes(modularAsm, gltf);
        }).catch(() => {
          // Split body missing — the outfit's full VRM is the visible mesh.
          if (cancelled || req !== swapReq) return;
          modularAsm = null;
          publishModularView('fallback');
          beginLoad(candidatesFor(wardrobeBodyRef.current ?? bodyId));
        });
        return;
      }
      publishModularView('fallback');
      beginLoad(candidatesFor(bodyId));
    };

    const bootAvatar = () => {
      if (libraryOnlyRef.current) {
        publishModularView('idle');
        swapsLive = true;
        beginLoad(miniGameModelCandidates(ownModel));
        return;
      }
      const headId = wardrobeHeadId;
      const bodyId = wardrobeBodyRef.current;
      if (!headId || !bodyId) {
        publishModularView('idle');
        swapsLive = true;
        beginLoad(MODEL_CANDIDATES);
        return;
      }
      mountModular(headId, bodyId).catch(() => {
        if (cancelled) return;
        modularAsm = null;
        swapsLive = true;
        publishModularView('fallback');
        beginLoad(candidatesFor(wardrobeBodyRef.current ?? bodyId));
      });
    };
    const libraryModel = miniGameModelCandidates(ownModel)[0];
    showLibraryRef.current = () => {
      if (cancelled || !libraryOnlyRef.current) return;
      if (!libraryModel) {
        loadingModel = '';
        clearAvatar();
        shownModel = '';
        setLoadProgress(null);
        onNoticeRef.current?.({ reason: 'asset' });
        return;
      }
      if (shownModel === libraryModel || loadingModel === libraryModel) return;
      modularAsm = null;
      publishModularView('idle');
      swapsLive = true;
      beginLoad([libraryModel]);
    };

    bootAvatar();

    // ---- pointer gestures ────────────────────────────────────────────────
    // one finger drag   = rotate around her
    // two finger drag   = move (pan) the camera · pinch = zoom
    // double tap empty  = reset camera · tap / double tap her = poke
    // r115: the poke now knows WHERE it landed (nearest skeleton bone →
    // head/body/armL/armR/belly reaction), and either HAND is grabbable —
    // land a pointer within GRAB_PX of a projected hand bone and you can
    // pull that arm around; it springs home on release.
    const raycaster = new THREE.Raycaster();
    let pokeAt = -Infinity;
    let lastEmptyTap = -Infinity;
    // r115: which body zone the current poke reaction belongs to
    let pokeZone: 'head' | 'torso' | 'chest' | 'side' | 'back' = 'torso';
    let pokeSideSign = 1;
    // Push direction comes from the hit vs the character's facing.
    const pokeFallDir = new THREE.Vector3(0, 0, -1);
    // r2026-10-04.58: which library performance the move trigger already
    // fired for (rising-edge firing — one clip start per triggerMove)
    let mvHandled: MoveKind | null = null;
    const pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number; moved: number }>();
    let pinchDist = 0;
    let lastMid: { x: number; y: number } | null = null;
    // r115 hand-drag state — released<0 means still held
    let handDrag: {
      side: 'left' | 'right'; pointerId: number;
      target: THREE.Vector3; depth: number; infl: number; released: number;
    } | null = null;
    const GRAB_PX = 64;
    // scratch (no per-frame allocation)
    const sHit = new THREE.Vector3();
    const sV1 = new THREE.Vector3(); const sV2 = new THREE.Vector3();
    const sV3 = new THREE.Vector3(); const sV4 = new THREE.Vector3();
    const sQ1 = new THREE.Quaternion(); const sQ2 = new THREE.Quaternion();
    const sQ3 = new THREE.Quaternion();

    const worldOf = (node: THREE.Object3D) => {
      node.getWorldPosition(sV1);
      return { x: sV1.x, y: sV1.y, z: sV1.z };
    };

    const rayHit = (cx: number, cy: number): THREE.Intersection | null => {
      if (!avatar) return null;
      const rect = host.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((cx - rect.left) / rect.width) * 2 - 1,
        -((cy - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(avatar.root, true);
      return hits[0] ?? null;
    };

    // r115: screen-space position + camera depth of a hand bone (for the grab test)
    const handScreen = (side: 'left' | 'right') => {
      const node = avatar?.getBoneNode(side === 'left' ? 'leftHand' : 'rightHand');
      if (!node) return null;
      const rect = host.getBoundingClientRect();
      node.getWorldPosition(sV2);
      const depth = sV2.distanceTo(camera.position);
      sV2.project(camera);
      return {
        x: rect.left + ((sV2.x + 1) / 2) * rect.width,
        y: rect.top + ((-sV2.y + 1) / 2) * rect.height,
        depth,
      };
    };

    const midpoint = () => {
      const pts = [...pointers.values()];
      const a = pts[0]!, b = pts[1]!;
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

    // PC: hold on a blank area away from the bottom scroll strip, then drag
    // vertically to pan. A quick drag is still orbit. Two-finger pan is unchanged.
    let panArm: { id: number; sx: number; sy: number; t: number; on: boolean } | null = null;
    const PAN_HOLD_MS = 320;
    const distantBlank = (cx: number, cy: number) => {
      const rect = host.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return false;
      const nx = (cx - rect.left) / rect.width;
      const ny = (cy - rect.top) / rect.height;
      const side = nx < 0.18 || (nx > 0.82 && ny > 0.2);
      const upper = ny < 0.5 && nx < 0.78;
      return side || upper;
    };

    const onPointerDown = (e: PointerEvent) => {
      host.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0 });
      if (pointers.size === 2) {
        panArm = null;
        const pts = [...pointers.values()];
        const a = pts[0]!, b = pts[1]!;
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        lastMid = midpoint();
      } else if (pointers.size === 1 && avatar && !handDrag) {
        // r115: did the pointer land on a HAND? then it is a grab, not a poke
        for (const side of ['left', 'right'] as const) {
          const hs = handScreen(side);
          if (hs && Math.hypot(e.clientX - hs.x, e.clientY - hs.y) < GRAB_PX) {
            const node = avatar.getBoneNode(side === 'left' ? 'leftHand' : 'rightHand');
            if (!node) break;
            handDrag = {
              side, pointerId: e.pointerId,
              target: node.getWorldPosition(new THREE.Vector3()),
              depth: hs.depth, infl: 0, released: -1,
            };
            beginBoneBlend(0.7);
            onHandHoldRef.current?.();
            break;
          }
        }
        if (!handDrag && !rayHit(e.clientX, e.clientY) && distantBlank(e.clientX, e.clientY)) {
          panArm = { id: e.pointerId, sx: e.clientX, sy: e.clientY, t: performance.now(), on: false };
        }
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
      // r115: a held hand follows the pointer on the camera-facing plane at
      // the grab depth — the camera does NOT rotate while a hand is held.
      if (handDrag && e.pointerId === handDrag.pointerId && handDrag.released < 0) {
        const rect = host.getBoundingClientRect();
        sV3.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
          0.5,
        ).unproject(camera).sub(camera.position).normalize();
        handDrag.target.copy(camera.position).addScaledVector(sV3, handDrag.depth);
        return;
      }
      if (panArm && e.pointerId === panArm.id && pointers.size === 1 && !handDrag) {
        const held = performance.now() - panArm.t;
        const pull = Math.hypot(e.clientX - panArm.sx, e.clientY - panArm.sy);
        if (!panArm.on && held >= PAN_HOLD_MS && Math.abs(e.clientY - panArm.sy) > 6) panArm.on = true;
        if (panArm.on) {
          e.preventDefault();
          const scale = 0.0016 * (orbit.dist / 1.9) * 0.75;
          target.y += dy * scale;
          resetAnim = null;
          applyCamera();
          return;
        }
        if (pull > 10 && held < PAN_HOLD_MS) panArm = null;
      }
      if (pointers.size === 2) {
        panArm = null;
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
      if (panArm && e.pointerId === panArm.id) panArm = null;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {
        pinchDist = 0;
        lastMid = null;
      }
      // r115: letting go of a held hand starts the spring-home glide
      if (handDrag && e.pointerId === handDrag.pointerId && handDrag.released < 0) {
        handDrag.released = performance.now();
        beginBoneBlend(0.7);
      }
      if (!p) return;
      const quick = performance.now() - p.t < 350;
      const still = Math.hypot(e.clientX - p.sx, e.clientY - p.sy) <= 8;
      if (quick && still) {
        const hit = rayHit(e.clientX, e.clientY);
        if (hit) {
          pokeAt = performance.now();
          const hipsN = avatar?.getBoneNode('hips');
          const headN = avatar?.getBoneNode('head');
          const chestN = avatar?.getBoneNode('chest') ?? avatar?.getBoneNode('spine');
          const leftN = avatar?.getBoneNode('leftShoulder');
          const rightN = avatar?.getBoneNode('rightShoulder');
          if (hipsN && headN && chestN && leftN && rightN) {
            const cls = classifyPoke(
              { x: hit.point.x, y: hit.point.y, z: hit.point.z },
              worldOf(hipsN), worldOf(headN), worldOf(chestN), worldOf(leftN), worldOf(rightN),
            );
            pokeZone = cls.zone;
            pokeFallDir.set(cls.impulse.x, 0, cls.impulse.z);
            pokeSideSign = cls.sideSign;
          }
          beginBoneBlend(0.65);
          onPokeRef.current?.(pokeZone);
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

    const groundNdc = new THREE.Vector2();
    const groundHit = new THREE.Vector3();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    registerGroundPick((nx, ny) => {
      groundNdc.set(nx, ny);
      raycaster.setFromCamera(groundNdc, camera);
      const hit = raycaster.ray.intersectPlane(groundPlane, groundHit);
      return hit ? { x: hit.x, z: hit.z } : null;
    });
    const gameCam = new THREE.Vector3();
    let wasGame = false;
    let gameClipKey = '';
    let pausedHidden = false;
    const playGameBody = (anim: GameAnim) => {
      if (!mixer) return;
      const pick = resolveGameClip(anim, new Set(clips.keys()));
      if (!pick) return;
      const key = `${pick.id}:${pick.loop ? 'L' : '1'}`;
      perfClipId = pick.id;
      if (gameClipKey === key) return;
      const clip = clips.get(pick.id);
      if (!clip) return;
      gameClipKey = key;
      beginBoneBlend(0.35);
      const action = mixer.clipAction(clip);
      action.timeScale = anim === 'run' || anim === 'dash' ? 1.15 : 1;
      action.setLoop(pick.loop ? THREE.LoopRepeat : THREE.LoopOnce, pick.loop ? Infinity : 1);
      action.clampWhenFinished = !pick.loop;
      action.reset();
      if (perfAction && perfAction !== action) {
        perfAction.crossFadeTo(action, 0.28, false);
      } else if (idleAction && idleAction !== action) {
        idleAction.crossFadeTo(action, 0.28, false);
      } else {
        action.fadeIn(0.28);
      }
      action.play();
      perfAction = action;
    };

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const gameView = getMiniGameView();
      if (document.hidden && (gameView || pausedHidden)) {
        pausedHidden = true;
        raf = 0;
        return;
      }
      pausedHidden = false;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(100, now - last);
      last = now;

      if (wasGame && !gameView) {
        wasGame = false;
        gameClipKey = '';
        if (perfAction) {
          perfAction.fadeOut(0.3);
          perfAction = null;
          perfClipId = null;
        }
        camera.far = 20;
        camera.updateProjectionMatrix();
        orbit.theta = HOME.theta;
        orbit.phi = HOME.phi;
        orbit.dist = HOME.dist;
        target.copy(HOME_TARGET);
        resetAnim = null;
        nextIdle(FADE.perfEnd);
      }

      if (!gameView && resetAnim) {
        const p = clamp((now - resetAnim.t0) / resetAnim.dur, 0, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        orbit.theta = resetAnim.from.theta + (HOME.theta - resetAnim.from.theta) * ease;
        orbit.phi = resetAnim.from.phi + (HOME.phi - resetAnim.from.phi) * ease;
        orbit.dist = resetAnim.from.dist + (HOME.dist - resetAnim.from.dist) * ease;
        target.lerpVectors(resetAnim.fromTarget, HOME_TARGET, ease);
        if (p >= 1) resetAnim = null;
      }
      if (!gameView) applyCamera();

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
      if (avatar) {
        // Poke and laugh stay on the upper body. The root never translates,
        // scales, or tips — that used to slide and lift both feet.
        const pokeAge = now - pokeAt;
        const boost = pokeAge < 900 ? 1 - pokeAge / 900 : 0;
        const laughAge = now - lastLaughAt();
        const laugh = laughAge >= 0 && laughAge < 1600 ? 1 - laughAge / 1600 : 0;
        let skSpine = 0, skChest = 0, skHeadX = 0, skHeadZ = 0;
        let skSpineY = 0, skChestZ = 0;
        let skLArm = 0, skRArm = 0, skLElb = 0, skRElb = 0, skLUp = 0, skRUp = 0;
        if (boost > 0) {
          const hit = pokeBodyReaction({
            t: 1 - boost,
            zone: pokeZone,
            fallX: pokeFallDir.x,
            fallZ: pokeFallDir.z,
            sideSign: pokeSideSign,
            softChest: pokeZone === 'chest' && gender === 'female',
            twist: TWIST_AMOUNT[poke.twist] ?? 0.05,
          });
          skSpine = hit.spinePitch;
          skChest = hit.chestPitch;
          skSpineY = hit.spineYaw;
          skChestZ = hit.chestRoll;
          skHeadX = hit.headX;
          skHeadZ = hit.headZ;
          skLArm = hit.lArmX;
          skRArm = hit.rArmX;
          skLElb = hit.lElbowZ;
          skRElb = hit.rElbowZ;
          skLUp = hit.lArmUp;
          skRUp = hit.rArmUp;
        }
        if (laugh > 0) {
          const lt = 1 - laugh;
          const bounce = Math.abs(Math.sin(lt * Math.PI * 4.5)) * Math.exp(-lt * 2.0);
          skSpine += -0.1 * Math.sin(lt * Math.PI);
          skChest += -0.06 * bounce;
          skHeadX += -0.12 * Math.sin(lt * Math.PI);
        }
        avatar.root.position.set(0, 0, 0);
        avatar.root.scale.set(BASE_SX, BASE_SY, BASE_SX);
        avatar.root.rotation.set(0, 0, 0);
        // r102: hard on-screen clamp — whatever a clip or reaction wrote
        // into the root this frame, the avatar can never leave the visible
        // stage. The camera target is already clamped (y 0.4–1.7 in
        // applyCamera); this box is the matching root-side guarantee.
        avatar.root.position.x = clamp(avatar.root.position.x, -0.6, 0.6);
        avatar.root.position.y = clamp(avatar.root.position.y, -0.35, 0.5);
        avatar.root.position.z = clamp(avatar.root.position.z, -0.8, 0.8);
        // Dance with no library clip loaded yet: a small sway so the body
        // still answers. The Dance VRMA, when it is playing, is the motion.
        if (mv?.kind === 'dance' && boost === 0 && laugh === 0) {
          const danceClip = clips.get('Dance');
          const clipPlaying = !!(
            perfAction && danceClip
            && perfAction.getClip() === danceClip
            && perfAction.isRunning()
          );
          if (!clipPlaying) {
            const sway = Math.sin(now / 170);
            avatar.root.rotation.y += sway * 0.1;
            avatar.root.rotation.z += sway * 0.04;
            avatar.root.position.y = clamp(avatar.root.position.y + Math.abs(Math.sin(now / 85)) * 0.016, -0.35, 0.5);
          }
        }
        if (gameView) {
          avatar.root.position.set(gameView.vrmX, 0, gameView.vrmZ);
          avatar.root.rotation.set(0, gameView.vrmYaw, 0);
          avatar.root.scale.set(BASE_SX, BASE_SY, BASE_SX);
        }

        // speech visemes: duck the emotion shapes while the mouth talks
        const sp = sampleSpeech();
        const duck = sp ? 1 - 0.4 * sp.duck : 1;
        const v = (x: number) => clamp(x * duck + (sp ? 0 : 0), 0, 1);
        const pokeBoost = 0.9 * boost;
        const laughBoost = 0.85 * laugh; // full smile while the giggles play
        const setEm = (name: string, val: number) => avatar!.setExpression(name, val);
        const performBoost = mv?.kind === 'sing' ? 0.55 : mv?.kind === 'dance' ? 0.4 : 0;
        setEm('happy', clamp(v(Math.max(targets.blendShape.joy, targets.blendShape.fun)) + (poke.face === 'happy' ? pokeBoost : 0) + laughBoost + performBoost, 0, 1));
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
        if (gameView) {
          const expr = gameView.expr;
          setEm('happy', expr.happy ?? 0);
          setEm('angry', expr.angry ?? 0);
          setEm('sad', expr.sad ?? 0);
          setEm('surprised', expr.surprised ?? 0);
          setEm('relaxed', expr.relaxed ?? 0);
          setEm('blink', expr.blink ?? 0);
          setEm('blinkLeft', expr.blinkLeft ?? 0);
          setEm('blinkRight', 0);
        } else {
          setEm('blinkLeft', 0);
          setEm('blinkRight', 0);
        }

        const b = targets.bones;
        const poseTargets: AvatarPose = {
          headX: b.headPitch + skHeadX,
          headY: b.headYaw,
          headZ: b.headRoll + skHeadZ,
          spineX: b.spinePitch, chestX: b.chestPitch,
          leftUpperArm: b.leftUpperArm + skLUp, rightUpperArm: b.rightUpperArm + skRUp,
          leftLowerArm: b.leftLowerArm, rightLowerArm: b.rightLowerArm,
          spineY: skSpineY, chestZ: skChestZ,
          lArmX: skLArm, rArmX: skRArm,
          lElbowZ: skLElb, rElbowZ: skRElb,
          spinePitchAdd: skSpine, chestPitchAdd: skChest,
          lArmRaise: 0, rArmRaise: 0,
        };
        // dialogue-triggered performance: fire the matching LIBRARY clip once
        // on the rising edge. Clip-less kinds keep the skeleton for the
        // additive choreography above (r86).
        if (!gameView && mv && mvHandled !== mv.kind) {
          mvHandled = mv.kind;
          const clipName = MOVE_CLIP[mv.kind];
          if (clipName) playPerf(clipName);
        } else if (!mv) {
          mvHandled = null;
        }
        // r93: idle handover — when this idle's hold expires and no one-shot
        // performance is on stage, glide into the next idle mid-motion. The
        // body is always inside a live loop: no straight stand between moves.
        if (mixerActive && !perfAction && !gameView) {
          if (thinkingPoseActive()) {
            if (idleClipId !== 'Thinking' && !thinkMiss) {
              if (!playNamedIdle('Thinking', FADE.idleRotate)) thinkMiss = true;
              else idleHoldUntil = performance.now() + 20000;
            }
          } else {
            thinkMiss = false;
            if (now >= idleHoldUntil) nextIdle(FADE.idleRotate);
          }
        }
        // r2026-10-04.58: while a library clip drives the body, the skeleton
        // belongs to the mixer — so applyPose there is limited to its designed
        // whisper + additives. r83: it MUST still be called in clip mode,
        // because the poke recoil and head life arrive through its additive
        // channels (spine/chest pitch, arm flinch), which compose on top of
        // whatever the mixer wrote this frame.
        if (gameView) playGameBody(gameView.anim);
        if (avatar.clipDrivesBody) {
          mixer?.update(dt / 1000);
          avatar.applyPose(poseTargets);
        } else {
          avatar.applyPose(poseTargets);
        }
        // r103: relaxed fingers + shoulder ROM run AFTER the mixer and
        // applyPose wrote the skeleton and BEFORE the spring bones react —
        // both are idempotent absolute writes (base·delta / minimal-rotation
        // fix), and both skip whatever a clip actively animates, so they
        // compose cleanly with every driving mode (clip, procedural, recoil).
        avatar.applyRelaxedHands();
        avatar.smoothFingers(dt / 1000);
        avatar.clampShoulderROM();

        // r115: hand-drag override — after everything else wrote the
        // skeleton, pull the grabbed arm's two bones toward the pointer.
        // Influence eases in on grab and glides out over ~0.4s after release
        // (the spring home), then the drag state clears entirely.
        if (handDrag) {
          if (handDrag.released < 0) {
            handDrag.infl = Math.min(1, handDrag.infl + dt / 540);
          } else {
            handDrag.infl = Math.max(0, handDrag.infl - dt / 920);
            if (handDrag.infl <= 0) handDrag = null;
          }
        }
        if (handDrag && handDrag.infl > 0 && avatar) {
          const side = handDrag.side;
          const upN = avatar.getBoneNode(side === 'left' ? 'leftUpperArm' : 'rightUpperArm');
          const loN = avatar.getBoneNode(side === 'left' ? 'leftLowerArm' : 'rightLowerArm');
          const haN = avatar.getBoneNode(side === 'left' ? 'leftHand' : 'rightHand');
          if (upN && loN && haN) {
            // two-bone reach: swing the upper arm so the elbow heads for the
            // target, then the forearm so the hand closes the gap. Each
            // correction is a world-space delta re-expressed in the bone's
            // local frame (pW⁻¹·Δ·pW) and slerped by the influence — partial
            // while easing in, full while held, fading on the spring home.
            const tgt = handDrag.target;
            const k = handDrag.infl * 0.8;
            const reach = (bone: THREE.Object3D, child: THREE.Object3D) => {
              bone.getWorldPosition(sV3);
              child.getWorldPosition(sV4);
              sV1.copy(tgt).sub(sV3).normalize(); // want
              sV2.copy(sV4).sub(sV3).normalize();  // have
              sQ1.setFromUnitVectors(sV2, sV1);   // world delta
              sQ2.identity().slerp(sQ1, k);        // scaled by influence
              if (bone.parent) {
                bone.parent.getWorldQuaternion(sQ3);   // pW
                sQ1.copy(sQ3).invert()                  // pW⁻¹
                  .multiply(sQ2)                          // ·Δ
                  .multiply(sQ3);                         // ·pW
                bone.quaternion.premultiply(sQ1);
              }
            };
            reach(upN, loN);
            reach(loN, haN);
          }
        }

        applyBoneBlend(now);
        // After the mixer, poke additives, and the pose blend: both soles
        // share one ground height. Walk/jump clips are the exception.
        avatar.plantFeet(!clipFreesFeet(perfClipId));
        avatar.update(dt / 1000);
        // Chest poke only: a short damped spring on the bust bones, after
        // the skeleton update so it is not overwritten. Feet stay planted.
        const bounceT = boost > 0 ? (1 - boost) * 0.9 : -1;
        avatar.applyChestBounce(chestPokeBounce(pokeZone, bounceT));

        // r109 NaN sweep: a corrupt clip key or a bad spring-bone write can
        // poison a quaternion/scale and make the whole skinned mesh collapse
        // or render black. For the first 60 frames after mount, sweep the
        // hierarchy and reset any non-finite transform (warned once).
        mountFrame += 1;
        if (mountFrame <= 60) {
          avatar.root.traverse((node) => {
            const q = node.quaternion;
            if (!Number.isFinite(q.x + q.y + q.z + q.w)) {
              q.identity();
              if (!nanLogged) { nanLogged = true; console.warn('[amoji] r109: non-finite quaternion reset'); }
            }
            const s = node.scale;
            if (!Number.isFinite(s.x + s.y + s.z) || s.x === 0 || s.y === 0 || s.z === 0) {
              s.set(1, 1, 1);
              if (!nanLogged) { nanLogged = true; console.warn('[amoji] r109: non-finite/zero scale reset'); }
            }
          });
        }

        // r109 rework of the r101 reveal gate: by this point the skeleton
        // holds its first pose/clip frame. A VRM 1.0 avatar must additionally
        // wait for the clip engine (mixerActive) so a raw T-pose never shows;
        // generic (VRM 0.x) avatars are pose-driven from frame one. Textures
        // must be decoded — but a texture that ERRORED never decodes, so
        // after 4s the one-shot fallback neutralizes the broken slots (null
        // map + lifted base color + floored shade color) and the gate
        // proceeds; the watchdog's forceReveal applies the same fallback and
        // stays an absolute override. The gate's first passing frame
        // re-compiles the shaders so nothing compiles against still-empty
        // texture slots, and two fully-lit frames are counted before she
        // steps on stage.
        revealPoseApplied = true;
        if (revealPending) {
          const poseSettled = mixerActive || avatar.kind !== 'v1';
          let texturesOk = modelTexturesReady(avatar.root);
          if (!texturesOk && !textureFallbackApplied && now - mountTime > 4000) {
            neutralizeBrokenTextures(avatar.root);
            textureFallbackApplied = true;
            texturesOk = true;
          }
          if (forceReveal && !textureFallbackApplied) {
            neutralizeBrokenTextures(avatar.root);
            textureFallbackApplied = true;
            texturesOk = true;
          }
          if (forceReveal || (poseSettled && texturesOk)) {
            revealLitFrames += 1;
            if (revealLitFrames === 1) renderer.compile(scene, camera);
            if (revealLitFrames >= 2) {
              revealPending = false;
              avatar.root.visible = true;
              setLoadProgress(null);
              clearTimeout(loadWatchdog);
            }
          }
        }
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

      if (gameView) {
        const snap = !wasGame || !gameView.camFollow;
        gameCam.set(gameView.camX, gameView.camY, gameView.camZ);
        if (snap) camera.position.copy(gameCam);
        else camera.position.lerp(gameCam, CAM_LERP);
        camera.lookAt(gameView.lookX, gameView.lookY, gameView.lookZ);
        if (!wasGame) {
          camera.far = 80;
          camera.updateProjectionMatrix();
        }
        wasGame = true;
      }
      updateMiniGameStage(scene, gameView);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    const onGameVis = () => {
      if (!document.hidden && pausedHidden && raf === 0) {
        pausedHidden = false;
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onGameVis);

    const onResize = () => {
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      swapBodyRef.current = () => {};
      showLibraryRef.current = () => {};
      publishModularView('idle');
      cancelAnimationFrame(raf);
      clearTimeout(loadWatchdog);
      document.removeEventListener('visibilitychange', onGameVis);
      registerGroundPick(null);
      disposeMiniGameStage(scene);
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
  }, [accent, seedKey, wardrobeHeadId]);

  // Outfit changes hot-swap body meshes when the modular GLBs mounted.
  // Otherwise they reload that outfit's full VRM. A head change rebuilds above.
  useEffect(() => {
    if (libraryOnly || !wardrobeHeadId || !wardrobeBodyId) return;
    swapBodyRef.current(wardrobeBodyId);
  }, [libraryOnly, wardrobeHeadId, wardrobeBodyId]);

  // A round that keeps the same companion still drops Seed-san / modular
  // stand-ins onto her want-list VRM. A different seedKey rebuilds above.
  useEffect(() => {
    if (!libraryOnly) return;
    showLibraryRef.current();
  }, [libraryOnly, seedKey, wardrobeHeadId]);

  // r91 (Master Simon): no overlay here at all — the empty stage IS the
  // loading state, and the top-left name bar (StatusPlate) carries a mini
  // spinner + the real percentage through lib/load-progress.
  return <div ref={hostRef} className="absolute inset-0 touch-none" aria-label="companion" />;
}
