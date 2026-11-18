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

import {
  createDefaultAudioContext,
  ensureCompanionPlaybackRoute,
  isSharedDefaultAudioContext,
  primeSharedAudioContext,
  startHtmlAudioOnDefaultSpeakers,
} from './audio-output';
import { DEFAULT_VOLUME, isVolumeStep, volumeLinear, type VolumeKey } from './audio-levels';
import { isMasterMuted } from './master-mute';
import { assetUrl } from './asset';
import { clearSpeechLevel, feedSpeechLevel, type VisemeVowel } from './speech';
import {
  CLIP_BASE_GAIN, pickPerformanceClip,
  type ClipQuery, type PerformanceClip,
} from './performance-clips';
import {
  pickStreamTrack,
  streamTrackById,
  STYLE_THEME_ID,
  type MusicStyleId,
} from './music-catalog';
import { pickOwnerSongClipId, pickOwnerStreamTrack } from './owner-perf-picks';
import { endPerformanceSession } from './performance-session';
export {
  detectMusicStyle,
  resolveStreamPlaylist,
  pickStreamTrack,
  streamTrackById,
  STREAM_TRACKS,
} from './music-catalog';
export type { MusicStyleId, StreamTrack } from './music-catalog';

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
  // Style aliases (user asks for jazz / pop / etc.) → procedural beds
  pop:     { mood: 'bright pop',  bpm: 112, wave: 'triangle', root: 2,  scale: MAJOR, progression: [0, 4, 5, 3], bassEvery: 2, volume: 0.11 },
  jazz:    { mood: 'smoky jazz',  bpm: 90,  wave: 'sine',     root: -3, scale: MINOR, progression: [0, 3, 4, 5], bassEvery: 2, volume: 0.11 },
  hiphop:  { mood: 'boom bap',    bpm: 96,  wave: 'square',   root: -5, scale: MINOR, progression: [0, 0, 3, 5], bassEvery: 2, volume: 0.10 },
  lofi:    { mood: 'lofi bed',    bpm: 76,  wave: 'sine',     root: 0,  scale: PENTA, progression: [0, 2, 4, 3], bassEvery: 4, volume: 0.09 },
  electronic: { mood: 'pulse',    bpm: 124, wave: 'sawtooth', root: 5,  scale: MAJOR, progression: [0, 3, 4, 3], bassEvery: 2, volume: 0.09 },
  ballad:  { mood: 'slow ballad', bpm: 68,  wave: 'sine',     root: -2, scale: MAJOR, progression: [0, 4, 1, 5], bassEvery: 8, volume: 0.10 },
  rock:    { mood: 'drive rock',  bpm: 118, wave: 'sawtooth', root: -4, scale: MAJOR, progression: [0, 0, 4, 5], bassEvery: 2, volume: 0.10 },
  cantopop:{ mood: 'canto glow',  bpm: 104, wave: 'triangle', root: 0,  scale: MAJOR, progression: [0, 4, 5, 4], bassEvery: 2, volume: 0.11 },
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
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

/** Stop the band engine. Never close the shared default AudioContext. */
function haltBand(): void {
  if (schedTimer) {
    clearInterval(schedTimer);
    schedTimer = null;
  }
  if (master) {
    try { master.gain.value = 0; } catch { /* already closed */ }
    try { master.disconnect(); } catch { /* ignore */ }
  }
  ctx = null;
  master = null;
}

/**
 * Start her backing track — an original composition for this character.
 * Safe to call repeatedly (restarts the theme) and a no-op where WebAudio
 * is unavailable. Pair with stopMusic() when the performance ends.
 */
