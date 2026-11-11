// The poke is one event with three parts: the sound, the spoken line, and the
// recoil. These pin the two couplings that actually broke.
//
// 1. The SFX has to answer the zone that was hit, in a language the companion
//    speaks, and it has to finish inside the reaction window — a clip that
//    outlives the recoil keeps sounding after she has settled, which reads as
//    "the poke voice is wrong".
// 2. A side tap must swing the arms the same way at every camera angle. The
//    swing used to be signed by a value built from the camera's right vector,
//    so the same tap swung her arms backwards at one orbit angle and forwards
//    at another.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { mp3DurationSec } from '../lib/clip-duration';
import { POKE_REACTION_MS, pokeBodyReaction, type TalkZone } from '../lib/poke-hit';
import {
  POKE_PREFETCH_ZONES,
  RECORDED_POKE_ZONE,
  pokeZoneClipPaths,
  recordedPokeClip,
} from '../lib/voice-clips';
import { criticalChatAudioPaths } from '../lib/early-audio-preload';
import {
  forgetCmaReactionPickCache,
  resetCmaReactionPicks,
  resetWantedCmaReactionRotation,
} from '../lib/cma-reaction-gallery';

const here = path.dirname(fileURLToPath(import.meta.url));
const GENDERS = ['female', 'male'] as const;
const ZONES = [
  'head', 'torso', 'chest', 'breast', 'side', 'back',
  'belly', 'butt', 'hand', 'hands', 'arm', 'armL', 'armR',
  'legs', 'legL', 'legR', 'foot', 'default',
] as const;

function publicFile(rel: string): string {
  return path.resolve(here, '../public', rel.slice(1));
}

function durationOf(rel: string): number {
  const sec = mp3DurationSec(readFileSync(publicFile(rel)));
  expect(sec, `unreadable mp3: ${rel}`).not.toBeNull();
  return sec!;
}

/** Wanted gallery is a user setting; the shipped defaults are the zone table. */
function withEmptyGallery<T>(fn: () => T): T {
  resetCmaReactionPicks();
  forgetCmaReactionPickCache();
  resetWantedCmaReactionRotation();
  try {
    return fn();
  } finally {
    resetCmaReactionPicks();
    forgetCmaReactionPickCache();
    resetWantedCmaReactionRotation();
  }
}

const REACTION_SEC = POKE_REACTION_MS / 1000;

