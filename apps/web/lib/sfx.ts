'use client';
// Procedural sound-effects + ambient-scene engine (r2026-10-04.82).
// Everything is synthesized live in WebAudio — no audio files, no network,
// no keys — the same philosophy as music.ts. Two layers:
//   AMBIENT — the backdrop gains a voice: rain patter + distant thunder on
//     the rainy-night scene, campfire crackle at the ember camp, wind and
//     birdsong over the meadow, a warm drone under the stars… started by
//     the chat panel, keyed by background id, crossfaded on scene change.
//   ONE-SHOTS — her body makes noise now: a boing on every hop, whoosh-thud
//     for kung fu, long chimes for tai chi, plucked notes for piano, a
//     little violin phrase, ice-cream munching, jogging footsteps, a glass
//     clink for the fine-dining toast — plus giggle trills when she laughs
//     and a soft boing when you poke her.
// Pure-data tables are exported for tests; every AudioContext touch is lazy
// so node selftests stay side-effect free. Master switch: localStorage
// 'amoji.sfx' = 'off' silences everything (a Settings toggle can call
// setSfxEnabled).

import type { MoveKind } from './moves';

// ---------------------------------------------------------------------------
// pure data — node-testable
// ---------------------------------------------------------------------------

/** ambient elements a scene is built from (composed by the runtime below) */
export type AmbientElement =
  | 'rain' | 'thunder'   // rainy night
  | 'fire'               // campfire crackle
  | 'wind' | 'birds'     // meadows, blossom
  | 'crickets'           // warm evenings
  | 'drone' | 'twinkle'  // night-sky beds
  | 'hum'                // city night
  | 'bubbles';           // underwater

/** backdrop id → its ambient recipe (mirrors the SCENE_LINES keys) */
export const AMBIENT_MAP: Record<string, AmbientElement[]> = {
  void: ['drone', 'twinkle', 'crickets'],
  aurora: ['drone', 'twinkle', 'wind'],
  ember: ['fire', 'drone'],
  sakura: ['wind', 'birds'],
  abyss: ['bubbles', 'drone'],
  rain: ['rain', 'thunder'],
  sunset: ['drone', 'crickets', 'birds'],
  meadow: ['wind', 'birds'],
  cloudsea: ['wind', 'drone'],
  neon: ['hum', 'wind'],
  snowmoon: ['wind', 'twinkle'],
  galaxy: ['drone', 'twinkle'],
};
export const AMBIENT_DEFAULT: AmbientElement[] = ['drone'];

/** moves the backing-track engine already covers — no one-shot on top */
export const MOVE_SFX_SKIP: MoveKind[] = ['dance', 'sing'];

// ---------------------------------------------------------------------------
// runtime (browser only; never touched in node tests)
// ---------------------------------------------------------------------------

let ac: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
let unlockBound = false;

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ac) {
    ac = new AC();
    // autoplay policies start the context suspended — resume on the first
    // real gesture and on every later call, whichever comes first
    if (!unlockBound) {
      unlockBound = true;
      const kick = () => { if (ac && ac.state === 'suspended') void ac.resume().catch(() => undefined); };
      window.addEventListener('pointerdown', kick, { passive: true });
      window.addEventListener('keydown', kick, { passive: true });
    }
  }
  if (ac.state === 'suspended') void ac.resume().catch(() => undefined);
  return ac;
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

export function sfxEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem('amoji.sfx') !== 'off'; } catch { return true; }
}

export function setSfxEnabled(on: boolean): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem('amoji.sfx', on ? 'on' : 'off'); } catch { /* ignore */ }
  if (!on) ambientStop();
}

/** true while an ambient scene bed is running */
export function ambientPlaying(): boolean {
  return current !== null;
}

// ---- low-level one-shot helpers ---------------------------------------------

interface ToneOpts {
  freq: number; at: number; dur: number; vol: number;
  wave?: OscillatorType; slideTo?: number; attack?: number;
}

function tone(c: AudioContext, dest: AudioNode, o: ToneOpts): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.wave ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, o.at);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, o.at + o.dur);
  const atk = o.attack ?? 0.012;
  g.gain.setValueAtTime(0, o.at);
  g.gain.linearRampToValueAtTime(o.vol, o.at + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, o.at + o.dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(o.at);
  osc.stop(o.at + o.dur + 0.05);
}

interface BurstOpts {
  at: number; dur: number; vol: number;
  type?: BiquadFilterType; f0: number; f1?: number; q?: number;
}

