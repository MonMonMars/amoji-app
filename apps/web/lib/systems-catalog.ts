/**
 * Runtime catalog of free hosts, file locations, and system posture.
 * Kept factual so Settings /systems and docs/SYSTEMS.md stay aligned.
 */

export interface FreeServerEntry {
  id: string;
  role: string;
  host: string;
  notes: string;
}

export interface FileLocationEntry {
  id: string;
  kind: string;
  location: string;
}

export const FREE_SERVERS: FreeServerEntry[] = [
  {
    id: 'pages',
    role: 'Companion UI',
    host: 'GitHub Pages (monmonmars.github.io/amoji-app)',
    notes: 'Static export. No production API unless NEXT_PUBLIC_AMOJI_API is set.',
  },
  {
    id: 'tts-proxy',
    role: 'Edge TTS relay',
    host: 'Cloudflare Worker (server/amoji-proxy)',
    notes: 'Optional free relay when the browser cannot open the Edge socket.',
  },
  {
    id: 'backend',
    role: 'Optional session API',
    host: 'Node @amoji/server (AMOJI_PORT, default 8787)',
    notes: 'Anonymous sessions + SQLite. Used only when the web build points at it.',
  },
  {
    id: 'pollinations',
    role: 'Free chat brain',
    host: 'text.pollinations.ai',
    notes: 'Keyless default LLM path.',
  },
  {
    id: 'ovh',
    role: 'Free chat brain (racer)',
    host: 'oai.endpoints.kepler.ai.cloud.ovh.net',
    notes: 'Keyless public endpoint raced with Pollinations.',
  },
  {
    id: 'puter',
    role: 'Free chat brain (racer)',
    host: 'js.puter.com / puter.ai.chat',
    notes: 'In-browser SDK race lane.',
  },
  {
    id: 'gtts',
    role: 'Free online voice',
    host: 'translate.google.com/translate_tts',
    notes: 'Used when the free online voice path is active.',
  },
  {
    id: 'open-meteo',
    role: 'Weather',
    host: 'api.open-meteo.com',
    notes: 'Keyless weather when the user asks (or quiet idle offers).',
  },
];

export const FILE_LOCATIONS: FileLocationEntry[] = [
  { id: 'public-assets', kind: 'Static assets', location: 'apps/web/public/ (models, audio, sfx)' },
  { id: 'prefs', kind: 'Client prefs', location: 'localStorage amoji.prefs.v1' },
  { id: 'memory', kind: 'Long-term memory', location: 'localStorage amoji.memory.v2' },
  { id: 'history', kind: 'Chat history', location: 'localStorage amoji.history.v1' },
  { id: 'reports', kind: 'Content reports', location: 'localStorage amoji.reports.v1 (+ optional API)' },
  { id: 'companion-file', kind: 'Portable companion card', location: 'User-downloaded .aigf file' },
  { id: 'sqlite', kind: 'Production DB', location: 'AMOJI_DB on the Node host (default data/amoji.sqlite)' },
  { id: 'legal', kind: 'Legal copy source', location: 'apps/web/lib/legal-copy.ts' },
];

export function productionApiConfigured(): boolean {
  return !!(typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_AMOJI_API ?? '').trim());
}

export function stripePaymentLinkConfigured(): boolean {
  return !!(typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? '').trim());
}

export function systemsSnapshot() {
  return {
    freeServers: FREE_SERVERS,
    fileLocations: FILE_LOCATIONS,
    productionApi: productionApiConfigured(),
    stripePaymentLink: stripePaymentLinkConfigured(),
    paymentDemo:
      typeof process !== 'undefined'
      && ['1', 'true', 'yes'].includes((process.env.NEXT_PUBLIC_AMOJI_PAYMENT_DEMO ?? '').trim().toLowerCase()),
  };
}