describe('poke SFX answers the zone that was hit', () => {
  it('ships every zone clip on disk, for both genders', () => {
    for (const gender of GENDERS) {
      for (const zone of ZONES) {
        const rel = recordedPokeClip(gender, zone);
        expect(rel.startsWith('/voice-clips/'), `${gender} ${zone}`).toBe(true);
        expect(() => readFileSync(publicFile(rel)), `${gender} ${zone} → ${rel}`).not.toThrow();
      }
    }
  });

  it('uses distinct clips for distinct zones, so a tap is not answered generically', () => {
    for (const gender of GENDERS) {
      const table = RECORDED_POKE_ZONE[gender];
      // Zones that must never share a sound with each other.
      const pairs: [string, string][] = [
        ['torso', 'chest'],
        ['head', 'legs'],
        ['belly', 'butt'],
      ];
      for (const [a, b] of pairs) {
        expect(table[a], `${gender} ${a} vs ${b}`).not.toBe(table[b]);
      }
      expect(pokeZoneClipPaths(gender).length).toBeGreaterThan(4);
    }
  });

  it('finishes inside the poke reaction window, so sound and body settle together', () => {
    for (const gender of GENDERS) {
      const table = RECORDED_POKE_ZONE[gender];
      for (const [zone, rel] of Object.entries(table)) {
        const sec = durationOf(rel);
        expect(
          sec,
          `${gender} ${zone} plays ${rel} for ${sec.toFixed(2)}s but the body finishes in ${REACTION_SEC.toFixed(2)}s`,
        ).toBeLessThanOrEqual(REACTION_SEC);
      }
    }
  });

  it('never answers a poke in a language the companion does not speak', () => {
    // The male table was all `ja/...`, so an English or Cantonese companion
    // yelped in Japanese on every poke. Only language-neutral pools remain.
    const NEUTRAL = ['/voice-clips/universal/', '/voice-clips/cma-reaction/', '/voice-clips/en/'];
    for (const gender of GENDERS) {
      for (const [zone, rel] of Object.entries(RECORDED_POKE_ZONE[gender])) {
        const neutral = NEUTRAL.some((prefix) => rel.startsWith(prefix));
        expect(neutral, `${gender} ${zone} → ${rel} is language-specific`).toBe(true);
      }
    }
  });

  it('never answers a punch with a laugh, a sigh, or a question', () => {
    // These three were the actual regressions:
    //   · male torso  played a LAUGH (1.72s) — the one sound that inverts
    //     the meaning of a hit
    //   · female butt played a SIGH (1.12s) — bored, not reacting
    //   · female side played a 2.06s question ("huh?") that outlived the body
    // Short conversational takes that Mon tuned deliberately (smile on the
    // arms, hehe on the head) are left alone — they are a beat long, not wrong.
    const NOT_A_PUNCH_REACTION = /\/(laugh|sigh|huh)\w*\.mp3$/;
    for (const gender of GENDERS) {
      for (const [zone, rel] of Object.entries(RECORDED_POKE_ZONE[gender])) {
        expect(NOT_A_PUNCH_REACTION.test(rel), `${gender} ${zone} → ${rel}`).toBe(false);
      }
    }
  });

  it('wraps soft-vs-hard female poke zones from the CMA ship-set', () => {
    // Soft head (hehe→CMA00352) stays distinct from chest oh and hard belly ouch (#18).
    expect(RECORDED_POKE_ZONE.female.chest).toContain('CMA00351');
    expect(RECORDED_POKE_ZONE.female.breast).toBe(RECORDED_POKE_ZONE.female.chest);
    expect(RECORDED_POKE_ZONE.female.head).not.toBe(RECORDED_POKE_ZONE.female.chest);
    expect(RECORDED_POKE_ZONE.female.belly).toContain('CMA00335');
    expect(RECORDED_POKE_ZONE.male.default).toContain('CMA00339');
    expect(RECORDED_POKE_ZONE.male.torso).not.toBe(RECORDED_POKE_ZONE.male.chest);
    // Runtime poke paths must come from the EmotionClipRow / CMA ship-set
    // (keepers + CMA00350–362) — never orphaned universal CLIP_LIBRARY rows.
    for (const gender of GENDERS) {
      for (const rel of Object.values(RECORDED_POKE_ZONE[gender])) {
        expect(rel.startsWith('/voice-clips/cma-reaction/'), rel).toBe(true);
      }
    }
  });
});

describe('poke audio is warm before the first tap', () => {
  it('prefetches the zones a body tap actually lands on, for both genders', () => {
    for (const gender of GENDERS) {
      const paths = criticalChatAudioPaths('yue', gender);
      for (const zone of POKE_PREFETCH_ZONES) {
        const expected = RECORDED_POKE_ZONE[gender][zone]!;
        expect(paths, `${gender} ${zone}`).toContain(expected);
      }
      // A background warm must never enqueue the same URL twice.
      expect(new Set(paths).size).toBe(paths.length);
    }
  });
});