export function startMusic(characterId: string): void {
  if (isMasterMuted()) return;
  if (typeof window === 'undefined') return;
  haltBand();
  primeSharedAudioContext();
  const theme = getTheme(characterId);
  const ac = createDefaultAudioContext();
  if (!ac) return;
  try { void ac.resume(); } catch { /* ignore */ }
  ctx = ac;
  const gain = ac.createGain();
  gain.gain.value = theme.volume * volumeLinear('bgmVol');
  baseBgm = theme.volume;
  gain.connect(ac.destination);
  master = gain;
  const eighth = 60 / theme.bpm / 2;
  nextStep = 0;
  nextTime = ac.currentTime;
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

/** stop the procedural track immediately */
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

function stepLinear(step: number | undefined, key: VolumeKey): number {
  if (typeof step !== 'number') return volumeLinear(key);
  return (isVolumeStep(step) ? step : DEFAULT_VOLUME) / 100;
}

/** Re-apply the settings BGM step to a track that is already playing. */
export function applyBgmLevel(step?: number): void {
  const k = stepLinear(step, 'bgmVol');
  if (master) master.gain.value = baseBgm * k;
  if (pianoMaster) pianoMaster.gain.value = basePiano * k;
  if (clipVolumeKey === 'bgmVol') writeClipGain(k);
}

/** Re-apply the dialogue step to a premade song that is already playing. */
export function applyDialogueLevel(step?: number): void {
  if (clipVolumeKey !== 'voiceVol') return;
  const k = stepLinear(step, 'voiceVol');
  writeClipGain(k);
}

function haltPiano(): void {
  if (pianoTimer) {
    clearInterval(pianoTimer);
    pianoTimer = null;
  }
  if (pianoMaster) {
    try { pianoMaster.gain.value = 0; } catch { /* already closed */ }
    try { pianoMaster.disconnect(); } catch { /* ignore */ }
  }
  pianoCtx = null;
  pianoMaster = null;
}

/**
 * r86 — start her piano arrangement: the theme's own melody in the right
 * hand over rolling broken chords in the left, on a physical-model piano
 * timbre. The piano move finally SOUNDS like a piano, not generic plucks.
 */
export function startPiano(characterId: string): void {
  if (isMasterMuted()) return;
  if (typeof window === 'undefined') return;
  haltPiano();
  primeSharedAudioContext();
  const theme = getTheme(characterId);
  const ac = createDefaultAudioContext();
  if (!ac) return;
  try { void ac.resume(); } catch { /* ignore */ }
  pianoCtx = ac;
  const gain = ac.createGain();
  basePiano = Math.min(0.4, theme.volume * 3.2);
  gain.gain.value = basePiano * volumeLinear('bgmVol');
  gain.connect(ac.destination);
  pianoMaster = gain;
  const eighth = 60 / theme.bpm / 2;
  let step = 0;
  let t = ac.currentTime;
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
  if (isMasterMuted()) return;
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
  endPerformanceSession();
  haltBand();
  haltPiano();
  haltClip({ fadeOutSec: 0 });
}

// ---- premade library (songs + dance beds) -----------------------------------
// Same performance stage as the procedural band: stopMusic() will not cut a
// show short, endPerformanceMusic() stops beds instantly, and the settings steps scale
// the gain. Songs use dialogue volume and drive the viseme clock; dance beds
// use BGM. Playback is async and never awaited by chat or poke.

const SONG_VOWELS: VisemeVowel[] = ['aa', 'oh', 'ee', 'ou', 'ih'];

let clipGain: GainNode | null = null;
let clipCtx: AudioContext | null = null;
let clipSrc: AudioBufferSourceNode | null = null;
let clipAnalyser: AnalyserNode | null = null;
let clipEl: HTMLAudioElement | null = null;
let clipMediaSource: MediaElementAudioSourceNode | null = null;
let clipVolumeKey: VolumeKey = 'bgmVol';
let clipBase = CLIP_BASE_GAIN.dance;
let clipId: string | null = null;
let clipKind: 'song' | 'dance' | null = null;
let clipCharacter = 'default';
let loadToken = 0;
let mouthTimer: ReturnType<typeof setInterval> | null = null;
let duck = 1;
let duckTimer: ReturnType<typeof setTimeout> | null = null;
/** BufferSource / procedural fallback: when the bed became audible. */
let clipBedAnchorCtxSec: number | null = null;
let clipBedAnchorWallMs: number | null = null;

function markBedPlaybackAnchor(ctxSec?: number): void {
  if (typeof performance !== 'undefined') {
    clipBedAnchorWallMs = performance.now();
  }
  clipBedAnchorCtxSec = ctxSec ?? null;
}

function clearBedPlaybackAnchor(): void {
  clipBedAnchorCtxSec = null;
  clipBedAnchorWallMs = null;
}

/** Seconds since the active library / fallback bed became audible (0 when idle). */
export function libraryBedPlaybackSec(): number {
  if (typeof window === 'undefined' || !clipAudible) return 0;
  if (clipEl && !clipEl.paused) {
    return Math.max(0, clipEl.currentTime);
  }
  if (clipSrc && clipCtx && clipCtx.state === 'running' && clipBedAnchorCtxSec !== null) {
    return Math.max(0, clipCtx.currentTime - clipBedAnchorCtxSec);
  }
  if (clipBedAnchorWallMs !== null) {
    return Math.max(0, (performance.now() - clipBedAnchorWallMs) / 1000);
  }
  return 0;
}

/**
 * Beds start after intro TTS — flip play-and-record back to playback, then
 * prime WebAudio. Never awaited pin-before-play here (setSinkId raced unlock).
 */
function primeLibraryBedPlayback(): void {
  ensureCompanionPlaybackRoute();
  primeSharedAudioContext();
}

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

/** True after `playing` was emitted for the active bed (sync path catch-up). */
let clipAudible = false;

export function activeLibraryClipId(): string | null {
  return clipId;
}

/** Bed reports audible — use to catch missed `amoji:library-clip` dispatches. */
export function isLibraryClipAudible(): boolean {
  return clipAudible && Boolean(clipId);
}

/** Notify UI that a library bed is audible — dance/sing body gates on this. */
function emitLibraryClipPlaying(id: string | null = clipId): void {
  if (typeof window === 'undefined' || !id) return;
  clipAudible = true;
  window.dispatchEvent(new CustomEvent('amoji:library-clip', { detail: { state: 'playing', id } }));
}

/** Procedural band when a file/stream bed cannot start — still emit playing. */
function startLibraryBandFallback(characterId: string): void {
  startMusic(characterId);
  markBedPlaybackAnchor();
  emitLibraryClipPlaying(clipId);
}

/** Drop the premade clip only. Does not touch the preserve flag or the band. */
function haltClip(opts?: { fadeOutSec?: number }): void {
  loadToken += 1;
  stopSongMouth();
  if (duckTimer) {
    clearTimeout(duckTimer);
    duckTimer = null;
  }
  duck = 1;
  const src = clipSrc;
  const el = clipEl;
  const fadeOutSec = Math.max(0, opts?.fadeOutSec ?? 0);
  const media = clipMediaSource;
  const stale = clipCtx;
  const gain = clipGain;
  const an = clipAnalyser;
  clipSrc = null;
  clipEl = null;
  clipMediaSource = null;
  clipGain = null;
  clipAnalyser = null;
  clipCtx = null;
  clipId = null;
  clipKind = null;
  clipAudible = false;
  clearBedPlaybackAnchor();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('amoji:library-clip', { detail: { state: 'stopped' } }));
  }
  if (src) {
    try { src.stop(); } catch { /* already stopped */ }
  }
  if (el) {
    const fadeMs = Math.round(fadeOutSec * 1000);
    if (fadeMs > 0 && el.volume > 0.02) {
      const startVol = el.volume;
      const started = performance.now();
      const tick = () => {
        const t = (performance.now() - started) / fadeMs;
        if (t >= 1) {
          el.pause();
          el.volume = startVol;
          el.src = '';
          return;
        }
        el.volume = Math.max(0, startVol * (1 - t));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } else {
      el.pause();
      el.src = '';
    }
  }
  if (media) {
    try { media.disconnect(); } catch { /* ignore */ }
  }
  if (an) {
    try { an.disconnect(); } catch { /* ignore */ }
  }
  if (gain) {
    try { gain.gain.value = 0; } catch { /* closed */ }
    try { gain.disconnect(); } catch { /* ignore */ }
  }
  // Never close the shared default AudioContext — voice/SFX still need it.
  // Closing it after the first song made later sing/dance beds stay silent.
  if (stale && !isSharedDefaultAudioContext(stale) && stale.state !== 'closed') {
    void stale.close().catch(() => undefined);
  }
}

