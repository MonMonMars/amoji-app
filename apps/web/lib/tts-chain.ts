// Free wire-now order. Edge neural first, then Google Translate's MP3 endpoint
// (plain HTTPS, so it survives the networks where the Edge socket is blocked),
// then the browser's speechSynthesis (works offline once a voice is installed).
// Yue may add canto-tts-nano only when that runtime is actually present.
// Kokoro, MeloTTS, and the other GPU models are not hops. Google Cloud, Azure,
// and Polly are not hops.

export type FreeVoiceHop = 'edge' | 'gtts' | 'synth' | 'canto-nano';

export function freeVoiceHops(
  locale: string,
  opts?: { cantoNano?: boolean; edge?: boolean; gtts?: boolean },
): FreeVoiceHop[] {
  const hops: FreeVoiceHop[] = [];
  if (opts?.edge !== false) hops.push('edge');
  // The Edge readaloud endpoint answers 403 to every client now (verified: 401
  // without the client token, 403 with it), so this HTTP tier is the only path
  // that reliably produces real speech on a phone. Keep it ahead of synth:
  // speechSynthesis is muted by the iOS hardware silent switch and ships no
  // voice on some devices, which is what made the app go totally silent.
  if (opts?.gtts !== false) hops.push('gtts');
  hops.push('synth');
  if (locale === 'yue' && opts?.cantoNano) hops.push('canto-nano');
  return hops;
}

export function formatVoiceChain(hops: readonly string[], lead?: string | null): string {
  const all = lead ? [lead, ...hops] : [...hops];
  return all.join('→');
}