describe('poke recoil is the same gesture at every camera angle', () => {
  const CAMERA_RIGHTS = [
    { label: 'face-on', x: 1, z: 0 },
    { label: 'orbit 25', x: 0.906, z: 0.423 },
    { label: 'orbit 45', x: 0.707, z: -0.707 },
    { label: 'orbit 70', x: 0.342, z: 0.94 },
    { label: 'orbit 110', x: -0.342, z: 0.94 },
  ];

  /** Exactly what CompanionCanvas hands over on its lateral path (opposite-side lean). */
  function lateralFall(camRight: { x: number; z: number }, camSide: number) {
    const n = Math.hypot(camRight.x, camRight.z);
    // Pixel: lean away from the poked screen side → cameraRight * (-camSide).
    return { fallX: (camRight.x / n) * -camSide, fallZ: 0 };
  }

  it('swings the arms away from the poke, identically across the orbit', () => {
    const seen = new Map<string, { l: number; r: number }>();
    for (const cam of CAMERA_RIGHTS) {
      for (const camSide of [1, -1] as const) {
        const { fallX, fallZ } = lateralFall(cam, camSide);
        const hit = pokeBodyReaction({
          t: 0.12,
          zone: 'side',
          fallX,
          fallZ,
          sideSign: camSide,
          softChest: false,
          twist: 0,
          direction: camSide > 0 ? 'right' : 'left',
        });
        seen.set(`${cam.label}:${camSide}`, { l: hit.lArmX, r: hit.rArmX });
      }
    }
    const rights = [...seen.entries()].filter(([k]) => k.endsWith(':1')).map(([, v]) => v);
    const lefts = [...seen.entries()].filter(([k]) => k.endsWith(':-1')).map(([, v]) => v);
    // One gesture per side, not one per orbit angle.
    for (const v of rights) expect(v).toEqual(rights[0]);
    for (const v of lefts) expect(v).toEqual(lefts[0]);
    // And the two sides are opposite swings of the same arm pair.
    expect(Math.sign(rights[0]!.l)).toBe(-Math.sign(lefts[0]!.l));
    expect(Math.sign(rights[0]!.r)).toBe(-Math.sign(lefts[0]!.r));
  });

  it('gives the poked side the full arm swing and the far arm the echo', () => {
    for (const cam of CAMERA_RIGHTS) {
      for (const camSide of [1, -1] as const) {
        const { fallX, fallZ } = lateralFall(cam, camSide);
        const hit = pokeBodyReaction({
          t: 0.12, zone: 'side', fallX, fallZ, sideSign: camSide,
          softChest: false, twist: 0, direction: camSide > 0 ? 'right' : 'left',
        });
        const near = camSide > 0 ? hit.rArmX : hit.lArmX;
        const far = camSide > 0 ? hit.lArmX : hit.rArmX;
        expect(Math.abs(near), cam.label).toBeGreaterThan(Math.abs(far));
      }
    }
  });

  it('ignores float noise in the forward component of a side tap', () => {
    const clean = pokeBodyReaction({
      t: 0.12, zone: 'side', fallX: 1, fallZ: 0, sideSign: 1,
      softChest: false, twist: 0, direction: 'right',
    });
    for (const noise of [1e-17, -1e-17, 1e-12, -1e-12]) {
      const noisy = pokeBodyReaction({
        t: 0.12, zone: 'side', fallX: 1, fallZ: noise, sideSign: 1,
        softChest: false, twist: 0, direction: 'right',
      });
      expect(noisy.lArmX, `fallZ=${noise}`).toBeCloseTo(clean.lArmX, 6);
      expect(noisy.rArmX, `fallZ=${noise}`).toBeCloseTo(clean.rArmX, 6);
    }
  });

  it('leaves a front or back poke driving the arms from its own axis', () => {
    const front = pokeBodyReaction({
      t: 0.12, zone: 'torso', fallX: 0, fallZ: -1, sideSign: 1,
      softChest: false, twist: 0, direction: 'front',
    });
    const back = pokeBodyReaction({
      t: 0.12, zone: 'torso', fallX: 0, fallZ: 1, sideSign: 1,
      softChest: false, twist: 0, direction: 'back',
    });
    // A front push swings the arms one way, a back push the other.
    expect(Math.sign(front.lArmX)).toBe(-Math.sign(back.lArmX));
    expect(Math.sign(front.rArmX)).toBe(-Math.sign(back.rArmX));
    // A front poke is symmetric: neither arm is singled out. (The right arm
    // carries a pre-existing 0.94 factor, so compare relative to the front.)
    expect(Math.abs(front.lArmX)).toBeCloseTo(Math.abs(front.rArmX) / 0.94, 1);
  });

  it('reaches the same recoil for a tap on either arm', () => {
    for (const zone of ['armL', 'armR'] as TalkZone[]) {
      const hit = pokeBodyReaction({
        t: 0.12, zone, fallX: 0, fallZ: -1, sideSign: zone === 'armR' ? 1 : -1,
        softChest: false, twist: 0, direction: 'front',
      });
      const struck = zone === 'armL' ? hit.lArmX : hit.rArmX;
      const other = zone === 'armL' ? hit.rArmX : hit.lArmX;
      expect(Math.abs(struck)).toBeGreaterThan(Math.abs(other));
    }
  });
});

