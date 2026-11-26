'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import { mapFrameToVrm, posesByIds, sampleIdlePoseFrom } from '@amoji/vrm-renderer';
import { tickEngine, lastLaughAt, activeMove, thinkingPoseActive, getPerfMotionProfile, clearPerfMotionProfile } from '../lib/companion';
import { setLoadProgress } from '../lib/load-progress';
import { type MoveKind } from '../lib/moves';
import { PROPS, propsForMove, propPresence, propEnterFromTop, propMagicDust, type PropDef, type PropPart } from '../lib/props';
import { characterById } from '../lib/prefs';
import { modelUrl } from '../lib/asset';
import { pokeStyleFor, poseIdsFor, lookFor } from '../lib/persona';
import { DEFAULT_CAMERA_HOME, upperBodyHome } from '../lib/camera-frame';
import { orderIdleClips, personalityMotion } from '../lib/personality';
import {
  classifyPoke,
  screenSideSign,
  screenPointerSideSign,
  lateralFallTowardScreenSide,
  flipPokeFallToFingerSide,
  directionFromAxes,
  clientPointInElementLocal,
  ndcPointInElementLocal,
  pokeArmSideFromScreenPush,
  armZoneFromScreen,
  axialRecoilFall,
  POKE_REACTION_MS,
  type PokeDirection,
  type TalkZone,
} from '../lib/poke-hit';
import { pokeSectionBodyReaction, resolvePokeSection, type PokeSection, type PokeSectionId } from '../lib/poke-zones';
import { clipFreesFeet, collectPlantRest, pinPlantedClipTracks } from '../lib/vrm/plant-feet';
import { humanoidRestHipsY, sanitizeClipHipsScale } from '../lib/vrm/vrma-hips-scale';
import { dancePerfClipSources } from '../lib/dance-clip-sources';
import { markMartialFlowClipLoaded } from '../lib/martial-speak-guard';
import { martialPerfClipSources } from '../lib/martial-clip-sources';
import { beatAlignedVrmaTime, timeScaleForProfile } from '../lib/performance-motion';
import { steerDanceTimeScale } from '../lib/perf-tempo-lock';
import { isLibraryClipAudible, libraryBedPlaybackSec } from '../lib/music';
import { liveBeatSnapshot } from '../lib/live-beat';
import { visemeWeights } from '../lib/vocal-envelope';
import { playableIdles } from '../lib/idle-library';
import { listEnabledIdleClipIds } from '../lib/idle-enabled';
import {
  idleV2NearStillOnly,
  isIdleV2Enabled,
  orderIdleV2VisibleClips,
} from '../lib/idle-v2-visible';
import { orderPassiveIdleClips } from '../lib/idle-passive-loop';
import {
  DEFAULT_IDLE_CLIP_ID,
  isPixelCalmIdleClip,
  isRetiredIdleClip,
  resolveIdleClipForPlay,
  resolveIdleClipId,
} from '../lib/idle-retired';
import { IDLE_JOINT_REFRESH_FADE_S, IDLE_JOINT_REFRESH_MS, nextIdleRefreshAt, shouldRefreshIdleJoints } from '../lib/idle-refresh';
import {
  IDLE_PIN_CROSSFADE_S,
  IDLE_SWAP_BLEND_BONES,
  IDLE_SWAP_LEG_BLEND_S,
  idleCrossfadeAdditiveScale,
  idleSwapBlendActive,
} from '../lib/idle-crossfade';
import {
  IDLE_INCOMPAT_CROSSFADE_S,
  idleCrossfadeCompatible,
} from '../lib/idle-clip-family';
import {
  calmIdleHeadPitch,
  dampenIdleClipAmplitude,
  idlePlaybackTimeScale,
} from '../lib/idle-amplitude';
import {
  shortestEulerYXZSlerp,
  shortestQuatSlerp,
  shortestQuatSlerpClamped,
} from '../lib/vrm/quat-blend';
import { clampBoneByName } from '../lib/vrm/bone-joint-limits';
import {
  applyIdleClipSoftening,
  idleArmRewriteAllowed,
  IDLE_CALM_TORSO_PITCH_MAX,
  pullIdleTorsoUpright,
} from '../lib/idle-stance-soften';
import { chestPokeBounce, CHEST_BOUNCE_SEC, SOFT_CHEST_BOUNCE_SEC } from '../lib/vrm/chest-bounce';
import { sampleSpeech } from '../lib/speech';
import { createV1Avatar, createGenericAvatar } from '../lib/vrm/avatar';
import { applyDominatedEyeExpressions, isEyeMaterial, stabilizeEyeMaterials } from '../lib/vrm/eyes';
import {
  applyCastShaderLook,
  patchCastTextures,
  stabilizeCastEyes,
} from '../lib/vrm/cast-materials';
import { addCastDaylight, applyCastToneMapping } from '../lib/vrm/cast-lighting';
import { placeStoryRoomBehind, sanitizeStoryRoomMaterials } from '../lib/vrm/story-room';
import type { Avatar, AvatarPose } from '../lib/vrm/avatar';
import { WARDROBE_ENABLED, modularGlbUrl, vrmCandidatesForOutfit } from '../lib/modular/catalog';
import { assembleModular, replaceBodyMeshes, type ModularAssembly } from '../lib/modular/assemble';
import { loadModularGltf } from '../lib/modular/load';
import { publishModularView } from '../lib/modular/storage';
import { PHI_HOME, PHI_MAX, PHI_MIN } from '../lib/orbit-limits';
import { CAM_LERP, getMiniGameView, miniGameModelCandidates, registerGroundPick, resolveGameClip, type GameAnim } from '../lib/minigames';
import { disposeMiniGameStage, updateMiniGameStage } from './minigameStage';

// r97 (Master Simon): idle-clip restoration ??the mixer now starts the
// moment the FIRST clip lands (it used to wait for all 26 loads, so a single
// hung URL meant no mixer at all and a permanent T-pose), every URL attempt
// carries a 12s watchdog (a stalled stream can no longer block the chain),
// and the dead tk256ailab host is removed ??verified-live library hosts lead
// every chain, with the local mirror as fallback.
// r98 (Master Simon): feet on the floor through TALK. Performance clips
// (sing / dance / piano / violin / punch / jump / bow / hello ??the ones a
// speech trigger fires the moment she starts talking about them) used to
// keep their baked root-Y verbatim: authored on rigs of a different scale
// and pose (seated / bent-knee mocap), that hips-Y dragged her body far
// below the r94-pinned idle the instant a talk move took over ??she visibly
// "fell" (equivalently: the camera seemed to rise), then popped back up
// when the idle returned. Now EVERY clip's hips-Y is normalized onto our
// rest height ??median baseline + over-scale compression + a knee-deep
// floor clamp ??while X/Z sway and genuine motion (hops, dips, bows) are
// preserved. The camera target is static and clamped and nothing in the
// speaking path touches it, so no camera change ships in r98.
// r101 (Master Simon): no more black or lying first frames. Some VRMs ship
// a rotated root (Z-up exports), and the old load path only ever yaws the
// facing ??nothing un-tilted the body, so those characters lay flat until
// (unless) their first rebased clip frame corrected them; generic VRM 0.x
// models never get clips at all. lib/vrm/avatar.ts now un-tilts hips?ead
// to +Y at calibration time (BEFORE the first rendered frame). And the
// avatar no longer steps on stage the instant the glTF parses: she mounts
// INVISIBLE and is revealed only after every texture has decoded AND the
// first pose/clip frame has been applied AND two fully-lit frames have
// been presented ??on iPhone Safari a big MToon atlas decodes late, and
// the old code showed the raw rest pose for those frames (the "completely
// black at the beginning" report). The 25s load watchdog can force the
// reveal so a stuck texture never leaves her invisible forever.
// r102 (Master Simon): three iPhone-Safari fixes. (1) The loading bar can
// never freeze at 99% again: byte/clip progress still counts up honestly,
// but once an avatar MOUNTS the remaining wait is the reveal gate (clip
// engine + texture decode + two lit frames) ??not byte-measurable ??so the
// plate shows an indeterminate "preparing?? until she steps on stage or the
// 25s watchdog retires it. (2) She can never drop off the stage again:
// rebaseClipHips now clamps hips X/Z travel too (r98 clamped Y only, so a
// clip authored on a differently-scaled rig could still WALK the hips
// meters away horizontally), and the render loop hard-clamps the avatar
// root every frame. (3) Voice/SFX disentangle lives in lib/voice.ts +
// lib/sfx.ts (the "bell rings / typing sounds" were movement foley firing
// while every TTS tier stayed silent).
// r103 (Master Simon): relaxed hands + shoulder ROM clamp. (1) The library
// idles animate BODY bones only ??standard_idle.vrma's humanoid map carries
// no finger entries at all, and even weightShift.vrma maps just thumb/index
// chains ??so between keyframes her fingers sat in the model's rigid rest
// splay. avatar.ts now calibrates a gentle curl per finger ONCE at load
// (fold-test: rotate all phalanges 簣0.35 rad about each local axis, keep
// the axis+sign that shortens tip?rist ??pose-independent) and the render
// loop re-applies it every frame AFTER the mixer and applyPose as
// base繚delta (idempotent). Fingers a clip actually animates are tracked in
// clipAnimatedBones ??node names scanned from every loaded clip's track
// names, dot- and bracket-binding forms both ??and left entirely to the
// clip. (2) A big swing could carry an upper arm past the body midline ??
// clampShoulderROM floors the arm's outward (body-relative) direction at
// ~8.6簞 past plumb, gated to at/below horizontal so dance crosses and
// overhead waves stay free.
// r108 (Master Simon): neutral daylight everywhere ??the indoor rig's warm
// cream key ('#fff6ec') read as an orange cast against the warm ember/neon
// backdrops; ONE neutral rig lights every backdrop now, and ACES filmic
// tone mapping at exposure 1.0 pins the color pipeline.
// r109 (Master Simon): intermittent "character renders all black" ??three
// hardenings. (1) A texture whose request ERRORED (iPhone network hiccup)
// never decodes, so the r101 texture gate could never pass and the 25s
// watchdog revealed a model with broken texture slots (black). The gate now
// sweeps EVERY texture-typed property (MToon shade/rim/matcap included),
// and after 4s of undecoded textures a one-shot fallback neutralizes the
// broken slots (null map + lifted base color + floored shade color).
// (2) MToon shadeColor could sit near-black and render black at some
// angles ??it is floored at mount and in the fallback, and a whisper of
// flat ambient light guarantees no material state can render pure black.
// (3) A NaN sweep for the first 60 frames after mount resets any corrupt
// quaternion/scale, and the reveal gate re-compiles shaders on its first
// pass so nothing compiles against still-empty texture slots.

export interface CompanionCanvasProps {
  onNotice?: (n: { reason: 'webgl' | 'asset' }) => void;
  /** Where the poke landed: head, torso, chest, side, or back. */
  onPoke?: (zone: string, direction?: string, sectionId?: PokeSectionId) => void;
  /** Fired once when a hand grab starts, so chat can speak a hold line. */
  onHandHold?: () => void;
  accent?: string;
  /** character id ??gives her/him a deterministic, personal idle-motion sequence */
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
  /** @deprecated r108: ignored ??one neutral daylight rig lights every backdrop */
  lighting?: 'indoor' | 'outdoor';
  /** Pinned idle clip id (a01 / b02 ??. Empty keeps the calm rotation. */
  idleClip?: string | null;
  /** Optional story-room GLB path used by modelUrl(); loads behind the companion. */
  sceneGlbUrl?: string;
}

