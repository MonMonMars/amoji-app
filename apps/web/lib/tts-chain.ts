// Free wire-now order. Edge neural first, then Google Translate's MP3 endpoint
// (plain HTTPS, so it survives the networks where the Edge socket is blocked),
// then the browser's speechSynthesis (works offline once a voice is installed).
// Yue may add canto-tts-nano only when that runtime is actually present.
// Kokoro, MeloTTS, and the other GPU models are not hops. Google Cloud, Azure,
// and Polly are not hops.

export type FreeVoiceHop = 'edge' | 'gtts' | 'synth' | 'canto-nano';

export function freeVoiceHops(
  locale: string,
  opts?: {
    cantoNano?: boolean;
    edge?: boolean;
    gtts?: boolean;
    /**
     * Male delivery needs a real male speaker (Edge WanLung/Guy/… or OS synth).
     * gTTS is one speaker per `tl` — pitch-shifting it still sounds female.
     */
    preferMale?: boolean;
  },
): FreeVoiceHop[] {
  const hops: FreeVoiceHop[] = [];
  if (opts?.preferMale) {
    // Real male neural / OS voice first; gTTS pitch-fallback last.
    if (opts?.edge !== false) hops.push('edge');
    hops.push('synth');
    if (opts?.gtts !== false) hops.push('gtts');
    if (locale === 'yue' && opts?.cantoNano) hops.push('canto-nano');
    return hops;
  }
  // Female / default: Google Translate MP3 first (Edge read-aloud often 403s).
  // speechSynthesis after (iOS silent switch); Edge as a rare upside.
  if (opts?.gtts !== false) hops.push('gtts');
  hops.push('synth');
  if (locale === 'yue' && opts?.cantoNano) hops.push('canto-nano');
  if (opts?.edge !== false) hops.push('edge');
  return hops;
}

export function formatVoiceChain(hops: readonly string[], lead?: string | null): string {
  const all = lead ? [lead, ...hops] : [...hops];
  return all.join('→');
}