describe('poke reaction clock', () => {
  afterEach(() => resetCmaReactionPicks());

  it('is one shared window the SFX budget is measured against', () => {
    expect(POKE_REACTION_MS).toBeGreaterThan(0);
    // The impulse is fully settled by the end of the window.
    const tail = pokeBodyReaction({
      t: 1, zone: 'torso', fallX: 0, fallZ: -1, sideSign: 1,
      softChest: false, twist: 0, direction: 'front',
    });
    expect(Math.abs(tail.spinePitch)).toBeLessThan(0.15);
  });

  it('keeps the default table in force when no gallery pick exists', () => {
    const rel = withEmptyGallery(() => recordedPokeClip('female', 'chest'));
    expect(rel).toBe(RECORDED_POKE_ZONE.female.chest);
  });

  it('ChatPanel keeps poke off persisted chat history', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const panel = readFileSync(path.join(here, '../components/ChatPanel.tsx'), 'utf8');
    const pokeBlock = panel.slice(
      panel.indexOf('const lastPokeRef = useRef(pokeCount)'),
      panel.indexOf('const lastHandRef = useRef(handHoldCount)'),
    );
    expect(pokeBlock).toContain('playPokeBurst');
    expect(pokeBlock).not.toContain('setHistory');
  });

  it('ChatPanel poke plays the zone MP3 without a parallel TTS / utterance feed', () => {
    // Regression: SFX-only poke still called feedUtterance + notifySpeaking on a
    // placeholder line beside playPokeBurst, so the speaking indicator (and any
    // synth/edge fallthrough) ran as a second utterance over the premade clip.
    const here = path.dirname(fileURLToPath(import.meta.url));
    const panel = readFileSync(path.join(here, '../components/ChatPanel.tsx'), 'utf8');
    const pokeBlock = panel.slice(
      panel.indexOf('const lastPokeRef = useRef(pokeCount)'),
      panel.indexOf('const lastHandRef = useRef(handHoldCount)'),
    );
    expect(pokeBlock).toContain('playPokeBurst');
    expect(pokeBlock).not.toContain('feedUtterance');
    expect(pokeBlock).not.toContain('notifySpeaking');
    expect(pokeBlock).not.toMatch(/\bspeak\s*\(/);
    expect(pokeBlock).not.toMatch(/\bsayLocal\s*\(/);
    expect(pokeBlock).not.toMatch(/pokeReactionLine|pokeSectionPlaceholderLine/);

    const voice = readFileSync(path.join(here, '../lib/voice.ts'), 'utf8');
    const burst = voice.slice(
      voice.indexOf('export function playPokeBurst'),
      voice.indexOf('export function playLaughBurst'),
    );
    expect(burst).toContain('playVoiceClip');
    expect(burst).not.toMatch(/\bspeak\s*\(/);
    expect(burst).not.toContain('beginTts');
    expect(burst).not.toContain('speakGtts');
    expect(burst).not.toContain('speakEdge');
    expect(burst).not.toContain('synthSpeak');

    const clip = readFileSync(path.join(here, '../lib/play-voice-clip.ts'), 'utf8');
    expect(clip).toContain('noteSpeechStarted');
    expect(clip).toContain('followAudioElement');
  });

  it('the canvas reads the shared window instead of hard-coding its own', () => {
    // The window lives in two files: poke-hit owns POKE_REACTION_MS (which the
    // SFX budget is measured against), and CompanionCanvas drives the recoil.
    // They were duplicated as a literal 1200, so editing one silently desynced
    // the other — which is how a 2.06s clip ended up playing over a 1.2s recoil.
    const here = path.dirname(fileURLToPath(import.meta.url));
    const canvas = readFileSync(path.join(here, '../components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toContain('POKE_REACTION_MS');
    expect(canvas).toMatch(/const POKE_MS = POKE_REACTION_MS;/);
    // No stray literal window left behind.
    expect(canvas).not.toMatch(/const POKE_MS = \d+;/);
  });
});
