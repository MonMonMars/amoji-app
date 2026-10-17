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

import { createDefaultAudioContext, pinDefaultOutput } from './audio-output';
import { volumeLinear, type VolumeKey } from './audio-levels';
import { assetUrl } from './asset';
import { clearSpeechLevel, feedSpeechLevel, type VisemeVowel } from './speech';
import {
  CLIP_BASE_GAIN, pickPerformanceClip,
  type ClipQuery, type PerformanceClip,
} from './performance-clips';

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
let baseBgm = 0.12;
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
  haltBand();
  const theme = getTheme(characterId);
  const ac = createDefaultAudioContext();
  if (!ac) return;
  ctx = ac;
  const gain = ac.createGain();
  gain.gain.value = theme.volume * volumeLinear('bgmVol');
  baseBgm = theme.volume;
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
let basePiano = 0.3;

/** Re-apply the settings BGM step to a track that is already playing. */
export function applyBgmLevel(step?: number): void {
  const k = typeof step === 'number' ? step / 100 : volumeLinear('bgmVol');
  if (master) master.gain.value = baseBgm * k;
  if (pianoMaster) pianoMaster.gain.value = basePiano * k;
  if (clipVolumeKey === 'bgmVol') writeClipGain(k);
}

/** Re-apply the dialogue step to a premade song that is already playing. */
export function applyDialogueLevel(step?: number): void {
  if (clipVolumeKey !== 'voiceVol') return;
  const k = typeof step === 'number' ? step / 100 : volumeLinear('voiceVol');
  writeClipGain(k);
}

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
  haltPiano();
  const theme = getTheme(characterId);
  const ac = createDefaultAudioContext();
  if (!ac) return;
  pianoCtx = ac;
  const gain = ac.createGain();
  basePiano = Math.min(0.4, theme.volume * 3.2);
  gain.gain.value = basePiano * volumeLinear('bgmVol');
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
  haltClip();
}

// ---- premade library (songs + dance beds) -----------------------------------
// Same performance stage as the procedural band: stopMusic() will not cut a
// show short, endPerformanceMusic() fades it, and the settings steps scale
// the gain. Songs use dialogue volume and drive the viseme clock; dance beds
// use BGM. Playback is async and never awaited by chat or poke.

const SONG_VOWELS: VisemeVowel[] = ['aa', 'oh', 'ee', 'ou', 'ih'];

let clipGain: GainNode | null = null;
let clipCtx: AudioContext | null = null;
let clipSrc: AudioBufferSourceNode | null = null;
let clipAnalyser: AnalyserNode | null = null;
let clipEl: HTMLAudioElement | null = null;
let clipVolumeKey: VolumeKey = 'bgmVol';
let clipBase = CLIP_BASE_GAIN.dance;
let clipId: string | null = null;
let clipCharacter = 'default';
let loadToken = 0;
let mouthTimer: ReturnType<typeof setInterval> | null = null;
let duck = 1;
let duckTimer: ReturnType<typeof setTimeout> | null = null;

function writeClipGain(stepLinear: number): void {
  const g = clipBase * stepLinear * duck;
  if (clipGain) clipGain.gain.value = Math.max(0, g);
  if (clipEl) clipEl.volume = Math.max(0, Math.min(1, g));
}

function applyActiveClipGain(): void {
  writeClipGain(volumeLinear(clipVolumeKey));
}

function stopSongMouth(): void {
  if (mouthTimer) {
    clearInterval(mouthTimer);
    mouthTimer = null;
  }
  clearSpeechLevel();
}

function startSongMouth(an: AnalyserNode): void {
  stopSongMouth();
  const data = new Float32Array(an.fftSize);
  mouthTimer = setInterval(() => {
    if (!clipAnalyser || typeof clipAnalyser.getFloatTimeDomainData !== 'function') return;
    clipAnalyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!;
    const rms = Math.sqrt(sum / data.length);
    const mouth = Math.max(0, Math.min(1, (rms - 0.015) * 8));
    const vowel = SONG_VOWELS[Math.floor(Date.now() / 160) % SONG_VOWELS.length]!;
    feedSpeechLevel(mouth, vowel);
  }, 70);
}

function armPerformance(ms: number): void {
  if (perfTimer) clearTimeout(perfTimer);
  perfPreserve = true;
  perfTimer = setTimeout(() => endPerformanceMusic(), ms);
}

