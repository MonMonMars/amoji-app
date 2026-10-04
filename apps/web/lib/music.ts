'use client';
// Procedural backing-track engine (r2026-10-04.48) — original, royalty-free
// accompaniment composed LIVE in the browser via WebAudio. No audio files,
// no network, no API keys: each character gets a theme (tempo, scale, timbre,
// bass pattern) matched to her personality, so her dance or song performance
// sounds like HER. The pure-data tables and the scheduling math are exported
// for unit tests; every AudioContext/DOM touch happens lazily inside
// startMusic(), never at import time, so node tests stay side-effect free.
// r2026-10-04.86 — the piano performance joins the band: a Karplus-Strong
// plucked-string piano arrangement (broken-chord left hand, theme melody
// right hand) plus a PERFORMANCE layer so sing/duet/piano music survives
// the chat pipeline's generic stopMusic() calls for the length of the show.

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

/**
 * r86 — one note of the piano arrangement, a pure function of (theme, step)
 * so the tune is auditable in tests. The grid is eighth notes; even steps
 * are the LEFT hand rolling a broken chord under the bar's root
 * (root−12 → +arp 0/7/12/16), odd steps are the RIGHT hand playing the
 * theme melody an octave up — every 4th melody note adds a +4 chord tone
 * so the line harmonizes with itself.
 */
export interface PianoNote {
  /** semitone offset from A4 */
  semi: number;
  /** 0 = left hand (broken chord), 1 = right hand (melody) */
  hand: 0 | 1;
}