/** Wire song lips only after the HTMLAudio bed is actually audible. */
function armSongMouthFromElement(audio: HTMLAudioElement): void {
  if (clipKind !== 'song') return;
  stopSongMouth();
  primeSharedAudioContext();
  const ac = createDefaultAudioContext();
  if (!ac) return;
  try { void ac.resume(); } catch { /* ignore */ }
  try {
    // MediaElementSource can only be created once per element.
    const media = ac.createMediaElementSource(audio);
    const an = ac.createAnalyser();
    an.fftSize = 256;
    const gain = ac.createGain();
    clipMediaSource = media;
    clipAnalyser = an;
    clipGain = gain;
    clipCtx = ac;
    applyActiveClipGain();
    // Route through WebAudio so analyser sees samples; element volume stays.
    media.connect(an);
    an.connect(gain);
    gain.connect(ac.destination);
    startSongMouth(an);
  } catch {
    // Already wired or unsupported — mouth stays quiet rather than pre-flapping.
  }
}

function playClipElement(url: string, token: number, characterId: string): boolean {
  if (typeof Audio === 'undefined') return false;
  try {
    primeLibraryBedPlayback();
    const audio = new Audio(url);
    // Own this element so duckExternalAudioForCompanion / pauseForeignPageMedia
    // never pause the song/dance bed when companion TTS starts (Pixel: no volume dip).
    try { audio.dataset.amojiAudio = '1'; } catch { /* non-DOM Audio stubs */ }
    audio.loop = true;
    clipEl = audio;
    applyActiveClipGain();
    // Gate dance + song mouth on real playback (playing / first audible samples).
    let emitted = false;
    const emitOnce = () => {
      if (emitted || token !== loadToken) return;
      emitted = true;
      audio.removeEventListener('playing', emitOnce);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      markBedPlaybackAnchor();
      // Mouth only when the song bed is audible — never during intro wait.
      if (clipKind === 'song') armSongMouthFromElement(audio);
      emitLibraryClipPlaying(clipId);
    };
    const onTimeUpdate = () => {
      if (audio.currentTime > 0) emitOnce();
    };
    audio.addEventListener('playing', emitOnce);
    audio.addEventListener('timeupdate', onTimeUpdate);
    // Play-first + pin on reject only (#424). Never setSinkId in onplay.
    void startHtmlAudioOnDefaultSpeakers(audio, 'gesture-safe').then(() => {
      if (token !== loadToken) return;
      // Some engines resolve play() before `playing`; currentTime>0 still counts.
      if (!audio.paused && audio.currentTime > 0) emitOnce();
    }, () => {
      if (token !== loadToken) return;
      audio.removeEventListener('playing', emitOnce);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.pause();
      if (clipEl === audio) clipEl = null;
      startLibraryBandFallback(characterId);
    });
    return true;
  } catch {
    return false;
  }
}

