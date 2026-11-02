import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EN_SFX_AB_PICK_KEY,
  EN_SFX_AB_SAMPLES,
  EN_SFX_GATEWAY_DEFAULT,
  EN_SFX_SIDECAR_ENGINES,
  enSfxGatewayBase,
  enSfxSidecarEngine,
  isEnSfxSidecarFlagEnabled,
  isEnvFlagOn,
  readEnSfxAbPick,
  writeEnSfxAbPick,
  type EnSfxSidecarEngineId,
} from '../lib/en-sfx-sidecar';
import { HELD_GPU_ENGINES, VOICE_CATALOG } from '../lib/voice-catalog';
import { isSilencio2Enabled } from '../lib/silencio2-flag';

describe('EN SFX sidecar A/B catalog', () => {
  it('lists Edge baseline plus Silencio-2, Chatterbox-Turbo, Vui Nano, Lure as labeled test engines', () => {
    const ids = EN_SFX_SIDECAR_ENGINES.map((e) => e.id);
    expect(ids).toEqual(['edge', 'silencio2', 'chatterbox-turbo', 'vui-nano', 'lure-tts']);
    expect(EN_SFX_SIDECAR_ENGINES[0].badge).toBe('shipping');
    for (const e of EN_SFX_SIDECAR_ENGINES.slice(1)) {
      expect(e.badge).toBe('test');
      expect(e.label).toMatch(/\(test\)/);
      expect(e.flagEnv).toMatch(/^NEXT_PUBLIC_AMOJI_/);
      expect(e.toolsDir).toMatch(/^tools\//);
    }
  });

  it('ships EN catalog stubs as shipping:false and never mixes into Edge/Yue shipping engines', () => {
    const sidecarEngines = ['silencio2', 'chatterbox-turbo', 'vui-nano', 'lure-tts'] as const;
    for (const engine of sidecarEngines) {
      const rows = VOICE_CATALOG.filter((v) => v.engine === engine);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows.every((v) => v.shipping === false)).toBe(true);
      expect(rows.every((v) => v.locale === 'en')).toBe(true);
    }
    const shipping = new Set(VOICE_CATALOG.filter((v) => v.shipping).map((v) => v.engine));
    for (const engine of sidecarEngines) {
      expect(shipping.has(engine)).toBe(false);
    }
    expect(HELD_GPU_ENGINES.map((h) => h.engine)).toEqual(
      expect.arrayContaining(['silencio2', 'chatterbox-turbo', 'vui-nano', 'lure-tts']),
    );
  });

  it('keeps default flags off (missing / empty / 0 / false)', () => {
    expect(isEnvFlagOn(undefined)).toBe(false);
    expect(isEnvFlagOn(null)).toBe(false);
    expect(isEnvFlagOn('')).toBe(false);
    expect(isEnvFlagOn('0')).toBe(false);
    expect(isEnvFlagOn('false')).toBe(false);
    expect(isEnvFlagOn('1')).toBe(true);
    expect(isEnvFlagOn('true')).toBe(true);

    const prev = { ...process.env };
    try {
      delete process.env.NEXT_PUBLIC_AMOJI_SILENCIO2;
      delete process.env.NEXT_PUBLIC_AMOJI_CHATTERBOX_TURBO;
      delete process.env.NEXT_PUBLIC_AMOJI_VUI_NANO;
      delete process.env.NEXT_PUBLIC_AMOJI_LURE_TTS;
      expect(isSilencio2Enabled()).toBe(false);
      expect(isEnSfxSidecarFlagEnabled('silencio2')).toBe(false);
      expect(isEnSfxSidecarFlagEnabled('chatterbox-turbo')).toBe(false);
      expect(isEnSfxSidecarFlagEnabled('vui-nano')).toBe(false);
      expect(isEnSfxSidecarFlagEnabled('lure-tts')).toBe(false);
      expect(isEnSfxSidecarFlagEnabled('edge')).toBe(true);

      process.env.NEXT_PUBLIC_AMOJI_SILENCIO2 = '1';
      expect(isSilencio2Enabled()).toBe(true);
      expect(isEnSfxSidecarFlagEnabled('silencio2')).toBe(true);
    } finally {
      for (const k of Object.keys(process.env)) {
        if (!(k in prev)) delete process.env[k];
      }
      Object.assign(process.env, prev);
    }
  });

  it('defaults gateway to localhost:8765 and resolves engine rows', () => {
    expect(enSfxGatewayBase()).toBe(EN_SFX_GATEWAY_DEFAULT);
    expect(enSfxSidecarEngine('chatterbox-turbo')?.label).toBe('Chatterbox-Turbo (test)');
    expect(enSfxSidecarEngine('nope')).toBeUndefined();
    expect(EN_SFX_AB_SAMPLES.some((s) => s.text.includes('[laugh]'))).toBe(true);
  });

  it('persists A/B pick in localStorage and falls back to edge', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v); },
      },
    });
    expect(readEnSfxAbPick()).toBe('edge');
    writeEnSfxAbPick('vui-nano');
    expect(store.get(EN_SFX_AB_PICK_KEY)).toBe('vui-nano');
    expect(readEnSfxAbPick()).toBe('vui-nano');
    writeEnSfxAbPick('not-an-engine' as EnSfxSidecarEngineId);
    // invalid id still written by helper; reader validates
    store.set(EN_SFX_AB_PICK_KEY, 'garbage');
    expect(readEnSfxAbPick()).toBe('edge');
    vi.unstubAllGlobals();
  });
});