/** Drop the premade clip only. Does not touch the preserve flag or the band. */
function haltClip(): void {
  loadToken += 1;
  stopSongMouth();
  if (duckTimer) {
    clearTimeout(duckTimer);
    duckTimer = null;
  }
  duck = 1;
  const src = clipSrc;
  const el = clipEl;
  const stale = clipCtx;
  const gain = clipGain;
  clipSrc = null;
  clipEl = null;
  clipGain = null;
  clipAnalyser = null;
  clipCtx = null;
  clipId = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('amoji:library-clip', { detail: { state: 'stopped' } }));
  }
  if (src) {
    try { src.stop(); } catch { /* already stopped */ }
  }
  if (el) {
    el.pause();
    el.src = '';
  }
  if (gain && stale) {
    try {
      gain.gain.setValueAtTime(gain.gain.value, stale.currentTime);
      gain.gain.linearRampToValueAtTime(0, stale.currentTime + 0.2);
    } catch { /* closed */ }
  }
  if (stale) {
    setTimeout(() => { void stale.close().catch(() => undefined); }, 280);
  }
}

function playClipElement(url: string, token: number, characterId: string): boolean {
  if (typeof Audio === 'undefined') return false;
  try {
    const audio = new Audio(url);
    pinDefaultOutput(audio);
    audio.loop = true;
    clipEl = audio;
    applyActiveClipGain();
    void audio.play().then(() => {
      if (token !== loadToken) return;
      window.dispatchEvent(new CustomEvent('amoji:library-clip', { detail: { state: 'playing', id: clipId } }));
    }, () => {
      if (token !== loadToken) return;
      audio.pause();
      if (clipEl === audio) clipEl = null;
      startMusic(characterId);
    });
    return true;
  } catch {
    return false;
  }
}

async function playClip(clip: PerformanceClip, token: number, characterId: string): Promise<void> {
  const url = assetUrl(clip.file);
  const ac = createDefaultAudioContext();
  if (!ac) {
    if (token !== loadToken) return;
    if (!playClipElement(url, token, characterId)) startMusic(characterId);
    return;
  }
  try {
    void ac.resume();
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const raw = await res.arrayBuffer();
    if (token !== loadToken) {
      void ac.close().catch(() => undefined);
      return;
    }
    const buffer = await ac.decodeAudioData(raw.slice(0));
    if (token !== loadToken) {
      void ac.close().catch(() => undefined);
      return;
    }
    clipCtx = ac;
    const gain = ac.createGain();
    clipGain = gain;
    applyActiveClipGain();
    gain.connect(ac.destination);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    if (clip.kind === 'song') {
      const an = ac.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      an.connect(gain);
      clipAnalyser = an;
      startSongMouth(an);
    } else {
      src.connect(gain);
    }
    src.start();
    clipSrc = src;
    window.dispatchEvent(new CustomEvent('amoji:library-clip', { detail: { state: 'playing', id: clip.id } }));
  } catch {
    if (token !== loadToken) {
      void ac.close().catch(() => undefined);
      return;
    }
    if (clipCtx === ac) clipCtx = null;
    void ac.close().catch(() => undefined);
    if (!playClipElement(url, token, characterId)) startMusic(characterId);
  }
}

/**
 * Play a premade song or dance bed from the library. Safe to call again with
 * the same pick — the show keeps going and only the timer re-arms — so a
 * reply that arrives mid-clip does not restart it. A new chat message ends
 * it via endPerformanceMusic(). Where WebAudio can't decode the file, the
 * same clip plays through an &lt;audio&gt; element; if that fails too, the
 * procedural band covers the show.
 */
export function startLibraryPerformance(q: ClipQuery & { ms: number }): PerformanceClip {
  const clip = pickPerformanceClip(q);
  if (typeof window === 'undefined') return clip;
  if (clipId === clip.id && perfPreserve) {
    armPerformance(q.ms);
    return clip;
  }
  endPerformanceMusic();
  perfPreserve = true;
  duck = 1;
  clipId = clip.id;
  clipVolumeKey = clip.volume;
  clipBase = CLIP_BASE_GAIN[clip.kind];
  clipCharacter = q.characterId ?? 'default';
  armPerformance(q.ms);
  const token = ++loadToken;
  void playClip(clip, token, clipCharacter);
  return clip;
}

/**
 * Dip a live library bed so a spoken line (poke, dance reply, intro) stays
 * intelligible. Songs are not spoken through speak(), so a sing performance
 * stays full until something else actually talks. No-op when nothing is playing.
 */
export function duckLibraryBed(amount = 0.28, ms = 4200): void {
  if (typeof window === 'undefined' || !clipId) return;
  duck = Math.max(0, Math.min(1, amount));
  applyActiveClipGain();
  if (duckTimer) clearTimeout(duckTimer);
  duckTimer = setTimeout(() => {
    duck = 1;
    duckTimer = null;
    applyActiveClipGain();
  }, ms);
}