async function playClip(clip: PerformanceClip, token: number, characterId: string): Promise<void> {
  const url = assetUrl(clip.file);
  primeLibraryBedPlayback();
  const ac = createDefaultAudioContext();
  if (!ac) {
    if (token !== loadToken) return;
    if (!playClipElement(url, token, characterId)) startLibraryBandFallback(characterId);
    return;
  }
  try {
    try { await ac.resume(); } catch { /* gesture may still be required */ }
    // Suspended context → HTMLAudioElement (gesture-unlocked media path).
    if (ac.state !== 'running') {
      if (token !== loadToken) return;
      if (!playClipElement(url, token, characterId)) startLibraryBandFallback(characterId);
      return;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const raw = await res.arrayBuffer();
    if (token !== loadToken) return;
    const buffer = await ac.decodeAudioData(raw.slice(0));
    if (token !== loadToken) return;
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
    } else {
      src.connect(gain);
    }
    // BufferSource starts samples immediately — emit playing only after start().
    // Mouth follows the same gate: never flap before audible samples.
    clipBedAnchorCtxSec = ac.currentTime;
    markBedPlaybackAnchor(ac.currentTime);
    src.start();
    clipSrc = src;
    if (clip.kind === 'song' && clipAnalyser) startSongMouth(clipAnalyser);
    emitLibraryClipPlaying(clip.id);
  } catch {
    if (token !== loadToken) return;
    if (clipCtx === ac) clipCtx = null;
    if (!playClipElement(url, token, characterId)) startLibraryBandFallback(characterId);
  }
}

function streamDanceClip(
  stream: NonNullable<ReturnType<typeof pickStreamTrack>>,
): PerformanceClip {
  return {
    id: `stream:${stream.id}`,
    kind: 'dance',
    style: stream.style,
    file: stream.url,
    durationMs: stream.durationMs,
    volume: 'bgmVol',
    moods: ['happy', 'neutral'],
    langs: ['en', 'yue', 'zh', 'ja'],
    characters: [],
    labels: { en: stream.title, yue: stream.title, zh: stream.title, ja: stream.title },
    license: 'CC0-1.0',
    credit: stream.credit,
    source: stream.source,
  };
}