function burst(c: AudioContext, dest: AudioNode, o: BurstOpts): void {
  const s = c.createBufferSource();
  s.buffer = noise(c);
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.f0, o.at);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, o.at + o.dur);
  f.Q.value = o.q ?? 1;
  const g = c.createGain();
  g.gain.setValueAtTime(0, o.at);
  g.gain.linearRampToValueAtTime(o.vol, o.at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, o.at + o.dur);
  s.connect(f);
  f.connect(g);
  g.connect(dest);
  s.start(o.at);
  s.stop(o.at + o.dur + 0.05);
}

// ---- one-shots keyed off her body -------------------------------------------

/** a movement performance now comes with its own foley — call for every triggerMove */
export function playMoveSfx(kind: MoveKind): void {
  if (MOVE_SFX_SKIP.includes(kind)) return; // the music engine carries these
  const c = ctx();
  if (!c || !sfxEnabled()) return;
  const t = c.currentTime + 0.02;
  const out = c.destination;
  switch (kind) {
    case 'jump': {
      // cartoon boing: fast rise, long settle
      tone(c, out, { freq: 170, slideTo: 540, at: t, dur: 0.13, vol: 0.13, wave: 'triangle' });
      tone(c, out, { freq: 540, slideTo: 210, at: t + 0.13, dur: 0.22, vol: 0.11, wave: 'triangle' });
      tone(c, out, { freq: 90, slideTo: 60, at: t + 0.02, dur: 0.12, vol: 0.12 });
      break;
    }
    case 'kungfu': {
      // two cloth whooshes, each with a padded impact thud
      burst(c, out, { at: t, dur: 0.22, vol: 0.16, f0: 420, f1: 1700, q: 1.4 });
      tone(c, out, { freq: 95, slideTo: 55, at: t + 0.09, dur: 0.16, vol: 0.16 });
      burst(c, out, { at: t + 0.3, dur: 0.24, vol: 0.15, f0: 1600, f1: 320, q: 1.4 });
      tone(c, out, { freq: 88, slideTo: 50, at: t + 0.39, dur: 0.16, vol: 0.15 });
      break;
    }
    case 'taichi': {
      // a slow temple-bowl swell per flow
      tone(c, out, { freq: 264, at: t, dur: 2.0, vol: 0.06, attack: 0.5 });
      tone(c, out, { freq: 396, at: t + 0.1, dur: 1.9, vol: 0.028, attack: 0.5 });
      tone(c, out, { freq: 528, at: t + 0.2, dur: 1.8, vol: 0.02, attack: 0.6 });
      break;
    }
    case 'violin': {
      // a short bowed phrase — sawtooth with a soft fifth under it
      const base = 587.33; // D5
      const phrase = [0, 3, 5, 4];
      phrase.forEach((semi, i) => {
        const f = base * Math.pow(2, semi / 12);
        tone(c, out, { freq: f, at: t + i * 0.3, dur: 0.34, vol: 0.055, wave: 'sawtooth', attack: 0.05 });
        tone(c, out, { freq: f * 1.5, at: t + i * 0.3, dur: 0.3, vol: 0.018, wave: 'sine', attack: 0.05 });
      });
      break;
    }
    case 'piano': {
      // five bright plucks walking up a pentatonic
      const base = 523.25; // C5
      [0, 2, 4, 7, 9].forEach((semi, i) => {
        tone(c, out, { freq: base * Math.pow(2, semi / 12), at: t + i * 0.13, dur: 0.55, vol: 0.08, wave: 'triangle' });
      });
      break;
    }
    case 'dine': {
      // a crystal toast: glass clink + high sparkle
      tone(c, out, { freq: 2093, at: t, dur: 0.5, vol: 0.05 });
      tone(c, out, { freq: 2637, at: t, dur: 0.4, vol: 0.035 });
      tone(c, out, { freq: 3520, at: t, dur: 0.28, vol: 0.02 });
      burst(c, out, { at: t, dur: 0.03, vol: 0.05, type: 'highpass', f0: 6000 });
      break;
    }
    case 'eat': {
      // happy munching — four quick crunchy bites
      [0, 0.24, 0.52, 0.72].forEach((dt, i) => {
        burst(c, out, { at: t + dt, dur: 0.07, vol: 0.08 - i * 0.008, f0: 640 + Math.random() * 320, q: 2.5 });
      });
      tone(c, out, { freq: 700, slideTo: 900, at: t + 0.9, dur: 0.12, vol: 0.04, wave: 'triangle' }); // satisfied mmm
      break;
    }
    case 'jog': {
      // soft footfalls on the spot, four strides
      for (let i = 0; i < 8; i++) {
        tone(c, out, { freq: i % 2 ? 105 : 92, slideTo: 62, at: t + i * 0.27, dur: 0.09, vol: 0.06 });
      }
      break;
    }
    case 'yoga': {
      // one long calm breath-chime
      tone(c, out, { freq: 392, at: t, dur: 2.4, vol: 0.05, attack: 0.9 });
      tone(c, out, { freq: 587, at: t + 0.2, dur: 2.2, vol: 0.02, attack: 1.0 });
      break;
    }
    case 'stretch': {
      // three light joint pops, playful
      [330, 392, 350].forEach((f, i) => {
        tone(c, out, { freq: f, at: t + i * 0.32, dur: 0.07, vol: 0.05, wave: 'triangle' });
      });
      break;
    }
    default:
      break;
  }
}