// r2026-10-04.92 (Master Simon): start FURTHER AWAY and at a NORMAL STRAIGHT
// angle ??the old phi 1.12 put the camera ~26簞 above her looking down (an
// "upper camera" close-up). Now the lens sits ~2.4簞 above eye level, ~2.6m
// back: upper body centered. Per-character home is unified via upperBodyHome
// after mount so short/tall cast share the same portrait framing.
const HOME = { theta: 0, phi: PHI_HOME, dist: DEFAULT_CAMERA_HOME.dist };
const HOME_TARGET = new THREE.Vector3(DEFAULT_CAMERA_HOME.lookX, DEFAULT_CAMERA_HOME.lookY, 0);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

// Polar window lives in lib/orbit-limits.ts (PHI_MIN / PHI_MAX). Theta is
// unclamped (full 360簞 yaw). Drag, pinch, and reset share the clamp in
// applyCamera below ??poke and hand-grab do not write phi.

// r101: texture slots that must hold a DECODED image before the avatar may
// step on stage. On iPhone Safari the big MToon atlases decode late ??the
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

// r109: a texture that ERRORED (network hiccup on iPhone) never decodes ??
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
          rec[key] = null; // failed slot ??fall back to the material's base color
          touched = true;
        }
      }
      if (isEyeMaterial((m as THREE.Material).name || '', mesh.name || '')) {
        if (touched) m.needsUpdate = true;
        continue;
      }
      const std = m as THREE.MeshStandardMaterial;
      if (std.color && !std.map) {
        // no map and a near-black base color can never be right ??lift it
        if (Math.max(std.color.r, std.color.g, std.color.b) < 0.08) {
          std.color.copy(FALLBACK_BASE);
          touched = true;
        }
      }
      if (touched) m.needsUpdate = true;
    }
  });
  applyCastShaderLook(root);
};

/** stable per-character hash ??motion seed: same character, same body language */
function seedFromKey(key: string): number {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) % 100000;
  return h;
}

/**
 * Punch window. Impact, one rebound, then settle — long enough to read.
 *
 * Sourced from poke-hit so the animation window and the AUDIO budget are the
 * same number. They were duplicated (1200 here, POKE_REACTION_MS there), which
 * let a clip run ~0.9s past a settled body — measured: female `huh.mp3` is
 * 2.06s against this 1.2s window, female `sigh.mp3` 1.12s.
 */
const POKE_MS = POKE_REACTION_MS;

/** how much each poke-twist flavor turns the body during the reaction */
const TWIST_AMOUNT: Record<string, number> = {
  playful: 0.1,
  startled: 0.06,
  unimpressed: 0.02,
  flustered: 0.05,
  challenging: 0.12,
};