type LibraryPerfQuery = ClipQuery & {
  ms?: number;
  style?: MusicStyleId | string;
  /** Exact Mixkit/PD track from a select offer. */
  streamId?: string;
};

function resolveStreamForQuery(q: LibraryPerfQuery) {
  const exact = streamTrackById(q.streamId);
  if (exact) return exact;
  const styleId = q.style as MusicStyleId | undefined;
  const owner = pickOwnerStreamTrack(styleId, q.n ?? 0);
  if (owner) return owner;
  return styleId ? pickStreamTrack(styleId, q.n ?? 0) : pickOwnerStreamTrack(undefined, q.n ?? 0);
}

/**
 * Resolve which library / stream clip would play — no audio side effects.
 * Same inputs as {@link startLibraryPerformance} so announce-then-play stays stable.
 */
export function resolveLibraryPerformance(q: LibraryPerfQuery): PerformanceClip {
  const ownerSong = pickOwnerSongClipId(q);
  const withOwner = ownerSong && !q.clipId ? { ...q, clipId: ownerSong } : q;
  if (withOwner.clipId) return pickPerformanceClip(withOwner);
  const stream = resolveStreamForQuery(withOwner);
  if (stream && q.kind === 'dance') return streamDanceClip(stream);
  return pickPerformanceClip(withOwner);
}

/**
 * Play a premade song or dance bed from the library. When `style` is set and
 * a royalty-free stream URL exists, prefer that bed (HTMLAudioElement);
 * otherwise local CC0 clips, then procedural band.
 */
export function startLibraryPerformance(
  q: ClipQuery & { ms: number; style?: MusicStyleId | string; streamId?: string },
): PerformanceClip {
  const ownerSong = pickOwnerSongClipId(q);
  const query = ownerSong && !q.clipId ? { ...q, clipId: ownerSong } : q;
  // Exact clip picks skip the stream bed path.
  if (!query.clipId) {
  const styleId = query.style as MusicStyleId | undefined;
  const stream = resolveStreamForQuery(query);
  if (stream && query.kind === 'dance') {
    const synthetic = streamDanceClip(stream);
    const holdMs = Math.max(query.ms, stream.durationMs + 600);
    if (isMasterMuted() || typeof window === 'undefined') return synthetic;
    if (clipId === synthetic.id && perfPreserve) {
      armPerformance(holdMs);
      // Already audible — re-emit so body dance can re-sync / extend hold.
      emitLibraryClipPlaying(synthetic.id);
      return synthetic;
    }
    endPerformanceMusic();
    primeLibraryBedPlayback();
    perfPreserve = true;
    duck = 1;
    clipId = synthetic.id;
    clipKind = 'dance';
    clipVolumeKey = 'bgmVol';
    clipBase = CLIP_BASE_GAIN.dance;
    clipCharacter = query.characterId ?? STYLE_THEME_ID[styleId ?? 'default'] ?? 'default';
    armPerformance(holdMs);
    const token = ++loadToken;
    if (!playClipElement(stream.url, token, clipCharacter)) {
      startLibraryBandFallback(clipCharacter);
    }
    return synthetic;
  }
  } // end !clipId stream path
  const clip = pickPerformanceClip(query);
  const holdMs = Math.max(query.ms, (clip.durationMs || 0) + 600);
  if (isMasterMuted() || typeof window === 'undefined') return clip;
  if (clipId === clip.id && perfPreserve) {
    armPerformance(holdMs);
    emitLibraryClipPlaying(clip.id);
    return clip;
  }
  endPerformanceMusic();
  primeLibraryBedPlayback();
  perfPreserve = true;
  duck = 1;
  clipId = clip.id;
  clipKind = clip.kind === 'song' ? 'song' : 'dance';
  clipVolumeKey = clip.volume;
  clipBase = CLIP_BASE_GAIN[clip.kind];
  clipCharacter = query.characterId ?? 'default';
  armPerformance(holdMs);
  const token = ++loadToken;
  void playClip(clip, token, clipCharacter);
  return clip;
}

/**
 * Previously dipped a live library bed under spoken TTS. That made voice
 * and BGM feel like they were auto-ducking each other mid-utterance.
 * Spoken voice stays at a fixed gain; dance beds stay at ambient ~30%.
 * Kept as a no-op so older call sites do not need a chase.
 */
export function duckLibraryBed(_amount = 0.28, _ms = 4200): void {
  /* no auto duck / boost — voice and BGM keep steady levels */
}