/** her giggle now trills — called from triggerLaugh so every funny moment rings */
export function playLaughSfx(): void {
  const c = ctx();
  if (!c || !sfxEnabled()) return;
  const t = c.currentTime + 0.02;
  const out = c.destination;
  // a descending trill of quick little notes, like a suppressed laugh
  const notes = [880, 712, 780, 628, 686, 540];
  notes.forEach((f, i) => {
    tone(c, out, { freq: f, slideTo: f * 0.86, at: t + i * 0.095, dur: 0.1, vol: 0.065, wave: 'triangle' });
  });
}

/** a soft boing + padded thump when you poke her */
export function playPokeSfx(): void {
  const c = ctx();
  if (!c || !sfxEnabled()) return;
  const t = c.currentTime + 0.02;
  const out = c.destination;
  tone(c, out, { freq: 320, slideTo: 110, at: t, dur: 0.16, vol: 0.14, wave: 'triangle' });
  burst(c, out, { at: t, dur: 0.05, vol: 0.07, f0: 900, q: 1.2 });
  tone(c, out, { freq: 520, slideTo: 940, at: t + 0.05, dur: 0.14, vol: 0.05, wave: 'sine' });
}

// ---- ambient scene beds ------------------------------------------------------

interface AmbientHandle {
  master: GainNode;
  teardown: () => void;
}

let current: { scene: string; handle: AmbientHandle } | null = null;

/**
 * Start the ambient bed for a backdrop. Re-calling with the same id is a
 * no-op; a different id crossfades. Safe to call before any user gesture
 * (the context resumes itself on the first tap/keypress).
 */
export function ambientStart(sceneId: string): void {
  const c = ctx();
  if (!c || !sfxEnabled()) return;
  if (current && current.scene === sceneId) return;
  ambientStop();
  const master = c.createGain();
  master.gain.setValueAtTime(0, c.currentTime);
  master.gain.linearRampToValueAtTime(1, c.currentTime + 2.5);
  master.connect(c.destination);
  const timers: ReturnType<typeof setTimeout>[] = [];
  const dead = { v: false };
  /** schedule fn once after a random delay in [min,max] ms */
  const later = (minMs: number, maxMs: number, fn: () => void): void => {
    const id = setTimeout(() => { if (!dead.v) fn(); }, minMs + Math.random() * (maxMs - minMs));
    timers.push(id);
  };
  /** schedule fn on a repeating random cadence in [min,max] ms */
  const every = (minMs: number, maxMs: number, fn: () => void): void => {
    const loop = (): void => {
      const id = setTimeout(() => { if (dead.v) return; fn(); loop(); }, minMs + Math.random() * (maxMs - minMs));
      timers.push(id);
    };
    loop();
  };
  const elements = AMBIENT_MAP[sceneId] ?? AMBIENT_DEFAULT;
  for (const el of elements) buildElement(c, master, el, every, later);
  current = {
    scene: sceneId,
    handle: {
      master,
      teardown: () => {
        dead.v = true;
        timers.forEach(clearTimeout);
        try { master.disconnect(); } catch { /* already gone */ }
      },
    },
  };
}

/** fade the current bed out and release it (~1s) */
export function ambientStop(): void {
  if (!current) return;
  const { handle } = current;
  current = null;
  const c = ac;
  if (!c) { handle.teardown(); return; }
  try {
    handle.master.gain.cancelScheduledValues(c.currentTime);
    handle.master.gain.setValueAtTime(handle.master.gain.value, c.currentTime);
    handle.master.gain.linearRampToValueAtTime(0, c.currentTime + 1.0);
  } catch { /* context closed */ }
  setTimeout(() => handle.teardown(), 1200);
}

type EveryFn = (minMs: number, maxMs: number, fn: () => void) => void;
type LaterFn = (minMs: number, maxMs: number, fn: () => void) => void;

