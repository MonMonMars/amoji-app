'use client';
// Brain routing (r2026-10-03.05): which LLM answers the chat, and with what key.
// Everything lives in localStorage on the user's own device — no key is ever
// committed to the repo. `auto` walks BRAIN_SPECS top-down and picks the first
// provider with a stored key; with no keys it falls back to keyless Pollinations.

export type BrainProvider = 'auto' | 'pollinations' | 'groq' | 'moonshot' | 'openrouter';

export interface BrainSpec {
  id: Exclude<BrainProvider, 'auto'>;
  label: string;
  baseUrl: string;
  model: string;
  keyless: boolean;
  /** one-line hint shown in Settings → Brain */
  blurb: string;
  /** where to get a key (shown next to the key field) */
  keyFrom: string;
}

// Order matters: `auto` tries these top-down.
export const BRAIN_SPECS: BrainSpec[] = [
  {
    id: 'moonshot', label: 'Moonshot Kimi', keyless: false,
    baseUrl: 'https://api.moonshot.ai/v1', model: 'kimi-k2.5',
    blurb: 'Smartest — best Cantonese & personality.',
    keyFrom: 'platform.moonshot.ai',
  },
  {
    id: 'groq', label: 'Groq', keyless: false,
    baseUrl: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-120b',
    blurb: 'Free key — sub-second streaming replies.',
    keyFrom: 'console.groq.com',
  },
  {
    id: 'openrouter', label: 'OpenRouter', keyless: false,
    baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-oss-20b:free',
    blurb: 'Free models; one key for many providers.',
    keyFrom: 'openrouter.ai',
  },
  {
    id: 'pollinations', label: 'Pollinations', keyless: true,
    baseUrl: 'https://text.pollinations.ai/openai', model: 'openai',
    blurb: 'Zero setup — free shared queue, slower when busy.',
    keyFrom: '',
  },
];

const LS_PROVIDER = 'amoji.brain.provider';
const lsKey = (id: string) => `amoji.brain.key.${id}`;

const store = (): Storage | null =>
  typeof localStorage === 'undefined' ? null : localStorage;

export function brainProvider(): BrainProvider {
  const v = store()?.getItem(LS_PROVIDER);
  return v === 'pollinations' || v === 'groq' || v === 'moonshot' || v === 'openrouter'
    ? v
    : 'auto';
}

export function setBrainProvider(p: BrainProvider): void {
  store()?.setItem(LS_PROVIDER, p);
}

export function brainKey(id: string): string {
  return (store()?.getItem(lsKey(id)) ?? '').trim();
}

export function setBrainKey(id: string, key: string): void {
  const s = store();
  if (!s) return;
  if (key.trim()) s.setItem(lsKey(id), key.trim());
  else s.removeItem(lsKey(id));
}

export interface PickedBrain { spec: BrainSpec; key: string }

/** Resolve which brain answers right now. Explicit choice wins if usable;
 *  otherwise `auto` prefers the first keyed spec, else keyless Pollinations. */
export function pickBrain(): PickedBrain {
  const want = brainProvider();
  if (want !== 'auto') {
    const spec = BRAIN_SPECS.find((s) => s.id === want);
    if (spec) {
      const key = brainKey(spec.id);
      if (spec.keyless || key) return { spec, key };
    }
    // forced provider without a key → fall through to the free lane
  }
  for (const spec of BRAIN_SPECS) {
    const key = brainKey(spec.id);
    if (key) return { spec, key };
  }
  const fallback = BRAIN_SPECS.find((s) => s.id === 'pollinations') ?? BRAIN_SPECS[BRAIN_SPECS.length - 1]!;
  return { spec: fallback, key: '' };
}
