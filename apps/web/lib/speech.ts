// Speech-driven mouth (pseudo-viseme) driver — no audio needed.
export type VisemeVowel = 'aa' | 'ih' | 'ou' | 'ee' | 'oh';
export interface SpeechSample { mouth: number; vowel: VisemeVowel; duck: number }
const VOWELS: VisemeVowel[] = ['aa', 'ou', 'ih', 'ee', 'oh', 'aa', 'ou'];
const SYLLABLE_MS = 170;
let speakingUntil = 0, startedAt = 0, seed = 1, syllableCount = 1;
function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 1;
}
export function notifySpeaking(text: string, now = Date.now()): void {
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  const chars = text.length;
  const durationMs = Math.min(15000, Math.max(1400, words * 340 + chars * 12));
  startedAt = now; speakingUntil = now + durationMs;
  seed = hashText(text);
  syllableCount = Math.max(1, Math.round(durationMs / SYLLABLE_MS));
}
export function isSpeaking(now = Date.now()): boolean { return now < speakingUntil; }
function syllableNoise(i: number): number {
  let h = Math.imul(i + 1, 374761393) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export function sampleSpeech(now = Date.now()): SpeechSample | null {
  if (!isSpeaking(now)) return null;
  const total = speakingUntil - startedAt;
  const t = now - startedAt;
  const syllableIdx = Math.min(syllableCount - 1, Math.floor(t / SYLLABLE_MS));
  const phase = (t % SYLLABLE_MS) / SYLLABLE_MS;
  const envelope = phase < 0.3 ? phase / 0.3 : 1 - (phase - 0.3) / 0.7;
  const openBase = 0.35 + 0.55 * syllableNoise(syllableIdx);
  const duck = Math.min(1, t / 180, (total - t) / 260);
  const vowel = VOWELS[Math.floor(syllableNoise(syllableIdx + 977) * VOWELS.length) % VOWELS.length]!;
  return { mouth: envelope * openBase * duck, vowel, duck };
}
