/**
 * EN emotion/SFX sidecar A/B engines (test lane only).
 * Edge chat / Yue / ja untouched. Never EN+Cantonese code-switch.
 * Flags default OFF. Not in freeVoiceHops().
 */

export type EnSfxSidecarEngineId =
  | 'edge'
  | 'silencio2'
  | 'chatterbox-turbo'
  | 'vui-nano'
  | 'lure-tts';

export type EnSfxSidecarEngine = {
  id: EnSfxSidecarEngineId;
  /** Button label Mon taps on /en-sfx-ab */
  label: string;
  /** Short badge on the button */
  badge: string;
  /** Env flag (NEXT_PUBLIC_…). Empty for Edge baseline. */
  flagEnv: string | null;
  license: string;
  notes: string;
  /** Whether this engine is expected to be present in the repo tools/ tree. */
  toolsDir: string | null;
};

/** Distinct A/B options. Edge first as fail-closed baseline. */
export const EN_SFX_SIDECAR_ENGINES: readonly EnSfxSidecarEngine[] = [
  {
    id: 'edge',
    label: 'Edge (baseline)',
    badge: 'shipping',
    flagEnv: null,
    license: 'Microsoft neural (read-aloud, no key)',
    notes: 'Unchanged EN Edge path. Always available.',
    toolsDir: null,
  },
  {
    id: 'silencio2',
    label: 'Silencio-2 (test)',
    badge: 'test',
    flagEnv: 'NEXT_PUBLIC_AMOJI_SILENCIO2',
    license: 'CC-BY-4.0 weights / MIT core',
    notes: 'EN emotion/SFX tags. tools/silencio2-sidecar. Flag default off.',
    toolsDir: 'tools/silencio2-sidecar',
  },
  {
    id: 'chatterbox-turbo',
    label: 'Chatterbox-Turbo (test)',
    badge: 'test',
    flagEnv: 'NEXT_PUBLIC_AMOJI_CHATTERBOX_TURBO',
    license: 'MIT',
    notes: 'EN paralinguistic tags [laugh]/[chuckle]. tools/chatterbox-turbo-sidecar. Flag default off.',
    toolsDir: 'tools/chatterbox-turbo-sidecar',
  },
  {
    id: 'vui-nano',
    label: 'Vui Nano (test)',
    badge: 'test',
    flagEnv: 'NEXT_PUBLIC_AMOJI_VUI_NANO',
    license: 'Apache-2.0',
    notes: 'EN conversational TTS with [laugh]/[sigh]. tools/vui-nano-sidecar. Flag default off.',
    toolsDir: 'tools/vui-nano-sidecar',
  },
  {
    id: 'lure-tts',
    label: 'Lure-TTS-0.6B (test)',
    badge: 'test',
    flagEnv: 'NEXT_PUBLIC_AMOJI_LURE_TTS',
    license: 'Apache-2.0',
    notes: 'EN expressive tags (laugh)/(sigh). Optional — may be SKIP if CPU install fails. tools/lure-tts-sidecar.',
    toolsDir: 'tools/lure-tts-sidecar',
  },
] as const;

export function enSfxSidecarEngine(id: string): EnSfxSidecarEngine | undefined {
  return EN_SFX_SIDECAR_ENGINES.find((e) => e.id === id);
}

/** True only when env is exactly 1 or true. Missing/empty/0 → false. */
export function isEnvFlagOn(raw: string | undefined | null): boolean {
  return raw === '1' || raw === 'true';
}

export function isEnSfxSidecarFlagEnabled(engineId: EnSfxSidecarEngineId): boolean {
  if (engineId === 'edge') return true;
  const row = enSfxSidecarEngine(engineId);
  if (!row?.flagEnv) return false;
  if (typeof process === 'undefined') return false;
  const raw = process.env[row.flagEnv];
  return isEnvFlagOn(raw);
}

