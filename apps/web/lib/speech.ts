// Speech-driven mouth (pseudo-viseme) driver.
// The clock starts from the text, then follows the real audio element so a
// long sentence cannot die after the first syllable, and it closes when that
// audio actually ends.
export type VisemeVowel = 'aa' | 'ih' | 'ou' | 'ee' | 'oh';
export interface SpeechSample { mouth: number; vowel: VisemeVowel; duck: number }
const VOWELS: VisemeVowel[] = ['aa', 'ou', 'ih', 'ee', 'oh', 'aa', 'ou'];
const SYLLABLE_MS = 170;

/**
 * How long the mouth should stay in motion for this sentence.
 * CJK and kana are one syllable each. A space-split used to treat a whole
 * Chinese line as one word, so the mouth flapped once and died — the
 * "only the first syllable" bug.
 */
export function speechDurationMs(text: string): number {
  const spoken = text.trim();
  if (!spoken) return 0;
  const cjk = spoken.match(/[\u3400-\u9fff\u3040-\u30ff]/g)?.length ?? 0;
  const latin = spoken.replace(/[\u3400-\u9fff\u3040-\u30ff]/g, ' ').split(/[^A-Za-z']+/).filter(Boolean);
  let syllables = cjk;
  for (const w of latin) syllables += Math.max(1, Math.round(w.length / 3));
  if (syllables < 1) syllables = Math.max(1, Math.round(spoken.length / 2));
  return Math.min(20000, Math.max(480, syllables * 190 + 320));
}

let speakingUntil = 0, startedAt = 0, seed = 1, syllableCount = 1;
/** Bumped on every real start so a finished older line cannot cut the new one. */
let lipSession = 0;

function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 1;
}
// Live mouth from a premade song clip. While a level is fresh it wins over
// the syllable clock so the lips follow the audio, not just the lyric length.
let fed: { mouth: number; vowel: VisemeVowel; until: number } | null = null;

/** Push one analyser frame. `holdMs` bridges the gap until the next frame. */
export function feedSpeechLevel(mouth: number, vowel: VisemeVowel = 'aa', holdMs = 140, now = Date.now()): void {
  const m = mouth < 0 ? 0 : mouth > 1 ? 1 : mouth;
  fed = { mouth: m, vowel, until: now + holdMs };
}

/** Drop the live level. The syllable clock (if any) takes the mouth back. */
export function clearSpeechLevel(): void {
  fed = null;
}

function growSyllables(): void {
  const total = Math.max(SYLLABLE_MS, speakingUntil - startedAt);
  syllableCount = Math.max(syllableCount, Math.max(1, Math.round(total / SYLLABLE_MS)));
}

export function notifySpeaking(text: string, now = Date.now()): void {
  const durationMs = speechDurationMs(text);
  startedAt = now; speakingUntil = now + durationMs;
  seed = hashText(text);
  syllableCount = Math.max(1, Math.round(durationMs / SYLLABLE_MS));
}

/**
 * Audio actually started. Restarts the viseme clock so fetch latency is not
 * eaten out of the sentence, and returns the session later chunks must use.
 */
export function noteSpeechStarted(text: string, now = Date.now()): number {
  lipSession += 1;
  notifySpeaking(text, now);
  // Stay open until the player reports a real duration. A short guess used
  // to close the mouth while the rest of the file was still playing.
  holdLipSync(lipSession, Math.max(speechDurationMs(text), 1400), now);
  return lipSession;
}

export function currentLipSession(): number {
  return lipSession;
}

/** Keep the mouth moving while this session is still the one being spoken. */
export function holdLipSync(sessionId: number, ms = 900, now = Date.now()): void {
  if (sessionId !== lipSession || sessionId === 0) return;
  const until = now + Math.max(200, ms);
  if (until > speakingUntil) {
    speakingUntil = until;
    growSyllables();
  }
}

/**
 * Match the mouth to audio still left in this element. A longer file extends
 * a short text guess; a later timeupdate pulls the end back onto the file.
 */
export function syncLipToAudio(sessionId: number, durationSec: number, currentTimeSec: number, now = Date.now()): void {
  if (sessionId !== lipSession || sessionId === 0) return;
  if (!Number.isFinite(durationSec) || durationSec <= 0) return;
  const remainMs = Math.max(0, (durationSec - Math.max(0, currentTimeSec)) * 1000);
  speakingUntil = now + remainMs + 160;
  growSyllables();
}

export interface LipAudioClock {
  duration: number;
  currentTime: number;
  addEventListener?: (type: string, listener: () => void) => void;
}

/**
 * Bind the current sentence to one audio element. `last` is false while more
 * chunks of the same line are queued — the mouth stays up across the gap and
 * only closes when the final chunk ends.
 */
export function followAudioElement(audio: LipAudioClock, last: boolean): void {
  const id = lipSession;
  if (!id) return;
  const sync = () => {
    const dur = audio.duration;
    if (!Number.isFinite(dur) || dur <= 0) {
      holdLipSync(id, 1600);
      return;
    }
    syncLipToAudio(id, dur, Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
  };
  const onEnd = () => {
    if (last) finishLipSync(id);
    else holdLipSync(id, 700);
  };
  if (typeof audio.addEventListener === 'function') {
    for (const ev of ['loadedmetadata', 'durationchange', 'timeupdate', 'play']) {
      audio.addEventListener(ev, sync);
    }
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', () => finishLipSync(id));
  }
  sync();
}

/** Snap the mouth shut shortly after this session's audio ends. Older ids are ignored. */
export function finishLipSync(sessionId: number, now = Date.now(), tailMs = 140): void {
  if (sessionId !== lipSession || sessionId === 0) return;
  speakingUntil = now + Math.max(0, tailMs);
}

/** Cut whatever is on the mouth now (stop / a new line took over). */
export function endLipSync(now = Date.now()): void {
  if (lipSession === 0) {
    speakingUntil = now;
    return;
  }
  finishLipSync(lipSession, now, 0);
}

export function isSpeaking(now = Date.now()): boolean { return now < speakingUntil; }
function syllableNoise(i: number): number {
  let h = Math.imul(i + 1, 374761393) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export function sampleSpeech(now = Date.now()): SpeechSample | null {
  if (fed && now < fed.until) {
    return { mouth: fed.mouth, vowel: fed.vowel, duck: fed.mouth > 0.05 ? 0.9 : 0.15 };
  }
  if (!isSpeaking(now)) return null;
  const total = speakingUntil - startedAt;
  const t = now - startedAt;
  const syllableIdx = Math.min(syllableCount - 1, Math.floor(t / SYLLABLE_MS));
  const phase = (t % SYLLABLE_MS) / SYLLABLE_MS;
  // Stay open between syllables so the mouth covers the whole sentence,
  // not a single flap at the start.
  const pulse = phase < 0.35 ? phase / 0.35 : 1 - (phase - 0.35) / 0.65;
  const envelope = 0.34 + 0.66 * pulse;
  const openBase = 0.35 + 0.55 * syllableNoise(syllableIdx);
  const duck = Math.min(1, t / 180, Math.max(0, total - t) / 260);
  const vowel = VOWELS[Math.floor(syllableNoise(syllableIdx + 977) * VOWELS.length) % VOWELS.length]!;
  return { mouth: envelope * openBase * duck, vowel, duck };
}
