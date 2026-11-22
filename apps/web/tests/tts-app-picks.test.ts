import { beforeEach, describe, expect, it } from 'vitest';
import {
  TTS_APP_PICKS,
  TTS_APP_PICK_COUNTS,
  TTS_APP_PICK_STORAGE_KEY,
  setTtsAppPickVerdict,
  ttsAppPickById,
  ttsAppPickVerdict,
  ttsAppPicksForLocale,
} from '../lib/tts-app-picks';

/** Minimal localStorage so the store's persistence path is exercised in node. */
function installStorage(): void {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
  };
  (globalThis as unknown as { localStorage: typeof storage }).localStorage = storage;
}

describe('tts app keep/delete picks', () => {
  beforeEach(() => {
    installStorage();
  });

  it('lists TTS-001 through TTS-218 once each', () => {
    const ids = TTS_APP_PICKS.map((row) => row.id);
    expect(ids).toHaveLength(218);
    expect(new Set(ids).size).toBe(218);
    expect(ids[0]).toBe('TTS-001');
    expect(ids[217]).toBe('TTS-218');
    expect(ids.every((id) => /^TTS-\d{3}$/.test(id))).toBe(true);
  });

  it('matches the language counts from the keep/delete list', () => {
    // yue 26 -> 25 and zh 33 -> 34 at r283: TTS-013 GLM-TTS was re-tagged off
    // `yue` (zai-org/GLM-TTS issue #8 — dialects still training). See
    // tests/tts-yue-verified.test.ts for the allowlist that now guards this.
    expect(TTS_APP_PICK_COUNTS.yue).toEqual({ total: 25, edge: 3, link: 22 });
    expect(TTS_APP_PICK_COUNTS.zh).toEqual({ total: 34, edge: 11, link: 23 });
    expect(TTS_APP_PICK_COUNTS.ja).toEqual({ total: 60, edge: 2, link: 58 });
    expect(TTS_APP_PICK_COUNTS.en).toEqual({ total: 113, edge: 47, link: 66 });
    expect(ttsAppPicksForLocale('yue')).toHaveLength(25);
    expect(ttsAppPicksForLocale('zh')).toHaveLength(34);
    expect(ttsAppPicksForLocale('ja')).toHaveLength(60);
    expect(ttsAppPicksForLocale('en')).toHaveLength(113);
  });

  it('stars the preferred defaults and includes lifted HOLD plus legal child Edge voices', () => {
    const stars = TTS_APP_PICKS.filter((row) => row.preferred).map((row) => row.id);
    // TTS-003 (HiuGaai) joined the stars with the owner's 3-voice Cantonese
    // pool: all three zh-HK Edge voices are the playable voice set now.
    expect(stars).toEqual([
      'TTS-001',
      'TTS-002',
      'TTS-003',
      'TTS-027',
      'TTS-028',
      'TTS-058',
      'TTS-059',
      'TTS-115',
      'TTS-116',
      'TTS-117',
    ]);
    expect(ttsAppPickById('TTS-001')?.edgeVoiceId).toBe('zh-HK-WanLungNeural');
    expect(ttsAppPickById('TTS-004')?.name).toMatch(/Fun-CosyVoice/);
    expect(ttsAppPickById('TTS-011')?.name).toMatch(/CosyVoice2-Yue/);
    expect(ttsAppPickById('TTS-014')?.name).toMatch(/JyutVoice/);
    expect(ttsAppPickById('TTS-029')?.edgeVoiceId).toBe('zh-CN-YunxiaNeural');
    expect(ttsAppPickById('TTS-143')?.edgeVoiceId).toBe('en-GB-MaisieNeural');
    expect(ttsAppPickById('TTS-155')?.edgeVoiceId).toBe('en-US-AnaNeural');
    expect(ttsAppPickById('TTS-147')?.edgeVoiceId).toBe('en-IN-NeerjaExpressiveNeural');
  });

  it('reuses the same number for a multi-language row', () => {
    const ekho = ttsAppPickById('TTS-012');
    expect(ekho?.locales).toEqual(expect.arrayContaining(['yue', 'zh']));
    expect(ttsAppPicksForLocale('yue').some((row) => row.id === 'TTS-012')).toBe(true);
    expect(ttsAppPicksForLocale('zh').some((row) => row.id === 'TTS-012')).toBe(true);
  });

  it('persists keep and delete verdicts under the tts pick key', () => {
    expect(ttsAppPickVerdict('TTS-015')).toBeNull();
    expect(setTtsAppPickVerdict('TTS-015', 'delete')).toBe('delete');
    expect(ttsAppPickVerdict('TTS-015')).toBe('delete');
    expect(setTtsAppPickVerdict('TTS-015', 'keep')).toBe('keep');
    expect(ttsAppPickVerdict('TTS-015')).toBe('keep');
    expect(setTtsAppPickVerdict('TTS-015', null)).toBeNull();
    expect(ttsAppPickVerdict('TTS-015')).toBeNull();
    const stored = JSON.parse(localStorage.getItem(TTS_APP_PICK_STORAGE_KEY) || '{}');
    expect(stored).not.toHaveProperty('TTS-015');
  });
});