/** Master DESKTOP test-page gate. When off, /en-sfx-ab still renders but sidecar calls stay fail-closed. */
export function isEnSfxAbPageEnabled(): boolean {
  if (typeof process === 'undefined') return false;
  const raw = process.env.NEXT_PUBLIC_AMOJI_EN_SFX_AB;
  // Page is always reachable for Mon A/B UI; this flag only marks "live sidecar" mode in docs.
  return isEnvFlagOn(raw);
}

export const EN_SFX_GATEWAY_DEFAULT = 'http://127.0.0.1:8765';

export function enSfxGatewayBase(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AMOJI_EN_SFX_GATEWAY) {
    return process.env.NEXT_PUBLIC_AMOJI_EN_SFX_GATEWAY.replace(/\/$/, '');
  }
  return EN_SFX_GATEWAY_DEFAULT;
}

/** localStorage key for Mon's last A/B engine pick (test lane only). */
export const EN_SFX_AB_PICK_KEY = 'amoji.enSfxAb.engine.v1';

export function readEnSfxAbPick(): EnSfxSidecarEngineId {
  if (typeof window === 'undefined') return 'edge';
  try {
    const raw = window.localStorage.getItem(EN_SFX_AB_PICK_KEY);
    if (raw && enSfxSidecarEngine(raw)) return raw as EnSfxSidecarEngineId;
  } catch { /* ignore */ }
  return 'edge';
}

export function writeEnSfxAbPick(id: EnSfxSidecarEngineId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EN_SFX_AB_PICK_KEY, id);
  } catch { /* ignore */ }
}

/** Sample lines for A/B preview (EN tags only). */
export const EN_SFX_AB_SAMPLES: readonly { id: string; label: string; text: string }[] = [
  { id: 'laugh', label: '[laugh]', text: 'That was funny. [laugh]' },
  { id: 'sigh', label: '[sigh]', text: 'What a long day. [sigh]' },
  { id: 'gasp', label: '[gasp]', text: 'Wait — [gasp] did you hear that?' },
  { id: 'happy', label: 'happy filler', text: 'Nice! We can try that.' },
  { id: 'whisper', label: 'whisper', text: 'Keep your voice down.' },
];


export type EnSfxGatewayHealth = {
  ok?: boolean;
  engines?: Record<string, { engine?: string; ready?: boolean; skipped?: boolean; reason?: string; hint?: string; venv?: boolean; sample_wav?: boolean }>;
  error?: string;
};

export type EnSfxGatewayStatus = {
  state: 'up' | 'down' | 'unknown';
  label: string;
  detail: string;
};

/** Pure helper for /en-sfx-ab gateway pill. */
export function enSfxGatewayStatus(health: EnSfxGatewayHealth | null | undefined): EnSfxGatewayStatus {
  if (health == null) {
    return { state: 'unknown', label: 'Gateway…', detail: 'Probing 127.0.0.1:8765' };
  }
  if (health.ok === true) {
    return { state: 'up', label: 'Gateway up', detail: 'Health OK — sidecars may still SKIP per engine' };
  }
  const err = health.error ? String(health.error) : 'unreachable';
  return {
    state: 'down',
    label: 'Gateway down',
    detail: `Fail-closed to Edge (${err})`,
  };
}

/** Clearer fail-closed / CUDA-skip copy when a preview falls back to Edge. */
export function enSfxFailClosedMessage(opts: {
  engineId: string;
  detail?: string;
  engineHealth?: { ready?: boolean; skipped?: boolean; reason?: string; hint?: string } | null;
}): string {
  const detail = (opts.detail || '').trim();
  const st = opts.engineHealth;
  if (st?.skipped) {
    const why = st.reason || st.hint || detail || 'engine skipped';
    if (opts.engineId === 'vui-nano' || /cuda|gpu/i.test(why)) {
      return `Vui CUDA/skip — fail-closed to Edge (${why})`;
    }
    return `Engine SKIP — fail-closed to Edge (${why})`;
  }
  if (detail) return `Fail-closed → Edge (${detail})`;
  return 'Fail-closed → Edge';
}
