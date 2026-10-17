// Free wire-now order. Edge neural first, then the browser's speechSynthesis
// (works offline once a voice is installed). Yue may add canto-tts-nano only
// when that runtime is actually present. Kokoro, MeloTTS, and the other GPU
// models are not hops. Google Cloud, Azure, and Polly are not hops.
//
// CosyVoice is an experiment, not a default. Callers pass cosyvoice: true
// only when the settings flag and a self-hosted URL are both set
// (cosyvoiceActive). It is tried first so a listen is possible, then Edge.

export type FreeVoiceHop = 'edge' | 'synth' | 'canto-nano' | 'cosyvoice';

export function freeVoiceHops(
  locale: string,
  opts?: { cantoNano?: boolean; edge?: boolean; cosyvoice?: boolean },
): FreeVoiceHop[] {
  const hops: FreeVoiceHop[] = [];
  if (opts?.cosyvoice) hops.push('cosyvoice');
  if (opts?.edge !== false) hops.push('edge');
  hops.push('synth');
  if (locale === 'yue' && opts?.cantoNano) hops.push('canto-nano');
  return hops;
}

export function formatVoiceChain(hops: readonly string[], lead?: string | null): string {
  const all = lead ? [lead, ...hops] : [...hops];
  return all.join('→');
}