function buildElement(c: AudioContext, dest: AudioNode, el: string, every: EveryFn, later: LaterFn): void {
  const R = Math.random;
  switch (el) {
    case 'wind': {
      // gusting band-passed noise, breathing slowly
      const s = c.createBufferSource();
      s.buffer = noise(c); s.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 0.7;
      const g = c.createGain(); g.gain.value = 0.045;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.08;
      const lfoG = c.createGain(); lfoG.gain.value = 260;
      lfo.connect(lfoG); lfoG.connect(f.frequency);
      s.connect(f); f.connect(g); g.connect(dest);
      s.start(); lfo.start();
      break;
    }
    case 'drone': {
      // a warm two-note night bed, gently beating
      const g = c.createGain(); g.gain.value = 0.05;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      [110, 164.81].forEach((f0, i) => {
        const o = c.createOscillator();
        o.type = 'sine'; o.frequency.value = f0; o.detune.value = i ? 5 : -5;
        o.connect(lp); o.start();
      });
      lp.connect(g); g.connect(dest);
      break;
    }
    case 'rain': {
      // steady patter: soft low-passed wash + a faint high hiss
      const mk = (type: BiquadFilterType, freq: number, vol: number): void => {
        const s = c.createBufferSource();
        s.buffer = noise(c); s.loop = true;
        const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
        const g = c.createGain(); g.gain.value = vol;
        s.connect(f); f.connect(g); g.connect(dest); s.start();
      };
      mk('lowpass', 1300, 0.085);
      mk('highpass', 4200, 0.014);
      break;
    }
    case 'hum': {
      // the city never fully sleeps — mains hum + low traffic bed
      const g = c.createGain(); g.gain.value = 0.02;
      [60, 120].forEach((f0, i) => {
        const o = c.createOscillator();
        o.type = 'sine'; o.frequency.value = f0;
        const og = c.createGain(); og.gain.value = i ? 0.4 : 1;
        o.connect(og); og.connect(g); o.start();
      });
      g.connect(dest);
      const s = c.createBufferSource(); s.buffer = noise(c); s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
      const ng = c.createGain(); ng.gain.value = 0.018;
      s.connect(f); f.connect(ng); ng.connect(dest); s.start();
      break;
    }
    case 'thunder': {
      // a distant roll every so often, never a clap overhead
      later(12_000, 30_000, () => {
        tone(c, dest, { freq: 46, at: c.currentTime, dur: 3.2, vol: 0.13, attack: 0.9 });
        burst(c, dest, { at: c.currentTime, dur: 2.6, vol: 0.07, type: 'lowpass', f0: 180 });
      });
      break;
    }
    case 'fire': {
      // restless crackle — tiny irregular pops
      every(70, 240, () => {
        burst(c, dest, { at: c.currentTime, dur: 0.02 + R() * 0.035, vol: 0.014 + R() * 0.04, type: 'highpass', f0: 1600 + R() * 1800 });
      });
      break;
    }
    case 'birds': {
      // sparse songbirds, each a little two-or-three-note chirp
      every(2_800, 8_500, () => {
        const t = c.currentTime;
        const f0 = 2200 + R() * 1100;
        const n = 2 + Math.floor(R() * 2);
        for (let i = 0; i < n; i++) {
          tone(c, dest, { freq: f0 * (1 + R() * 0.12), slideTo: f0 * 0.82, at: t + i * 0.11, dur: 0.07 + R() * 0.04, vol: 0.04 });
        }
      });
      break;
    }
    case 'crickets': {
      // a steady little night pulse
      every(650, 1_100, () => {
        const t = c.currentTime;
        for (let i = 0; i < 3; i++) {
          tone(c, dest, { freq: 4300, at: t + i * 0.07, dur: 0.03, vol: 0.016 });
        }
      });
      break;
    }
    case 'twinkle': {
      // slow high pings drifting by — starlight you can hear
      every(2_500, 7_500, () => {
        const f0 = 1250 + R() * 900;
        const t = c.currentTime;
        tone(c, dest, { freq: f0, at: t, dur: 1.15, vol: 0.042, attack: 0.02 });
        tone(c, dest, { freq: f0 * 1.5, at: t + 0.03, dur: 0.9, vol: 0.016, attack: 0.02 });
      });
      break;
    }
    case 'bubbles': {
      // slow buoyant blips rising through the water column
      every(800, 2_800, () => {
        tone(c, dest, { freq: 230 + R() * 120, slideTo: 480 + R() * 260, at: c.currentTime, dur: 0.2, vol: 0.032 });
      });
      break;
    }
    default:
      break;
  }
}