export function pianoStep(theme: MusicTheme, step: number): PianoNote {
  const s = Math.abs(step);
  if (s % 2 === 0) {
    const bar = Math.floor(s / 8);
    const degree = theme.progression[bar % theme.progression.length] ?? 0;
    const root = theme.root + theme.scale[degree % theme.scale.length]! - 12;
    const arp = [0, 7, 12, 16];
    return { semi: root + arp[(s / 2) % 4]!, hand: 0 };
  }
  const mStep = (s - 1) / 2;
  const chordTone = mStep % 4 === 3 ? 4 : 0;
  return { semi: melodyStep(theme, mStep) + 12 + chordTone, hand: 1 };
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

/** stop the band engine and release its AudioContext (unguarded internals) */
function haltBand(): void {
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

/**
 * Start her backing track — an original composition for this character.
 * Safe to call repeatedly (restarts the theme) and a no-op where WebAudio
 * is unavailable. Pair with stopMusic() when the performance ends.
 */
export function startMusic(characterId: string): void {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  haltBand();
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
  // r86: while a performance (sing/duet/piano) owns the stage, the chat
  // pipeline's generic cleanup calls must NOT kill her music — the show
  // ends via endPerformanceMusic() or the performance timer instead.
  if (perfPreserve) return;
  haltBand();
}

/** true while a backing track is scheduled */
export function musicPlaying(): boolean {
  return schedTimer !== null;
}

// ---- r86: Karplus-Strong piano ----------------------------------------------
// A plucked string is noise fed through a feedback delay whose period equals
// the string's fundamental — the cheapest physically-modelled piano timbre
// there is, and it sounds genuinely like a felt hammer's ring. Buffers are
// cached per frequency so the scheduler only allocates once per note.

const KS_CACHE = new Map<string, AudioBuffer>();

function ksBurst(ac: AudioContext, freq: number): AudioBuffer {
  const key = freq.toFixed(2);
  const hit = KS_CACHE.get(key);
  if (hit) return hit;
  const sr = ac.sampleRate;
  const len = Math.round(sr * 1.4);
  const buf = ac.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  const period = Math.max(2, Math.round(sr / freq));
  // seed one period with noise through a one-pole lowpass — the lowpass
  // keeps high notes from hissing while the low end stays warm
  let prev = 0;
  for (let i = 0; i < period && i < len; i++) {
    prev = (prev + (Math.random() * 2 - 1) * 0.9) * 0.5;
    data[i] = prev;
  }
  for (let i = period; i < len; i++) {
    data[i] = (data[i - period] + data[i - period + 1]) * 0.498;
  }
  if (KS_CACHE.size > 64) KS_CACHE.clear();
  KS_CACHE.set(key, buf);
  return buf;
}

function ksPlay(ac: AudioContext, dest: AudioNode, freq: number, when: number, vel: number): void {
  const src = ac.createBufferSource();
  src.buffer = ksBurst(ac, freq);
  const g = ac.createGain();
  g.gain.value = vel;
  src.connect(g);
  g.connect(dest);
  src.start(when);
}

let pianoCtx: AudioContext | null = null;
let pianoMaster: GainNode | null = null;
let pianoTimer: ReturnType<typeof setInterval> | null = null;

function haltPiano(): void {
  if (pianoTimer) {
    clearInterval(pianoTimer);
    pianoTimer = null;
  }
  if (pianoMaster && pianoCtx) {
    try {
      pianoMaster.gain.setValueAtTime(pianoMaster.gain.value, pianoCtx.currentTime);
      pianoMaster.gain.linearRampToValueAtTime(0, pianoCtx.currentTime + 0.25);
    } catch { /* already closed */ }
  }
  const stale = pianoCtx;
  pianoCtx = null;
  pianoMaster = null;
  if (stale) {
    setTimeout(() => {
      void stale.close().catch(() => undefined);
    }, 400);
  }
}

/**
 * r86 — start her piano arrangement: the theme's own melody in the right
 * hand over rolling broken chords in the left, on a physical-model piano
 * timbre. The piano move finally SOUNDS like a piano, not generic plucks.
 */
export function startPiano(characterId: string): void {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  haltPiano();
  const theme = getTheme(characterId);
  const ac = new AC();
  pianoCtx = ac;
  const gain = ac.createGain();
  gain.gain.value = Math.min(0.4, theme.volume * 3.2);
  gain.connect(ac.destination);
  pianoMaster = gain;
  const eighth = 60 / theme.bpm / 2;
  let step = 0;
  let t = ac.currentTime + 0.08;
  pianoTimer = setInterval(() => {
    if (!pianoCtx) return;
    while (t < pianoCtx.currentTime + 0.3) {
      const n = pianoStep(theme, step);
      ksPlay(pianoCtx, pianoMaster!, noteFreq(n.semi), t, n.hand === 0 ? 0.5 : 0.24);
      step += 1;
      t += eighth;
    }
  }, 100);
}

export function stopPiano(): void {
  haltPiano();
}

// ---- r86: performance preservation layer ------------------------------------
// Singing and piano are LONG performances, but the chat pipeline calls
// stopMusic() as generic cleanup the moment a reply commits — which used to
// cut her song dead after the first phrase. While a performance is live,
// stopMusic() is a no-op; the show ends on its own timer or when the user
// interrupts (endPerformanceMusic).

let perfPreserve = false;
let perfTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Start performance music that outlives the chat pipeline's stopMusic():
 *   'band'  — her backing track (dance / sing / duet)
 *   'piano' — the Karplus-Strong piano arrangement (piano move)
 * `ms` bounds the show; endPerformanceMusic() stops it early.
 */
export function startPerformanceMusic(kind: 'band' | 'piano', characterId: string, ms: number): void {
  if (typeof window === 'undefined') return;
  endPerformanceMusic();
  perfPreserve = true;
  if (kind === 'band') startMusic(characterId);
  else startPiano(characterId);
  perfTimer = setTimeout(() => endPerformanceMusic(), ms);
}

/** stop the preserved performance and release the stage */
export function endPerformanceMusic(): void {
  perfPreserve = false;
  if (perfTimer) {
    clearTimeout(perfTimer);
    perfTimer = null;
  }
  haltBand();
  haltPiano();
}