export default function CompanionCanvas({
  onNotice, onPoke, onHandHold, accent = '#f9a8d4', seedKey,
  wardrobeHeadId: wardrobeHeadProp, wardrobeBodyId: wardrobeBodyProp,
  libraryOnly = false,
  idleClip = null,
  sceneGlbUrl,
}: CompanionCanvasProps) {
  // Cloth swap is gated off. A stored outfit must not replace the base VRM.
  const wardrobeHeadId = WARDROBE_ENABLED ? wardrobeHeadProp : undefined;
  const wardrobeBodyId = WARDROBE_ENABLED ? wardrobeBodyProp : undefined;
  const hostRef = useRef<HTMLDivElement>(null);
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;
  const onPokeRef = useRef(onPoke);
  onPokeRef.current = onPoke;
  const onHandHoldRef = useRef(onHandHold);
  onHandHoldRef.current = onHandHold;
  // Body swaps must not rebuild the WebGL scene ??the head mesh stays.
  const wardrobeBodyRef = useRef(wardrobeBodyId);
  wardrobeBodyRef.current = wardrobeBodyId;
  const libraryOnlyRef = useRef(libraryOnly);
  const idleClipRef = useRef<string | null>(idleClip);
  idleClipRef.current = idleClip;
  const showLibraryRef = useRef<() => void>(() => {});
  const swapBodyRef = useRef<(bodyId: string) => void>(() => {});

  useEffect(() => {
    libraryOnlyRef.current = libraryOnly;
  }, [libraryOnly]);

  // r84 (Master Simon): while she loads, the stage stays EMPTY ??no giant
  // placeholder figure. r91: the loading indicator moved OUT of this canvas
  // and INTO the top-left name bar (StatusPlate) through the shared store in
  // lib/load-progress ??smaller, next to the status it reports, and backed
  // by a watchdog so it can never spin at 99% forever. null = ready.

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setLoadProgress(0);
    // r91 (Master Simon): the indicator must never spin forever. A model
    // request can stream to ~99% and then hang (progress events but no
    // success/error ??a stalled connection); without a guard the old ring
    // sat at 99% eternally. After 25s the indicator retires and the asset
    // notice takes over. Cleared the moment she mounts (or on unmount).
    // r101: the watchdog ALSO forces the reveal gate ??whatever happened,
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
      clearTimeout(loadWatchdog);
      setLoadProgress(null);
      onNoticeRef.current?.({ reason: 'webgl' });
      return;
    }
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(host.clientWidth, host.clientHeight);
    // Shared cast daylight + ACES (see lib/vrm/cast-lighting.ts).
    applyCastToneMapping(renderer, seedKey);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // transparent canvas ??the page's themed gradient shows through (alpha:true)
    scene.background = null;
    let cancelled = false;
    // ONE shared cast daylight rig (chat / preview / thumbs / bake).
    // Cool sky hemi + white key + cool fill + ambient floor - no per-model lights.
    addCastDaylight(scene, seedKey);

    const camera = new THREE.PerspectiveCamera(35, host.clientWidth / host.clientHeight, 0.1, 20);

    // spherical orbit state + pannable look-target (home retargeted per VRM)
    const homeTarget = HOME_TARGET.clone();
    const target = homeTarget.clone();
    const orbit = { theta: HOME.theta, phi: HOME.phi, dist: HOME.dist };
    // Per-cast unified dist from upperBodyHome; reset/double-tap must reuse it
    // (HOME.dist stays the pre-mount default 2.6).
    let homeDist = HOME.dist;
    let framed = false;
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

    // Optional story-room GLB (WANT12): fire-and-forget; JPG SceneBackdrop stays as fallback.
    const roomRoot = new THREE.Group();
    roomRoot.name = 'amoji-story-room';
    scene.add(roomRoot);
    if (sceneGlbUrl) {
      const roomUrl = modelUrl(sceneGlbUrl);
      if (roomUrl) {
        const roomLoader = new GLTFLoader();
        roomLoader.load(
          roomUrl,
          (gltf) => {
            if (cancelled) return;
            try {
              const room = gltf.scene;
              const box = new THREE.Box3().setFromObject(room);
              if (box.isEmpty()) return;
              const size = box.getSize(new THREE.Vector3());
              const targetWidth = 3.8;
              const scale = size.x > 0 ? targetWidth / size.x : 1;
              room.scale.setScalar(scale);
              const fitted = new THREE.Box3().setFromObject(room);
              const center = fitted.getCenter(new THREE.Vector3());
              room.position.x -= center.x;
              room.position.y -= fitted.min.y;
              room.position.z -= center.z;
              room.position.z -= 2.6; // sit behind the companion
              // Grab3D PBR rooms go black without envMap; also push so the
              // front wall cannot occlude the companion (JPG backdrop stays).
              sanitizeStoryRoomMaterials(room);
              placeStoryRoomBehind(room);
              roomRoot.add(room);
              camera.far = Math.max(camera.far, 80);
              camera.updateProjectionMatrix();
            } catch {
              /* keep JPG backdrop */
            }
          },
          undefined,
          () => { /* silent fail — painted backdrop remains */ },
        );
      }
    }

    const unifyFraming = (a: Avatar) => {
      try {
        a.root.scale.set(BASE_SX, BASE_SY, BASE_SX);
        a.root.updateMatrixWorld(true);
        const head = a.getBoneNode('head');
        const hips = a.getBoneNode('hips');
        const chest = a.getBoneNode('chest') ?? a.getBoneNode('spine');
        if (!head || !hips) return;
        const hp = head.getWorldPosition(new THREE.Vector3());
        const ip = hips.getWorldPosition(new THREE.Vector3());
        const cp = chest ? chest.getWorldPosition(new THREE.Vector3()) : ip.clone().lerp(hp, 0.55);
        const home = upperBodyHome({
                  hipsY: ip.y,
                  chestY: cp.y,
                  headY: hp.y,
                  hipsX: ip.x,
                  chestX: cp.x,
                });
        homeTarget.set(home.lookX, home.lookY, 0);
        homeDist = home.dist;
        orbit.dist = homeDist;
        if (!resetAnim) {
          target.copy(homeTarget);
          orbit.theta = HOME.theta;
          orbit.phi = HOME.phi;
          applyCamera();
        }
        framed = true;
      } catch { /* keep default home */ }
    };

    // smooth camera-reset animation state
    let resetAnim: {
      t0: number; dur: number;
      from: { theta: number; phi: number; dist: number };
      fromTarget: THREE.Vector3;
    } | null = null;

    // r84 (Master Simon): NO placeholder mesh while loading ??the old accent
    // capsule read as "a huge ball in the middle". The stage stays empty and
    // the name-bar indicator reports real progress: model bytes (75%) +
    // motion clips delivered (25%). Recomputed on every loader progress
    // event. r91: published through lib/load-progress instead of local state.
    let modelPct = 0;
    let clipDone = 0;
    let lastReported: number | 'prep' = -1;
    // r102: once an avatar is MOUNTED the remaining wait is the reveal gate
    // (clip engine + texture decode + two lit frames) ??none of it is
    // byte-measurable, so counting a percentage from there would be fiction.
    // The bar goes honestly INDETERMINATE ('prep' ??"preparing?? on the
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

    // r2026-10-04.69: stage props ??one THREE.Group per catalog entry. A
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
    const blendNames: string[] = [];
    const blendFrom: THREE.Quaternion[] = [];
    const blendQ = new THREE.Quaternion();
    let blendT0 = -1;
    let blendDur = 0.68;
    let swapBlendActive = false;
    let swapBlendUntil = 0;
    let blendAvatar: Avatar | null = null;
    // Humanoid (normalized) bones only — raw scene.traverse(isBone) mixed
    // VRM 1.0 raw bind bones with the mixer’s normalized targets, so the
    // entry crossfade slumped shoulders into the torso (Mon t265u).
    // Hips and legs stay out of the entry blend. Blending them from the
    // bind pose twisted the upper body (char 6) and tugged the feet.
    // Shoulders still blend so 1–3 do not snap, then applyCastFixes lifts
    // only the sunk-shoulder ids.
    const HUMAN_BLEND_BONES = [
      'spine', 'chest', 'upperChest', 'neck', 'head',
      'leftShoulder', 'rightShoulder',
      'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm',
      'leftHand', 'rightHand',
    ] as const;
    const beginBoneBlend = (seconds = 0.68, bones: readonly string[] = HUMAN_BLEND_BONES, includeLegs = false) => {
      if (!avatar) return;
      swapBlendActive = includeLegs;
      if (blendAvatar !== avatar) {
        blendNodes.length = 0;
        blendNames.length = 0;
        blendFrom.length = 0;
        blendAvatar = avatar;
      }
      blendNodes.length = 0;
      blendNames.length = 0;
      blendFrom.length = 0;
      for (const name of bones) {
        const n = avatar.getBoneNode(name);
        if (!n) continue;
        blendNodes.push(n);
        blendNames.push(name);
        blendFrom.push(n.quaternion.clone().normalize());
      }
      blendT0 = performance.now();
      blendDur = seconds;
      swapBlendUntil = swapBlendActive ? blendT0 + seconds * 1000 : 0;
    };
    const beginIdleSwapBlend = (seconds = IDLE_SWAP_LEG_BLEND_S) => {
      beginBoneBlend(seconds, IDLE_SWAP_BLEND_BONES, true);
    };
    const applyBoneBlend = (nowMs: number) => {
      if (blendT0 < 0) return;
      // Idle A→B: mixer crossFadeTo owns the body — manual upper blend here
      // stacked a third quaternion smear on top of near-still VRMA.
      if (swapBlendActive) return;
      const u = (nowMs - blendT0) / (blendDur * 1000);
      const kRaw = u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10);
      if (u >= 1) {
        const k = 1;
        for (let i = 0; i < blendNodes.length; i++) {
          const tgt = blendNodes[i]!.quaternion;
          const name = blendNames[i];
          if (name && /spine|chest|neck|head/i.test(name)) {
            shortestEulerYXZSlerp(blendQ, blendFrom[i]!, tgt, k);
            clampBoneByName(blendQ, name);
          } else {
            shortestQuatSlerpClamped(blendQ, blendFrom[i]!, tgt, k, name);
          }
          blendNodes[i]!.quaternion.copy(blendQ);
        }
        blendT0 = -1;
        swapBlendActive = false;
        swapBlendUntil = 0;
        return;
      }
      const k = kRaw;
      for (let i = 0; i < blendNodes.length; i++) {
        const tgt = blendNodes[i]!.quaternion;
        const name = blendNames[i];
        // Euler short-arc for axial torso/neck — legs are not in this blend
        // (mixer-only) so we do not double-write and shake the lower body.
        if (name && /spine|chest|neck|head/i.test(name)) {
          shortestEulerYXZSlerp(blendQ, blendFrom[i]!, tgt, k);
          clampBoneByName(blendQ, name);
        } else {
          shortestQuatSlerpClamped(blendQ, blendFrom[i]!, tgt, k, name);
        }
        blendNodes[i]!.quaternion.copy(blendQ);
      }
    };
    let mixer: THREE.AnimationMixer | null = null;
    let mixerActive = false;
    // r101 reveal gate ??the avatar mounts INVISIBLE and steps on stage only
    // when textures are decoded AND the first pose/clip frame is applied AND
    // two fully-lit frames have been presented. forceReveal (the 25s load
    // watchdog) overrides so nothing can keep her invisible forever.
    let revealPending = false;
    let revealPoseApplied = false;
    let revealLitFrames = 0;
    let forceReveal = false;
    // r109: reveal-gate hardening state ??mount timestamp (textures that
    // never decode must not hold her hostage until the 25s watchdog),
    // frames since mount (NaN sweep window), the one-shot flag for the
    // texture-error fallback, and a once-only log guard for the sweep.
    let mountTime = 0;
    let mountFrame = 0;
    let textureFallbackApplied = false;
    let castLookPatched = false;
    let nanLogged = false;
    // per-character motion personality: Rin always fidgets the same way,
    // Ren drifts through his own calm sequence ??deterministic per character.
    const poseSeed = seedKey ? seedFromKey(seedKey) : Date.now() % 100000;
    const gender = seedKey ? characterById(seedKey).gender : 'female';
    // r2026-10-03.04: each character drifts through a personality-curated
    // subset of the pose library instead of the full shared catalog.
    const poseSubset = posesByIds(poseIdsFor(seedKey ?? 'juno'));
    const poke = pokeStyleFor(seedKey ?? 'juno');
    // r2026-10-03.28: per-character look ??the shared open-license VRM gets a
    // gentle palette tint and an individual build (height/shoulders), so each
    // character reads as her/his own person in the 3D scene.
    const look = lookFor(seedKey ?? 'a01-shino');
    const BASE_SX = look.width;
    const BASE_SY = look.height;
    const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    // r2026-10-04.50: every character maps to a VRM under /models/want
    // (remote release asset, downloaded same-origin at build). Load strategy per candidate:
    //   1. three-vrm plugin parse ??VRM 1.0 avatar (VRMA idle clip eligible)
    //   2. plain GLTF parse ??generic avatar (VRM 0.x legacy rig; bones and
    //      morphs are driven through the humanBones table with automatic
    //      facing + arm calibration, so a legacy model never shows its back
    //      or a raised-arms rest pose)
    //   3. any failure walks the chain to the next candidate.
    // r2026-10-04.58: body motion comes from the ONLINE MOTION LIBRARY
    // (open .vrma clips ??real keyframed performances, streamed from the
    // library with a local /models/anims mirror taking over once vendored).
    // Master Simon's rule: the skeleton is NEVER rotated by hand while a
    // library clip drives the body. The old procedural pose/move math now
    // only runs as a last-resort fallback when no clip could be built.
    const ownModel = seedKey ? characterById(seedKey).model : undefined;
    const MODEL_CANDIDATES = libraryOnlyRef.current
      ? miniGameModelCandidates(ownModel)
      : [ownModel, 'seed-san.vrm'].filter((m): m is string => !!m);

    // -- clip library ---------------------------------------------------------
    // Standing idle. Fresh default = IdleQuaterniusHuman (v6). Owner-enabled
    // rails / pins migrate forward and win over Quaternius (#432). Amplitude
    // damp kills thrash / sky-look. LookAround / Sassy / BreathCalm / hug /
    // wave stay out.
    // rebaseClipHips pins feet and yaw-only hips on every idle in this list.
    const ANIM_MIRROR = `${ASSET_BASE}/models/anims`;
    const CHAT_HOST = 'https://raw.githubusercontent.com/DavinciDreams/3dchat/main/public/animations/vrma';
    const ALT_HOST = 'https://raw.githubusercontent.com/hirokazuniimoto/virtual-avatar-sdk/main/assets/animations';
    const ST_HOST = 'https://raw.githubusercontent.com/test157t/VRM-Assets-Pack-For-Silly-Tavern/main/animation_nitral-fork';

    interface ClipSource { id: string; urls: string[] }
    // Idle # SoT: apps/web/lib/idle-library.ts (free-library Cxx map).
    // Default rotation = enabled playable nums (localStorage amoji.idleEnabled.v6),
    // falling back to IdleQuaterniusHuman. Every idle gets
    // rebaseClipHips + amplitude damp + pinPlantedClipTracks (no floating feet).
    const libPlayable = playableIdles();
    const enabledIds = new Set(listEnabledIdleClipIds());
    const IDLE_SOURCES: ClipSource[] = libPlayable
      .filter((e) => enabledIds.has(e.clipId))
      .map((e) => ({ id: e.clipId, urls: [`${ANIM_MIRROR}/${e.clipId}.vrma`] }));
    if (!IDLE_SOURCES.length) {
      IDLE_SOURCES.push(
        { id: DEFAULT_IDLE_CLIP_ID, urls: [`${ANIM_MIRROR}/${DEFAULT_IDLE_CLIP_ID}.vrma`] },
      );
    }
    // All other playable library idles (side picks / Mon # tap).
    const IDLE_PICKS: ClipSource[] = libPlayable
      .filter((e) => !enabledIds.has(e.clipId))
      .map((e) => ({ id: e.clipId, urls: [`${ANIM_MIRROR}/${e.clipId}.vrma`] }));
    // one-shot dialogue performances (library clips with a real ending)
    // r96 (Master Simon): the move triggers get REAL performances too ??
    // dance / sing / kungfu / piano / violin fire actual keyframed mocap
    // from the 3dchat Mixamo-class library (file list verified via the
    // GitHub API) instead of leaving the body in its idle.
    // r106: eat / dine join them. No literal eating clip exists in any
    // reachable free VRMA library (3dchat / desktop-waifu / MotionPack all
    // fully listed), so eat takes smoking.vrma ??repetitive pinched-finger
    // hand-to-mouth, the closest real motion to steady bites ??and dine
    // takes blowAKiss.vrma, one graceful hand raise to lips (a toast/sip).
    // Jog / yoga / stretch still keep the r95 rule (library idle) until
    // dedicated VRMAs land. Tai chi uses idle-rail lib_C121 (see MOVE_CLIP).
    const PERF_SOURCES: ClipSource[] = [
      { id: 'Jump', urls: [`${ANIM_MIRROR}/Jump.vrma`] },
      { id: 'Bow', urls: [`${ALT_HOST}/quick_formal_bow.vrma`, `${ANIM_MIRROR}/Bow.vrma`] },
      { id: 'Hello', urls: [`${ST_HOST}/hello.vrma`, `${ANIM_MIRROR}/Hello.vrma`] },
      // Local first — remote-first left Sing unloaded when mirror lagged, so
      // playPerf failed once and mvHandled never retried (T-pose / idle).
      { id: 'Dance', urls: [`${ANIM_MIRROR}/Dance.vrma`, `${CHAT_HOST}/hipHopDancing.vrma`] },
      { id: 'Sing', urls: [`${ANIM_MIRROR}/Sing.vrma`, `${CHAT_HOST}/singing.vrma`] },
      { id: 'Punch', urls: [`${CHAT_HOST}/punch.vrma`, `${ANIM_MIRROR}/Punch.vrma`] },
      { id: 'Piano', urls: [`${CHAT_HOST}/pianoPlaying.vrma`, `${ANIM_MIRROR}/Piano.vrma`] },
      { id: 'Violin', urls: [`${CHAT_HOST}/playingTheViolin.vrma`, `${ANIM_MIRROR}/Violin.vrma`] },
      // r106: eating performances ??hand-to-mouth proxies, see note above
      { id: 'Eat', urls: [`${CHAT_HOST}/smoking.vrma`, `${ANIM_MIRROR}/Eat.vrma`] },
      { id: 'Dine', urls: [`${CHAT_HOST}/blowAKiss.vrma`, `${ANIM_MIRROR}/Dine.vrma`] },
      // r110 (Master Simon): emotion performances from the recovered handoff
      // library ??cheer-ups and reactions get REAL keyframed body language
      // (her "you did it!" is a literal cheer, not just a smile blendshape).
      { id: 'Cheer', urls: [`${ANIM_MIRROR}/Cheer.vrma`] },
      { id: 'Clapping', urls: [`${ANIM_MIRROR}/Clapping.vrma`] },
      { id: 'Idea', urls: [`${ANIM_MIRROR}/Idea.vrma`] },
      { id: 'Goodbye', urls: [`${ANIM_MIRROR}/Goodbye.vrma`] },
      { id: 'HelloWave', urls: [`${ANIM_MIRROR}/HelloWave.vrma`] },
      { id: 'Blush', urls: [`${ANIM_MIRROR}/Blush.vrma`] },
      // Dance shortlist lib_C* — local VRMA when converted; interim Mixamo-class remotes for C03/C61/C62/C110.
      // Rokoko C112–C128 / C09 / C60 stay local-only until FBX→VRMA (see DEFERRED_DANCE_VRMA.md).
      ...dancePerfClipSources(ANIM_MIRROR),
      ...martialPerfClipSources(ANIM_MIRROR),
    ];
    const TOTAL_CLIPS = IDLE_SOURCES.length + IDLE_PICKS.length + PERF_SOURCES.length;
    const clips = new Map<string, THREE.AnimationClip>();
    // r103: node names of every bone ANY loaded clip animates ??scanned from
    // each clip's track names as it lands. The avatar hands those bones to
    // the mixer untouched; relaxed hands apply only to fingers no clip keys.
    // The SAME live Set is shared with the avatar (filled after mount ??
    // clips stream in asynchronously), so no re-handshake is ever needed.
    const clipAnimatedBones = new Set<string>();
    let idleAction: THREE.AnimationAction | null = null;
    let perfAction: THREE.AnimationAction | null = null;
    let perfClipId: string | null = null;
    /** Authored rate before live tempo correction; restored on the next clip. */
    let perfBaseTimeScale = 1;
    /** Track BPM the profile was built from (0 = unknown, no live correction). */
    let perfTrackBpm = 0;
    /** Rate last written by live-tempo steering (0 = no clip yet). */
    let perfTempoRate = 0;
    let idleOrder: string[] = [];
    /** One upright stand — no A→B idle crossfade rotation (Pixel blend-bad). */
    let singleIdleStand = true;
    let idleClipId = '';
    let thinkMiss = false;
    let idleIdx = 0;
    // r93: when the current idle hands over to the next one (RAF clock, ms).
    // The handover is a crossfade between two LIVE loops ??never a freeze.
    let idleHoldUntil = Infinity;
    // Soft re-play deadline: looping the same VRMA for too long lets additive
    // hang/plant/cast fixes accumulate into a visible joint drift. Re-blend
    // the current idle on a timer without swapping clips (no pop).
    let idleRefreshAt = nextIdleRefreshAt(performance.now());
    // dialogue performances that have a matching library clip; move kinds
    // without one keep the library idle (r95/r96) ??the skeleton is never
    // rotated by formula.
    const MOVE_CLIP: Partial<Record<MoveKind, string>> = {
      jump: 'Jump',
      dance: 'Dance',
      sing: 'Sing',
      // Martial flows: local Rokoko kata (lib_C120) and idle-rail tai chi
      // (lib_C121). Both play as one-shot general flows, not cue-synced.
      kungfu: 'lib_C120',
      taichi: 'lib_C121',
      piano: 'Piano',
      violin: 'Violin',
      eat: 'Eat',
      dine: 'Dine',
      // r110: emotion performances (recovered handoff library)
      cheer: 'Cheer',
      clap: 'Clapping',
      idea: 'Idea',
      goodbye: 'HelloWave',
      blush: 'Blush',
    };
    // r2026-10-04.59 (Master Simon): EVERY clip change is a blend, never a
    // jump ??pose A at 10簞 glides into pose B at 90簞 over `fade` seconds.
    // The mixer crossfades bone quaternions, so intermediate frames are real
    // in-between poses, not snaps.
    const FADE = {
      entry: 1.15,     // procedural pose ??first library clip
      idleRotate: 1.65, // longer glide so idle loops don't snap
      toPerf: 0.6,     // idle ??one-shot performance
      perfCut: 0.35,   // performance ??interrupted by another performance
      perfEnd: 0.85,   // finished performance ??back to idle
    };

    const playClipAsIdle = (
      clip: THREE.AnimationClip,
      id: string,
      fade: number,
      honorOwnerPin = false,
    ) => {
      if (!mixer) return;
      // Never play Pixel blend-bad / retired clips (lean-wall, IdleHug, etc.).
      // Owner pins (#432): keep honorable RPM stands — do not remap to
      // Quaternius then hang/soften into a frankenstein mid-pose.
      const safeId = resolveIdleClipForPlay(id, { honorOwnerPin });
      if (safeId !== id) {
        const safeClip = clips.get(safeId);
        if (safeClip) return playClipAsIdle(safeClip, safeId, fade, honorOwnerPin);
        return;
      }
      if (isRetiredIdleClip(safeId)) return;
      const sameClip = !!idleAction && idleClipId === safeId;
      const swapping = !!idleAction && idleClipId !== safeId;
      const compatible = !swapping || idleCrossfadeCompatible(idleClipId, safeId);
      // Incompatible family (Quaternius↔RPM↔Mixamo): short cut, not a long
      // smear through broken intermediate quaternions.
      const fadeUse = compatible ? fade : Math.min(fade, IDLE_INCOMPAT_CROSSFADE_S);
      const blendS = swapping
        ? (compatible
          ? Math.max(fadeUse, IDLE_SWAP_LEG_BLEND_S)
          : Math.min(IDLE_INCOMPAT_CROSSFADE_S, IDLE_SWAP_LEG_BLEND_S))
        : 0.7;
      if (swapping) beginIdleSwapBlend(blendS);
      else if (!sameClip) beginBoneBlend(0.7);
      const action = mixer.clipAction(clip);
      action.timeScale = idlePlaybackTimeScale(
        personalityMotion(seedKey ?? '', gender).timeScale,
      );
      // r93: idles LOOP — the old LoopOnce + clampWhenFinished parked her on
      // the clip's end frame (a straight stand) while the next clip faded
      // in: the "zombie pose between idle movements". A looping body is
      // never parked anywhere.
      action.setLoop(THREE.LoopRepeat, Infinity);
      if (sameClip) {
        // Joint refresh of the *same* clip: do NOT reset to t≈0 — that was a
        // sudden body/arm snap every ~28s. Keep time and weight; bone blend
        // alone re-asserts the current pose gently.
        action.setEffectiveWeight(1);
        action.play();
      } else {
        action.reset();
        // Never sync absolute time across *different* clips — that blended
        // mismatched mid-poses and looked like a sudden spin "to the back".
        // Always enter the new idle near its start; crossfade owns the A→B glide.
        action.time = Math.min(0.08, Math.max(0, clip.duration * 0.02));
        if (idleAction && idleAction !== action) {
          // blend from wherever the body currently is into this clip
          idleAction.crossFadeTo(action, fadeUse, false);
          action.play();
        } else {
          // First idle entry: no mixer fadeIn. fadeIn starts weight near 0 so
          // the body sits on bind/T-pose while normalized tracks ramp in —
          // that + raw-bone blend collapsed shoulders (Mon t265u). Full weight
          // + beginBoneBlend crossfades the current humanoid pose into the clip.
          action.setEffectiveWeight(1);
          action.play();
        }
      }
      idleAction = action;
      idleClipId = safeId;
      if (singleIdleStand) {
        idleHoldUntil = Infinity;
      } else {
        // hold this idle for 1–2 of its own beats, then hand over mid-motion
        const holdMs = Math.min(14000, Math.max(5000, clip.duration * 1000 * (1 + Math.random())));
        idleHoldUntil = performance.now() + holdMs;
      }
      idleRefreshAt = nextIdleRefreshAt(performance.now(), IDLE_JOINT_REFRESH_MS);
    };

    const nextIdle = (fade: number) => {
      if (!mixer || !idleOrder.length) return;
      const raw = idleOrder[idleIdx % idleOrder.length]!;
      idleIdx++;
      const id = resolveIdleClipId(raw);
      if (isRetiredIdleClip(id)) return;
      const clip = clips.get(id);
      if (!clip) return;
      playClipAsIdle(clip, id, fade, false);
    };

    const playNamedIdle = (id: string, fade: number, honorOwnerPin = false): boolean => {
      const safeId = resolveIdleClipForPlay(id, { honorOwnerPin });
      if (isRetiredIdleClip(safeId)) return false;
      const clip = clips.get(safeId);
      if (!clip) return false;
      playClipAsIdle(clip, safeId, fade, honorOwnerPin);
      return true;
    };

    /** Start a MOVE_CLIP performance. Returns false when the VRMA is not loaded yet. */
    const playPerf = (name: string): boolean => {
      if (!mixer) return false;
      // t725–729: prefer shortlist lib_C* when loaded; else Dance/Sing.
      // Beat match via timeScale = clamp(trackBpm / clipBpm, 0.65, 1.45).
      const profile = getPerfMotionProfile();
      let clipName = name;
      let clip = clips.get(name) ?? null;
      if (profile) {
        for (const id of [...profile.preferredClipIds, ...profile.fallbackClipIds]) {
          const c = clips.get(id);
          if (c) { clipName = id; clip = c; break; }
        }
      }
      // Hard fallbacks so song/dance still move if preferred ids lag.
      if (!clip && (name === 'Sing' || name === 'Dance')) {
        const extras = name === 'Sing'
          ? ['lib_C116', 'lib_C112', 'lib_C117', 'Dance']
          : ['lib_C61', 'lib_C03', 'lib_C113', 'Sing'];
        for (const id of extras) {
          const c = clips.get(id);
          if (c) { clipName = id; clip = c; break; }
        }
      }
      if (!clip) return false;
      perfClipId = clipName;
      beginBoneBlend(0.7);
      const action = mixer.clipAction(clip);
      const personality = personalityMotion(seedKey ?? '', gender).timeScale;
      action.timeScale = profile
        ? timeScaleForProfile(profile, clipName)
        : personality;
      perfBaseTimeScale = action.timeScale;
      perfTrackBpm = profile?.bpm ?? 0;
      perfTempoRate = 0;
      // Dance/sing shows loop with the music bed — even when perfMotionProfile
      // is not set yet (LoopOnce + clamp looked like a frozen static pose).
      // Tai chi / idle-rail lib_C* martial flows loop for the full move clock.
      const loopPerf =
        name === 'Dance'
        || name === 'Sing'
        || clipName.startsWith('lib_C')
        || name.startsWith('lib_C');
      if (loopPerf) {
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      } else {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      const loopWithBed =
        name === 'Dance' || name === 'Sing' || clipName.startsWith('lib_C');
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
      if (loopWithBed && isLibraryClipAudible()) {
        const bedSec = libraryBedPlaybackSec();
        action.time = beatAlignedVrmaTime(bedSec, clip.duration, action.timeScale);
      }
      perfAction = action;
      return true;
    };
    const startClipEngine = (vrm: VRM) => {
      mixer = new THREE.AnimationMixer(vrm.scene);
      mixer.addEventListener('finished', (e) => {
        if (e.action === perfAction) {
          // A mini-game pose holds its last frame. Idle stays paused until exit.
          if (getMiniGameView()) return;
          // a one-shot performance ended ??glide back into the idle playlist
          perfAction = null;
          perfClipId = null;
          nextIdle(FADE.perfEnd);
        }
        // r93: idles never "finish" ??they loop until the swap timer hands
        // over mid-motion, so there is no clamped end-frame freeze to
        // recover from and no neutral stand between idle movements
      });
      // Owner-enabled clips → pick ONE upright stand (no blend-bad A→B rotation).
      // Side picks stay loadable for playNamedIdle; chat idle loops that single clip.
      const enabledLoaded = IDLE_SOURCES
        .map((s) => s.id)
        .filter((id) => clips.has(id) && !isRetiredIdleClip(resolveIdleClipId(id)));
      if (enabledLoaded.length) {
        idleOrder = isIdleV2Enabled()
          ? orderIdleV2VisibleClips(enabledLoaded, seedKey)
          : orderPassiveIdleClips(enabledLoaded, seedKey);
      } else {
        const loadedIdleIds = [...IDLE_SOURCES, ...IDLE_PICKS]
          .map((s) => s.id)
          .filter((id) => clips.has(id) && !isRetiredIdleClip(resolveIdleClipId(id)));
        idleOrder = orderIdleClips(loadedIdleIds, seedKey ?? '', gender);
        if (!idleOrder.length) {
          idleOrder = orderIdleClips(
            [...clips.keys()].filter((id) => !isRetiredIdleClip(resolveIdleClipId(id))),
            seedKey ?? '',
            gender,
          );
        }
      }
      singleIdleStand = idleOrder.length <= 1
        || (isIdleV2Enabled() && idleV2NearStillOnly(idleOrder));
      idleIdx = 0;
      mixerActive = true;
      if (avatar) avatar.clipDrivesBody = true;
      // r59: blend IN from the current (procedural) pose over ~a second ??
      // the very first clip no longer pops in from nowhere
      const pinned = idleClipRef.current;
      if (!(pinned && playNamedIdle(pinned, FADE.entry, true))) nextIdle(FADE.entry);
      if (pinned) idleHoldUntil = Infinity;
      // r124 / r2026-10-12: after the entry crossfade settles, re-measure
      // facing (yaw) and upright (hips?ead pitch/roll) on the inner model.
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
      // turns her back to me" ??the library clips carry ABSOLUTE hips
      // rotations authored on a rig whose rest faces 180簞 off ours. The
      // mixer's first clip overwrites the (calibrated) rest hips pose with
      // the source convention, and the whole body turns around inside the
      // calibrated wrapper the moment a clip takes over. Previous agents who
      // mixed load-time calibration with absolute library clips inherited
      // the same bug. Fix: rebase every clip's hips tracks onto OUR rest ??
      //   rotation: key'(t) = restQ 繚 key0?鄞?繚 key(t)
      //   position: key'(t) = key(t) ??key0 + restP
      // so each clip's neutral frame lands exactly on our rest pose while
      // all of its real motion (bows, sways, turns, jumps) is preserved.
      // This MUST be captured before any action plays ??the bones are still
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
      // r94 (Master Simon): "she keeps floating up and down ??keep her feet
      // on the ground". Many library idles carry breathing/bounce keys on
      // the hips Y that read as floating. Idle loops get their hips HEIGHT
      // pinned to our rest foot-planted height (X/Z sway ??weight shifts ??
      // is preserved).
      // r98 (Master Simon): the SAME protection now covers the performance
      // clips. Talking replies trigger MOVE_CLIP performances (sing / dance /
      // piano / violin / punch / jump / bow / hello) the moment speech
      // starts, and those clips carry baked root-Y authored on rigs of
      // a different scale and pose (seated / bent-knee mocap). Handed to the
      // mixer verbatim, that hips-Y sank her far below the r94-pinned idle ??
      // she visibly "fell" when talking began (equivalently: the camera
      // seemed to rise), then popped back up when the idle returned. Now
      // EVERY clip's hips-Y is normalized onto OUR rest height: the track's
      // MEDIAN key becomes its standing baseline (robust against a first
      // frame that already sits low), over-scale rig units are compressed
      // to a human hip-travel span, and no key may sink below a knee-deep
      // floor. X/Z sway and all genuine motion (hops, dips, bows) survive.
      const IDLE_IDS = new Set([...IDLE_SOURCES, ...IDLE_PICKS].map((s) => s.id));
      const HIP_TRAVEL_MAX = 0.8; // meters ??no human hips-Y span exceeds this
      const FLOOR_FRAC = 0.55;    // never sink below 55% of rest hips height
      // r102: same idea on the horizontal plane ??a clip authored on a rig
      // at another scale can walk the hips METERS away in X/Z (she slid
      // right off the stage). Sway and steps survive; migration does not.
      const HORIZ_TRAVEL_MAX = 1.0; // meters of total hips X/Z drift from rest
      const rebaseClipHips = (clip: THREE.AnimationClip, lockFeet: boolean) => {
        if (!hipsNode || !hipsRestQ || !hipsRestP) return;
        const floorY = hipsRestP.y * FLOOR_FRAC;
        for (const track of clip.tracks) {
          // r113: match the hips track by REDUCING the binding path to its
          // bare node name ??the library emits `J_Bip_C_Hips.position`
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
                // on foreign rigs ??after landing frame 0 on our rest, keep only
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
      // resolve ??one hung URL used to mean no mixer ever = the T-pose stand
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
        // Logged when the last clip settles ??the relaxed-hand guard keys on
        // this (standard_idle.vrma maps zero finger bones; weightShift.vrma
        // only thumb/index ??so the calibrated curl almost always applies).
        if (pending === 0 && avatar) {
          const fingers = [...clipAnimatedBones].filter((n) => avatar!.fingerBones.has(n));
          console.info(`[amoji] r103: ${clips.size} clips, ${clipAnimatedBones.size} animated bones, clip-driven fingers: ${fingers.length ? fingers.join(', ') : 'none'}`);
        }
      };
      // try each candidate URL in order: verified-live library first, the
      // local mirror as fallback (r97 ??the dead hosts were cut, see above)
      const loadOne = (src: ClipSource, idx = 0) => {
        if (idx >= src.urls.length) {
          done();
          return;
        }
        // r97: per-attempt watchdog ??without it a stalled stream (bytes
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
              // VRMA files whose own rest hips Y is <= 0 (15 shipped clips, see
              // lib/vrm/vrma-hips-scale.ts) make the clip factory's
              // humanoidY / restHipsPosition.y scale negative: hips X/Z are
              // mirrored and hips Y inverted. Pinned idles never show it, but
              // the freed dance clips do. Treat them as already normalized.
              sanitizeClipHipsScale(anims[0]!, humanoidRestHipsY(vrm.humanoid));
              const clip = createVRMAnimationClip(anims[0]!, vrm);
              // expression tracks stay ours ??speech/visemes own the face
              clip.tracks = clip.tracks.filter((t) => !t.name.includes('expression'));
              // r79: land the clip's neutral frame on our calibrated rest;
              // r94: idle loops pin the hips height (no floating);
              // r98: performances normalize their root-Y onto our rest too
              // Martial / dance idles keep full hip+leg keys — planting at load
              // made lib_C121 tai chi raise arms once then freeze (Mon).
              const idlePlantLock = IDLE_IDS.has(src.id) && !clipFreesFeet(src.id);
              rebaseClipHips(clip, idlePlantLock);
              // Idle-only: crush VRMA thrash + baked sky-look before mixer play.
              if (IDLE_IDS.has(src.id)) dampenIdleClipAmplitude(clip);
              if (!clipFreesFeet(src.id)) pinPlantedClipTracks(clip, plantRest);
              if (clip.tracks.length) {
                clips.set(src.id, clip);
                markMartialFlowClipLoaded(src.id);
              }
              // r103: record which bones this clip drives, so the avatar can
              // leave them to the mixer. Track names arrive as PropertyBinding
              // paths ??`Bone.quaternion`, `.Bone.quaternion`, or
              // `.bones[Bone].quaternion` ??all reduce to the bare node name.
              for (const t of clip.tracks) {
                if (!t.name.endsWith('.quaternion')) continue;
                const path = t.name.slice(0, -'.quaternion'.length);
                const bone = path.includes('[') && path.endsWith(']')
                  ? path.slice(path.lastIndexOf('[') + 1, -1)
                  : path.slice(path.lastIndexOf('.') + 1);
                clipAnimatedBones.add(bone);
              }
            }
          } catch { /* this clip is unusable on this rig ??skip it */ }
          done();
        }, undefined, () => {
          if (settled) return;
          settled = true;
          clearTimeout(attemptTimer);
          loadOne(src, idx + 1);
        });
      };
      for (const src of [...IDLE_SOURCES, ...IDLE_PICKS, ...PERF_SOURCES]) loadOne(src);
    };

    const mountAvatar = (a: Avatar) => {
      avatar = a;
      // Opt-in rig readout for the owner / agents: ?bones=1 prints the
      // upper-arm hang direction per side. Used to prove the left arm is not
      // crossing the midline (r2026-11-24.310). Zero cost without the flag.
      if (typeof window !== 'undefined' && new URLSearchParams(location.search).has('bones')) {
        (window as unknown as { __amojiBones?: unknown }).__amojiBones = {
          read: () => {
            const out: Record<string, unknown> = {};
            for (const side of ['left', 'right'] as const) {
              const up = a.getBoneNode(`${side}UpperArm`);
              const lo = a.getBoneNode(`${side}LowerArm`);
              const ha = a.getBoneNode(`${side}Hand`);
              if (!up || !lo) continue;
              const p = new THREE.Vector3();
              const q = new THREE.Vector3();
              const h = new THREE.Vector3();
              up.getWorldPosition(p);
              lo.getWorldPosition(q);
              ha?.getWorldPosition(h);
              const d = q.clone().sub(p).normalize();
              out[side] = {
                x: +d.x.toFixed(3),
                y: +d.y.toFixed(3),
                z: +d.z.toFixed(3),
                handX: ha ? +h.x.toFixed(3) : null,
                handY: ha ? +h.y.toFixed(3) : null,
              };
            }
            return out;
          },
        };
      }
      scene.add(a.root);
      a.root.position.set(0, 0, 0);
      // r101 (Master Simon): she mounts INVISIBLE and steps on stage only
      // through the reveal gate in the render loop ??textures decoded AND
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
      castLookPatched = false;
      nanLogged = false;
      // r102: from this moment the honest progress state is 'prep' ??the
      // reveal-gate wait is not byte-measurable (see reportProgress above)
      mounted = true;
      // warm every shader program + upload whatever has decoded while she
      // is still off stage, so her first visible frame is fully lit
      renderer.compile(scene, camera);
      // r84/r91 ??progress reporting continues, but the spinner now retires
      // at the REVEAL (she counts as loaded only when she is actually on
      // stage, textured, posed and lit), not at glTF parse time
      modelPct = 100;
      reportProgress();

      applyCastShaderLook(a.root, seedKey);
      if (seedKey) a.armCastFixes(seedKey);
    };

    const loadPlain = (index: number, url: string, token: number) => {
      const plain = new GLTFLoader();
      plain.load(url, (gltf) => {
        if (cancelled || token !== loadToken) return;
        try {
          // r103: hand the shared clip-animated-bone set to the avatar ??the
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
        // r84 ??nothing left to try: stop waiting, show the notice
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
        // r103: the avatar keeps a LIVE reference to clipAnimatedBones ??the
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
          // Split body missing ??the outfit's full VRM is the visible mesh.
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

    // ---- pointer gestures ????????????????????????????????????????????????
    // one finger drag   = rotate around her
    // two finger drag   = move (pan) the camera 繚 pinch = zoom
    // double tap empty  = reset camera 繚 tap / double tap her = poke
    // r115: the poke now knows WHERE it landed (nearest skeleton bone ??
    // head/body/armL/armR/belly reaction), and either HAND is grabbable ??
    // land a pointer within GRAB_PX of a projected hand bone and you can
    // pull that arm around; it springs home on release.
    const raycaster = new THREE.Raycaster();
    let pokeAt = -Infinity;
    let lastEmptyTap = -Infinity;
    // r115: which body zone the current poke reaction belongs to
    let pokeZone: TalkZone = 'torso';
    let pokeDirection: PokeDirection = 'front';
    let pokeSection: PokeSection = resolvePokeSection('torso', 'front');
    let pokeSideSign = 1;
    // Push direction comes from the hit vs the character's facing.
    const pokeFallDir = new THREE.Vector3(0, 0, -1);
    // r2026-10-04.58: which library performance the move trigger already
    // fired for (rising-edge firing ??one clip start per triggerMove)
    let mvHandled: MoveKind | null = null;
    const pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number; moved: number }>();
    let pinchDist = 0;
    let lastMid: { x: number; y: number } | null = null;
    // r115 hand-drag state ??released<0 means still held
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

    // r115: layout-local screen position + camera depth of a hand bone
    // (grab test + poke arm pick). Same clientWidth space as camera.aspect
    // so portrait/landscape rotation stays aligned with the pointer.
    const handScreen = (side: 'left' | 'right') => {
      const node = avatar?.getBoneNode(side === 'left' ? 'leftHand' : 'rightHand');
      if (!node) return null;
      const rect = host.getBoundingClientRect();
      const layoutW = host.clientWidth || rect.width;
      const layoutH = host.clientHeight || rect.height;
      node.getWorldPosition(sV2);
      const depth = sV2.distanceTo(camera.position);
      sV2.project(camera);
      const local = ndcPointInElementLocal(sV2.x, sV2.y, layoutW, layoutH);
      return { x: local.x, y: local.y, depth };
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
        const grabRect = host.getBoundingClientRect();
        const grabLocal = clientPointInElementLocal(
          e.clientX, e.clientY,
          host.clientWidth || grabRect.width,
          host.clientHeight || grabRect.height,
          grabRect,
        );
        for (const side of ['left', 'right'] as const) {
          const hs = handScreen(side);
          if (hs && Math.hypot(grabLocal.x - hs.x, grabLocal.y - hs.y) < GRAB_PX) {
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
      // the grab depth ??the camera does NOT rotate while a hand is held.
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
            const armL = avatar?.getBoneNode('leftLowerArm');
            const armR = avatar?.getBoneNode('rightLowerArm');
            const handL = avatar?.getBoneNode('leftHand');
            const handR = avatar?.getBoneNode('rightHand');
            const legL = avatar?.getBoneNode('leftLowerLeg');
            const legR = avatar?.getBoneNode('rightLowerLeg');
            const footL = avatar?.getBoneNode('leftFoot');
            const footR = avatar?.getBoneNode('rightFoot');
            const hipsW = worldOf(hipsN);
            const chestW = worldOf(chestN);
            const headW = worldOf(headN);
            // Character forward on XZ from shoulder axis (same as classifyPoke).
            const shR = worldOf(rightN);
            const shL = worldOf(leftN);
            let fx = shR.z - shL.z;
            let fz = -(shR.x - shL.x);
            const fl = Math.hypot(fx, fz) || 1;
            fx /= fl; fz /= fl;
            let hasNormal = false;
            if (hit.face) {
              sV2.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
              hasNormal = sV2.lengthSq() > 1e-8;
            }
            const ray = raycaster.ray.direction;
            const cls = classifyPoke(
              { x: hit.point.x, y: hit.point.y, z: hit.point.z },
              hipsW, headW, chestW, shL, shR,
              {
                normal: hasNormal ? { x: sV2.x, y: sV2.y, z: sV2.z } : undefined,
                rayDir: { x: ray.x, y: ray.y, z: ray.z },
                leftArm: armL ? worldOf(armL) : undefined,
                rightArm: armR ? worldOf(armR) : undefined,
                leftHand: handL ? worldOf(handL) : undefined,
                rightHand: handR ? worldOf(handR) : undefined,
                leftLeg: legL ? worldOf(legL) : undefined,
                rightLeg: legR ? worldOf(legR) : undefined,
                leftFoot: footL ? worldOf(footL) : undefined,
                rightFoot: footR ? worldOf(footR) : undefined,
                belly: {
                  x: hipsW.x * 0.72 + chestW.x * 0.28,
                  y: hipsW.y * 0.72 + chestW.y * 0.28,
                  z: hipsW.z * 0.72 + chestW.z * 0.28,
                },
                // Slightly behind hips along -forward for rear-hips / butt probe.
                butt: {
                  x: hipsW.x - fx * 0.08,
                  y: hipsW.y + 0.02,
                  z: hipsW.z - fz * 0.08,
                },
              },
            );
            pokeZone = cls.zone;
            pokeDirection = cls.direction;
            pokeFallDir.set(cls.impulse.x, 0, cls.impulse.z);
            pokeSideSign = cls.sideSign;
            // Camera-aware L/R (Mon queue #22): prefer the limb that sits nearer
            // to the tap in screen space. Character-axis sideSign alone mirrors
            // under orbit / face-on because shoulder forward and view axes disagree.
            camera.updateMatrixWorld();
            sV3.setFromMatrixColumn(camera.matrixWorld, 0);
            const camRightXZ = { x: sV3.x, z: sV3.z };
            // Push side = FINGER vs hips in layout-local CSS pixels (not mesh-hit
            // alone, and not raw viewport clientX vs AABB-mapped hips). After
            // portrait/landscape rotation, clientWidth drives camera.aspect —
            // map both pointer and projected hips into that same layout box.
            sV4.set(hipsW.x, hipsW.y, hipsW.z).project(camera);
            const rectLean = host.getBoundingClientRect();
            const layoutW = host.clientWidth || rectLean.width;
            const layoutH = host.clientHeight || rectLean.height;
            const hipsOnScreen = Number.isFinite(sV4.x) && Math.abs(sV4.x) <= 1.5;
            const ptrLocal = clientPointInElementLocal(
              e.clientX, e.clientY, layoutW, layoutH, rectLean,
            );
            const hipsLocal = ndcPointInElementLocal(sV4.x, sV4.y, layoutW, layoutH);
            const leanSide = hipsOnScreen
              ? screenPointerSideSign(ptrLocal.x, hipsLocal.x)
              : screenSideSign(
                { x: hit.point.x, y: hit.point.y, z: hit.point.z },
                hipsW,
                camRightXZ,
              );
            // Owner R13 (#409 + #434): poke the screen-left side and the body
            // tips screen-left; poke screen-right and it tips screen-right.
            // Do NOT "recoil away" from the finger - #443/#554 did that and
            // the owner rejected it. 8-way direction comes from the final
            // fall vector in the character frame + camera/ray.
            {
              const lean = lateralFallTowardScreenSide(camRightXZ, leanSide);
              const lateralOnly =
                pokeZone === 'side' || pokeZone === 'armL' || pokeZone === 'armR' || pokeZone === 'hand';
              const fingerOffCenter = hipsOnScreen && Math.abs(ptrLocal.x - hipsLocal.x) > 14;
              if (lateralOnly) {
                pokeFallDir.set(
                  cls.impulse.x * 0.35 + lean.x * 0.85,
                  0,
                  cls.impulse.z * 0.55 + lean.z * 0.35,
                );
                const len = Math.hypot(pokeFallDir.x, pokeFallDir.z);
                if (len > 1e-6) pokeFallDir.multiplyScalar(1 / len);
                else pokeFallDir.set(lean.x, 0, lean.z);
              } else if (fingerOffCenter) {
                pokeFallDir.set(
                  cls.impulse.x * 0.7 + lean.x * 0.55,
                  0,
                  cls.impulse.z * 0.85 + lean.z * 0.3,
                );
                const len = Math.hypot(pokeFallDir.x, pokeFallDir.z);
                if (len > 1e-6) pokeFallDir.multiplyScalar(1 / len);
              }
            }
            // Owner report 2026-11-22 (second time): a side poke must never
            // blend to the opposite side. Anchor the LATERAL component to the
            // finger's screen side. This only touches X; the axial (Z) sign is
            // decided once, below, by axialRecoilFall().
            {
              const fingerFall = flipPokeFallToFingerSide(pokeFallDir, camRightXZ, leanSide);
              pokeFallDir.set(fingerFall.x, 0, fingerFall.z);
            }
            const hsL = handScreen('left');
            const hsR = handScreen('right');
            const screenArm = armZoneFromScreen(ptrLocal.x, ptrLocal.y, hsL, hsR);
            // Never re-label a confident `side` flank tap as a single arm:
            // armZoneFromScreen always returns the nearer hand (it is null
            // only when both hands are off-screen), so every lateral poke was
            // being rewritten to armL/armR. That swapped the side gains
            // (roll 0.68) for the arm gains (roll 0.28) and turned the torso
            // lean the owner asked for into a one-arm flinch. `side` already
            // emphasises the near arm through pokeSideSign below.
            if (
              screenArm
              && (pokeZone === 'armL' || pokeZone === 'armR' || pokeZone === 'hand')
            ) {
              pokeZone = screenArm;
            }
            // Split push-side voice vs character arm emphasis (face-on they oppose:
            // screen-left is character-right). pokeSideSign = CHARACTER arms only
            // (+1 right arm / −1 left). leanSide = where the finger pushed (voice).
            if (pokeZone === 'armR') pokeSideSign = 1;
            else if (pokeZone === 'armL') pokeSideSign = -1;
            else if (
              pokeZone === 'side'
              || pokeZone === 'hand'
              || (hipsOnScreen && Math.abs(ptrLocal.x - hipsLocal.x) > 14)
            ) {
              pokeSideSign = pokeArmSideFromScreenPush(leanSide);
            }
            pokeDirection = directionFromAxes(
              { x: pokeFallDir.x, z: pokeFallDir.z },
              cls.forward,
              cls.right,
            );
            pokeSection = resolvePokeSection(pokeZone, pokeDirection);
          }
          // No full-skeleton slerp here. That blend was easing toward a
          // flipped euler and shrinking the punch to a twitch.
          onPokeRef.current?.(pokeZone, pokeDirection, pokeSection.id);
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
        orbit.dist = homeDist;
        target.copy(homeTarget);
        resetAnim = null;
        nextIdle(FADE.perfEnd);
      }

      if (!gameView && resetAnim) {
        const p = clamp((now - resetAnim.t0) / resetAnim.dur, 0, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        orbit.theta = resetAnim.from.theta + (HOME.theta - resetAnim.from.theta) * ease;
        orbit.phi = resetAnim.from.phi + (HOME.phi - resetAnim.from.phi) * ease;
        orbit.dist = resetAnim.from.dist + (homeDist - resetAnim.from.dist) * ease;
        target.lerpVectors(resetAnim.fromTarget, homeTarget, ease);
        if (p >= 1) resetAnim = null;
      }
      if (!gameView) applyCamera();

      const frame = tickEngine(dt);
      const pose = mixerActive ? undefined : sampleIdlePoseFrom(frame.t, poseSeed, poseSubset);
      const targets = mapFrameToVrm(frame, 1, pose);
      // r2026-10-03.39: a dialogue-triggered movement performance (sing / jump
      // / kungfu / taichi / piano / jog), stamped on the same clock as `now`.
      const mv = activeMove(now);
      // Live tempo: once the analyser locks, nudge the dance/sing clip toward
      // the measured BPM. Bounded to ±18% so a noisy estimate can never turn
      // a walk into a sprint. Until lock, the profile's known/measured BPM runs.
      const beatNow = mv?.kind === 'dance' || mv?.kind === 'sing'
        ? liveBeatSnapshot(now)
        : null;
      if (
        perfAction
        && beatNow
        && beatNow.source === 'analyser'
        && beatNow.bpm
        && beatNow.confidence >= 0.5
        && perfTrackBpm > 0
      ) {
        // Steer, never teleport: a wobbling estimate must not lurch the clip's
        // speed (see lib/perf-tempo-lock.ts — the "stop motion dance" report).
        perfTempoRate = steerDanceTimeScale(
          perfBaseTimeScale,
          beatNow.bpm / perfTrackBpm,
          dt,
          perfTempoRate,
        );
        perfAction.timeScale = perfTempoRate;
      }
      const beatPulse = beatNow?.pulse ?? 0;
      // r95 (Master Simon): NO hand-composed skeleton choreography. The old
      // moveDeltas ? moveEnvelope "semantic additives" made eating / dance /
      // kungfu twist the spine past human limits (upper body spinning 360簞).
      // New rule: a move either has a REAL clip in the online movement
      // library (Jump / Bow / Hello ??fired via MOVE_CLIP below) or the body
      // simply stays in its library idle. The skeleton is never rotated by
      // formula. Stage props (piano, mic?? still ride the move clock.
      if (avatar) {
        // Poke and laugh stay on the upper body. The root never translates,
        // scales, or tips ??that used to slide and lift both feet.
        const pokeAge = now - pokeAt;
        const pokeRaw = pokeAge < POKE_MS ? 1 - pokeAge / POKE_MS : 0;
        // Poke lean damp only during idle A→B mixer swap — not entry/perf
        // bone ease (that made lean pop when a 0.7s clip crossfade ended).
        const pokeDamp = idleCrossfadeAdditiveScale(now, swapBlendUntil);
        const boost = pokeRaw * pokeDamp;
        const laughAge = now - lastLaughAt();
        const laugh = laughAge >= 0 && laughAge < 1600 ? 1 - laughAge / 1600 : 0;
        let skSpine = 0, skChest = 0, skHeadX = 0, skHeadZ = 0;
        let skSpineY = 0, skChestZ = 0;
        let skLArm = 0, skRArm = 0, skLElb = 0, skRElb = 0, skLUp = 0, skRUp = 0;
        let skHip = 0, skHipRoll = 0, skHipX = 0, skHipZ = 0;
        if (boost > 0) {
          // Front/back lean sign — THE single decision (lib/poke-hit.ts header).
          // pokeFallDir is the punch TRAVEL vector (a front hit travels −Z), and
          // pokeBodyReaction leans along −fallZ, so hand it the mirrored Z to
          // make her recoil AWAY from the punch: front poke → leans back, away
          // from the camera; back poke → leans forward, toward the camera.
          // `pokeSection` above was resolved from the raw travel vector, so the
          // front/back LABEL and voice slot are untouched. Lateral (X) is
          // untouched too; `side` is returned verbatim by the helper.
          const bodyFall = axialRecoilFall(
            { x: pokeFallDir.x, z: pokeFallDir.z },
            pokeZone,
          );
          const hit = pokeSectionBodyReaction({
            t: 1 - boost,
            section: pokeSection,
            hitZone: pokeZone,
            fallX: bodyFall.x,
            fallZ: bodyFall.z,
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
          skHip = hit.hipPitch;
          skHipRoll = hit.hipRoll;
          skHipX = hit.hipShiftX;
          skHipZ = hit.hipShiftZ;
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
        // r102: hard on-screen clamp ??whatever a clip or reaction wrote
        // into the root this frame, the avatar can never leave the visible
        // stage. The camera target is already clamped (y 0.4??.7 in
        // applyCamera); this box is the matching root-side guarantee.
        avatar.root.position.x = clamp(avatar.root.position.x, -0.6, 0.6);
        avatar.root.position.y = clamp(avatar.root.position.y, -0.35, 0.5);
        avatar.root.position.z = clamp(avatar.root.position.z, -0.8, 0.8);
        // Dance/sing with no library clip loaded yet: a small sway so the body
        // still answers. A running perfAction supplies the main motion, but a
        // root-level beat accent is ADDITIVE and never fights the bone tracks.
        if ((mv?.kind === 'dance' || mv?.kind === 'sing') && boost === 0 && laugh === 0) {
          const clipPlaying = !!(perfAction && perfAction.isRunning());
          if (!clipPlaying) {
            const sway = Math.sin(now / 170);
            const amp = mv.kind === 'sing' ? 0.06 : 0.1;
            avatar.root.rotation.y += sway * amp;
            avatar.root.rotation.z += sway * (amp * 0.4);
            avatar.root.position.y = clamp(
              avatar.root.position.y + Math.abs(Math.sin(now / 85)) * (mv.kind === 'sing' ? 0.008 : 0.016),
              -0.35,
              0.5,
            );
          }
          if (beatPulse > 0) {
            // Knee/torso accent on the beat: a few millimetres of lift plus a
            // tiny roll. Deliberately subtle — the VRMA owns the choreography.
            const accent = mv.kind === 'dance' ? 0.018 : 0.009;
            avatar.root.position.y = clamp(
              avatar.root.position.y + beatPulse * accent,
              -0.35,
              0.5,
            );
            avatar.root.rotation.z += beatPulse * (mv.kind === 'dance' ? 0.01 : 0.005);
            avatar.root.rotation.y += beatPulse * (mv.kind === 'dance' ? 0.005 : 0.003);
          }
        }
        if (gameView) {
          avatar.root.position.set(gameView.vrmX, 0, gameView.vrmZ);
          avatar.root.rotation.set(0, gameView.vrmYaw, 0);
          avatar.root.scale.set(BASE_SX, BASE_SY, BASE_SX);
        }

        // speech visemes: previously ducked the whole emotion face to ~0.64
        // while the mouth moved, which read as "she goes blank to talk".
        // OWNER OVERRIDE 2026-11-25: keep 90% of the expression — the visemes
        // still open the jaw, the face does not need to flatten to speak.
        const sp = sampleSpeech();
        const duck = sp ? 1 - 0.1 * sp.duck : 1;
        const v = (x: number) => clamp(x * duck + (sp ? 0 : 0), 0, 1);
        const pokeBoost = 0.9 * boost;
        const laughBoost = 0.85 * laugh; // full smile while the giggles play
        const setEm = (name: string, val: number) => avatar!.setExpression(name, val);
        const performBoost = mv?.kind === 'sing' ? 0.55 : mv?.kind === 'dance' ? 0.4 : 0;
        // One dominant face preset for eye atlas / size morphs. The profile
        // comes from the mounted rig: `atlas` keeps winner-take-all for
        // seed-san; `roster` allows a reduced secondary so brows and mouth can
        // come from different emotions. The avatar applies the matching caps.
        if (gameView) {
          const expr = gameView.expr;
          applyDominatedEyeExpressions(setEm, {
            happy: expr.happy ?? 0,
            angry: expr.angry ?? 0,
            sad: expr.sad ?? 0,
            surprised: expr.surprised ?? 0,
            relaxed: expr.relaxed ?? 0,
            blink: expr.blink ?? 0,
            blinkLeft: expr.blinkLeft ?? 0,
            blinkRight: 0,
          }, avatar!.eyeProfile);
        } else {
          applyDominatedEyeExpressions(setEm, {
            happy: clamp(v(Math.max(targets.blendShape.joy, targets.blendShape.fun)) + (poke.face === 'happy' ? pokeBoost : 0) + laughBoost + performBoost, 0, 1),
            angry: v(targets.blendShape.angry) + (poke.face === 'angry' ? pokeBoost : 0),
            sad: v(targets.blendShape.sorrow),
            surprised: poke.face === 'surprised'
              ? clamp(v(targets.blendShape.surprise) + pokeBoost, 0, 1)
              : v(targets.blendShape.surprise),
            relaxed: v(targets.blendShape.relaxed) + (poke.face === 'relaxed' ? pokeBoost : 0),
            // No blink keys here. The avatar's blink clock owns the lids
            // (V1Avatar.update / GenericAvatar.update). Writing 0 every frame
            // here used to fight that timer and would zero it again if both
            // existed; leaving the channel untouched lets the clock win.
          }, avatar!.eyeProfile);
        }
        if (sp) {
          // Jaw openness always follows amplitude (`aa`), with the vowel only
          // tinting the shape. The old 0.12 floor on non-matching vowels made
          // the mouth look nearly shut whenever she sang anything but "ah".
          const w = visemeWeights(sp.mouth, sp.vowel);
          setEm('aa', w.aa);
          setEm('ih', w.ih);
          setEm('ou', w.ou);
          setEm('ee', w.ee);
          setEm('oh', w.oh);
        } else {
          setEm('aa', 0); setEm('ih', 0); setEm('ou', 0);
          setEm('ee', 0); setEm('oh', 0);
        }
        // Singing breath: slow root sway scaled by the live audio envelope, so
        // a long vocal never looks frozen even while the VRMA runs. Additive
        // and tiny; the clip still owns the actual performance.
        if (!gameView && mv?.kind === 'sing' && boost === 0 && laugh === 0) {
          const level = sp?.mouth ?? 0;
          avatar.root.rotation.z += Math.sin(now / 780) * 0.012 * (0.35 + level);
          avatar.root.rotation.y += Math.sin(now / 1450) * 0.006 * (0.35 + level);
          avatar.root.position.y = clamp(
            avatar.root.position.y + Math.abs(Math.sin(now / 1250)) * 0.004 * (0.35 + level),
            -0.35,
            0.5,
          );
        }

        const b = targets.bones;
        const calmClipNow = isPixelCalmIdleClip(idleClipId);
        const poseTargets: AvatarPose = {
          // Calm idle: kill engine look-at-sky; poke/laugh still use headPitchAdd.
          headX: calmClipNow && !perfAction && boost === 0
            ? calmIdleHeadPitch(b.headPitch)
            : b.headPitch,
          headY: calmClipNow && !perfAction && boost === 0 ? b.headYaw * 0.2 : b.headYaw,
          headZ: calmClipNow && !perfAction && boost === 0 ? b.headRoll * 0.25 : b.headRoll,
          headPitchAdd: skHeadX,
          headRollAdd: skHeadZ,
          spineX: b.spinePitch, chestX: b.chestPitch,
          leftUpperArm: b.leftUpperArm, rightUpperArm: b.rightUpperArm,
          leftLowerArm: b.leftLowerArm, rightLowerArm: b.rightLowerArm,
          spineY: skSpineY, chestZ: skChestZ,
          lArmX: skLArm, rArmX: skRArm,
          lElbowZ: skLElb, rElbowZ: skRElb,
          spinePitchAdd: skSpine, chestPitchAdd: skChest,
          lArmRaise: -skLUp, rArmRaise: -skRUp,
        };
        // dialogue-triggered performance: fire the matching LIBRARY clip once
        // on the rising edge. Clip-less kinds keep the skeleton for the
        // additive choreography above (r86).
        // Retry while armed if the VRMA has not loaded yet — locking
        // mvHandled on a failed playPerf left sing/dance as idle/T-pose.
        if (!gameView && mv) {
          const clipName = MOVE_CLIP[mv.kind];
          if (mvHandled !== mv.kind) {
            if (clipName) {
              if (playPerf(clipName)) mvHandled = mv.kind;
            } else {
              mvHandled = mv.kind;
            }
          } else if (
            clipName
            && (mv.kind === 'sing' || mv.kind === 'dance')
            && !(perfAction && perfAction.isRunning())
          ) {
            playPerf(clipName);
          }
        } else if (!mv) {
          // Rising edge of move-end: stop sticky LoopRepeat sing/dance so a
          // new talk / demo does not leave her performing forever.
          if (mvHandled !== null && perfAction) {
            perfAction.fadeOut(FADE.perfEnd);
            perfAction = null;
            perfClipId = null;
            clearPerfMotionProfile();
            if (!gameView) nextIdle(FADE.perfEnd);
          }
          mvHandled = null;
        }
        // r93: idle handover ??when this idle's hold expires and no one-shot
        // performance is on stage, glide into the next idle mid-motion. The
        // body is always inside a live loop: no straight stand between moves.
        if (mixerActive && !perfAction && !gameView) {
          const pinnedIdle = idleClipRef.current;
          if (pinnedIdle) {
            if (idleClipId !== pinnedIdle) playNamedIdle(pinnedIdle, IDLE_PIN_CROSSFADE_S, true);
            idleHoldUntil = Infinity;
          } else if (thinkingPoseActive()) {
            // Visual wait cue: Thinking pose (C56), upright stand if VRMA missing.
            const thinkClip = clips.has('Thinking') ? 'Thinking' : DEFAULT_IDLE_CLIP_ID;
            if (idleClipId !== thinkClip && !thinkMiss) {
              if (!playNamedIdle(thinkClip, FADE.idleRotate)) thinkMiss = true;
              else idleHoldUntil = performance.now() + 20000;
            }
          } else {
            thinkMiss = false;
            if (!singleIdleStand && now >= idleHoldUntil) nextIdle(FADE.idleRotate);
          }
          // Periodic same-clip re-blend (pinned or rotating) — stops slow joint drift.
          const idleBusy = !!perfAction || boost > 0 || !!handDrag || !!gameView;
          if (shouldRefreshIdleJoints(now, idleRefreshAt, idleBusy) && idleClipId && idleAction) {
            const cur = clips.get(idleClipId);
            if (cur) {
              playClipAsIdle(cur, idleClipId, IDLE_JOINT_REFRESH_FADE_S);
              if (pinnedIdle) idleHoldUntil = Infinity;
            } else {
              idleRefreshAt = nextIdleRefreshAt(now, IDLE_JOINT_REFRESH_MS);
            }
          }
        }
        // r2026-10-04.58: while a library clip drives the body, the skeleton
        // belongs to the mixer ??so applyPose there is limited to its designed
        // whisper + additives. r83: it MUST still be called in clip mode,
        // because the poke recoil and head life arrive through its additive
        // channels (spine/chest pitch, arm flinch), which compose on top of
        // whatever the mixer wrote this frame.
        // Idle A→B glide window — same gate for feet AND arm writers so hang /
        // soften / shoulder ROM do not yank limbs to a "strange" pose mid-fade.
        // Mixer-owned idle A→B only — deferring IK on perf/entry bone ease
        // left feet unlocked for 0.7s then plantFeet snapped the body sideways.
        const idleLegGlide = idleSwapBlendActive(now, swapBlendUntil);

        if (gameView) playGameBody(gameView.anim);
        // Calm upright: torso upright only — arm soften + hang on near-still
        // amp was the Quaternius/RPM frankenstein "strange blended pose".
        const allowArmRewrite = idleArmRewriteAllowed(idleClipId);
        if (avatar.clipDrivesBody) {
          mixer?.update(dt / 1000);
          // Idle soften — skip during swap glide (fights mixer A→B).
          if (!perfAction && boost === 0 && !gameView && !handDrag && !idleLegGlide) {
            applyIdleClipSoftening((name) => avatar!.getBoneNode(name), idleClipId);
          } else if (
            calmClipNow
            && !perfAction
            && boost === 0
            && !gameView
            && !handDrag
            && !idleLegGlide
          ) {
            // Upright-only on calm VRMA — no arm hang rewrite (frankenstein).
            pullIdleTorsoUpright(
              (name) => avatar!.getBoneNode(name),
              IDLE_CALM_TORSO_PITCH_MAX,
            );
          }
          avatar.applyPose(poseTargets);
        } else {
          avatar.applyPose(poseTargets);
        }
        // r103: relaxed fingers + shoulder ROM run AFTER the mixer and
        // applyPose wrote the skeleton and BEFORE the spring bones react.
        // Pixel-OK calm stands (not only legacy BreathCalm / StandardIdle).
        const calmIdle = !perfAction && boost === 0 && !gameView && !handDrag
          && isPixelCalmIdleClip(idleClipId);
        avatar.applyRelaxedHands(calmIdle);
        avatar.smoothFingers(dt / 1000, calmIdle);
        // Shoulder ROM mid-crossfade yanked arms — skip during glide.
        // Hang rewrite on calm upright stands fights the VRMA (strange blend).
        if (!idleLegGlide) avatar.clampShoulderROM();
        if (
          allowArmRewrite
          && !perfAction && boost === 0 && !gameView && !handDrag && !idleLegGlide
        ) {
          avatar.easeIdleHang();
        }

        // r115: hand-drag override ??after everything else wrote the
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
            // local frame (pW?鄞嗽煎搆W) and slerped by the influence ??partial
            // while easing in, full while held, fading on the spring home.
            const tgt = handDrag.target;
            const k = handDrag.infl * 0.8;
            const reach = (bone: THREE.Object3D, child: THREE.Object3D) => {
              bone.getWorldPosition(sV3);
              child.getWorldPosition(sV4);
              sV1.copy(tgt).sub(sV3).normalize(); // want
              sV2.copy(sV4).sub(sV3).normalize();  // have
              sQ1.setFromUnitVectors(sV2, sV1);   // world delta
              shortestQuatSlerp(sQ2, sQ3.identity(), sQ1, k); // scaled by influence
              if (bone.parent) {
                bone.parent.getWorldQuaternion(sQ3);   // pW
                sQ1.copy(sQ3).invert()                  // pW?鄞?
                  .multiply(sQ2)                          // 繚?
                  .multiply(sQ3);                         // 繚pW
                bone.quaternion.premultiply(sQ1);
              }
            };
            reach(upN, loN);
            reach(loN, haN);
          }
        }

        applyBoneBlend(now);
        // Plant first so rest hips land, then cast-fix levels hips/spine
        // (twisted rest hips + leveled spine sheared the waist into a
        // blended legs/body read on the distorted cast). Thigh unblend
        // runs last so hanging adducted thighs open off the torso.
        const feetFree = clipFreesFeet(perfClipId);
        // Kill stuck poke lean after poke ends — even mid idle A→B glide
        // (full plantFeet fights the mixer; hips-only clear is safe).
        // Also zero fall dir + side sign after the reaction window so the
        // stuck same-side poke tip does not linger into the next idle blend.
        if (boost === 0) {
          avatar.clearPlantLean();
          if (pokeAge >= POKE_MS) {
            pokeFallDir.set(0, 0, -1);
            pokeSideSign = 1;
          }
        }
        // During idle A→B mixer crossfade, skip plantFeet + thigh unblend so
        // IK does not tug legs against the mixer (was a visible shake).
        if (!feetFree && !idleLegGlide) {
          avatar.plantFeet(true, boost > 0 ? {
            pitch: skHip,
            roll: skHipRoll,
            shiftX: skHipX,
            shiftZ: skHipZ,
          } : undefined);
        } else if (feetFree) {
          avatar.plantFeet(false);
        }
        avatar.applyCastFixes({ skipShoulders: idleLegGlide });
        // Final axial ROM — after mixer / poke / dance sway / idle crossfade /
        // cast leveling. Fixes Normalized_J_Bip_* clamps that used to miss
        // BONE_BLEND_LIMITS and let spine/back/head travel a full turn.
        avatar.clampAxialNoFlip();
        if (!feetFree && !idleLegGlide) avatar.unblendLegs();
        avatar.update(dt / 1000);
        // Iris/white z-order can flip after morph or late texture decode — re-pin
        // every frame so pupils do not vanish mid-chat (not only at reveal gate).
        if (!revealPending) stabilizeEyeMaterials(avatar.root);
        // Chest and torso punches: bust spring after the skeleton update.
        // Soft breast (Mon t765): bounce clock outlives the tiny body recoil.
        const bounceSoft = pokeZone === 'chest' && gender === 'female';
        const bounceLimit = bounceSoft ? SOFT_CHEST_BOUNCE_SEC : CHEST_BOUNCE_SEC;
        const bounceAge = (now - pokeAt) / 1000;
        const bounceT = pokeAt > 0 && bounceAge >= 0 && bounceAge < bounceLimit ? bounceAge : -1;
        avatar.applyChestBounce(chestPokeBounce(pokeZone, bounceT, bounceSoft));

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
        // must be decoded ??but a texture that ERRORED never decodes, so
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
            stabilizeEyeMaterials(avatar.root);
            textureFallbackApplied = true;
            texturesOk = true;
          }
          if (forceReveal && !textureFallbackApplied) {
            neutralizeBrokenTextures(avatar.root);
            stabilizeEyeMaterials(avatar.root);
            textureFallbackApplied = true;
            texturesOk = true;
          }
          if (texturesOk && !castLookPatched && seedKey) {
            patchCastTextures(avatar.root, seedKey);
            stabilizeCastEyes(avatar.root, seedKey);
            stabilizeEyeMaterials(avatar.root);
            castLookPatched = true;
          }
          if (forceReveal || (poseSettled && texturesOk)) {
            revealLitFrames += 1;
            if (revealLitFrames === 1) renderer.compile(scene, camera);
            if (revealLitFrames >= 2) {
              revealPending = false;
              avatar.root.visible = true;
              if (!framed) unifyFraming(avatar);
              setLoadProgress(null);
              clearTimeout(loadWatchdog);
            }
          }
        }
      }

      // r2026-10-04.69: stage props ride the same move clock ??pop in when
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
        // Sing mic: settle from above instead of growing up from the floor.
        const enterT = on && mv ? mv.t : 1;
        pg.group.position.y = propId === 'micStand' ? propEnterFromTop(enterT) : 0;
        const dust = propId === 'micStand' ? propMagicDust(enterT) : 0;
        for (const ap of pg.animParts) {
          if (ap.anim === 'pianoKeys') {
            ap.obj.position.y = ap.base.y - 0.011 * Math.max(0, Math.sin(now * 0.014 + ap.phase));
          } else if (ap.anim === 'softBob') {
            ap.obj.position.y = ap.base.y + 0.008 * Math.sin(now * 0.0045 + ap.phase);
          } else if (ap.anim === 'sway') {
            ap.obj.rotation.z = ap.baseRotZ + 0.09 * Math.sin(now * 0.004 + ap.phase);
          } else if (ap.anim === 'sparkle') {
            ap.obj.scale.setScalar(1 + 0.08 * Math.max(0, Math.sin(now * 0.009 + ap.phase)));
          } else if (ap.anim === 'magicDust') {
            const twinkle = 0.55 + 0.45 * Math.max(0, Math.sin(now * 0.012 + ap.phase));
            const fall = dust * (0.04 + 0.03 * Math.sin(now * 0.009 + ap.phase));
            ap.obj.position.y = ap.base.y - (1 - dust) * 0.18 + fall;
            ap.obj.scale.setScalar(Math.max(0.001, dust * twinkle));
            ap.obj.visible = dust > 0.02;
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
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!(w > 0) || !(h > 0)) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    // Mobile portrait↔landscape often fires orientationchange before layout
    // settles; a deferred resize keeps camera.aspect + pointer/hips local space
    // in sync with the rendered canvas.
    let orientResizeTimer = 0;
    const onOrientation = () => {
      onResize();
      window.clearTimeout(orientResizeTimer);
      orientResizeTimer = window.setTimeout(onResize, 180);
    };
    window.addEventListener('orientationchange', onOrientation);
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    vv?.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      swapBodyRef.current = () => {};
      showLibraryRef.current = () => {};
      publishModularView('idle');
      cancelAnimationFrame(raf);
      window.clearTimeout(orientResizeTimer);
      clearTimeout(loadWatchdog);
      // Match the r91 comment: retire the StatusPlate spinner on unmount so a
      // mid-load leave/chat remount never flashes a stale % or "preparing…".
      setLoadProgress(null);
      document.removeEventListener('visibilitychange', onGameVis);
      registerGroundPick(null);
      disposeMiniGameStage(scene);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientation);
      vv?.removeEventListener('resize', onResize);
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', onPointerUp);
      host.removeEventListener('pointercancel', onPointerUp);
      host.removeEventListener('wheel', onWheel);
      avatar?.root.removeFromParent();
      // dispose optional story-room GLB
      roomRoot.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) (m as THREE.Material | undefined)?.dispose();
      });
      roomRoot.removeFromParent();
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
  }, [accent, seedKey, wardrobeHeadId, sceneGlbUrl]);

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

  // r91 (Master Simon): no overlay here at all ??the empty stage IS the
  // loading state, and the top-left name bar (StatusPlate) carries a mini
  // spinner + the real percentage through lib/load-progress.
  return <div ref={hostRef} className="absolute inset-0 touch-none" aria-label={characterById(seedKey ?? '').name} />;
}

