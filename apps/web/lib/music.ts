'use client';
// Procedural backing-track engine (r2026-10-04.48) — original, royalty-free
// accompaniment composed LIVE in the browser via WebAudio. No audio files,
// no network, no API keys: each character gets a theme (tempo, scale, timbre,
// bass pattern) matched to her personality, so her dance or song performance
// sounds like HER. The pure-data tables and the scheduling math are exported
// for unit tests; every AudioContext/DOM touch happens lazily inside
// startMusic(), never at import time, so node tests stay side-effect free.

export interface MusicTheme {
  /** personality group this theme belongs to */
  mood: string;
  /** beats per minute */
  bpm: number;
  /** lead oscillator timbre */
  wave: OscillatorType;
  /** root note as semitone offset from A4 (440 Hz) */
  root: number;
  /** scale intervals in semitones */
  scale: number[];
  /** scale-degree walk for the chord loop (indexes into `scale`) */
  progression: number[];
  /** play a bass note every N eighth notes */
  bassEvery: number;
  /** master volume 0..1 */
  volume: number;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PENTA = [0, 2, 4, 7, 9];

export const MUSIC_THEMES: Record<string, MusicTheme> = {
  default: { mood: 'warm pop',    bpm: 96,  wave: 'triangle', root: 0,  scale: MAJOR, progression: [0, 4, 5, 3], bassEvery: 4, volume: 0.12 },
  juno:    { mood: 'smoky swing', bpm: 88,  wave: 'sine',     root: -4, scale: MINOR, progression: [0, 3, 4, 2], bassEvery: 2, volume: 0.12 },
  mochi:   { mood: 'music box',   bpm: 78,  wave: 'sine',     root: 5,  scale: PENTA, progression: [0, 3, 1, 4], bassEvery: 4, volume: 0.10 },
  marin:   { mood: 'hyper pop',   bpm: 128, wave: 'square',   root: 2,  scale: MAJOR, progression: [0, 3, 4, 3], bassEvery: 2, volume: 0.09 },
  ruby:    { mood: 'bouncy',      bpm: 118, wave: 'triangle', root: 7,  scale: MAJOR, progression: [0, 4, 3, 4], bassEvery: 2, volume: 0.12 },
  alan:    { mood: 'easy jam',    bpm: 100, wave: 'triangle', root: -2, scale: MAJOR, progression: [0, 3, 4, 4], bassEvery: 4, volume: 0.12 },
  mika:    { mood: 'laid-back',   bpm: 82,  wave: 'sine',     root: -7, scale: MAJOR, progression: [0, 4, 1, 3], bassEvery: 4, volume: 0.11 },
  luna:    { mood: 'dreamy',      bpm: 72,  wave: 'sine',     root: 3,  scale: MINOR, progression: [0, 2, 4, 3], bassEvery: 8, volume: 0.10 },
  anchor:  { mood: 'sea shanty',  bpm: 92,  wave: 'sawtooth', root: -5, scale: MINOR, progression: [0, 0, 3, 4], bassEvery: 4, volume: 0.10 },
};

/** a character's theme — unknown ids fall back to the warm-pop default */
export function getTheme(characterId: string): MusicTheme {
  return MUSIC_THEMES[characterId] ?? MUSIC_THEMES['default']!;
}

/** equal temperament: semitone offset from A4 → Hz */
export function noteFreq(semitoneOffsetFromA4: number): number {
  return 440 * Math.pow(2, semitoneOffsetFromA4 / 12);
}

/**
 * The melody note scheduled at absolute eighth-note index `step` — a pure
 * function of the theme so tests can audit the tune. Returns a semitone
 * offset from A4. The line walks up and down the scale over each bar with a
 * wiggle borrowed from a different scale step, so it sounds composed rather
 * than random; the last two eighths of every bar lift an octave home.
 */
export function melodyStep(theme: MusicTheme, step: number): number {
  const s = Math.abs(step);
  const bar = Math.floor(s / 8);
  const pos = s % 8;
  const degree = theme.progression[bar % theme.progression.length] ?? 0;
  const octaveLift = pos >= 6 ? 12 : 0;
  const wiggle = theme.scale[(pos * 3 + bar) % theme.scale.length] ?? 0;
  return theme.root + theme.scale[degree % theme.scale.length]! + (wiggle % 7) + octaveLift;
}

/** the bass note (root of the current bar, two octaves down) at eighth index */
export function bassStep(theme: MusicTheme, step: number): number {
  const bar = Math.floor(Math.abs(step) / 8);
  const degree = theme.progression[bar % theme.progression.length] ?? 0;
  return theme.root + theme.scale[degree % theme.scale.length]! - 24;
}

// ---- runtime (browser only; never touched in node tests) --------------------
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let schedTimer: ReturnType<typeof setInterval> | null = null;
let nextStep = 0;
let nextTime = 0;

function playNote(freq: number, when: number, dur: number, wave: OscillatorType, vol: number): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

/**
 * Start her backing track — an original composition for this character.
 * Safe to call repeatedly (restarts the theme) and a no-op where WebAudio
 * is unavailable. Pair with stopMusic() when the performance ends.
 */
export function startMusic(characterId: string): void {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  stopMusic();
  const theme = getTheme(characterId);
  const ac = new AC();
  ctx = ac;
  const gain = ac.createGain();
  gain.gain.value = theme.volume;
  gain.connect(ac.destination);
  master = gain;
  const eighth = 60 / theme.bpm / 2;
  nextStep = 0;
  nextTime = ac.currentTime + 0.08;
  schedTimer = setInterval(() => {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.3) {
      if (nextStep % theme.bassEvery === 0) {
        playNote(noteFreq(bassStep(theme, nextStep)), nextTime, eighth * 1.8, 'sine', 0.5);
      }
      playNote(noteFreq(melodyStep(theme, nextStep)), nextTime, eighth * 0.9, theme.wave, 0.22);
      nextStep += 1;
      nextTime += eighth;
    }
  }, 100);
}

/** fade the track out and release the AudioContext */
export function stopMusic(): void {
  if (schedTimer) {
    clearInterval(schedTimer);
    schedTimer = null;
  }
  if (master && ctx) {
    try {
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    } catch { /* already closed */ }
  }
  const stale = ctx;
  ctx = null;
  master = null;
  if (stale) {
    setTimeout(() => {
      void stale.close().catch(() => undefined);
    }, 400);
  }
}

/** true while a backing track is scheduled */
export function musicPlaying(): boolean {
  return schedTimer !== null;
}
